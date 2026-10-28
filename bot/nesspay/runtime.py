from __future__ import annotations

from typing import Any

from .config import settings

_bot: Any = None


def bind(bot: Any) -> None:
    global _bot
    _bot = bot


def bot() -> Any:
    return _bot


def is_owner(user_id: int) -> bool:
    return user_id in settings.owner_ids


def is_manager(member: Any) -> bool:
    if member is None:
        return False
    if is_owner(getattr(member, "id", 0)):
        return True
    permissions = getattr(member, "guild_permissions", None)
    return bool(permissions and (permissions.administrator or permissions.manage_guild))


async def is_staff(member: Any, guild_id: int) -> bool:
    if member is None:
        return False
    if is_manager(member):
        return True
    from . import services

    config = await services.get_settings(guild_id)
    role_id = config.get("staff_role_id")
    if not role_id:
        return False
    return any(role.id == int(role_id) for role in getattr(member, "roles", []))
