import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from app.config import settings
from app.models.idea import Idea


class IdeaNotFoundError(Exception):
    pass


class IdeaRepository:
    """Simple JSON-file-per-idea persistence layer."""

    def __init__(self, data_dir: Path = settings.data_dir):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, idea_id: str) -> Path:
        return self.data_dir / f"{idea_id}.json"

    def list_all(self) -> List[Idea]:
        ideas = []
        for file in self.data_dir.glob("*.json"):
            ideas.append(Idea.model_validate_json(file.read_text(encoding="utf-8")))
        ideas.sort(key=lambda i: i.updated_at, reverse=True)
        return ideas

    def get(self, idea_id: str) -> Idea:
        path = self._path(idea_id)
        if not path.exists():
            raise IdeaNotFoundError(idea_id)
        return Idea.model_validate_json(path.read_text(encoding="utf-8"))

    def save(self, idea: Idea) -> Idea:
        path = self._path(idea.id)
        path.write_text(idea.model_dump_json(indent=2), encoding="utf-8")
        return idea

    def delete(self, idea_id: str) -> None:
        path = self._path(idea_id)
        if not path.exists():
            raise IdeaNotFoundError(idea_id)
        path.unlink()


idea_repository = IdeaRepository()
