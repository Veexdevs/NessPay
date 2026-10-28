from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from .. import embeds, services
from ..checks import staff_only
from ..models import STATUS_LABEL
from ..views import TicketControlView, TicketPanelView


class Tickets(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="ticket", description="Abre um atendimento com a equipe")
    async def ticket(self, interaction: discord.Interaction) -> None:
        from ..views import TicketModal

        await interaction.response.send_modal(TicketModal())

    @app_commands.command(name="tickets", description="Lista os atendimentos do servidor")
    @staff_only()
    async def listar(self, interaction: discord.Interaction) -> None:
        rows = await services.list_tickets(interaction.guild_id)
        if not rows:
            await interaction.response.send_message(
                embed=embeds.error("Nenhum atendimento registrado."), ephemeral=True
            )
            return
        embed = discord.Embed(title="Atendimentos", color=discord.Color.from_str("#FFFFFF"))
        for row in rows[:15]:
            channel = f"<#{row['channel_id']}>" if row["channel_id"] else "sem canal"
            embed.add_field(
                name=f"{row['id']} - {row['subject'][:60]}",
                value=f"<@{row['user_id']}> - {STATUS_LABEL.get(row['status'], row['status'])} - {channel}",
                inline=False,
            )
        embed.set_footer(text="NessPay")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="fechar", description="Encerra o atendimento deste canal")
    @staff_only()
    async def fechar(self, interaction: discord.Interaction) -> None:
        ticket = await services.find_ticket_by_channel(interaction.channel_id)
        if not ticket:
            await interaction.response.send_message(
                embed=embeds.error("Este canal não é um atendimento."), ephemeral=True
            )
            return
        await services.close_ticket(ticket["id"])
        await interaction.response.send_message(embed=embeds.success("Atendimento encerrado."))
        bot = getattr(interaction.client, "delivery", None)
        if bot is not None:
            await bot.log_guild(
                ticket["guild_id"],
                discord.Embed(
                    title="Atendimento encerrado",
                    description=f"{ticket['id']} por {interaction.user}",
                    color=discord.Color.from_str("#FFFFFF"),
                ),
            )

    @staff_only()
    @app_commands.command(name="controle", description="Publica os botões de controle neste atendimento")
    async def controle(self, interaction: discord.Interaction) -> None:
        await interaction.channel.send(view=TicketControlView())
        await interaction.response.send_message(embed=embeds.success("Controles publicados."), ephemeral=True)

    @app_commands.command(name="painel_tickets", description="Publica o painel de abertura de atendimento")
    @staff_only()
    async def painel(self, interaction: discord.Interaction) -> None:
        embed = discord.Embed(
            title="Atendimento",
            description="Abra um atendimento para falar com a equipe.",
            color=discord.Color.from_str("#FFFFFF"),
        )
        embed.set_footer(text="NessPay")
        await interaction.channel.send(embed=embed, view=TicketPanelView())
        await interaction.response.send_message(embed=embeds.success("Painel publicado."), ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Tickets(bot))
