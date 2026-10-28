from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from .. import database as db
from .. import embeds, services
from ..checks import staff_only
from ..config import settings
from ..models import CATEGORIES, DeliveryMode, OrderStatus, PaymentMethod, STATUS_LABEL
from ..views import ManualDeliveryView, StaffPaymentView, StorePanelView, TicketPanelView


class StockModal(discord.ui.Modal, title="Abastecer estoque"):
    items = discord.ui.TextInput(
        label="Itens, um por linha",
        style=discord.TextStyle.paragraph,
        placeholder="conta1@email.com:senha\nhttps://link-de-acesso",
        max_length=3900,
    )

    def __init__(self, product_id: str) -> None:
        super().__init__()
        self.product_id = product_id

    async def on_submit(self, interaction: discord.Interaction) -> None:
        lines = [line.strip() for line in self.items.value.splitlines() if line.strip()]
        added = await services.add_stock(self.product_id, lines)
        total = await services.stock_count(self.product_id)
        await interaction.response.send_message(
            embed=embeds.success(f"{added} itens adicionados. Estoque atual: {total}."), ephemeral=True
        )


class DeliveryModal(discord.ui.Modal, title="Registrar entrega"):
    content = discord.ui.TextInput(
        label="Conteúdo entregue ao cliente", style=discord.TextStyle.paragraph, max_length=1800
    )

    def __init__(self, order_id: str) -> None:
        super().__init__()
        self.order_id = order_id

    async def on_submit(self, interaction: discord.Interaction) -> None:
        order = await services.get_order(self.order_id)
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        await services.mark_delivered(self.order_id, self.content.value)
        bot = getattr(interaction.client, "delivery", None)
        delivered = False
        if bot is not None:
            embed = discord.Embed(
                title="Entrega concluída", color=discord.Color.from_str("#FFFFFF")
            )
            embed.add_field(name="Pedido", value=order["id"], inline=True)
            embed.add_field(name="Produto", value=order["product_name"], inline=True)
            embed.add_field(name="Conteúdo", value=f"```{self.content.value[:1800]}```", inline=False)
            delivered = await bot.user_dm(order["user_id"], embed)
        await interaction.response.send_message(
            embed=embeds.success("Entrega registrada e enviada por DM." if delivered else "Entrega registrada. O DM falhou."),
            ephemeral=True,
        )


