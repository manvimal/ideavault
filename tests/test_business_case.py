import io
import json
import socket
import tempfile
import time
import unittest
from contextlib import ExitStack
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Event, Thread
from unittest.mock import patch

from docx import Document
from fastapi import HTTPException

from app.api.routes import ideas
from app.config import settings
from app.models.idea import Idea, IdeaCreate, IdeaUpdate
from app.services import business_case_service, export_service
from app.services.business_case_jobs import ACTIVE_STATUSES, BusinessCaseJobManager
from app.services.business_case_service import BusinessCaseCancelled, BusinessCaseError, generate_business_case
from app.services.idea_repository import IdeaRepository
from app.services.idea_service import IdeaService


def _llm_settings(base_url: str, **overrides) -> ExitStack:
    values = {
        "llm_enabled": True,
        "llm_provider": "openai",
        "llm_base_url": base_url,
        "llm_api_key": None,
        "llm_timeout_seconds": 5,
        "llm_max_tokens": 50,
        **overrides,
    }
    stack = ExitStack()
    for name, value in values.items():
        stack.enter_context(patch.object(settings, name, value))
    return stack


def _wait_for(condition, timeout: float = 5.0) -> None:
    deadline = time.monotonic() + timeout
    while not condition():
        if time.monotonic() > deadline:
            raise AssertionError("Timed out waiting for condition")
        time.sleep(0.02)


class _ModelHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        server = self.server
        server.requests.append((self.path, json.loads(self.rfile.read(int(self.headers["Content-Length"])))))
        server.release.wait(server.delay)
        if server.status != 200:
            self.send_response(server.status)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()
        for token in server.tokens:
            self._event({"choices": [{"delta": {"content": token}, "finish_reason": None}]})
            server.release.wait(server.token_delay)
        self._event({"choices": [{"delta": {}, "finish_reason": server.finish_reason}]})
        self.wfile.write(b"data: [DONE]\n\n")

    def _event(self, data: dict) -> None:
        self.wfile.write(f"data: {json.dumps(data)}\n\n".encode())
        self.wfile.flush()

    def log_message(self, format, *args):
        pass


class _ModelServer(ThreadingHTTPServer):
    """Local OpenAI-compatible streaming server with controllable delays."""

    daemon_threads = True

    def __init__(self, tokens=("Hello", " world"), status=200, delay=0.0, token_delay=0.0, finish_reason="stop"):
        super().__init__(("127.0.0.1", 0), _ModelHandler)
        self.tokens = tokens
        self.status = status
        self.delay = delay
        self.token_delay = token_delay
        self.finish_reason = finish_reason
        self.requests: list[tuple[str, dict]] = []
        self.release = Event()
        Thread(target=self.serve_forever, daemon=True).start()

    @property
    def base_url(self) -> str:
        return f"http://127.0.0.1:{self.server_address[1]}/v1"

    def handle_error(self, request, client_address):
        pass

    def close(self) -> None:
        self.release.set()
        self.shutdown()
        self.server_close()


class IdeaPersistenceTests(unittest.TestCase):
    def test_existing_records_and_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            service = IdeaService(IdeaRepository(Path(directory)))
            idea = service.create_idea(IdeaCreate(title="Idea", content="Original"))
            self.assertEqual(idea.ai_generated_description, "")
            service.save_business_case(idea.id, idea.title, idea.content, "Generated case")
            self.assertEqual(service.get_idea(idea.id).ai_generated_description, "Generated case")
            service.update_idea(idea.id, IdeaUpdate(title="Idea", content="Edited"))
            self.assertEqual(service.get_idea(idea.id).ai_generated_description, "Generated case")
            with self.assertRaises(ValueError):
                service.save_business_case(idea.id, "Idea", "Original", "Stale case")
            self.assertEqual(service.get_idea(idea.id).ai_generated_description, "Generated case")

    def test_generated_case_is_in_exports(self):
        idea = Idea(title="Idea", content="Original", ai_generated_description="Generated analysis")
        self.assertIn(b"Generated analysis", export_service.to_markdown(idea))
        document = Document(io.BytesIO(export_service.to_docx(idea)))
        self.assertIn("Generated analysis", [paragraph.text for paragraph in document.paragraphs])
        self.assertTrue(export_service.to_pdf(idea).startswith(b"%PDF"))


