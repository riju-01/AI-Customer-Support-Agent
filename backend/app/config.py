from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    google_api_key: str = ""
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # "Rachel" — warm female voice
    database_url: str = "sqlite:///./crm.db"
    app_name: str = "AI Customer Support Agent"
    debug: bool = True
    
    base_dir: Path = Path(__file__).resolve().parent
    policy_path: Path = Path(__file__).resolve().parent / "policy" / "refund_policy.md"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
