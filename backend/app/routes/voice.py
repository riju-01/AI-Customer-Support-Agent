"""Voice routes — ElevenLabs TTS proxy."""

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/api/voice", tags=["voice"])

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


class TTSRequest(BaseModel):
    text: str


@router.get("/status")
async def voice_status():
    """Check if voice (ElevenLabs) is configured."""
    return {"enabled": bool(settings.elevenlabs_api_key)}


@router.post("/speak")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech via ElevenLabs and return audio/mpeg."""
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    # Cap at ~5000 chars to stay within free tier limits
    if len(text) > 5000:
        text = text[:5000]

    url = f"{ELEVENLABS_TTS_URL}/{settings.elevenlabs_voice_id}"

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

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="ElevenLabs API error")

    return Response(content=resp.content, media_type="audio/mpeg")
