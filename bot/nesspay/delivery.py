from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import discord

from . import database as db
from . import services
from .models import DeliveryMode

if TYPE_CHECKING:
    from .bot import NessPayBot

log = logging.getLogger("nesspay.delivery")

TICKET_CATEGORY_NAME = "NessPay - Entregas"


class DeliveryService:
    def __init__(self, bot: "NessPayBot") -> None:
        self.bot = bot

    async def log_guild(self, guild_id: int, embed: discord.Embed) -> None:
        config = await services.get_settings(guild_id)
        channel_id = config.get("log_channel_id")
        if not channel_id:
            return
        channel = self.bot.get_channel(int(channel_id))
        if isinstance(channel, discord.TextChannel):
            try:
                await channel.send(embed=embed)
            except discord.HTTPException:
                log.warning("não foi possível enviar log no canal %s", channel_id)

    async def user_dm(self, user_id: int, embed: discord.Embed, view: discord.ui.View | None = None) -> bool:
        user = self.bot.get_user(user_id)
        if user is None:
            try:
                user = await self.bot.fetch_user(user_id)
            except discord.HTTPException:
                return False
        try:
            await user.send(embed=embed, view=view)
            return True
        except discord.HTTPException:
            return False

    async def handle_paid(self, order: dict) -> None:
        delivery_mode = order["delivery_mode"]
        if delivery_mode == DeliveryMode.AUTO.value:
            await self.deliver_auto(order)
        else:
            await self.open_manual_delivery(order)

    async def deliver_auto(self, order: dict) -> None:
        content = await services.take_stock(order["product_id"], order["id"])
        if not content:
            await self.open_manual_delivery(order, reason="sem estoque")
            return
        embed = discord.Embed(
            title="Entrega concluída",
            description=f"Pedido {order['id']} confirmado. Abaixo está o conteúdo do seu produto.",
            color=discord.Color.from_str("#FFFFFF"),
        )
        embed.add_field(name="Produto", value=order["product_name"], inline=False)
        embed.add_field(name="Valor", value=services.brl(order["amount_cents"]), inline=True)
        embed.add_field(name="Entrega", value="Automática", inline=True)
        embed.add_field(name="Conteúdo", value=f"```{content[:1800]}```", inline=False)
        embed.set_footer(text="NessPay - guarde este conteúdo")
        delivered = await self.user_dm(order["user_id"], embed)
        await services.mark_delivered(order["id"], content)
        log_embed = discord.Embed(
            title="Venda entregue automaticamente",
            color=discord.Color.from_str("#FFFFFF"),
        )
        log_embed.add_field(name="Pedido", value=order["id"], inline=True)
        log_embed.add_field(name="Produto", value=order["product_name"], inline=True)
        log_embed.add_field(name="Valor", value=services.brl(order["amount_cents"]), inline=True)
        log_embed.add_field(name="Cliente", value=f"{order['user_name']} ({order['user_id']})", inline=False)
        log_embed.add_field(name="DM", value="enviada" if delivered else "falhou - entregar manualmente", inline=True)
        await self.log_guild(order["guild_id"], log_embed)

    async def open_manual_delivery(self, order: dict, reason: str | None = None) -> None:
        guild = self.bot.get_guild(int(order["guild_id"]))
        config = await services.get_settings(order["guild_id"])
        if guild is None:
            return
        channel = await self.create_delivery_channel(guild, order, config, reason)
        ticket = await services.create_ticket(
            order["guild_id"],
            order["user_id"],
            order["user_name"],
            f"Entrega manual - {order['product_name']}",
            order["product_name"],
            order["id"],
            "alta",
        )
        if channel:
            await services.attach_ticket_channel(ticket["id"], channel.id)
            await services.attach_ticket(order["id"], channel.id)
        log_embed = discord.Embed(
            title="Venda aguardando entrega manual",
            description=reason or "produto com entrega manual",
            color=discord.Color.from_str("#FFFFFF"),
        )
        log_embed.add_field(name="Pedido", value=order["id"], inline=True)
        log_embed.add_field(name="Cliente", value=f"{order['user_name']} ({order['user_id']})", inline=False)
        log_embed.add_field(name="Produto", value=order["product_name"], inline=True)
        log_embed.add_field(name="Valor", value=services.brl(order["amount_cents"]), inline=True)
        if channel:
            log_embed.add_field(name="Canal", value=channel.mention, inline=True)
        await self.log_guild(order["guild_id"], log_embed)

    async def create_delivery_channel(
        self,
        guild: discord.Guild,
        order: dict,
        config: dict,
        reason: str | None,
        kind: str = "delivery",
    ) -> discord.TextChannel | None:
        category = None
        category_id = config.get("ticket_category_id")
        if category_id:
            found = guild.get_channel(int(category_id))
            if isinstance(found, discord.CategoryChannel):
                category = found
        if category is None:
            category = discord.utils.get(guild.categories, name=TICKET_CATEGORY_NAME)
            if category is None:
                try:
                    category = await guild.create_category(TICKET_CATEGORY_NAME)
                except discord.HTTPException:
                    category = None

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, manage_channels=True),
        }
        member = guild.get_member(int(order["user_id"]))
        if member:
            overwrites[member] = discord.PermissionOverwrite(
                view_channel=True, send_messages=True, attach_files=True, read_message_history=True
            )
        staff_role_id = config.get("staff_role_id")
        if staff_role_id:
            role = guild.get_role(int(staff_role_id))
            if role:
                overwrites[role] = discord.PermissionOverwrite(
                    view_channel=True, send_messages=True, manage_channels=True
                )

        prefix = "entrega" if kind == "delivery" else "ticket"
        name = f"{prefix}-{order['id'].lower()}"
        try:
            channel = await guild.create_text_channel(name=name, category=category, overwrites=overwrites)
        except discord.HTTPException:
            log.warning("não foi possível criar canal de entrega para %s", order["id"])
            return None

        from .views import ManualDeliveryView, TicketControlView

        if kind == "delivery":
            embed = discord.Embed(
                title="Entrega manual",
                description="Use o botão abaixo para informar o conteúdo entregue ao cliente.",
                color=discord.Color.from_str("#FFFFFF"),
            )
            embed.add_field(name="Pedido", value=order["id"], inline=True)
            embed.add_field(name="Produto", value=order["product_name"], inline=True)
            embed.add_field(name="Valor", value=services.brl(order["amount_cents"]), inline=True)
            embed.add_field(name="Cliente", value=f"<@{order['user_id']}>", inline=False)
            if reason:
                embed.add_field(name="Motivo", value=reason, inline=False)
            view = ManualDeliveryView(order["id"])
        else:
            embed = discord.Embed(
                title="Atendimento aberto",
                description="Descreva o que você precisa. A equipe responde neste canal.",
                color=discord.Color.from_str("#FFFFFF"),
            )
            embed.add_field(name="Ticket", value=order["id"], inline=True)
            embed.add_field(name="Assunto", value=order["product_name"], inline=True)
            embed.add_field(name="Cliente", value=f"<@{order['user_id']}>", inline=False)
            view = TicketControlView()

        await channel.send(content=f"<@{order['user_id']}>", embed=embed, view=view)
        return channel