class Admin(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    produto = app_commands.Group(name="produto", description="Gerencia o catálogo")
    estoque = app_commands.Group(name="estoque", description="Gerencia as entregas")
    cupom = app_commands.Group(name="cupom", description="Gerencia cupons de desconto")
    pedido = app_commands.Group(name="pedido", description="Gerencia pedidos")
    config = app_commands.Group(name="config", description="Configura o bot no servidor")
    painel = app_commands.Group(name="painel", description="Publica os painéis fixos")

    @produto.command(name="adicionar", description="Cadastra um produto")
    @app_commands.describe(
        nome="Nome do produto",
        preco="Preço no formato 34,90",
        categoria="Categoria do produto",
        entrega="Automática consome o estoque, manual abre atendimento",
        descricao="Descrição exibida ao cliente",
    )
    @app_commands.choices(
        categoria=[app_commands.Choice(name=item, value=item) for item in CATEGORIES],
        entrega=[
            app_commands.Choice(name="Automática", value=DeliveryMode.AUTO.value),
            app_commands.Choice(name="Manual", value=DeliveryMode.MANUAL.value),
        ],
    )
    @staff_only()
    async def produto_adicionar(
        self,
        interaction: discord.Interaction,
        nome: str,
        preco: str,
        categoria: app_commands.Choice[str],
        entrega: app_commands.Choice[str],
        descricao: str = "",
    ) -> None:
        try:
            amount = services.parse_price(preco)
        except ValueError as exc:
            await interaction.response.send_message(embed=embeds.error(str(exc)), ephemeral=True)
            return
        product = await services.create_product(
            interaction.guild_id, nome, amount, categoria.value, descricao, entrega.value
        )
        product["stock"] = await services.stock_count(product["id"])
        await interaction.response.send_message(embed=embeds.product_card(product), ephemeral=True)

    @produto.command(name="editar", description="Edita um produto existente")
    @app_commands.describe(codigo="Código do produto", campo="O que alterar", valor="Novo valor")
    @app_commands.choices(
        campo=[
            app_commands.Choice(name="Nome", value="name"),
            app_commands.Choice(name="Preço", value="price_cents"),
            app_commands.Choice(name="Categoria", value="category"),
            app_commands.Choice(name="Descrição", value="description"),
            app_commands.Choice(name="Entrega automática", value="auto"),
            app_commands.Choice(name="Entrega manual", value="manual"),
            app_commands.Choice(name="Ativar", value="active"),
            app_commands.Choice(name="Pausar", value="inactive"),
        ]
    )
    @staff_only()
    async def produto_editar(
        self, interaction: discord.Interaction, codigo: str, campo: app_commands.Choice[str], valor: str = ""
    ) -> None:
        product = await services.get_product(codigo.strip().upper())
        if not product:
            await interaction.response.send_message(embed=embeds.error("Produto não encontrado."), ephemeral=True)
            return
        updates: dict = {}
        if campo.value == "name":
            updates["name"] = valor.strip()
        elif campo.value == "price_cents":
            try:
                updates["price_cents"] = services.parse_price(valor)
            except ValueError as exc:
                await interaction.response.send_message(embed=embeds.error(str(exc)), ephemeral=True)
                return
        elif campo.value == "category":
            if valor not in CATEGORIES:
                await interaction.response.send_message(
                    embed=embeds.error("Categoria inválida."), ephemeral=True
                )
                return
            updates["category"] = valor
        elif campo.value == "description":
            updates["description"] = valor
        elif campo.value in ("auto", "manual"):
            updates["delivery_mode"] = DeliveryMode.AUTO.value if campo.value == "auto" else DeliveryMode.MANUAL.value
        elif campo.value == "active":
            updates["active"] = 1
        elif campo.value == "inactive":
            updates["active"] = 0
        updated = await services.update_product(product["id"], **updates)
        updated["stock"] = await services.stock_count(updated["id"])
        await interaction.response.send_message(embed=embeds.product_card(updated), ephemeral=True)

    @produto.command(name="remover", description="Remove um produto e o estoque dele")
    @staff_only()
    async def produto_remover(self, interaction: discord.Interaction, codigo: str) -> None:
        product = await services.get_product(codigo.strip().upper())
        if not product:
            await interaction.response.send_message(embed=embeds.error("Produto não encontrado."), ephemeral=True)
            return
        await services.delete_product(product["id"])
        await interaction.response.send_message(
            embed=embeds.success(f"Produto {product['name']} removido."), ephemeral=True
        )

    @produto.command(name="listar", description="Lista os produtos do servidor")
    @staff_only()
    async def produto_listar(self, interaction: discord.Interaction) -> None:
        products = await services.list_products(interaction.guild_id)
        if not products:
            await interaction.response.send_message(
                embed=embeds.error("Nenhum produto cadastrado."), ephemeral=True
            )
            return
        embed = discord.Embed(title="Catálogo", color=discord.Color.from_str("#FFFFFF"))
        for product in products[:20]:
            embed.add_field(
                name=f"{product['name']} - {product['id']}",
                value=f"{services.brl(product['price_cents'])} - estoque {product['stock']} - {product['category']} - {'Automática' if product['delivery_mode'] == 'auto' else 'Manual'} - {'Ativo' if product['active'] else 'Pausado'}",
                inline=False,
            )
        embed.set_footer(text="NessPay")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @estoque.command(name="abastecer", description="Adiciona itens ao estoque de um produto")
    @staff_only()
    async def estoque_abastecer(self, interaction: discord.Interaction, codigo: str) -> None:
        product = await services.get_product(codigo.strip().upper())
        if not product:
            await interaction.response.send_message(embed=embeds.error("Produto não encontrado."), ephemeral=True)
            return
        await interaction.response.send_modal(StockModal(product["id"]))

    @estoque.command(name="adicionar", description="Adiciona um único item ao estoque")
    @staff_only()
    async def estoque_adicionar(self, interaction: discord.Interaction, codigo: str, conteudo: str) -> None:
        product = await services.get_product(codigo.strip().upper())
        if not product:
            await interaction.response.send_message(embed=embeds.error("Produto não encontrado."), ephemeral=True)
            return
        await services.add_stock(product["id"], [conteudo])
        total = await services.stock_count(product["id"])
        await interaction.response.send_message(
            embed=embeds.success(f"Item adicionado. Estoque atual: {total}."), ephemeral=True
        )

    @estoque.command(name="listar", description="Mostra o estoque por produto")
    @staff_only()
    async def estoque_listar(self, interaction: discord.Interaction) -> None:
        rows = await services.stock_overview(interaction.guild_id)
        if not rows:
            await interaction.response.send_message(
                embed=embeds.error("Nenhum produto cadastrado."), ephemeral=True
            )
            return
        embed = discord.Embed(title="Estoque", color=discord.Color.from_str("#FFFFFF"))
        for row in rows:
            embed.add_field(
                name=row["name"],
                value=f"disponível {row['available'] or 0} de {row['total'] or 0} - {'Automática' if row['delivery_mode'] == 'auto' else 'Manual'}",
                inline=False,
            )
        embed.set_footer(text="NessPay")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @cupom.command(name="criar", description="Cria um cupom de desconto")
    @app_commands.describe(
        codigo="Código que o cliente digita",
        desconto="Percentual (ex: 10) ou valor em reais (ex: 15,00)",
        tipo="Percentual ou valor fixo",
        usos="Limite de usos, deixe vazio para ilimitado",
    )
    @app_commands.choices(
        tipo=[
            app_commands.Choice(name="Percentual", value="percent"),
            app_commands.Choice(name="Valor fixo", value="fixed"),
        ]
    )
    @staff_only()
    async def cupom_criar(
        self,
        interaction: discord.Interaction,
        codigo: str,
        desconto: str,
        tipo: app_commands.Choice[str],
        usos: int | None = None,
    ) -> None:
        try:
            value = services.parse_price(desconto) if tipo.value == "fixed" else int(desconto.strip().replace("%", ""))
        except (ValueError, TypeError):
            await interaction.response.send_message(embed=embeds.error("Desconto inválido."), ephemeral=True)
            return
        coupon = await services.create_coupon(
            interaction.guild_id, codigo, tipo.value, value, usos
        )
        label = f"{value}%" if coupon["type"] == "percent" else services.brl(value)
        await interaction.response.send_message(
            embed=embeds.success(f"Cupom {coupon['code']} criado com desconto de {label}."), ephemeral=True
        )

    @cupom.command(name="remover", description="Remove um cupom")
    @staff_only()
    async def cupom_remover(self, interaction: discord.Interaction, codigo: str) -> None:
        coupon = await db.fetch_one(
            "SELECT * FROM coupons WHERE guild_id = ? AND code = ?",
            (interaction.guild_id, codigo.strip().upper()),
        )
        if not coupon:
            await interaction.response.send_message(embed=embeds.error("Cupom não encontrado."), ephemeral=True)
            return
        await services.delete_coupon(coupon["id"])
        await interaction.response.send_message(
            embed=embeds.success(f"Cupom {coupon['code']} removido."), ephemeral=True
        )

    @cupom.command(name="listar", description="Lista os cupons do servidor")
    @staff_only()
    async def cupom_listar(self, interaction: discord.Interaction) -> None:
        coupons = await services.list_coupons(interaction.guild_id)
        if not coupons:
            await interaction.response.send_message(embed=embeds.error("Nenhum cupom criado."), ephemeral=True)
            return
        embed = discord.Embed(title="Cupons", color=discord.Color.from_str("#FFFFFF"))
        for coupon in coupons[:20]:
            label = f"{coupon['value']}%" if coupon["type"] == "percent" else services.brl(coupon["value"])
            limit = coupon["max_uses"] if coupon["max_uses"] is not None else "ilimitado"
            embed.add_field(
                name=coupon["code"],
                value=f"{label} - usos {coupon['uses']}/{limit} - {'Ativo' if coupon['active'] else 'Inativo'}",
                inline=False,
            )
        embed.set_footer(text="NessPay")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @pedido.command(name="listar", description="Lista os pedidos recentes")
    @app_commands.describe(status="Filtrar pelo status do pedido")
    @staff_only()
    async def pedido_listar(
        self, interaction: discord.Interaction, status: str | None = None
    ) -> None:
        rows = await services.list_orders(interaction.guild_id)
        if status:
            rows = [row for row in rows if row["status"] == status]
        if not rows:
            await interaction.response.send_message(embed=embeds.error("Nenhum pedido encontrado."), ephemeral=True)
            return
        embed = discord.Embed(title="Pedidos", color=discord.Color.from_str("#FFFFFF"))
        for row in rows[:20]:
            embed.add_field(
                name=f"{row['id']} - {services.brl(row['amount_cents'])}",
                value=f"{row['product_name']} - {row['user_name']} - {STATUS_LABEL.get(row['status'], row['status'])}",
                inline=False,
            )
        embed.set_footer(text="NessPay")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @pedido.command(name="info", description="Mostra os detalhes de um pedido")
    @staff_only()
    async def pedido_info(self, interaction: discord.Interaction, codigo: str) -> None:
        order = await services.get_order(codigo.strip().upper())
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        embed = embeds.order_card(order)
        if order.get("delivered_content"):
            embed.add_field(name="Conteúdo", value=f"```{order['delivered_content'][:1500]}```", inline=False)
        await interaction.response.send_message(
            embed=embed, view=StaffPaymentView(order["id"]) if order["status"] == OrderStatus.PENDING.value else None, ephemeral=True
        )

    @pedido.command(name="aprovar", description="Confirma o pagamento e libera a entrega")
    @staff_only()
    async def pedido_aprovar(self, interaction: discord.Interaction, codigo: str) -> None:
        order = await services.get_order(codigo.strip().upper())
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        if order["status"] != OrderStatus.PENDING.value:
            await interaction.response.send_message(
                embed=embeds.error("Este pedido não está pendente."), ephemeral=True
            )
            return
        await services.confirm_payment(order["id"])
        await interaction.response.send_message(
            embed=embeds.success(f"Pedido {order['id']} confirmado. Entrega iniciada."), ephemeral=True
        )

    @pedido.command(name="entregar", description="Registra a entrega manual de um pedido")
    @staff_only()
    async def pedido_entregar(self, interaction: discord.Interaction, codigo: str) -> None:
        order = await services.get_order(codigo.strip().upper())
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        if order["status"] != OrderStatus.PAID.value:
            await interaction.response.send_message(
                embed=embeds.error("Confirme o pagamento antes de entregar."), ephemeral=True
            )
            return
        await interaction.response.send_modal(DeliveryModal(order["id"]))

    @pedido.command(name="reembolsar", description="Reembolsa um pedido pago")
    @staff_only()
    async def pedido_reembolsar(self, interaction: discord.Interaction, codigo: str) -> None:
        order = await services.get_order(codigo.strip().upper())
        if not order:
            await interaction.response.send_message(embed=embeds.error("Pedido não encontrado."), ephemeral=True)
            return
        if order["status"] != OrderStatus.PAID.value:
            await interaction.response.send_message(
                embed=embeds.error("Somente pedidos pagos podem ser reembolsados."), ephemeral=True
            )
            return
        if settings.gateway_enabled and order.get("payment_id"):
            from ..payments import refund

            await refund(order["payment_id"])
        refunded = await services.refund_order(order["id"])
        await interaction.response.send_message(
            embed=embeds.success(f"Pedido {order['id']} reembolsado."), ephemeral=True
        )
        bot = getattr(interaction.client, "delivery", None)
        if bot is not None and refunded is not None:
            await bot.user_dm(
                order["user_id"],
                embeds.error(f"O pedido {order['id']} foi reembolsado no valor de {services.brl(order['amount_cents'])}."),
            )

    @pedido.command(name="pendentes", description="Pedidos aguardando entrega manual")
    @staff_only()
    async def pedido_pendentes(self, interaction: discord.Interaction) -> None:
        rows = await services.waiting_delivery()
        rows = [row for row in rows if row["guild_id"] == interaction.guild_id]
        if not rows:
            await interaction.response.send_message(
                embed=embeds.success("Nenhuma entrega pendente."), ephemeral=True
            )
            return
        embed = discord.Embed(title="Entregas pendentes", color=discord.Color.from_str("#FFFFFF"))
        for row in rows[:15]:
            embed.add_field(
                name=f"{row['id']} - {row['product_name']}",
                value=f"<@{row['user_id']}> - {services.brl(row['amount_cents'])}",
                inline=False,
            )
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @config.command(name="canal_vendas", description="Define o canal de vendas")
    @staff_only()
    async def config_canal_vendas(self, interaction: discord.Interaction, canal: discord.TextChannel) -> None:
        await services.update_settings(interaction.guild_id, sales_channel_id=canal.id)
        await interaction.response.send_message(
            embed=embeds.success(f"Canal de vendas definido: {canal.mention}."), ephemeral=True
        )

    @config.command(name="canal_logs", description="Define o canal de logs")
    @staff_only()
    async def config_canal_logs(self, interaction: discord.Interaction, canal: discord.TextChannel) -> None:
        await services.update_settings(interaction.guild_id, log_channel_id=canal.id)
        await interaction.response.send_message(
            embed=embeds.success(f"Canal de logs definido: {canal.mention}."), ephemeral=True
        )

    @config.command(name="cargo_equipe", description="Define o cargo da equipe")
    @staff_only()
    async def config_cargo_equipe(self, interaction: discord.Interaction, cargo: discord.Role) -> None:
        await services.update_settings(interaction.guild_id, staff_role_id=cargo.id)
        await interaction.response.send_message(
            embed=embeds.success(f"Cargo de equipe definido: {cargo.mention}."), ephemeral=True
        )

    @config.command(name="categoria", description="Define a categoria dos canais de entrega")
    @staff_only()
    async def config_categoria(self, interaction: discord.Interaction, categoria: discord.CategoryChannel) -> None:
        await services.update_settings(interaction.guild_id, ticket_category_id=categoria.id)
        await interaction.response.send_message(
            embed=embeds.success(f"Categoria definida: {categoria.name}."), ephemeral=True
        )

    @config.command(name="manutencao", description="Ativa ou desativa a manutenção da loja")
    @staff_only()
    async def config_manutencao(self, interaction: discord.Interaction, ativo: bool) -> None:
        await services.update_settings(interaction.guild_id, maintenance=1 if ativo else 0)
        await interaction.response.send_message(
            embed=embeds.success(f"Manutenção {'ativada' if ativo else 'desativada'}."), ephemeral=True
        )

    @config.command(name="moeda", description="Define a moeda exibida")
    @staff_only()
    @app_commands.choices(
        moeda=[
            app_commands.Choice(name="Real", value="BRL"),
            app_commands.Choice(name="Dólar", value="USD"),
            app_commands.Choice(name="Euro", value="EUR"),
        ]
    )
    async def config_moeda(self, interaction: discord.Interaction, moeda: app_commands.Choice[str]) -> None:
        await services.update_settings(interaction.guild_id, currency=moeda.value)
        await interaction.response.send_message(
            embed=embeds.success(f"Moeda definida: {moeda.value}."), ephemeral=True
        )

    @config.command(name="ver", description="Mostra a configuração atual do servidor")
    @staff_only()
    async def config_ver(self, interaction: discord.Interaction) -> None:
        config = await services.get_settings(interaction.guild_id)
        embed = discord.Embed(title="Configuração", color=discord.Color.from_str("#FFFFFF"))
        embed.add_field(name="Canal de vendas", value=f"<#{config['sales_channel_id']}>" if config["sales_channel_id"] else "não definido", inline=True)
        embed.add_field(name="Canal de logs", value=f"<#{config['log_channel_id']}>" if config["log_channel_id"] else "não definido", inline=True)
        embed.add_field(name="Cargo da equipe", value=f"<@&{config['staff_role_id']}>" if config["staff_role_id"] else "não definido", inline=True)
        embed.add_field(name="Categoria", value=f"<#{config['ticket_category_id']}>" if config["ticket_category_id"] else "padrão", inline=True)
        embed.add_field(name="Moeda", value=config["currency"], inline=True)
        embed.add_field(name="Manutenção", value="ativa" if config["maintenance"] else "inativa", inline=True)
        embed.add_field(name="Gateway", value="Mercado Pago conectado" if settings.gateway_enabled else "aprovação manual", inline=False)
        embed.set_footer(text="NessPay")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @painel.command(name="loja", description="Publica o painel fixo da loja")
    @staff_only()
    async def painel_loja(self, interaction: discord.Interaction) -> None:
        embed = discord.Embed(
            title="NessPay",
            description="Clique em Abrir loja para ver o catálogo, preços, estoque e formas de entrega.",
            color=discord.Color.from_str("#FFFFFF"),
        )
        embed.set_footer(text="NessPay")
        await interaction.channel.send(embed=embed, view=StorePanelView())
        await interaction.response.send_message(embed=embeds.success("Painel publicado."), ephemeral=True)

    @painel.command(name="tickets", description="Publica o painel de atendimento")
    @staff_only()
    async def painel_tickets(self, interaction: discord.Interaction) -> None:
        embed = discord.Embed(
            title="Atendimento",
            description="Abra um atendimento para falar com a equipe sobre pedidos, entregas ou licenças.",
            color=discord.Color.from_str("#FFFFFF"),
        )
        embed.set_footer(text="NessPay")
        await interaction.channel.send(embed=embed, view=TicketPanelView())
        await interaction.response.send_message(embed=embeds.success("Painel publicado."), ephemeral=True)

    @app_commands.command(name="resumo", description="Resumo da operação do servidor")
    @staff_only()
    async def resumo(self, interaction: discord.Interaction) -> None:
        data = await services.stats(interaction.guild_id)
        config = await services.get_settings(interaction.guild_id)
        await interaction.response.send_message(
            embed=embeds.stats_embed(data, config["currency"]), ephemeral=True
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Admin(bot))
