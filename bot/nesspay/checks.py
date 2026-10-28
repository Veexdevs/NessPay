from __future__ import annotations

import discord
from discord import app_commands

from . import keys, runtime


class MissingLicense(app_commands.CheckFailure):
    def __init__(self, reason: str, expires_at: str | None = None) -> None:
        super().__init__(reason)
        self.reason = reason
        self.expires_at = expires_at


class MissingStaff(app_commands.CheckFailure):
    pass


def has_license():
    async def predicate(interaction: discord.Interaction) -> bool:
        if interaction.guild and await runtime.is_staff(interaction.user, interaction.guild.id):
            return True
        active = await keys.active_for(interaction.user.id)
        if active:
            return True
        latest = await keys.list_for_user(interaction.user.id)
        if latest:
            row = latest[0]
            if row["revoked"]:
                raise MissingLicense("Sua Key foi revogada pela equipe.", None)
            raise MissingLicense("Sua Key expirou.", row["expires_at"])
        raise MissingLicense("Nenhuma Key cadastrada para o seu usuário.", None)

    return app_commands.check(predicate)


def staff_only():
    async def predicate(interaction: discord.Interaction) -> bool:
        if interaction.guild and await runtime.is_staff(interaction.user, interaction.guild.id):
            return True
        raise MissingStaff("Apenas a equipe do servidor pode usar este comando.")

    return app_commands.check(predicate)
