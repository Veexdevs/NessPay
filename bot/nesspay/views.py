from __future__ import annotations

import discord

from . import database as db
from . import embeds, keys, runtime, services
from .config import settings
from .models import PaymentMethod


async def guard_license(interaction: discord.Interaction) -> bool:
    if interaction.guild and await runtime.is_staff(interaction.user, interaction.guild.id):
        return True
    active = await keys.active_for(interaction.user.id)
    if active:
        return True
    license_row = await db.fetch_one(
        "SELECT * FROM licenses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (interaction.user.id,)
    )
    reason = "Nenhuma Key cadastrada para o seu usuário."
    expires_at = None
    if license_row:
        if license_row["revoked"]:
            reason = "Sua Key foi revogada pela equipe."
        elif db.parse_iso(license_row["expires_at"]) and db.parse_iso(license_row["expires_at"]) <= db.utcnow():
            reason = "Sua Key expirou."
        expires_at = license_row["expires_at"]
    await interaction.response.send_message(
        embed=embeds.no_license(reason, expires_at), ephemeral=True
    )
    return False


async def guard_staff(interaction: discord.Interaction) -> bool:
    if interaction.guild and await runtime.is_staff(interaction.user, interaction.guild.id):
        return True
    await interaction.response.send_message(
        embed=embeds.error("Apenas a equipe do servidor pode usar esta ação."), ephemeral=True
    )
    return False


