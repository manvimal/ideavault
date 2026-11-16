import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Event, Lock, Semaphore, Thread

from app.config import settings
from app.models.idea import BusinessCaseJob, Idea
from app.services import business_case_service
from app.services.business_case_service import BusinessCaseCancelled, BusinessCaseError
from app.services.idea_repository import IdeaNotFoundError
from app.services.idea_service import IdeaService, idea_service

logger = logging.getLogger("uvicorn.error")
ACTIVE_STATUSES = {"queued", "running"}
SLOT_POLL_SECONDS = 0.5


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class _JobState:
    job: BusinessCaseJob
    cancel_event: Event = field(default_factory=Event)


class BusinessCaseJobManager:
    """Runs business case generation in background threads, with at most one active job per idea."""

    def __init__(self, ideas: IdeaService = idea_service, max_concurrent_jobs: int = 1):
        self.ideas = ideas
        self._jobs: dict[str, _JobState] = {}
        self._lock = Lock()
        self._slots = Semaphore(max_concurrent_jobs)

    def start(self, idea_id: str) -> BusinessCaseJob:
        idea = self.ideas.get_idea(idea_id)
        business_case_service.validate_configuration()
        with self._lock:
            current = self._jobs.get(idea_id)
            if current is not None and current.job.status in ACTIVE_STATUSES:
                return self._snapshot(current.job)
            state = _JobState(BusinessCaseJob(idea_id=idea_id, max_tokens=settings.llm_max_tokens))
            self._jobs[idea_id] = state
            snapshot = self._snapshot(state.job)
        logger.info("Queued business case job %s for idea %s", state.job.id, idea_id)
        Thread(target=self._run, args=(state, idea), name=f"business-case-{idea_id}", daemon=True).start()
        return snapshot

    def get(self, idea_id: str) -> BusinessCaseJob | None:
        with self._lock:
            state = self._jobs.get(idea_id)
            return None if state is None else self._snapshot(state.job)

    def cancel(self, idea_id: str) -> BusinessCaseJob | None:
        with self._lock:
            state = self._jobs.get(idea_id)
            if state is None:
                return None
            if state.job.status in ACTIVE_STATUSES:
                state.job.cancel_requested = True
                state.cancel_event.set()
            return self._snapshot(state.job)

    def _run(self, state: _JobState, idea: Idea) -> None:
        try:
            while not self._slots.acquire(timeout=SLOT_POLL_SECONDS):
                if state.cancel_event.is_set():
                    self._finish(state, "cancelled")
                    return
            try:
                if state.cancel_event.is_set():
                    self._finish(state, "cancelled")
                    return
                self._update(state, status="running", started_at=_utcnow())
                content, truncated = business_case_service.generate_business_case(
                    idea, on_token=lambda text: self._append(state, text), cancel_event=state.cancel_event
                )
                self.ideas.save_business_case(idea.id, idea.title, idea.content, content)
                logger.info("Business case saved for idea %s", idea.id)
                self._finish(state, "completed", truncated=truncated)
            finally:
                self._slots.release()
        except BusinessCaseCancelled:
            self._finish(state, "cancelled")
        except BusinessCaseError as exc:
            self._finish(state, "failed", error=str(exc))
        except IdeaNotFoundError:
            self._finish(state, "failed", error="The idea was deleted while the business case was being generated.")
        except ValueError as exc:
            self._finish(state, "failed", error=str(exc))
        except Exception:
            logger.exception("Business case job %s failed unexpectedly", state.job.id)
            self._finish(state, "failed", error="An unexpected error occurred while generating the business case.")

    def _update(self, state: _JobState, **changes) -> None:
        with self._lock:
            for name, value in changes.items():
                setattr(state.job, name, value)

    def _append(self, state: _JobState, text: str) -> None:
        with self._lock:
            state.job.partial_content += text
            state.job.generated_tokens += 1

    def _finish(self, state: _JobState, status: str, *, error: str | None = None, truncated: bool = False) -> None:
        with self._lock:
            job = state.job
            job.status = status
            job.error = error
            job.truncated = truncated
            job.finished_at = _utcnow()
            job.partial_content = ""
        logger.info("Business case job %s for idea %s finished: %s", job.id, job.idea_id, status)

    @staticmethod
    def _snapshot(job: BusinessCaseJob) -> BusinessCaseJob:
        end = job.finished_at or _utcnow()
        return job.model_copy(update={"elapsed_seconds": round((end - job.created_at).total_seconds(), 1)})


business_case_jobs = BusinessCaseJobManager(max_concurrent_jobs=settings.llm_max_concurrent_jobs)
