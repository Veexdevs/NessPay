from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from .. import database as db
from .. import embeds, keys, services
from ..checks import has_license
from ..config import settings
from ..models import STATUS_LABEL
from ..views import StoreView


class Store(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="loja", description="Abre o catálogo de produtos")
    @has_license()
    async def loja(self, interaction: discord.Interaction) -> None:
        config = await services.get_settings(interaction.guild_id)
        if config["maintenance"] and not interaction.user.guild_permissions.administrator:
            await interaction.response.send_message(
                embed=embeds.error("A loja está em manutenção."), ephemeral=True
            )
            return
        products = await services.list_products(interaction.guild_id, only_active=True)
        if not products:
            await interaction.response.send_message(
                embed=embeds.error("Nenhum produto cadastrado ainda."), ephemeral=True
            )
            return
        embed = embeds.help_embed(settings.gateway_enabled)
        embed.title = "Catálogo NessPay"
        embed.description = "Escolha um produto abaixo para ver detalhes, estoque e forma de entrega."
        await interaction.response.send_message(embed=embed, view=StoreView(products), ephemeral=True)

    @app_commands.command(name="pedidos", description="Mostra os seus pedidos")
    @app_commands.describe(limite="Quantos pedidos mostrar")
    async def pedidos(self, interaction: discord.Interaction, limite: int = 10) -> None:
        rows = await db.fetch_all(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (interaction.user.id, max(1, min(limite, 25))),
        )
        if not rows:
            await interaction.response.send_message(
                embed=embeds.error("Você ainda não tem pedidos registrados."), ephemeral=True
            )
            return
        embed = discord.Embed(
            title="Seus pedidos", color=discord.Color.from_str("#FFFFFF")
        )
        for row in rows:
            status = STATUS_LABEL.get(row["status"], row["status"])
            embed.add_field(
                name=f"{row['id']} - {row['product_name']}",
                value=f"{services.brl(row['amount_cents'])} - {status} - {row['created_at'][:16].replace('T', ' ')}",
                inline=False,
            )
        embed.set_footer(text="NessPay")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="licenca", description="Mostra a sua Key e o tempo restante")
    async def licenca(self, interaction: discord.Interaction) -> None:
        row = await keys.active_for(interaction.user.id)
        if not row:
            history = await keys.list_for_user(interaction.user.id)
            if history:
                await interaction.response.send_message(
                    embed=embeds.license_card(history[0]), ephemeral=True
                )
                return
            await interaction.response.send_message(
                embed=embeds.no_license("Nenhuma Key cadastrada para o seu usuário."), ephemeral=True
            )
            return
        await interaction.response.send_message(embed=embeds.license_card(row), ephemeral=True)

    @app_commands.command(name="ajuda", description="Lista os comandos do NessPay")
    async def ajuda(self, interaction: discord.Interaction) -> None:
        await interaction.response.send_message(
            embed=embeds.help_embed(settings.gateway_enabled), ephemeral=True
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Store(bot))
