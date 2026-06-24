"""File upload routes — images and videos for chat evidence."""

import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/webm", "video/quicktime",
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("")
async def upload_file(file: UploadFile = File(...)):
    """Upload an image or video. Returns the file URL."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' not allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    ext = Path(file.filename or "file").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    filepath.write_bytes(contents)

    return {"filename": filename, "url": f"/api/uploads/{filename}", "type": file.content_type}


@router.get("/{filename}")
async def get_file(filename: str):
    """Serve an uploaded file."""
    filepath = UPLOAD_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)
