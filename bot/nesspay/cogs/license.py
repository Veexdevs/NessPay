from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from .. import database as db
from .. import embeds, keys
from ..checks import staff_only
from ..config import settings


class License(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    key = app_commands.Group(name="key", description="Gerencia as Keys de acesso ao bot")

    def _allowed(self, user_id: int) -> bool:
        return settings.owner_ids == set() or user_id in settings.owner_ids

    @key.command(name="gerar", description="Gera uma Key para um usuário por um período em dias")
    @app_commands.describe(usuario="Usuário do Discord que vai receber a Key", dias="Quantidade de dias de acesso", nota="Observação interna")
    @staff_only()
    async def gerar(
        self, interaction: discord.Interaction, usuario: discord.User, dias: app_commands.Range[int, 1, 3650], nota: str = ""
    ) -> None:
        if settings.owner_ids and not self._allowed(interaction.user.id):
            await interaction.response.send_message(
                embed=embeds.error("Apenas os owners configurados podem gerar Keys."), ephemeral=True
            )
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        row = await keys.create(usuario.id, dias, interaction.user.id, nota, interaction.guild_id)
        embed = embeds.license_card(row, owner=True)
        embed.add_field(name="Acesso", value=f"A Key funciona apenas para <@{usuario.id}>.", inline=False)
        await interaction.followup.send(embed=embed, ephemeral=True)

        notice = embeds.license_card(row)
        notice.title = "Sua nova Key do NessPay"
        notice.description = "Guarde esta Key. Ela libera o acesso ao bot até a data indicada."
        dm_embed = notice
        try:
            await usuario.send(embed=dm_embed)
            sent = True
        except discord.HTTPException:
            sent = False

        bot = getattr(interaction.client, "delivery", None)
        if bot is not None:
            log_embed = discord.Embed(
                title="Key gerada", color=discord.Color.from_str("#FFFFFF")
            )
            log_embed.add_field(name="Usuário", value=f"{usuario} ({usuario.id})", inline=True)
            log_embed.add_field(name="Dias", value=str(dias), inline=True)
            log_embed.add_field(name="Key", value=row["key"], inline=True)
            log_embed.add_field(name="Por", value=str(interaction.user), inline=True)
            log_embed.add_field(name="DM", value="enviada" if sent else "falhou", inline=True)
            await bot.log_guild(interaction.guild_id, log_embed)

    @key.command(name="listar", description="Lista as Keys geradas")
    @app_commands.describe(ativas="Mostrar apenas Keys ativas")
    @staff_only()
    async def listar(self, interaction: discord.Interaction, ativas: bool = False) -> None:
        rows = await keys.list_all(include_expired=not ativas)
        if not rows:
            await interaction.response.send_message(
                embed=embeds.error("Nenhuma Key cadastrada."), ephemeral=True
            )
            return
        embed = discord.Embed(
            title="Keys ativas" if ativas else "Todas as Keys",
            color=discord.Color.from_str("#FFFFFF"),
        )
        for row in rows[:20]:
            expires = db.parse_iso(row["expires_at"])
            suffix = f" - expira <t:{int(expires.timestamp())}:R>" if expires else ""
            embed.add_field(
                name=row["key"],
                value=f"<@{row['user_id']}> - {row['days']} dias{suffix}",
                inline=False,
            )
        embed.set_footer(text=f"NessPay - {len(rows)} registros")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @key.command(name="info", description="Mostra os dados de uma Key")
    @staff_only()
    async def info(self, interaction: discord.Interaction, codigo: str) -> None:
        row = await keys.get(codigo)
        if not row:
            await interaction.response.send_message(
                embed=embeds.error("Key não encontrada."), ephemeral=True
            )
            return
        await interaction.response.send_message(embed=embeds.license_card(row, owner=True), ephemeral=True)

    @key.command(name="revogar", description="Revoga uma Key imediatamente")
    @staff_only()
    async def revogar(self, interaction: discord.Interaction, codigo: str) -> None:
        row = await keys.revoke(codigo, interaction.user.id)
        if not row:
            await interaction.response.send_message(
                embed=embeds.error("Key não encontrada."), ephemeral=True
            )
            return
        await interaction.response.send_message(
            embed=embeds.success(f"Key {row['key']} revogada. O usuário perdeu o acesso."), ephemeral=True
        )
        bot = getattr(interaction.client, "delivery", None)
        if bot is not None:
            await bot.user_dm(
                row["user_id"],
                embeds.error("Sua Key foi revogada pela equipe. O acesso ao NessPay foi encerrado."),
            )

    @key.command(name="estender", description="Adiciona dias a uma Key existente")
    @staff_only()
    async def estender(self, interaction: discord.Interaction, codigo: str, dias: app_commands.Range[int, 1, 3650]) -> None:
        row = await keys.extend(codigo, dias, interaction.user.id)
        if not row:
            await interaction.response.send_message(
                embed=embeds.error("Key não encontrada."), ephemeral=True
            )
            return
        await interaction.response.send_message(embed=embeds.license_card(row, owner=True), ephemeral=True)

    @app_commands.command(name="acesso", description="Verifica se um usuário tem acesso ao bot")
    @staff_only()
    async def acesso(self, interaction: discord.Interaction, usuario: discord.User) -> None:
        row = await keys.active_for(usuario.id)
        if row:
            await interaction.response.send_message(embed=embeds.license_card(row, owner=True), ephemeral=True)
            return
        await interaction.response.send_message(
            embed=embeds.no_license(f"{usuario} não possui licença ativa."), ephemeral=True
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(License(bot))
