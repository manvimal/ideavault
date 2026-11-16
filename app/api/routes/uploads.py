from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import settings

router = APIRouter()

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


@router.post("")
async def upload_image(file: UploadFile) -> dict[str, str]:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, GIF, or WEBP images are allowed")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 5 MB limit")

    # Filename is server-generated to avoid path traversal / unsafe user input.
    filename = f"{uuid4()}{ALLOWED_CONTENT_TYPES[file.content_type]}"
    (settings.uploads_dir / filename).write_bytes(contents)

    return {"url": f"/api/uploads/{filename}"}


@router.get("/{filename}")
def get_image(filename: str) -> FileResponse:
    path = (settings.uploads_dir / filename).resolve()
    if path.parent != settings.uploads_dir.resolve() or not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)
