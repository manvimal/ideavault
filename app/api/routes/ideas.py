from fastapi import APIRouter, HTTPException, Response

from app.models.idea import BusinessCaseJob, Idea, IdeaCreate, IdeaSummary, IdeaUpdate, StrategyToolUpdate
from app.services import export_service
from app.services.business_case_jobs import business_case_jobs
from app.services.business_case_service import BusinessCaseError
from app.services.idea_repository import IdeaNotFoundError
from app.services.idea_service import idea_service
from app.services.mindmap_service import build_mindmap

router = APIRouter()


@router.get("", response_model=list[IdeaSummary])
def list_ideas() -> list[IdeaSummary]:
    return idea_service.list_ideas()


@router.post("", response_model=Idea, status_code=201)
def create_idea(payload: IdeaCreate) -> Idea:
    return idea_service.create_idea(payload)


@router.get("/{idea_id}", response_model=Idea)
def get_idea(idea_id: str) -> Idea:
    try:
        return idea_service.get_idea(idea_id)
    except IdeaNotFoundError:
        raise HTTPException(status_code=404, detail="Idea not found")


@router.put("/{idea_id}", response_model=Idea)
def update_idea(idea_id: str, payload: IdeaUpdate) -> Idea:
    try:
        return idea_service.update_idea(idea_id, payload)
    except IdeaNotFoundError:
        raise HTTPException(status_code=404, detail="Idea not found")


@router.delete("/{idea_id}", status_code=204)
def delete_idea(idea_id: str) -> None:
    try:
        idea_service.delete_idea(idea_id)
    except IdeaNotFoundError:
        raise HTTPException(status_code=404, detail="Idea not found")


@router.post("/{idea_id}/business-case", response_model=BusinessCaseJob, status_code=202)
def start_business_case(idea_id: str) -> BusinessCaseJob:
    try:
        return business_case_jobs.start(idea_id)
    except IdeaNotFoundError:
        raise HTTPException(status_code=404, detail="Idea not found")
    except BusinessCaseError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/{idea_id}/business-case", response_model=BusinessCaseJob)
def get_business_case_job(idea_id: str) -> BusinessCaseJob:
    job = business_case_jobs.get(idea_id)
    if job is None:
        raise HTTPException(status_code=404, detail="No business case generation has been started for this idea")
    return job


@router.delete("/{idea_id}/business-case", response_model=BusinessCaseJob)
def cancel_business_case(idea_id: str) -> BusinessCaseJob:
    job = business_case_jobs.cancel(idea_id)
    if job is None:
        raise HTTPException(status_code=404, detail="No business case generation has been started for this idea")
    return job


@router.put("/{idea_id}/strategy/{tool_key}", response_model=Idea)
def update_strategy_tool(idea_id: str, tool_key: str, payload: StrategyToolUpdate) -> Idea:
    try:
        return idea_service.update_strategy_tool(idea_id, tool_key, payload.data)
    except IdeaNotFoundError:
        raise HTTPException(status_code=404, detail="Idea not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{idea_id}/mindmap")
def get_mindmap(idea_id: str) -> dict:
    try:
        idea = idea_service.get_idea(idea_id)
    except IdeaNotFoundError:
        raise HTTPException(status_code=404, detail="Idea not found")
    return build_mindmap(idea.title, idea.content)


@router.get("/{idea_id}/export/markdown")
def export_markdown(idea_id: str) -> Response:
    idea = _get_or_404(idea_id)
    content = export_service.to_markdown(idea)
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{idea.title}.md"'},
    )


@router.get("/{idea_id}/export/word")
def export_word(idea_id: str) -> Response:
    idea = _get_or_404(idea_id)
    content = export_service.to_docx(idea)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{idea.title}.docx"'},
    )


@router.get("/{idea_id}/export/pdf")
def export_pdf(idea_id: str) -> Response:
    idea = _get_or_404(idea_id)
    content = export_service.to_pdf(idea)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{idea.title}.pdf"'},
    )


def _get_or_404(idea_id: str) -> Idea:
    try:
        return idea_service.get_idea(idea_id)
    except IdeaNotFoundError:
        raise HTTPException(status_code=404, detail="Idea not found")
