from __future__ import annotations

import logging
import time

import discord
from discord.ext import commands, tasks

from . import database as db
from . import embeds, runtime, services
from .checks import MissingLicense, MissingStaff
from .config import settings
from .delivery import DeliveryService
from .views import BuyerOrderView, ManualDeliveryView, PaymentView, StorePanelView, TicketControlView, TicketPanelView

log = logging.getLogger("nesspay.bot")

COGS = (
    "nesspay.cogs.store",
    "nesspay.cogs.admin",
    "nesspay.cogs.license",
    "nesspay.cogs.tickets",
)


class NessPayBot(commands.Bot):
    def __init__(self) -> None:
        intents = discord.Intents.default()
        intents.guilds = True
        intents.members = True
        intents.messages = True
        intents.message_content = True
        intents.dm_messages = True
        super().__init__(command_prefix=commands.when_mentioned, intents=intents, help_command=None)
        self.started_at = time.time()
        self.delivery = DeliveryService(self)

    async def setup_hook(self) -> None:
        await db.connect()
        runtime.bind(self)
        services.on_paid(self.delivery.handle_paid)
        services.on_expired(self._on_order_expired)

        self.add_view(StorePanelView())
        self.add_view(TicketPanelView())
        self.add_view(TicketControlView())
        self.tree.on_error = self.on_app_command_error
        for cog in COGS:
            await self.load_extension(cog)

        if settings.guild_id:
            guild = discord.Object(id=settings.guild_id)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
        else:
            await self.tree.sync()
        log.info("comandos sincronizados")

    async def on_ready(self) -> None:
        log.info("conectado como %s (%s)", self.user, self.user.id if self.user else "-")
        if not self.license_watch.is_running():
            self.license_watch.start()
        if not self.order_watch.is_running():
            self.order_watch.start()

    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot or not message.guild:
            return
        await self.process_commands(message)
        ticket = await services.find_ticket_by_channel(message.channel.id)
        if ticket:
            await services.add_ticket_message(
                ticket["id"], message.author.id, str(message.author), message.content[:1000]
            )
            if ticket["status"] == "aberto" and await runtime.is_staff(message.author, message.guild.id):
                await services.set_ticket_status(ticket["id"], "aguardando")

    async def _on_order_expired(self, order: dict) -> None:
        embed = embeds.error(
            f"Seu pedido {order['id']} expirou por falta de pagamento. Se ainda quiser comprar, abra a loja novamente."
        )
        await self.delivery.user_dm(order["user_id"], embed)

    @tasks.loop(seconds=60)
    async def license_watch(self) -> None:
        try:
            expired = await self._purge_keys()
            for row in expired:
                await self.delivery.user_dm(row["user_id"], embeds.license_expired_notice(row))
                log_embed = discord.Embed(
                    title="Licença expirada e removida", color=discord.Color.from_str("#8A8A8A")
                )
                log_embed.add_field(name="Key", value=row["key"], inline=True)
                log_embed.add_field(name="Usuário", value=f"<@{row['user_id']}>", inline=True)
                log_embed.add_field(name="Dias", value=str(row["days"]), inline=True)
                if row.get("guild_id"):
                    await self.delivery.log_guild(int(row["guild_id"]), log_embed)
        except Exception:
            log.exception("falha ao processar licenças expiradas")

    async def _purge_keys(self) -> list[dict]:
        from . import keys

        return await keys.purge_expired()

    @tasks.loop(seconds=120)
    async def order_watch(self) -> None:
        try:
            await services.expire_pending_orders(settings.order_expiration_minutes)
        except Exception:
            log.exception("falha ao expirar pedidos pendentes")

    @license_watch.before_loop
    async def before_license_watch(self) -> None:
        await self.wait_until_ready()

    @order_watch.before_loop
    async def before_order_watch(self) -> None:
        await self.wait_until_ready()

    async def on_app_command_error(
        self, interaction: discord.Interaction, error: discord.app_commands.AppCommandError
    ) -> None:
        if isinstance(error, MissingLicense):
            embed = embeds.no_license(error.reason, error.expires_at)
        elif isinstance(error, MissingStaff):
            embed = embeds.error(str(error))
        elif isinstance(error, discord.app_commands.CommandOnCooldown):
            embed = embeds.error("Aguarde alguns segundos antes de usar este comando novamente.")
        else:
            log.exception("erro em comando", exc_info=error)
            embed = embeds.error("Ocorreu um erro ao executar o comando.")
        try:
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)
        except discord.HTTPException:
            pass
