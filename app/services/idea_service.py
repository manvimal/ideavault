from datetime import datetime, timezone
from typing import Any, Dict

from app.models.idea import Idea, IdeaCreate, IdeaSummary, IdeaUpdate, STRATEGY_TOOL_KEYS
from app.services.idea_repository import IdeaRepository, idea_repository


class IdeaService:
    def __init__(self, repository: IdeaRepository = idea_repository):
        self.repository = repository

    def list_ideas(self) -> list[IdeaSummary]:
        summaries = []
        for idea in self.repository.list_all():
            snippet = idea.content.strip().replace("\n", " ")[:160]
            summaries.append(
                IdeaSummary(
                    id=idea.id,
                    title=idea.title,
                    snippet=snippet,
                    created_at=idea.created_at,
                    updated_at=idea.updated_at,
                )
            )
        return summaries

    def get_idea(self, idea_id: str) -> Idea:
        return self.repository.get(idea_id)

    def create_idea(self, payload: IdeaCreate) -> Idea:
        idea = Idea(title=payload.title, content=payload.content)
        return self.repository.save(idea)

    def update_idea(self, idea_id: str, payload: IdeaUpdate) -> Idea:
        idea = self.repository.get(idea_id)
        idea.title = payload.title
        idea.content = payload.content
        idea.updated_at = datetime.now(timezone.utc)
        return self.repository.save(idea)

    def save_business_case(self, idea_id: str, title: str, content: str, description: str) -> Idea:
        idea = self.repository.get(idea_id)
        if idea.title != title or idea.content != content:
            raise ValueError("The idea changed while the business case was being generated. Please try again.")
        idea.ai_generated_description = description
        idea.updated_at = datetime.now(timezone.utc)
        return self.repository.save(idea)

    def delete_idea(self, idea_id: str) -> None:
        self.repository.delete(idea_id)

    def update_strategy_tool(self, idea_id: str, tool_key: str, data: Dict[str, Any]) -> Idea:
        if tool_key not in STRATEGY_TOOL_KEYS:
            raise ValueError(f"Unknown strategy tool: {tool_key}")
        idea = self.repository.get(idea_id)
        idea.strategic_tools[tool_key] = data
        idea.updated_at = datetime.now(timezone.utc)
        return self.repository.save(idea)


idea_service = IdeaService()
