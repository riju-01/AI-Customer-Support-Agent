"""Voice routes — ElevenLabs TTS proxy.

Gracefully degrades to text-only when the ElevenLabs quota is exhausted
or billing is not set up (402/422 from the upstream API).
"""

import logging
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"

_quota_exhausted = False


class TTSRequest(BaseModel):
    text: str


@router.get("/status")
async def voice_status():
    """Check if voice (ElevenLabs) is configured and has quota."""
    enabled = bool(settings.elevenlabs_api_key) and not _quota_exhausted
    return {"enabled": enabled, "quota_exhausted": _quota_exhausted}


@router.post("/speak")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech via ElevenLabs and return audio/mpeg.

    Returns a JSON fallback instead of an error when ElevenLabs billing
    or quota blocks the request, so the frontend can keep working in
    text-only mode.
    """
    global _quota_exhausted

    if not settings.elevenlabs_api_key:
        return JSONResponse(
            status_code=200,
            content={"fallback": True, "reason": "API key not configured"},
        )

    if _quota_exhausted:
        return JSONResponse(
            status_code=200,
            content={"fallback": True, "reason": "ElevenLabs quota exhausted — using text-only mode"},
        )

    text = req.text.strip() if isinstance(req.text, str) else str(req.text).strip()
    if not text:
        return JSONResponse(
            status_code=200,
            content={"fallback": True, "reason": "Empty text"},
        )

    if len(text) > 5000:
        text = text[:5000]

    url = f"{ELEVENLABS_TTS_URL}/{settings.elevenlabs_voice_id}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                headers={
                    "xi-api-key": settings.elevenlabs_api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.0,
                        "use_speaker_boost": True,
                    },
                },
            )
    except httpx.RequestError as exc:
        logger.warning("ElevenLabs request failed: %s", exc)
        return JSONResponse(
            status_code=200,
            content={"fallback": True, "reason": "TTS service unreachable"},
        )

    if resp.status_code in (402, 403, 422, 429):
        _quota_exhausted = True
        logger.warning(
            "ElevenLabs returned %s — disabling TTS for this session (quota/billing issue)",
            resp.status_code,
        )
        return JSONResponse(
            status_code=200,
            content={
                "fallback": True,
                "reason": "ElevenLabs quota exhausted or billing not set — switching to text-only mode",
            },
        )

    if resp.status_code != 200:
        logger.warning("ElevenLabs returned unexpected status %s", resp.status_code)
        return JSONResponse(
            status_code=200,
            content={"fallback": True, "reason": f"TTS error (status {resp.status_code})"},
        )

    return Response(content=resp.content, media_type="audio/mpeg")
