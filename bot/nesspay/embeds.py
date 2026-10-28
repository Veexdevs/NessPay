from __future__ import annotations

import discord

from . import database as db
from . import services
from .models import DELIVERY_LABEL, METHOD_LABEL, STATUS_LABEL
from .config import settings

WHITE = discord.Color.from_str("#FFFFFF")
GREY = discord.Color.from_str("#8A8A8A")
DARK = discord.Color.from_str("#1A1A1A")


def _e(title: str, description: str | None = None, color: discord.Color = WHITE) -> discord.Embed:
    embed = discord.Embed(title=title, description=description, color=color)
    embed.set_footer(text="NessPay")
    return embed


def error(message: str) -> discord.Embed:
    return _e("Não foi possível concluir", message, GREY)


def success(message: str) -> discord.Embed:
    return _e("Concluído", message, WHITE)


def no_license(reason: str | None = None, expires_at: str | None = None) -> discord.Embed:
    embed = _e(
        "Acesso restrito",
        "Este bot é licenciado. Você precisa de uma Key ativa gerada pela equipe para usar os comandos.",
        GREY,
    )
    if reason:
        embed.add_field(name="Motivo", value=reason, inline=False)
    if expires_at:
        embed.add_field(name="Expira em", value=f"<t:{int(db.parse_iso(expires_at).timestamp())}:F>", inline=False)
    embed.add_field(
        name="Como liberar",
        value="Envie a sua Key para a equipe ou peça uma nova Key com o seu ID do Discord.",
        inline=False,
    )
    return embed


def license_card(license_row: dict, owner: bool = False) -> discord.Embed:
    expires = db.parse_iso(license_row["expires_at"])
    active = expires is not None and expires > db.utcnow() and not license_row["revoked"]
    embed = _e("Licença NessPay", None, WHITE if active else GREY)
    embed.add_field(name="Key", value=f"```{license_row['key']}```", inline=False)
    embed.add_field(name="Usuário", value=f"<@{license_row['user_id']}>", inline=True)
    embed.add_field(name="Dias", value=str(license_row["days"]), inline=True)
    embed.add_field(name="Situação", value="Ativa" if active else ("Revogada" if license_row["revoked"] else "Expirada"), inline=True)
    if expires:
        embed.add_field(name="Expira em", value=f"<t:{int(expires.timestamp())}:F>", inline=True)
        embed.add_field(name="Tempo restante", value=f"<t:{int(expires.timestamp())}:R>", inline=True)
    if license_row.get("note"):
        embed.add_field(name="Observação", value=license_row["note"], inline=False)
    if owner:
        embed.add_field(name="Criada por", value=f"<@{license_row['created_by']}>", inline=True)
        embed.add_field(name="Criada em", value=license_row["created_at"][:16].replace("T", " "), inline=True)
    return embed


def product_card(product: dict, currency: str = "BRL") -> discord.Embed:
    embed = _e(product["name"], product["description"] or None, WHITE)
    embed.add_field(name="Preço", value=services.brl(product["price_cents"], currency), inline=True)
    embed.add_field(name="Entrega", value=DELIVERY_LABEL.get(product["delivery_mode"], "Manual"), inline=True)
    embed.add_field(name="Estoque", value=str(product.get("stock", 0)), inline=True)
    embed.add_field(name="Categoria", value=product["category"], inline=True)
    embed.add_field(name="Código", value=product["id"], inline=True)
    embed.add_field(name="Situação", value="Ativo" if product["active"] else "Pausado", inline=True)
    return embed


def order_card(order: dict, currency: str = "BRL") -> discord.Embed:
    embed = _e(f"Pedido {order['id']}", None, WHITE)
    embed.add_field(name="Produto", value=order["product_name"], inline=True)
    embed.add_field(name="Valor", value=services.brl(order["amount_cents"], currency), inline=True)
    embed.add_field(name="Status", value=STATUS_LABEL.get(order["status"], order["status"]), inline=True)
    embed.add_field(name="Método", value=METHOD_LABEL.get(order["method"], order["method"]), inline=True)
    embed.add_field(name="Entrega", value=DELIVERY_LABEL.get(order["delivery_mode"], "Manual"), inline=True)
    embed.add_field(name="Cliente", value=f"<@{order['user_id']}>", inline=True)
    if order.get("coupon_code"):
        embed.add_field(name="Cupom", value=order["coupon_code"], inline=True)
    if order.get("delivered_at"):
        embed.add_field(name="Entregue em", value=order["delivered_at"][:16].replace("T", " "), inline=False)
    embed.add_field(name="Criado em", value=order["created_at"][:16].replace("T", " "), inline=False)
    return embed


