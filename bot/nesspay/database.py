from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

import aiosqlite

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS guilds (
    guild_id INTEGER PRIMARY KEY,
    sales_channel_id INTEGER,
    log_channel_id INTEGER,
    staff_role_id INTEGER,
    ticket_category_id INTEGER,
    prefix TEXT NOT NULL DEFAULT '/',
    currency TEXT NOT NULL DEFAULT 'BRL',
    dm_delivery INTEGER NOT NULL DEFAULT 1,
    auto_refund INTEGER NOT NULL DEFAULT 0,
    anti_fraud INTEGER NOT NULL DEFAULT 1,
    maintenance INTEGER NOT NULL DEFAULT 0,
    cart_timeout INTEGER NOT NULL DEFAULT 30,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Outros',
    price_cents INTEGER NOT NULL,
    delivery_mode TEXT NOT NULL DEFAULT 'auto',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    content TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    order_id TEXT,
    created_at TEXT NOT NULL,
    used_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    original_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente',
    method TEXT NOT NULL DEFAULT 'pix',
    payment_id TEXT,
    coupon_code TEXT,
    delivery_mode TEXT NOT NULL DEFAULT 'auto',
    delivered_content TEXT,
    ticket_channel_id INTEGER,
    created_at TEXT NOT NULL,
    paid_at TEXT,
    delivered_at TEXT,
    refunded_at TEXT
);

CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'percent',
    value INTEGER NOT NULL,
    max_uses INTEGER,
    uses INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS licenses (
    key TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    guild_id INTEGER,
    days INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    channel_id INTEGER,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    product_name TEXT,
    order_id TEXT,
    status TEXT NOT NULL DEFAULT 'aberto',
    priority TEXT NOT NULL DEFAULT 'media',
    created_at TEXT NOT NULL,
    closed_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER,
    actor_id INTEGER,
    action TEXT NOT NULL,
    target TEXT,
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_guild ON orders(guild_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_products_guild ON products(guild_id);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_user ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
"""

_conn: aiosqlite.Connection | None = None


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(moment: datetime | None = None) -> str:
    return (moment or utcnow()).replace(microsecond=0).isoformat()


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def deadline(days: int) -> str:
    return iso(utcnow() + timedelta(days=days))


async def connect() -> aiosqlite.Connection:
    global _conn
    if _conn is None:
        _conn = await aiosqlite.connect(settings.database_path)
        _conn.row_factory = aiosqlite.Row
        await _conn.execute("PRAGMA journal_mode=WAL")
        await _conn.execute("PRAGMA foreign_keys=ON")
        await _conn.executescript(SCHEMA)
        await _conn.commit()
    return _conn


async def close() -> None:
    global _conn
    if _conn is not None:
        await _conn.close()
        _conn = None


async def execute(sql: str, params: Iterable[Any] = ()) -> None:
    conn = await connect()
    await conn.execute(sql, tuple(params))
    await conn.commit()


async def insert(sql: str, params: Iterable[Any] = ()) -> None:
    await execute(sql, params)


async def fetch_one(sql: str, params: Iterable[Any] = ()) -> dict[str, Any] | None:
    conn = await connect()
    async with conn.execute(sql, tuple(params)) as cursor:
        row = await cursor.fetchone()
    return dict(row) if row else None


async def fetch_all(sql: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
    conn = await connect()
    async with conn.execute(sql, tuple(params)) as cursor:
        rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def scalar(sql: str, params: Iterable[Any] = ()) -> Any:
    row = await fetch_one(sql, params)
    if not row:
        return None
    return next(iter(row.values()))


async def ensure_guild(guild_id: int) -> dict[str, Any]:
    row = await fetch_one("SELECT * FROM guilds WHERE guild_id = ?", (guild_id,))
    if row:
        return row
    await execute("INSERT INTO guilds (guild_id, created_at) VALUES (?, ?)", (guild_id, iso()))
    return await fetch_one("SELECT * FROM guilds WHERE guild_id = ?", (guild_id,)) or {}


async def audit(guild_id: int | None, actor_id: int | None, action: str, target: str | None = None, detail: str = "") -> None:
    await execute(
        "INSERT INTO audit (guild_id, actor_id, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (guild_id, actor_id, action, target, detail, iso()),
    )


def json_dumps(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, default=str)
