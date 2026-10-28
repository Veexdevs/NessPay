from __future__ import annotations

import asyncio
import secrets
from datetime import timedelta
from typing import Awaitable, Callable

from . import database as db
from .keys import ALPHABET
from .models import DeliveryMode, OrderStatus, PaymentMethod

PaidListener = Callable[[dict], Awaitable[None]]

_paid_listeners: list[PaidListener] = []
_expired_listeners: list[PaidListener] = []


def on_paid(listener: PaidListener) -> None:
    _paid_listeners.append(listener)


def on_expired(listener: PaidListener) -> None:
    _expired_listeners.append(listener)


def _code(prefix: str, size: int = 6) -> str:
    return f"{prefix}-" + "".join(secrets.choice(ALPHABET) for _ in range(size))


def brl(cents: int, currency: str = "BRL") -> str:
    value = (cents or 0) / 100
    formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}" if currency == "BRL" else f"{currency} {formatted}"


def parse_price(value: str) -> int:
    raw = (value or "").strip().replace("R$", "").replace(" ", "")
    if "," in raw:
        raw = raw.replace(".", "").replace(",", ".")
    try:
        amount = float(raw)
    except ValueError as exc:
        raise ValueError("Preço inválido. Use o formato 34,90.") from exc
    if amount < 0:
        raise ValueError("O preço não pode ser negativo.")
    return int(round(amount * 100))


async def get_settings(guild_id: int) -> dict:
    return await db.ensure_guild(guild_id)


async def update_settings(guild_id: int, **fields) -> dict:
    allowed = {
        "sales_channel_id",
        "log_channel_id",
        "staff_role_id",
        "ticket_category_id",
        "prefix",
        "currency",
        "dm_delivery",
        "auto_refund",
        "anti_fraud",
        "maintenance",
        "cart_timeout",
    }
    updates = {k: v for k, v in fields.items() if k in allowed}
    await db.ensure_guild(guild_id)
    if updates:
        assignments = ", ".join(f"{key} = ?" for key in updates)
        await db.execute(
            f"UPDATE guilds SET {assignments} WHERE guild_id = ?",
            (*updates.values(), guild_id),
        )
    return await db.ensure_guild(guild_id)


async def list_guilds() -> list[dict]:
    return await db.fetch_all("SELECT * FROM guilds ORDER BY guild_id ASC")


async def create_product(
    guild_id: int,
    name: str,
    price_cents: int,
    category: str = "Outros",
    description: str = "",
    delivery_mode: str = DeliveryMode.AUTO.value,
) -> dict:
    name = (name or "").strip()
    if not name:
        raise ValueError("O nome do produto é obrigatório.")
    if price_cents <= 0:
        raise ValueError("O preço precisa ser maior que zero.")
    if delivery_mode not in (DeliveryMode.AUTO.value, DeliveryMode.MANUAL.value):
        raise ValueError("Modo de entrega inválido.")
    product = {
        "id": _code("PRD"),
        "guild_id": guild_id,
        "name": name,
        "description": (description or "").strip(),
        "category": category,
        "price_cents": price_cents,
        "delivery_mode": delivery_mode,
        "active": 1,
        "created_at": db.iso(),
    }
    await db.execute(
        """INSERT INTO products (id, guild_id, name, description, category, price_cents, delivery_mode, active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)""",
        (
            product["id"],
            guild_id,
            product["name"],
            product["description"],
            product["category"],
            product["price_cents"],
            product["delivery_mode"],
            product["created_at"],
        ),
    )
    await db.audit(guild_id, None, "product.create", product["id"], name)
    return product


async def update_product(product_id: str, **fields) -> dict | None:
    allowed = {"name", "description", "category", "price_cents", "delivery_mode", "active"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return await db.fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))
    assignments = ", ".join(f"{key} = ?" for key in updates)
    await db.execute(f"UPDATE products SET {assignments} WHERE id = ?", (*updates.values(), product_id))
    return await db.fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))