class StreamingGenerationTests(unittest.TestCase):
    def serve(self, **kwargs) -> _ModelServer:
        server = _ModelServer(**kwargs)
        self.addCleanup(server.close)
        return server

    def test_streams_tokens_and_sends_bounded_request(self):
        server = self.serve()
        received: list[str] = []
        with _llm_settings(server.base_url):
            result = generate_business_case(Idea(title="Test", content="Local idea"), on_token=received.append)
        self.assertEqual(result, ("Hello world", False))
        self.assertEqual(received, ["Hello", " world"])
        path, payload = server.requests[0]
        self.assertEqual(path, "/v1/chat/completions")
        self.assertTrue(payload["stream"])
        self.assertEqual(payload["max_tokens"], 50)
        self.assertIn("Mauritius", payload["messages"][0]["content"])
        self.assertIn("Local idea", payload["messages"][1]["content"])

    def test_token_limit_is_reported(self):
        server = self.serve(finish_reason="length")
        with _llm_settings(server.base_url):
            _, truncated = generate_business_case(Idea(title="Test"))
        self.assertTrue(truncated)

    def test_cancel_while_waiting_for_first_token(self):
        server = self.serve(delay=30)
        cancel = Event()
        outcome: dict[str, BaseException] = {}

        def run() -> None:
            try:
                generate_business_case(Idea(title="Test"), cancel_event=cancel)
            except BaseException as exc:
                outcome["error"] = exc

        with _llm_settings(server.base_url, llm_timeout_seconds=30):
            thread = Thread(target=run)
            thread.start()
            _wait_for(lambda: server.requests)
            cancel.set()
            thread.join(5)
        self.assertFalse(thread.is_alive())
        self.assertIsInstance(outcome.get("error"), BusinessCaseCancelled)

    def test_idle_timeout_has_specific_error(self):
        server = self.serve(delay=30)
        with _llm_settings(server.base_url, llm_timeout_seconds=0.3):
            with self.assertRaisesRegex(BusinessCaseError, "sent no data for 0.3 seconds"):
                generate_business_case(Idea(title="Test"))

    def test_http_error_unreachable_server_and_disabled(self):
        server = self.serve(status=500)
        with _llm_settings(server.base_url):
            with self.assertRaisesRegex(BusinessCaseError, "HTTP 500"):
                generate_business_case(Idea(title="Test"))
        with socket.socket() as unused:
            unused.bind(("127.0.0.1", 0))
            port = unused.getsockname()[1]
        with _llm_settings(f"http://127.0.0.1:{port}/v1"):
            with self.assertRaisesRegex(BusinessCaseError, "Could not reach"):
                generate_business_case(Idea(title="Test"))
        with _llm_settings(server.base_url, llm_enabled=False):
            with self.assertRaisesRegex(BusinessCaseError, "disabled"):
                generate_business_case(Idea(title="Test"))

    def test_progress_logs_exclude_idea_content(self):
        server = self.serve(tokens=("A", "B"), delay=0.3, token_delay=0.3)
        with _llm_settings(server.base_url), \
             patch.object(business_case_service, "PROGRESS_LOG_INTERVAL_SECONDS", 0.2), \
             self.assertLogs("uvicorn.error", level="INFO") as logs:
            generate_business_case(Idea(title="Private title", content="Private content"))
        output = "\n".join(logs.output)
        self.assertIn("waiting for the first token", output)
        self.assertIn("tokens generated", output)
        self.assertIn("Model finished", output)
        self.assertNotIn("Private content", output)
        self.assertNotIn("Private title", output)


class BusinessCaseJobTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.ideas = IdeaService(IdeaRepository(Path(directory.name)))
        self.idea = self.ideas.create_idea(IdeaCreate(title="Idea", content="Original"))
        self.jobs = BusinessCaseJobManager(self.ideas)
        self.enterContext(_llm_settings("http://127.0.0.1:9/v1"))

    def finished_job(self, idea_id: str | None = None):
        idea_id = idea_id or self.idea.id
        _wait_for(lambda: self.jobs.get(idea_id).status not in ACTIVE_STATUSES)
        return self.jobs.get(idea_id)

    def test_job_streams_progress_then_saves_case(self):
        release = Event()

        def fake(idea, on_token, cancel_event):
            on_token("Case ")
            on_token("text")
            release.wait(5)
            return "Case text", True

        with patch.object(business_case_service, "generate_business_case", side_effect=fake):
            started = self.jobs.start(self.idea.id)
            self.assertIn(started.status, ACTIVE_STATUSES)
            _wait_for(lambda: self.jobs.get(self.idea.id).generated_tokens == 2)
            self.assertEqual(self.jobs.get(self.idea.id).partial_content, "Case text")
            self.assertEqual(self.jobs.start(self.idea.id).id, started.id)
            release.set()
            job = self.finished_job()
        self.assertEqual(job.status, "completed")
        self.assertTrue(job.truncated)
        self.assertEqual(job.partial_content, "")
        self.assertEqual(self.ideas.get_idea(self.idea.id).ai_generated_description, "Case text")

    def test_cancel_keeps_existing_case(self):
        self.ideas.save_business_case(self.idea.id, "Idea", "Original", "Existing")

        def fake(idea, on_token, cancel_event):
            cancel_event.wait(5)
            raise BusinessCaseCancelled()

        with patch.object(business_case_service, "generate_business_case", side_effect=fake):
            self.jobs.start(self.idea.id)
            self.assertTrue(self.jobs.cancel(self.idea.id).cancel_requested)
            job = self.finished_job()
        self.assertEqual(job.status, "cancelled")
        self.assertEqual(self.ideas.get_idea(self.idea.id).ai_generated_description, "Existing")

    def test_second_job_queues_until_a_slot_is_free(self):
        other = self.ideas.create_idea(IdeaCreate(title="Other", content="Second"))
        release = Event()

        def fake(idea, on_token, cancel_event):
            release.wait(5)
            return f"Case for {idea.title}", False

        with patch.object(business_case_service, "generate_business_case", side_effect=fake):
            self.jobs.start(self.idea.id)
            _wait_for(lambda: self.jobs.get(self.idea.id).status == "running")
            self.jobs.start(other.id)
            time.sleep(0.2)
            self.assertEqual(self.jobs.get(other.id).status, "queued")
            self.jobs.cancel(other.id)
            self.assertEqual(self.finished_job(other.id).status, "cancelled")
            release.set()
            self.assertEqual(self.finished_job().status, "completed")

    def test_failures_and_stale_ideas_are_reported(self):
        with patch.object(business_case_service, "generate_business_case", side_effect=BusinessCaseError("offline")):
            self.jobs.start(self.idea.id)
            job = self.finished_job()
        self.assertEqual((job.status, job.error), ("failed", "offline"))

        def edit_during_generation(idea, on_token, cancel_event):
            self.ideas.update_idea(idea.id, IdeaUpdate(title="Idea", content="Edited"))
            return "Stale case", False

        with patch.object(business_case_service, "generate_business_case", side_effect=edit_during_generation):
            self.jobs.start(self.idea.id)
            job = self.finished_job()
        self.assertEqual(job.status, "failed")
        self.assertIn("changed", job.error)
        self.assertEqual(self.ideas.get_idea(self.idea.id).ai_generated_description, "")

    def test_routes_start_poll_and_cancel(self):
        with patch.object(ideas, "business_case_jobs", self.jobs):
            with self.assertRaises(HTTPException) as error:
                ideas.get_business_case_job(self.idea.id)
            self.assertEqual(error.exception.status_code, 404)
            with self.assertRaises(HTTPException) as error:
                ideas.start_business_case("missing")
            self.assertEqual(error.exception.status_code, 404)
            with patch.object(settings, "llm_enabled", False), self.assertRaises(HTTPException) as error:
                ideas.start_business_case(self.idea.id)
            self.assertEqual(error.exception.status_code, 503)
            with patch.object(business_case_service, "generate_business_case", return_value=("Case", False)):
                ideas.start_business_case(self.idea.id)
                self.finished_job()
            self.assertEqual(ideas.get_business_case_job(self.idea.id).status, "completed")
            self.assertEqual(ideas.cancel_business_case(self.idea.id).status, "completed")


if __name__ == "__main__":
    unittest.main()