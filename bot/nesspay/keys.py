from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import timedelta

from . import database as db

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
KEY_GROUPS = 4
KEY_GROUP_SIZE = 4

INVALID = "invalida"
EXPIRED = "expirada"
REVOKED = "revogada"
USER_MISMATCH = "outro_usuario"


@dataclass
class LicenseCheck:
    valid: bool
    reason: str | None = None
    key: str | None = None
    user_id: int | None = None
    expires_at: str | None = None
    days: int | None = None

    @property
    def message(self) -> str:
        if self.valid:
            return "Licença ativa."
        return {
            INVALID: "Key não encontrada. Confira se digitou corretamente.",
            EXPIRED: "Sua Key expirou. O acesso ao bot foi encerrado.",
            REVOKED: "Esta Key foi revogada pela equipe.",
            USER_MISMATCH: "Esta Key pertence a outro usuário do Discord.",
        }.get(self.reason or "", "Licença inválida.")


def _block() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(KEY_GROUP_SIZE))


def generate_key() -> str:
    return "-".join(_block() for _ in range(KEY_GROUPS))


def normalize(key: str) -> str:
    raw = "".join(ch for ch in (key or "").upper() if ch.isalnum())
    if len(raw) != KEY_GROUPS * KEY_GROUP_SIZE:
        return (key or "").strip().upper()
    return "-".join(raw[i : i + KEY_GROUP_SIZE] for i in range(0, len(raw), KEY_GROUP_SIZE))


async def create(user_id: int, days: int, created_by: int, note: str = "", guild_id: int | None = None) -> dict:
    if days <= 0:
        raise ValueError("A quantidade de dias precisa ser maior que zero.")
    key = generate_key()
    while await db.fetch_one("SELECT key FROM licenses WHERE key = ?", (key,)):
        key = generate_key()
    row = {
        "key": key,
        "user_id": user_id,
        "guild_id": guild_id,
        "days": days,
        "note": note,
        "created_by": created_by,
        "created_at": db.iso(),
        "expires_at": db.deadline(days),
        "revoked": 0,
    }
    await db.execute(
        """INSERT INTO licenses (key, user_id, guild_id, days, note, created_by, created_at, expires_at, revoked)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)""",
        (key, user_id, guild_id, days, note, created_by, row["created_at"], row["expires_at"]),
    )
    await db.audit(guild_id, created_by, "license.create", key, f"user={user_id} dias={days}")
    return row


async def get(key: str) -> dict | None:
    return await db.fetch_one("SELECT * FROM licenses WHERE key = ?", (normalize(key),))


async def check(key: str, user_id: int | None = None) -> LicenseCheck:
    row = await get(key)
    if not row:
        return LicenseCheck(valid=False, reason=INVALID)
    if row["revoked"]:
        return LicenseCheck(valid=False, reason=REVOKED, key=row["key"], user_id=row["user_id"])
    if user_id is not None and int(row["user_id"]) != int(user_id):
        return LicenseCheck(valid=False, reason=USER_MISMATCH, key=row["key"], user_id=row["user_id"])
    expires = db.parse_iso(row["expires_at"])
    if expires is None or expires <= db.utcnow():
        return LicenseCheck(valid=False, reason=EXPIRED, key=row["key"], user_id=row["user_id"])
    return LicenseCheck(
        valid=True,
        key=row["key"],
        user_id=int(row["user_id"]),
        expires_at=row["expires_at"],
        days=row["days"],
    )


async def active_for(user_id: int) -> dict | None:
    return await db.fetch_one(
        """SELECT * FROM licenses
           WHERE user_id = ? AND revoked = 0 AND expires_at > ?
           ORDER BY expires_at DESC LIMIT 1""",
        (user_id, db.iso()),
    )


async def has_access(user_id: int) -> bool:
    return await active_for(user_id) is not None


async def list_all(include_expired: bool = True) -> list[dict]:
    if include_expired:
        return await db.fetch_all("SELECT * FROM licenses ORDER BY created_at DESC")
    return await db.fetch_all(
        "SELECT * FROM licenses WHERE revoked = 0 AND expires_at > ? ORDER BY expires_at ASC",
        (db.iso(),),
    )


async def list_for_user(user_id: int) -> list[dict]:
    return await db.fetch_all(
        "SELECT * FROM licenses WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
    )


async def revoke(key: str, actor_id: int | None = None) -> dict | None:
    row = await get(key)
    if not row:
        return None
    await db.execute("UPDATE licenses SET revoked = 1 WHERE key = ?", (row["key"],))
    await db.audit(row["guild_id"], actor_id, "license.revoke", row["key"], f"user={row['user_id']}")
    return row


async def extend(key: str, days: int, actor_id: int | None = None) -> dict | None:
    row = await get(key)
    if not row:
        return None
    current = db.parse_iso(row["expires_at"])
    base = current if current and current > db.utcnow() else db.utcnow()
    new_expiry = db.iso(base + timedelta(days=days))
    await db.execute(
        "UPDATE licenses SET expires_at = ?, revoked = 0, days = days + ? WHERE key = ?",
        (new_expiry, days, row["key"]),
    )
    await db.audit(row["guild_id"], actor_id, "license.extend", row["key"], f"+{days} dias")
    row["expires_at"] = new_expiry
    return row


async def purge_expired() -> list[dict]:
    expired = await db.fetch_all("SELECT * FROM licenses WHERE expires_at <= ?", (db.iso(),))
    for row in expired:
        await db.execute("DELETE FROM licenses WHERE key = ?", (row["key"],))
        await db.audit(row["guild_id"], None, "license.expire", row["key"], f"user={row['user_id']}")
    return expired


async def stats() -> dict:
    total = await db.scalar("SELECT COUNT(*) FROM licenses") or 0
    active = await db.scalar(
        "SELECT COUNT(*) FROM licenses WHERE revoked = 0 AND expires_at > ?", (db.iso(),)
    ) or 0
    expiring = await db.fetch_all(
        """SELECT * FROM licenses WHERE revoked = 0 AND expires_at > ? AND expires_at <= ?
           ORDER BY expires_at ASC""",
        (db.iso(), db.deadline(3)),
    )
    return {"total": total, "active": active, "expiring_soon": len(expiring), "expiring": expiring}