def pix_charge(order: dict, copy_paste: str, qr_url: str | None) -> discord.Embed:
    embed = _e(
        "Pagamento via Pix",
        f"Pedido {order['id']} - {order['product_name']}\nValor: **{services.brl(order['amount_cents'])}**",
        WHITE,
    )
    embed.add_field(name="Pix copia e cola", value=f"```{copy_paste[:1500]}```", inline=False)
    embed.add_field(
        name="Como pagar",
        value="Abra o app do seu banco, escolha Pix, cole o código abaixo e confirme o valor exato.",
        inline=False,
    )
    if qr_url:
        embed.set_image(url=qr_url)
    return embed


def awaiting_approval(order: dict) -> discord.Embed:
    embed = _e(
        "Pedido registrado",
        f"Pedido {order['id']} criado no valor de **{services.brl(order['amount_cents'])}**.",
        WHITE,
    )
    embed.add_field(name="Produto", value=order["product_name"], inline=True)
    embed.add_field(name="Entrega", value=DELIVERY_LABEL.get(order["delivery_mode"], "Manual"), inline=True)
    embed.add_field(
        name="Próximo passo",
        value="A equipe vai confirmar o pagamento. Você recebe uma mensagem aqui assim que o pedido for liberado.",
        inline=False,
    )
    return embed


def manual_delivery_prompt(order: dict) -> discord.Embed:
    embed = _e("Entrega manual pendente", f"Pedido {order['id']}", WHITE)
    embed.add_field(name="Produto", value=order["product_name"], inline=True)
    embed.add_field(name="Valor", value=services.brl(order["amount_cents"]), inline=True)
    embed.add_field(name="Cliente", value=f"<@{order['user_id']}>", inline=True)
    embed.add_field(name="Entrega", value=DELIVERY_LABEL.get(order["delivery_mode"], "Manual"), inline=False)
    return embed


def license_expired_notice(row: dict) -> discord.Embed:
    embed = _e(
        "Sua licença expirou",
        "O tempo da sua Key terminou e ela foi removida do sistema. O acesso aos comandos do NessPay foi encerrado.",
        GREY,
    )
    embed.add_field(name="Key", value=f"```{row['key']}```", inline=False)
    embed.add_field(name="Expirou em", value=row["expires_at"][:16].replace("T", " "), inline=True)
    embed.add_field(name="Como renovar", value="Fale com a equipe para gerar uma nova Key.", inline=False)
    return embed


def help_embed(gateway: bool) -> discord.Embed:
    embed = _e(
        "NessPay - central de vendas",
        "Bot de vendas com entrega automática e manual, cupons, pedidos e licenças por tempo.",
        WHITE,
    )
    embed.add_field(
        name="Loja",
        value="`/loja` abre o catálogo\n`/pedidos` mostra seus pedidos\n`/licenca` mostra sua Key",
        inline=False,
    )
    embed.add_field(
        name="Equipe",
        value="`/produto` gerencia o catálogo\n`/estoque` abastece as entregas\n`/cupom` cria descontos\n`/pedido` confirma, entrega e reembolsa\n`/key` gera e revoga licenças\n`/config` ajusta canais e equipe",
        inline=False,
    )
    embed.add_field(
        name="Pagamento",
        value="Pix automático ativo" if gateway else "Pix com aprovação manual da equipe",
        inline=False,
    )
    if not settings.public_webhook_url:
        embed.add_field(name="Webhook", value="Defina PUBLIC_WEBHOOK_URL para confirmar Pix automaticamente.", inline=False)
    return embed


def stats_embed(data: dict, currency: str = "BRL") -> discord.Embed:
    embed = _e("Resumo da operação", None, WHITE)
    embed.add_field(name="Receita", value=services.brl(data["revenue_cents"], currency), inline=True)
    embed.add_field(name="Pedidos pagos", value=str(data["paid_orders"]), inline=True)
    embed.add_field(name="Pedidos totais", value=str(data["total_orders"]), inline=True)
    embed.add_field(name="Produtos ativos", value=str(data["active_products"]), inline=True)
    embed.add_field(name="Tickets abertos", value=str(data["open_tickets"]), inline=True)
    embed.add_field(name="Licenças ativas", value=str(data["licenses_active"]), inline=True)
    return embed
