from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _int(name: str, default: int = 0) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on", "sim"}


def _id_set(name: str) -> set[int]:
    raw = os.getenv(name, "")
    ids: set[int] = set()
    for chunk in raw.replace(";", ",").split(","):
        chunk = chunk.strip()
        if chunk.isdigit():
            ids.add(int(chunk))
    return ids


@dataclass(frozen=True)
class Settings:
    token: str = os.getenv("DISCORD_TOKEN", "").strip()
    guild_id: int = _int("DISCORD_GUILD_ID")
    owner_ids: set[int] = field(default_factory=lambda: _id_set("OWNER_IDS"))

    database_path: Path = BASE_DIR / os.getenv("DATABASE_PATH", "data/nesspay.db")

    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = _int("API_PORT", 8000)
    api_key: str = os.getenv("API_KEY", "").strip()
    dashboard_origin: str = os.getenv("DASHBOARD_ORIGIN", "*").strip() or "*"
    public_webhook_url: str = os.getenv("PUBLIC_WEBHOOK_URL", "").strip()

    mp_access_token: str = os.getenv("MP_ACCESS_TOKEN", "").strip()
    mp_webhook_secret: str = os.getenv("MP_WEBHOOK_SECRET", "").strip()

    pix_manual_approval: bool = _bool("PIX_MANUAL_APPROVAL", True)
    order_expiration_minutes: int = _int("ORDER_EXPIRATION_MINUTES", 30)
    license_check_seconds: int = _int("LICENSE_CHECK_SECONDS", 60)
    log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()

    @property
    def gateway_enabled(self) -> bool:
        return bool(self.mp_access_token)

    @property
    def api_auth_enabled(self) -> bool:
        return bool(self.api_key)


settings = Settings()
settings.database_path.parent.mkdir(parents=True, exist_ok=True)
