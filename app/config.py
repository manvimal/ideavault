from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Idea Vault"
    data_dir: Path = Path(__file__).resolve().parent / "data" / "ideas"
    uploads_dir: Path = Path(__file__).resolve().parent / "data" / "uploads"
    cors_origins: list[str] = ["http://localhost:3000"]
    llm_enabled: bool = True
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    # Maximum time without receiving any data from the model, not total generation time.
    llm_timeout_seconds: float = Field(default=600.0, gt=0)
    llm_max_tokens: int = Field(default=3000, ge=1)
    llm_max_concurrent_jobs: int = Field(default=1, ge=1)
    rag_embedding_url: str = "http://localhost:11434/api/embed"
    rag_embedding_model: str = "nomic-embed-text"
    rag_timeout_seconds: float = 120.0

    class Config:
        env_prefix = "IDEAVAULT_"


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.uploads_dir.mkdir(parents=True, exist_ok=True)
