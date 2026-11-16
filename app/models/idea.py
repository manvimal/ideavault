from datetime import datetime, timezone
from typing import Any, Dict, List, Literal
from uuid import uuid4

from pydantic import BaseModel, Field

# Strategic frameworks selectable inside the idea viewer.
STRATEGY_TOOL_KEYS: List[str] = [
    "swot",
    "ansoff",
    "value_chain",
    "revenue_margin_matrix",
    "porter_five_forces",
    "flywheel_moat",
    "three_horizons",
    "customer_value",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IdeaCreate(BaseModel):
    title: str
    content: str = ""


class IdeaUpdate(BaseModel):
    title: str
    content: str


class StrategyToolUpdate(BaseModel):
    data: Dict[str, Any] = Field(default_factory=dict)


class Idea(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    content: str = ""
    ai_generated_description: str = ""
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    strategic_tools: Dict[str, Dict[str, Any]] = Field(
        default_factory=lambda: {key: {} for key in STRATEGY_TOOL_KEYS}
    )


class IdeaSummary(BaseModel):
    id: str
    title: str
    snippet: str
    created_at: datetime
    updated_at: datetime


class BusinessCaseJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    idea_id: str
    status: Literal["queued", "running", "completed", "failed", "cancelled"] = "queued"
    created_at: datetime = Field(default_factory=_utcnow)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    elapsed_seconds: float = 0
    generated_tokens: int = 0
    max_tokens: int
    partial_content: str = ""
    truncated: bool = False
    cancel_requested: bool = False
    error: str | None = None