class StorePanelView(discord.ui.View):
    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(label="Abrir loja", style=discord.ButtonStyle.primary, custom_id="nesspay:store_open")
    async def open_store(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await guard_license(interaction):
            return
        products = await services.list_products(interaction.guild_id, only_active=True)
        if not products:
            await interaction.response.send_message(
                embed=embeds.error("Nenhum produto disponível no momento."), ephemeral=True
            )
            return
        await interaction.response.send_message(
            embed=embeds.help_embed(settings.gateway_enabled), view=StoreView(products), ephemeral=True
        )


class ProductSelect(discord.ui.Select):
    def __init__(self, products: list[dict]) -> None:
        options = [
            discord.SelectOption(
                label=product["name"][:90],
                description=f"{services.brl(product['price_cents'])} - estoque {product['stock']}",
                value=product["id"],
            )
            for product in products[:25]
        ]
        super().__init__(placeholder="Escolha um produto", options=options, min_values=1, max_values=1)

    async def callback(self, interaction: discord.Interaction) -> None:
        product = await services.get_product(self.values[0])
        if not product:
            await interaction.response.send_message(embed=embeds.error("Produto não encontrado."), ephemeral=True)
            return
        product["stock"] = await services.stock_count(product["id"])
        await interaction.response.edit_message(
            embed=embeds.product_card(product), view=ProductView(product)
        )


class StoreView(discord.ui.View):
    def __init__(self, products: list[dict]) -> None:
        super().__init__(timeout=180)
        self.add_item(ProductSelect(products))


class ProductView(discord.ui.View):
    def __init__(self, product: dict) -> None:
        super().__init__(timeout=300)
        self.product = product

    @discord.ui.button(label="Comprar", style=discord.ButtonStyle.primary)
    async def buy(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await guard_license(interaction):
            return
        product = await services.get_product(self.product["id"])
        if not product or not product["active"]:
            await interaction.response.send_message(embed=embeds.error("Produto indisponível."), ephemeral=True)
            return
        config = await services.get_settings(interaction.guild_id)
        if config["maintenance"]:
            await interaction.response.send_message(
                embed=embeds.error("A loja está em manutenção. Tente novamente mais tarde."), ephemeral=True
            )
            return
        await interaction.response.send_message(
            embed=embeds.product_card(product, config["currency"]),
            view=CheckoutView(product, config),
            ephemeral=True,
        )

    @discord.ui.button(label="Tenho um cupom", style=discord.ButtonStyle.secondary)
    async def coupon(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await interaction.response.send_modal(CouponModal(self.product["id"]))


class CouponModal(discord.ui.Modal, title="Aplicar cupom"):
    code = discord.ui.TextInput(label="Código do cupom", placeholder="NESSPAY10", max_length=24)

    def __init__(self, product_id: str) -> None:
        super().__init__()
        self.product_id = product_id

    async def on_submit(self, interaction: discord.Interaction) -> None:
        product = await services.get_product(self.product_id)
        if not product:
            await interaction.response.send_message(embed=embeds.error("Produto indisponível."), ephemeral=True)
            return
        discount, coupon = await services.apply_coupon(
            interaction.guild_id, self.code.value, product["price_cents"]
        )
        if not coupon:
            await interaction.response.send_message(
                embed=embeds.error("Cupom inválido, expirado ou sem usos restantes."), ephemeral=True
            )
            return
        final = max(0, product["price_cents"] - discount)
        embed = embeds.product_card(product)
        embed.add_field(name="Cupom aplicado", value=f"{coupon['code']} (-{services.brl(discount)})", inline=False)
        embed.add_field(name="Total com desconto", value=f"**{services.brl(final)}**", inline=False)
        await interaction.response.send_message(
            embed=embed, view=CheckoutView(product, await services.get_settings(interaction.guild_id), coupon["code"]), ephemeral=True
        )


class CheckoutView(discord.ui.View):
    def __init__(self, product: dict, config: dict, coupon_code: str | None = None) -> None:
        super().__init__(timeout=300)
        self.product = product
        self.config = config
        self.coupon_code = coupon_code

    @discord.ui.button(label="Pagar com Pix", style=discord.ButtonStyle.primary)
    async def pay_pix(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await _start_order(interaction, self.product, PaymentMethod.PIX.value, self.coupon_code)

    @discord.ui.button(label="Pagar na entrega", style=discord.ButtonStyle.secondary)
    async def pay_manual(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await _start_order(interaction, self.product, PaymentMethod.BALANCE.value, self.coupon_code)


async def _start_order(
    interaction: discord.Interaction, product: dict, method: str, coupon_code: str | None
) -> None:
    if not await guard_license(interaction):
        return
    order = await services.create_order(
        interaction.guild_id,
        interaction.user.id,
        str(interaction.user),
        product,
        method,
        coupon_code,
    )
    config = await services.get_settings(interaction.guild_id)

    if method == PaymentMethod.PIX.value and settings.gateway_enabled:
        from .payments import PaymentError, create_pix

        try:
            charge = await create_pix(order, f"{interaction.user.id}@nesspay.local")
        except PaymentError as exc:
            await interaction.response.send_message(embed=embeds.error(str(exc)), ephemeral=True)
            await services.cancel_order(order["id"])
            return
        if charge:
            await db.execute(
                "UPDATE orders SET payment_id = ? WHERE id = ?", (charge.payment_id, order["id"])
            )
            qr_url = (
                f"https://api.qrserver.com/v1/create-qr-code/?size=320x320&data={charge.copy_paste}"
                if charge.copy_paste
                else None
            )
            await interaction.response.send_message(
                embed=embeds.pix_charge(order, charge.copy_paste, qr_url),
                view=PaymentView(order["id"], charge.payment_id),
                ephemeral=True,
            )
            await _notify_staff(interaction.guild_id, order, "Pix gerado, aguardando confirmação do gateway")
            return

    await interaction.response.send_message(
        embed=embeds.awaiting_approval(order), view=BuyerOrderView(order["id"]), ephemeral=True
    )
    await _notify_staff(interaction.guild_id, order, "Pedido aguardando aprovação manual")


async def _notify_staff(guild_id: int, order: dict, reason: str) -> None:
    config = await services.get_settings(guild_id)
    channel_id = config.get("log_channel_id") or config.get("sales_channel_id")
    bot = runtime.bot()
    if not channel_id or bot is None:
        return
    channel = bot.get_channel(int(channel_id))
    if not isinstance(channel, discord.TextChannel):
        return
    embed = embeds.manual_delivery_prompt(order)
    embed.add_field(name="Situação", value=reason, inline=False)
    try:
        await channel.send(embed=embed, view=StaffPaymentView(order["id"]))
    except discord.HTTPException:
        pass


class PaymentView(discord.ui.View):
    def __init__(self, order_id: str, payment_id: str | None) -> None:
        super().__init__(timeout=None)
        self.order_id = order_id
        self.payment_id = payment_id

    @discord.ui.button(label="Verificar pagamento", style=discord.ButtonStyle.primary)
    async def check(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        order = await services.get_order(self.order_id)
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        if order["status"] == "pago":
            await interaction.response.send_message(
                embed=embeds.success("Pagamento confirmado. Sua entrega foi processada."), ephemeral=True
            )
            return
        if settings.gateway_enabled and self.payment_id:
            from .payments import PaymentError, payment_status

            try:
                status = await payment_status(self.payment_id)
            except PaymentError:
                status = "unknown"
            if status == "approved":
                await services.confirm_payment(self.order_id, self.payment_id)
                await interaction.response.send_message(
                    embed=embeds.success("Pagamento confirmado. Sua entrega foi processada."), ephemeral=True
                )
                return
            await interaction.response.send_message(
                embed=embeds.error(f"O gateway informa o status: {status}. Aguarde alguns instantes e tente novamente."),
                ephemeral=True,
            )
            return
        await interaction.response.send_message(
            embed=embeds.awaiting_approval(order), ephemeral=True
        )

    @discord.ui.button(label="Cancelar pedido", style=discord.ButtonStyle.secondary)
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        order = await services.get_order(self.order_id)
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        if order["status"] != "pendente":
            await interaction.response.send_message(
                embed=embeds.error("Este pedido não pode mais ser cancelado."), ephemeral=True
            )
            return
        await services.cancel_order(self.order_id)
        await interaction.response.send_message(embed=embeds.success("Pedido cancelado."), ephemeral=True)


class BuyerOrderView(discord.ui.View):
    def __init__(self, order_id: str) -> None:
        super().__init__(timeout=None)
        self.order_id = order_id

    @discord.ui.button(label="Ver situação", style=discord.ButtonStyle.secondary, custom_id="nesspay:order_status")
    async def status(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        order = await services.get_order(self.order_id)
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        embed = embeds.order_card(order)
        if order["delivered_at"] and order.get("delivered_content"):
            embed.add_field(
                name="Conteúdo entregue", value=f"```{order['delivered_content'][:1800]}```", inline=False
            )
        await interaction.response.send_message(embed=embed, ephemeral=True)


class StaffPaymentView(discord.ui.View):
    def __init__(self, order_id: str) -> None:
        super().__init__(timeout=None)
        self.order_id = order_id
        self.approve.custom_id = f"nesspay:approve:{order_id}"
        self.reject.custom_id = f"nesspay:reject:{order_id}"

    @discord.ui.button(label="Aprovar pagamento", style=discord.ButtonStyle.primary)
    async def approve(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await guard_staff(interaction):
            return
        order = await services.confirm_payment(self.order_id)
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        if order["status"] != "pago":
            await interaction.response.send_message(
                embed=embeds.error("Este pedido não está pendente."), ephemeral=True
            )
            return
        await interaction.response.send_message(
            embed=embeds.success(f"Pedido {order['id']} confirmado. Entrega iniciada."), ephemeral=True
        )

    @discord.ui.button(label="Cancelar pedido", style=discord.ButtonStyle.secondary)
    async def reject(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await guard_staff(interaction):
            return
        await services.cancel_order(self.order_id)
        await interaction.response.send_message(
            embed=embeds.success(f"Pedido {self.order_id} cancelado."), ephemeral=True
        )


class DeliveryModal(discord.ui.Modal, title="Conteúdo da entrega"):
    content = discord.ui.TextInput(
        label="O que o cliente vai receber",
        placeholder="Conta, link, código ou instrução",
        style=discord.TextStyle.paragraph,
        max_length=1800,
    )

    def __init__(self, order_id: str) -> None:
        super().__init__()
        self.order_id = order_id

    async def on_submit(self, interaction: discord.Interaction) -> None:
        if not await guard_staff(interaction):
            return
        order = await services.get_order(self.order_id)
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        await services.mark_delivered(self.order_id, self.content.value)
        bot = runtime.bot()
        delivered = False
        if bot is not None:
            embed = discord.Embed(
                title="Entrega concluída",
                description=f"Pedido {order['id']} liberado pela equipe.",
                color=discord.Color.from_str("#FFFFFF"),
            )
            embed.add_field(name="Produto", value=order["product_name"], inline=True)
            embed.add_field(name="Valor", value=services.brl(order["amount_cents"]), inline=True)
            embed.add_field(name="Conteúdo", value=f"```{self.content.value[:1800]}```", inline=False)
            delivered = await bot.delivery.user_dm(order["user_id"], embed)
            log_embed = discord.Embed(
                title="Entrega manual concluída", color=discord.Color.from_str("#FFFFFF")
            )
            log_embed.add_field(name="Pedido", value=order["id"], inline=True)
            log_embed.add_field(name="Produto", value=order["product_name"], inline=True)
            log_embed.add_field(name="Responsável", value=str(interaction.user), inline=True)
            log_embed.add_field(name="DM", value="enviada" if delivered else "falhou", inline=True)
            await bot.delivery.log_guild(order["guild_id"], log_embed)
        await interaction.response.send_message(
            embed=embeds.success(
                "Entrega registrada e enviada por mensagem direta." if delivered else "Entrega registrada. O DM falhou, envie o conteúdo manualmente."
            ),
            ephemeral=True,
        )


class ManualDeliveryView(discord.ui.View):
    def __init__(self, order_id: str) -> None:
        super().__init__(timeout=None)
        self.deliver.custom_id = f"nesspay:deliver:{order_id}"

    @discord.ui.button(label="Registrar entrega", style=discord.ButtonStyle.primary)
    async def deliver(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await guard_staff(interaction):
            return
        order_id = self.deliver.custom_id.split(":")[-1]
        await interaction.response.send_modal(DeliveryModal(order_id))


class TicketControlView(discord.ui.View):
    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(label="Assumir atendimento", style=discord.ButtonStyle.secondary, custom_id="nesspay:ticket_claim")
    async def claim(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await guard_staff(interaction):
            return
        ticket = await services.find_ticket_by_channel(interaction.channel_id)
        if not ticket:
            await interaction.response.send_message(embed=embeds.error("Ticket não encontrado."), ephemeral=True)
            return
        await services.set_ticket_status(ticket["id"], "aguardando")
        await interaction.response.send_message(
            embed=embeds.success(f"Atendimento assumido por {interaction.user.mention}."), ephemeral=False
        )

    @discord.ui.button(label="Fechar ticket", style=discord.ButtonStyle.secondary, custom_id="nesspay:ticket_close")
    async def close(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if not await guard_staff(interaction):
            return
        ticket = await services.find_ticket_by_channel(interaction.channel_id)
        if not ticket:
            await interaction.response.send_message(embed=embeds.error("Ticket não encontrado."), ephemeral=True)
            return
        await services.close_ticket(ticket["id"])
        await interaction.response.send_message(embed=embeds.success("Ticket encerrado. O canal será removido em 10 segundos."))
        bot = runtime.bot()
        if bot is not None:
            embed = discord.Embed(title="Ticket encerrado", color=discord.Color.from_str("#FFFFFF"))
            embed.add_field(name="Ticket", value=ticket["id"], inline=True)
            embed.add_field(name="Cliente", value=f"<@{ticket['user_id']}>", inline=True)
            embed.add_field(name="Fechado por", value=str(interaction.user), inline=True)
            await bot.delivery.log_guild(ticket["guild_id"], embed)
            import asyncio

            await asyncio.sleep(10)
            try:
                await interaction.channel.delete(reason="Ticket encerrado")
            except discord.HTTPException:
                pass


class TicketPanelView(discord.ui.View):
    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(label="Abrir atendimento", style=discord.ButtonStyle.primary, custom_id="nesspay:ticket_open")
    async def open_ticket(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await interaction.response.send_modal(TicketModal())


class TicketModal(discord.ui.Modal, title="Abrir atendimento"):
    subject = discord.ui.TextInput(label="Assunto", max_length=100)
    details = discord.ui.TextInput(
        label="Detalhes", style=discord.TextStyle.paragraph, max_length=1000, required=False
    )

    async def on_submit(self, interaction: discord.Interaction) -> None:
        bot = runtime.bot()
        if bot is None:
            await interaction.response.send_message(embed=embeds.error("Bot indisponível."), ephemeral=True)
            return
        ticket = await services.create_ticket(
            interaction.guild_id,
            interaction.user.id,
            str(interaction.user),
            self.subject.value,
        )
        channel = await bot.delivery.create_delivery_channel(
            interaction.guild,
            {
                "id": ticket["id"],
                "user_id": interaction.user.id,
                "product_name": self.subject.value,
                "amount_cents": 0,
            },
            await services.get_settings(interaction.guild_id),
            None,
            "ticket",
        )
        if channel:
            await services.attach_ticket_channel(ticket["id"], channel.id)
            if self.details.value:
                await services.add_ticket_message(
                    ticket["id"], interaction.user.id, str(interaction.user), self.details.value
                )
            await interaction.response.send_message(
                embed=embeds.success(f"Atendimento aberto em {channel.mention}."), ephemeral=True
            )
        else:
            await interaction.response.send_message(
                embed=embeds.error("Não foi possível criar o canal de atendimento. Avise a equipe."), ephemeral=True
            )
