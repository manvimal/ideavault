Fixed two environment issues along the way: next.config.ts isn't supported on Next 14.2.5 (switched to .mjs), and pinned pydantic-core==2.18.2 had no prebuilt wheel for this machine's Python 3.14 (switched requirements to >= constraints so pip resolves modern wheels). npm run build and backend smoke tests both pass.

To run locally in PowerShell:

Backend:
	Set-Location "C:\Users\P128912\sixsigma\saas\EdTech"
	.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8085

Frontend (in another terminal):
	Set-Location "C:\Users\P128912\sixsigma\saas\EdTech\frontend"
	npm run dev

If the backend uses another port, set $env:IDEAVAULT_API_URL = "http://localhost:8001" in the frontend terminal before starting Next.js. To use another frontend port, run npm run dev -- -p 3002.

Local AI business cases (PowerShell):

	docker run -d --name idea-vault-ollama -p 11434:11434 -v idea-vault-ollama:/root/.ollama ollama/ollama
	docker exec idea-vault-ollama ollama pull llama3.1

If Ollama is already running on port 11434, use that server and pull the model there instead. In the backend terminal, set these variables before starting Uvicorn:

	$env:IDEAVAULT_LLM_ENABLED = "true"
$env:IDEAVAULT_LLM_MODEL = "llama3.2-8t"
$env:IDEAVAULT_LLM_BASE_URL = "http://localhost:9090/v1"
$env:IDEAVAULT_LLM_BASE_URL   # should print http://localhost:9090/v1
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8085
	.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8085

For the existing Ollama container exposed on port 9090, use the CPU-tuned llama3.2-8t model:

	$env:IDEAVAULT_LLM_MODEL = "llama3.2-8t"
	$env:IDEAVAULT_LLM_BASE_URL = "http://localhost:9090/v1"

Ollama runs this model on CPU only. With its default 16 threads it produced about 0.4 tokens/second on this machine; limiting it to 8 threads produced about 24 tokens/second. llama3.2-8t was created inside the container with:

	docker exec zealous_raman sh -c "printf 'FROM llama3.2\nPARAMETER num_thread 8\n' > /tmp/llama3.2-8t.Modelfile && ollama create llama3.2-8t -f /tmp/llama3.2-8t.Modelfile"

Generation runs as a background job: the page polls its status, shows a live preview, can be cancelled, and resumes tracking after a refresh. Jobs are kept in backend memory, so restarting the backend stops running jobs. Optional backend settings:

	IDEAVAULT_LLM_MAX_TOKENS          maximum length of a generated business case (default 3000)
	IDEAVAULT_LLM_TIMEOUT_SECONDS     maximum time without any data from the model, not total time (default 600)
	IDEAVAULT_LLM_MAX_CONCURRENT_JOBS jobs sent to the model at once; others wait in a queue (default 1)


Restart the backend after changing settings or updating backend code. Make sure the frontend's IDEAVAULT_API_URL points to that backend; an older backend may return "Not Found" for the business-case endpoint.

Use a model installed on your Ollama server in place of llama3.1. AI generation is enabled by default; set `$env:IDEAVAULT_LLM_ENABLED = "true"` in the backend terminal if its environment overrides that default, then restart the backend. For an authenticated OpenAI-compatible endpoint, set IDEAVAULT_LLM_API_KEY in the backend environment; do not commit keys. If the backend runs inside Docker, localhost refers to that container; configure an endpoint reachable from it, such as host.docker.internal where supported.

The embedding settings IDEAVAULT_RAG_EMBEDDING_URL and IDEAVAULT_RAG_EMBEDDING_MODEL default to http://localhost:11434/api/embed and nomic-embed-text. This application does not currently have a compliance-library index or retrieval pipeline, so generated cases do not use retrieved sources. AI output may be inaccurate or outdated; verify figures, assumptions and Mauritian regulations independently.