async def delete_product(product_id: str) -> None:
    await db.execute("DELETE FROM stock WHERE product_id = ?", (product_id,))
    await db.execute("DELETE FROM products WHERE id = ?", (product_id,))


async def get_product(product_id: str) -> dict | None:
    return await db.fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))


async def find_product(guild_id: int, name: str) -> dict | None:
    return await db.fetch_one(
        "SELECT * FROM products WHERE guild_id = ? AND lower(name) = ?", (guild_id, name.strip().lower())
    )


async def list_products(guild_id: int, only_active: bool = False) -> list[dict]:
    sql = "SELECT * FROM products WHERE guild_id = ?"
    params: list = [guild_id]
    if only_active:
        sql += " AND active = 1"
    sql += " ORDER BY created_at DESC"
    products = await db.fetch_all(sql, params)
    for product in products:
        product["stock"] = await stock_count(product["id"])
        sold = await db.scalar(
            "SELECT COUNT(*) FROM orders WHERE product_id = ? AND status = ?",
            (product["id"], OrderStatus.PAID.value),
        )
        product["sold"] = sold or 0
    return products


async def stock_count(product_id: str) -> int:
    total = await db.scalar(
        "SELECT COUNT(*) FROM stock WHERE product_id = ? AND used = 0", (product_id,)
    )
    return int(total or 0)


async def add_stock(product_id: str, items: list[str]) -> int:
    added = 0
    for content in items:
        content = (content or "").strip()
        if not content:
            continue
        await db.execute(
            "INSERT INTO stock (id, product_id, content, used, created_at) VALUES (?, ?, ?, 0, ?)",
            (_code("STK", 8), product_id, content, db.iso()),
        )
        added += 1
    return added


async def take_stock(product_id: str, order_id: str) -> str | None:
    row = await db.fetch_one(
        "SELECT * FROM stock WHERE product_id = ? AND used = 0 ORDER BY created_at ASC LIMIT 1",
        (product_id,),
    )
    if not row:
        return None
    await db.execute(
        "UPDATE stock SET used = 1, order_id = ?, used_at = ? WHERE id = ?",
        (order_id, db.iso(), row["id"]),
    )
    return row["content"]


async def stock_overview(guild_id: int) -> list[dict]:
    return await db.fetch_all(
        """SELECT p.id, p.name, p.delivery_mode,
                  SUM(CASE WHEN s.used = 0 THEN 1 ELSE 0 END) AS available,
                  COUNT(s.id) AS total
           FROM products p LEFT JOIN stock s ON s.product_id = p.id
           WHERE p.guild_id = ?
           GROUP BY p.id ORDER BY p.name ASC""",
        (guild_id,),
    )


async def list_coupons(guild_id: int) -> list[dict]:
    return await db.fetch_all(
        "SELECT * FROM coupons WHERE guild_id = ? ORDER BY created_at DESC", (guild_id,)
    )


async def create_coupon(
    guild_id: int,
    code: str,
    coupon_type: str,
    value: int,
    max_uses: int | None = None,
    expires_at: str | None = None,
) -> dict:
    code = (code or "").strip().upper()
    if not code:
        raise ValueError("Informe o código do cupom.")
    if coupon_type not in ("percent", "fixed"):
        raise ValueError("Tipo de cupom inválido.")
    if value <= 0:
        raise ValueError("O desconto precisa ser maior que zero.")
    coupon = {
        "id": _code("CPN"),
        "guild_id": guild_id,
        "code": code,
        "type": coupon_type,
        "value": value,
        "max_uses": max_uses,
        "uses": 0,
        "active": 1,
        "expires_at": expires_at,
        "created_at": db.iso(),
    }
    await db.execute(
        """INSERT INTO coupons (id, guild_id, code, type, value, max_uses, uses, active, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)""",
        (coupon["id"], guild_id, code, coupon_type, value, max_uses, expires_at, coupon["created_at"]),
    )
    await db.audit(guild_id, None, "coupon.create", code, f"{coupon_type}={value}")
    return coupon


