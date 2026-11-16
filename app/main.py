from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ideas, uploads
from app.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ideas.router, prefix="/api/ideas", tags=["ideas"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