async def update_coupon(coupon_id: str, **fields) -> dict | None:
    allowed = {"active", "max_uses", "expires_at", "value", "code"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if updates:
        assignments = ", ".join(f"{key} = ?" for key in updates)
        await db.execute(f"UPDATE coupons SET {assignments} WHERE id = ?", (*updates.values(), coupon_id))
    return await db.fetch_one("SELECT * FROM coupons WHERE id = ?", (coupon_id,))


async def delete_coupon(coupon_id: str) -> None:
    await db.execute("DELETE FROM coupons WHERE id = ?", (coupon_id,))


async def apply_coupon(guild_id: int, code: str | None, amount_cents: int) -> tuple[int, dict | None]:
    if not code:
        return 0, None
    coupon = await db.fetch_one(
        "SELECT * FROM coupons WHERE guild_id = ? AND code = ?", (guild_id, code.strip().upper())
    )
    if not coupon or not coupon["active"]:
        return 0, None
    if coupon["max_uses"] is not None and coupon["uses"] >= coupon["max_uses"]:
        return 0, None
    expiry = db.parse_iso(coupon["expires_at"])
    if expiry and expiry <= db.utcnow():
        return 0, None
    discount = (
        amount_cents * coupon["value"] // 100
        if coupon["type"] == "percent"
        else min(coupon["value"], amount_cents)
    )
    return discount, coupon


async def consume_coupon(coupon_id: str) -> None:
    await db.execute("UPDATE coupons SET uses = uses + 1 WHERE id = ?", (coupon_id,))


async def create_order(
    guild_id: int,
    user_id: int,
    user_name: str,
    product: dict,
    method: str = PaymentMethod.PIX.value,
    coupon_code: str | None = None,
) -> dict:
    original = int(product["price_cents"])
    discount, coupon = await apply_coupon(guild_id, coupon_code, original)
    amount = max(0, original - discount)
    order = {
        "id": _code("NP"),
        "guild_id": guild_id,
        "product_id": product["id"],
        "product_name": product["name"],
        "user_id": user_id,
        "user_name": user_name,
        "amount_cents": amount,
        "original_cents": original,
        "status": OrderStatus.PENDING.value,
        "method": method,
        "payment_id": None,
        "coupon_code": coupon["code"] if coupon else None,
        "delivery_mode": product["delivery_mode"],
        "created_at": db.iso(),
    }
    await db.execute(
        """INSERT INTO orders (id, guild_id, product_id, product_name, user_id, user_name, amount_cents,
                               original_cents, status, method, coupon_code, delivery_mode, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            order["id"],
            guild_id,
            order["product_id"],
            order["product_name"],
            user_id,
            user_name,
            amount,
            original,
            order["status"],
            method,
            order["coupon_code"],
            order["delivery_mode"],
            order["created_at"],
        ),
    )
    if coupon:
        await consume_coupon(coupon["id"])
    await db.audit(guild_id, user_id, "order.create", order["id"], f"{product['name']} {brl(amount)}")
    return order


async def get_order(order_id: str) -> dict | None:
    return await db.fetch_one("SELECT * FROM orders WHERE id = ?", (order_id,))


async def list_orders(guild_id: int | None = None, limit: int = 200) -> list[dict]:
    if guild_id:
        return await db.fetch_all(
            "SELECT * FROM orders WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?",
            (guild_id, limit),
        )
    return await db.fetch_all("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", (limit,))


async def set_order_status(order_id: str, status: str) -> None:
    fields = {"status": status}
    if status == OrderStatus.PAID.value:
        fields["paid_at"] = db.iso()
    if status == OrderStatus.REFUNDED.value:
        fields["refunded_at"] = db.iso()
    assignments = ", ".join(f"{key} = ?" for key in fields)
    await db.execute(f"UPDATE orders SET {assignments} WHERE id = ?", (*fields.values(), order_id))


async def confirm_payment(order_id: str, payment_id: str | None = None) -> dict | None:
    order = await get_order(order_id)
    if not order:
        return None
    if order["status"] == OrderStatus.PAID.value:
        return order
    await db.execute(
        "UPDATE orders SET status = ?, paid_at = ?, payment_id = COALESCE(?, payment_id) WHERE id = ?",
        (OrderStatus.PAID.value, db.iso(), payment_id, order_id),
    )
    order = await get_order(order_id)
    await db.audit(order["guild_id"], None, "order.paid", order_id, brl(order["amount_cents"]))
    for listener in list(_paid_listeners):
        asyncio.create_task(listener(order))
    return order


async def mark_delivered(order_id: str, content: str | None, channel_id: int | None = None) -> None:
    await db.execute(
        "UPDATE orders SET delivered_at = ?, delivered_content = ?, ticket_channel_id = COALESCE(?, ticket_channel_id) WHERE id = ?",
        (db.iso(), content, channel_id, order_id),
    )


async def attach_ticket(order_id: str, channel_id: int) -> None:
    await db.execute("UPDATE orders SET ticket_channel_id = ? WHERE id = ?", (channel_id, order_id))


async def refund_order(order_id: str) -> dict | None:
    order = await get_order(order_id)
    if not order:
        return None
    await db.execute(
        "UPDATE orders SET status = ?, refunded_at = ? WHERE id = ?",
        (OrderStatus.REFUNDED.value, db.iso(), order_id),
    )
    await db.execute(
        "UPDATE stock SET used = 0, order_id = NULL, used_at = NULL WHERE order_id = ?", (order_id,)
    )
    await db.audit(order["guild_id"], None, "order.refund", order_id, brl(order["amount_cents"]))
    return await get_order(order_id)


async def cancel_order(order_id: str, status: str = OrderStatus.CANCELLED.value) -> None:
    await set_order_status(order_id, status)
    await db.audit(None, None, "order.status", order_id, status)


async def expire_pending_orders(minutes: int) -> list[dict]:
    limit = db.iso(db.utcnow() - timedelta(minutes=minutes))
    pending = await db.fetch_all(
        "SELECT * FROM orders WHERE status = ? AND created_at <= ?", (OrderStatus.PENDING.value, limit)
    )
    for order in pending:
        await db.execute(
            "UPDATE orders SET status = ? WHERE id = ?", (OrderStatus.EXPIRED.value, order["id"])
        )
        for listener in list(_expired_listeners):
            asyncio.create_task(listener(order))
    return pending


async def create_ticket(
    guild_id: int,
    user_id: int,
    user_name: str,
    subject: str,
    product_name: str | None = None,
    order_id: str | None = None,
    priority: str = "media",
) -> dict:
    ticket = {
        "id": _code("TCK"),
        "guild_id": guild_id,
        "channel_id": None,
        "user_id": user_id,
        "user_name": user_name,
        "subject": subject,
        "product_name": product_name,
        "order_id": order_id,
        "status": "aberto",
        "priority": priority,
        "created_at": db.iso(),
    }
    await db.execute(
        """INSERT INTO tickets (id, guild_id, user_id, user_name, subject, product_name, order_id, status, priority, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            ticket["id"],
            guild_id,
            user_id,
            user_name,
            subject,
            product_name,
            order_id,
            ticket["status"],
            priority,
            ticket["created_at"],
        ),
    )
    await db.audit(guild_id, user_id, "ticket.create", ticket["id"], subject)
    return ticket


async def attach_ticket_channel(ticket_id: str, channel_id: int) -> None:
    await db.execute("UPDATE tickets SET channel_id = ? WHERE id = ?", (channel_id, ticket_id))


async def close_ticket(ticket_id: str) -> None:
    await db.execute(
        "UPDATE tickets SET status = 'resolvido', closed_at = ? WHERE id = ?", (db.iso(), ticket_id)
    )


async def set_ticket_status(ticket_id: str, status: str) -> None:
    await db.execute("UPDATE tickets SET status = ? WHERE id = ?", (status, ticket_id))


async def list_tickets(guild_id: int | None = None, limit: int = 200) -> list[dict]:
    base = """SELECT t.*, (SELECT content FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_message
              FROM tickets t"""
    if guild_id:
        return await db.fetch_all(
            f"{base} WHERE t.guild_id = ? ORDER BY t.created_at DESC LIMIT ?", (guild_id, limit)
        )
    return await db.fetch_all(f"{base} ORDER BY t.created_at DESC LIMIT ?", (limit,))


async def find_ticket_by_channel(channel_id: int) -> dict | None:
    return await db.fetch_one("SELECT * FROM tickets WHERE channel_id = ?", (channel_id,))


async def add_ticket_message(ticket_id: str, author_id: int, author_name: str, content: str) -> None:
    await db.execute(
        "INSERT INTO ticket_messages (ticket_id, author_id, author_name, content, created_at) VALUES (?, ?, ?, ?, ?)",
        (ticket_id, author_id, author_name, content, db.iso()),
    )


async def list_ticket_messages(ticket_id: str) -> list[dict]:
    return await db.fetch_all(
        "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC", (ticket_id,)
    )


async def customers(guild_id: int | None = None) -> list[dict]:
    where = "WHERE status = ?" + (" AND guild_id = ?" if guild_id else "")
    params: list = [OrderStatus.PAID.value]
    if guild_id:
        params.append(guild_id)
    rows = await db.fetch_all(
        f"""SELECT user_id, MAX(user_name) AS user_name, COUNT(*) AS orders, SUM(amount_cents) AS spent,
                   MIN(created_at) AS first_order, MAX(created_at) AS last_order
            FROM orders {where} GROUP BY user_id ORDER BY spent DESC""",
        params,
    )
    return [
        {
            "user_id": row["user_id"],
            "name": row["user_name"],
            "orders": row["orders"],
            "spent_cents": int(row["spent"] or 0),
            "first_order": row["first_order"],
            "last_order": row["last_order"],
        }
        for row in rows
    ]


async def stats(guild_id: int | None = None) -> dict:
    scope = " AND guild_id = ?" if guild_id else ""
    params: tuple = (guild_id,) if guild_id else ()

    revenue = await db.scalar(
        f"SELECT COALESCE(SUM(amount_cents), 0) FROM orders WHERE status = ?{scope}",
        (OrderStatus.PAID.value, *params),
    )
    paid_count = await db.scalar(
        f"SELECT COUNT(*) FROM orders WHERE status = ?{scope}", (OrderStatus.PAID.value, *params)
    )
    total_orders = await db.scalar(f"SELECT COUNT(*) FROM orders WHERE 1 = 1{scope}", params)
    products = await db.scalar(f"SELECT COUNT(*) FROM products WHERE 1 = 1{scope}", params)
    active_products = await db.scalar(
        f"SELECT COUNT(*) FROM products WHERE active = 1{scope}", params
    )
    tickets_open = await db.scalar(
        f"SELECT COUNT(*) FROM tickets WHERE status != ?{scope}", ("resolvido", *params)
    )
    customers_total = len(await customers(guild_id))
    licenses = await db.fetch_one(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN revoked = 0 AND expires_at > ? THEN 1 ELSE 0 END) AS active FROM licenses",
        (db.iso(),),
    ) or {}
    return {
        "revenue_cents": int(revenue or 0),
        "paid_orders": int(paid_count or 0),
        "total_orders": int(total_orders or 0),
        "products": int(products or 0),
        "active_products": int(active_products or 0),
        "open_tickets": int(tickets_open or 0),
        "customers": customers_total,
        "licenses_total": int(licenses.get("total") or 0),
        "licenses_active": int(licenses.get("active") or 0),
    }


async def waiting_delivery() -> list[dict]:
    return await db.fetch_all(
        "SELECT * FROM orders WHERE status = ? AND delivered_at IS NULL", (OrderStatus.PAID.value,)
    )
