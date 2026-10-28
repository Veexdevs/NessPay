from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import database as db
from . import keys, runtime, services
from .config import settings
from .models import CATEGORIES, DeliveryMode, OrderStatus

log = logging.getLogger("nesspay.api")

app = FastAPI(title="NessPay API", version="1.0.0")

origins = [origin.strip() for origin in settings.dashboard_origin.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def require_key(x_api_key: str | None = Header(default=None)) -> None:
    if not settings.api_auth_enabled:
        return
    if (x_api_key or "").strip() != settings.api_key:
        raise HTTPException(status_code=401, detail="Chave de API inválida.")


async def guild_param(guild: int | None = Query(default=None, alias="guild")) -> int | None:
    return guild


class OrderOut(BaseModel):
    id: str
    productId: str
    productName: str
    customerName: str
    customerId: str
    amount: float
    method: str
    status: str
    coupon: str | None = None
    createdAt: str
    delivered: bool = False
    deliveryMode: str
    guildId: str


class TicketOut(BaseModel):
    id: str
    customerName: str
    subject: str
    productName: str | None
    status: str
    priority: str
    createdAt: str
    lastMessage: str
    guildId: str


class ProductOut(BaseModel):
    id: str
    name: str
    description: str
    category: str
    price: float
    stock: int
    sold: int
    autoDelivery: bool
    deliveryMode: str
    active: bool
    createdAt: str


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    category: str = "Outros"
    price: float = Field(gt=0)
    stock: int | None = Field(default=None, ge=0)
    deliveryMode: str = "auto"
    autoDelivery: bool | None = None
    active: bool = True


class CouponOut(BaseModel):
    id: str
    code: str
    type: str
    value: float
    maxUses: int | None
    uses: int
    active: bool
    expiresAt: str | None
    createdAt: str


class CouponIn(BaseModel):
    code: str = Field(min_length=2, max_length=24)
    type: str = "percent"
    value: float = Field(gt=0)
    maxUses: int | None = None
    expiresAt: str | None = None
    active: bool = True


class SettingsOut(BaseModel):
    prefix: str
    currency: str
    salesChannel: str
    logsChannel: str
    dmDelivery: bool
    autoRefund: bool
    antiFraud: bool
    maintenance: bool
    cartTimeout: int


class SettingsIn(BaseModel):
    prefix: str | None = None
    currency: str | None = None
    salesChannel: str | None = None
    logsChannel: str | None = None
    dmDelivery: bool | None = None
    autoRefund: bool | None = None
    antiFraud: bool | None = None
    maintenance: bool | None = None
    cartTimeout: int | None = None


class VerifyIn(BaseModel):
    key: str
    userId: str


class LicenseIn(BaseModel):
    userId: str
    days: int = Field(gt=0, le=3650)
    note: str = ""


class ExtendIn(BaseModel):
    days: int = Field(gt=0, le=3650)


def _order_out(row: dict) -> OrderOut:
    return OrderOut(
        id=row["id"],
        productId=row["product_id"],
        productName=row["product_name"],
        customerName=row["user_name"],
        customerId=str(row["user_id"]),
        amount=round(row["amount_cents"] / 100, 2),
        method=row["method"],
        status=row["status"],
        coupon=row.get("coupon_code"),
        createdAt=row["created_at"],
        delivered=bool(row.get("delivered_at")),
        deliveryMode=row["delivery_mode"],
        guildId=str(row["guild_id"]),
    )


def _ticket_out(row: dict) -> TicketOut:
    return TicketOut(
        id=row["id"],
        customerName=row["user_name"],
        subject=row["subject"],
        productName=row.get("product_name"),
        status=row["status"],
        priority=row["priority"],
        createdAt=row["created_at"],
        lastMessage=row.get("last_message") or "",
        guildId=str(row["guild_id"]),
    )


def _product_out(row: dict) -> ProductOut:
    return ProductOut(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        category=row["category"],
        price=round(row["price_cents"] / 100, 2),
        stock=int(row.get("stock") or 0),
        sold=int(row.get("sold") or 0),
        autoDelivery=row["delivery_mode"] == DeliveryMode.AUTO.value,
        deliveryMode=row["delivery_mode"],
        active=bool(row["active"]),
        createdAt=row["created_at"],
    )


def _coupon_out(row: dict) -> CouponOut:
    value = row["value"] / 100 if row["type"] == "fixed" else row["value"]
    return CouponOut(
        id=row["id"],
        code=row["code"],
        type=row["type"],
        value=round(value, 2),
        maxUses=row["max_uses"],
        uses=row["uses"],
        active=bool(row["active"]),
        expiresAt=row["expires_at"],
        createdAt=row["created_at"],
    )


def _settings_out(row: dict) -> SettingsOut:
    return SettingsOut(
        prefix=row["prefix"],
        currency=row["currency"],
        salesChannel=str(row["sales_channel_id"] or ""),
        logsChannel=str(row["log_channel_id"] or ""),
        dmDelivery=bool(row["dm_delivery"]),
        autoRefund=bool(row["auto_refund"]),
        antiFraud=bool(row["anti_fraud"]),
        maintenance=bool(row["maintenance"]),
        cartTimeout=int(row["cart_timeout"]),
    )


def _parse_channel(value: str | None) -> int | None:
    if not value:
        return None
    digits = "".join(ch for ch in value if ch.isdigit())
    return int(digits) if digits else None


@app.on_event("startup")
async def startup() -> None:
    await db.connect()


@app.get("/health")
async def health() -> dict[str, Any]:
    bot = runtime.bot()
    return {
        "ok": True,
        "bot": {
            "ready": bool(bot and bot.is_ready()),
            "user": str(bot.user) if bot and bot.user else None,
            "latency_ms": round(bot.latency * 1000) if bot and bot.is_ready() else None,
            "guilds": len(bot.guilds) if bot else 0,
            "uptime_seconds": int(time.time() - bot.started_at) if bot else 0,
        },
        "gateway": {"enabled": settings.gateway_enabled, "webhook": bool(settings.public_webhook_url)},
        "auth": settings.api_auth_enabled,
    }


@app.get("/stats")
async def stats(_: None = Depends(require_key), guild: int | None = Depends(guild_param)) -> dict[str, Any]:
    data = await services.stats(guild)
    data["revenue"] = round(data["revenue_cents"] / 100, 2)
    data["licenses"] = await keys.stats()
    data["licenses"].pop("expiring", None)
    return data


@app.get("/orders", response_model=list[OrderOut])
async def list_orders(
    _: None = Depends(require_key),
    guild: int | None = Depends(guild_param),
    limit: int = Query(default=200, le=1000),
) -> list[OrderOut]:
    rows = await services.list_orders(guild, limit)
    return [_order_out(row) for row in rows]


@app.post("/orders/{order_id}/confirm", response_model=OrderOut)
async def confirm_order(order_id: str, _: None = Depends(require_key)) -> OrderOut:
    order = await services.get_order(order_id.upper())
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    if order["status"] != OrderStatus.PENDING.value:
        raise HTTPException(status_code=409, detail="Pedido não está pendente.")
    updated = await services.confirm_payment(order["id"])
    return _order_out(updated or order)


@app.post("/orders/{order_id}/refund", response_model=OrderOut)
async def refund_order(order_id: str, _: None = Depends(require_key)) -> OrderOut:
    order = await services.get_order(order_id.upper())
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    if order["status"] != OrderStatus.PAID.value:
        raise HTTPException(status_code=409, detail="Somente pedidos pagos podem ser reembolsados.")
    if settings.gateway_enabled and order.get("payment_id"):
        from .payments import refund

        await refund(order["payment_id"])
    updated = await services.refund_order(order["id"])
    return _order_out(updated or order)


@app.get("/tickets", response_model=list[TicketOut])
async def list_tickets(
    _: None = Depends(require_key), guild: int | None = Depends(guild_param)
) -> list[TicketOut]:
    rows = await services.list_tickets(guild)
    return [_ticket_out(row) for row in rows]


@app.get("/customers")
async def list_customers(
    _: None = Depends(require_key), guild: int | None = Depends(guild_param)
) -> list[dict[str, Any]]:
    rows = await services.customers(guild)
    return [
        {
            "id": str(row["user_id"]),
            "name": row["name"],
            "orders": row["orders"],
            "spent": round(row["spent_cents"] / 100, 2),
            "firstOrder": row["first_order"],
            "lastOrder": row["last_order"],
        }
        for row in rows
    ]


@app.get("/products", response_model=list[ProductOut])
async def list_products(
    _: None = Depends(require_key), guild: int | None = Depends(guild_param)
) -> list[ProductOut]:
    if guild is None:
        raise HTTPException(status_code=400, detail="Informe o parâmetro guild.")
    rows = await services.list_products(guild)
    return [_product_out(row) for row in rows]


@app.post("/products", response_model=ProductOut)
async def create_product(
    payload: ProductIn, _: None = Depends(require_key), guild: int | None = Depends(guild_param)
) -> ProductOut:
    if guild is None:
        raise HTTPException(status_code=400, detail="Informe o parâmetro guild.")
    mode = payload.deliveryMode if payload.deliveryMode in ("auto", "manual") else "auto"
    if payload.autoDelivery is not None:
        mode = "auto" if payload.autoDelivery else "manual"
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=422, detail="Categoria inválida.")
    product = await services.create_product(
        guild,
        payload.name,
        int(round(payload.price * 100)),
        payload.category,
        payload.description,
        mode,
    )
    if payload.stock:
        await services.add_stock(product["id"], [f"item {index + 1}" for index in range(payload.stock)])
    product["stock"] = await services.stock_count(product["id"])
    product["sold"] = 0
    return _product_out(product)


@app.patch("/products/{product_id}", response_model=ProductOut)
async def patch_product(
    product_id: str, payload: ProductIn, _: None = Depends(require_key)
) -> ProductOut:
    product = await services.get_product(product_id.upper())
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    mode = payload.deliveryMode if payload.deliveryMode in ("auto", "manual") else product["delivery_mode"]
    if payload.autoDelivery is not None:
        mode = "auto" if payload.autoDelivery else "manual"
    updated = await services.update_product(
        product["id"],
        name=payload.name,
        description=payload.description,
        category=payload.category,
        price_cents=int(round(payload.price * 100)),
        delivery_mode=mode,
        active=1 if payload.active else 0,
    )
    updated["stock"] = await services.stock_count(updated["id"])
    updated["sold"] = await db.scalar(
        "SELECT COUNT(*) FROM orders WHERE product_id = ? AND status = ?",
        (updated["id"], OrderStatus.PAID.value),
    ) or 0
    return _product_out(updated)


@app.delete("/products/{product_id}")
async def delete_product(product_id: str, _: None = Depends(require_key)) -> dict[str, bool]:
    product = await services.get_product(product_id.upper())
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    await services.delete_product(product["id"])
    return {"ok": True}


@app.post("/products/{product_id}/stock")
async def add_stock(
    product_id: str, request: Request, _: None = Depends(require_key)
) -> dict[str, int]:
    product = await services.get_product(product_id.upper())
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    payload = await request.json()
    items = payload.get("items") if isinstance(payload, dict) else None
    if not isinstance(items, list):
        raise HTTPException(status_code=422, detail="Envie uma lista em items.")
    added = await services.add_stock(product["id"], [str(item) for item in items])
    total = await services.stock_count(product["id"])
    return {"added": added, "available": total}


@app.get("/coupons", response_model=list[CouponOut])
async def list_coupons(
    _: None = Depends(require_key), guild: int | None = Depends(guild_param)
) -> list[CouponOut]:
    if guild is None:
        raise HTTPException(status_code=400, detail="Informe o parâmetro guild.")
    rows = await services.list_coupons(guild)
    return [_coupon_out(row) for row in rows]


@app.post("/coupons", response_model=CouponOut)
async def create_coupon(
    payload: CouponIn, _: None = Depends(require_key), guild: int | None = Depends(guild_param)
) -> CouponOut:
    if guild is None:
        raise HTTPException(status_code=400, detail="Informe o parâmetro guild.")
    if payload.type not in ("percent", "fixed"):
        raise HTTPException(status_code=422, detail="Tipo inválido.")
    value = int(payload.value) if payload.type == "percent" else int(round(payload.value * 100))
    coupon = await services.create_coupon(guild, payload.code, payload.type, value, payload.maxUses, payload.expiresAt)
    return _coupon_out(coupon)


@app.patch("/coupons/{coupon_id}", response_model=CouponOut)
async def patch_coupon(coupon_id: str, payload: CouponIn, _: None = Depends(require_key)) -> CouponOut:
    row = await db.fetch_one("SELECT * FROM coupons WHERE id = ?", (coupon_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Cupom não encontrado.")
    value = int(payload.value) if payload.type == "percent" else int(round(payload.value * 100))
    updated = await services.update_coupon(
        row["id"],
        code=payload.code.upper(),
        type=payload.type,
        value=value,
        max_uses=payload.maxUses,
        expires_at=payload.expiresAt,
        active=1 if payload.active else 0,
    )
    return _coupon_out(updated or row)


@app.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, _: None = Depends(require_key)) -> dict[str, bool]:
    await services.delete_coupon(coupon_id)
    return {"ok": True}


@app.get("/settings", response_model=SettingsOut)
async def get_settings(_: None = Depends(require_key), guild: int | None = Depends(guild_param)) -> SettingsOut:
    if guild is None:
        raise HTTPException(status_code=400, detail="Informe o parâmetro guild.")
    return _settings_out(await services.get_settings(guild))


@app.patch("/settings", response_model=SettingsOut)
async def patch_settings(
    payload: SettingsIn, _: None = Depends(require_key), guild: int | None = Depends(guild_param)
) -> SettingsOut:
    if guild is None:
        raise HTTPException(status_code=400, detail="Informe o parâmetro guild.")
    fields: dict[str, Any] = {}
    if payload.prefix is not None:
        fields["prefix"] = payload.prefix[:3]
    if payload.currency is not None:
        fields["currency"] = payload.currency
    if payload.salesChannel is not None:
        fields["sales_channel_id"] = _parse_channel(payload.salesChannel)
    if payload.logsChannel is not None:
        fields["log_channel_id"] = _parse_channel(payload.logsChannel)
    if payload.dmDelivery is not None:
        fields["dm_delivery"] = 1 if payload.dmDelivery else 0
    if payload.autoRefund is not None:
        fields["auto_refund"] = 1 if payload.autoRefund else 0
    if payload.antiFraud is not None:
        fields["anti_fraud"] = 1 if payload.antiFraud else 0
    if payload.maintenance is not None:
        fields["maintenance"] = 1 if payload.maintenance else 0
    if payload.cartTimeout is not None:
        fields["cart_timeout"] = payload.cartTimeout
    return _settings_out(await services.update_settings(guild, **fields))


@app.get("/licenses")
async def list_licenses(_: None = Depends(require_key)) -> list[dict[str, Any]]:
    rows = await keys.list_all()
    return [
        {
            "key": row["key"],
            "userId": str(row["user_id"]),
            "days": row["days"],
            "note": row["note"],
            "active": bool(row["expires_at"] > db.iso()) and not row["revoked"],
            "revoked": bool(row["revoked"]),
            "createdAt": row["created_at"],
            "expiresAt": row["expires_at"],
        }
        for row in rows
    ]


@app.post("/licenses")
async def create_license(payload: LicenseIn, _: None = Depends(require_key)) -> dict[str, Any]:
    user_id = "".join(ch for ch in payload.userId if ch.isdigit())
    if not user_id:
        raise HTTPException(status_code=422, detail="Informe o ID do Discord do usuário.")
    row = await keys.create(int(user_id), payload.days, 0, payload.note)
    return {
        "key": row["key"],
        "userId": str(row["user_id"]),
        "days": row["days"],
        "expiresAt": row["expires_at"],
    }


@app.post("/licenses/{key_code}/revoke")
async def revoke_license(key_code: str, _: None = Depends(require_key)) -> dict[str, bool]:
    row = await keys.revoke(key_code)
    if not row:
        raise HTTPException(status_code=404, detail="Key não encontrada.")
    return {"ok": True}


@app.post("/licenses/{key_code}/extend")
async def extend_license(key_code: str, payload: ExtendIn, _: None = Depends(require_key)) -> dict[str, Any]:
    row = await keys.extend(key_code, payload.days)
    if not row:
        raise HTTPException(status_code=404, detail="Key não encontrada.")
    return {"ok": True, "expiresAt": row["expires_at"]}


@app.post("/license/verify")
async def verify_license(payload: VerifyIn) -> dict[str, Any]:
    user_id = "".join(ch for ch in payload.userId if ch.isdigit())
    result = await keys.check(payload.key, int(user_id) if user_id else None)
    return {
        "valid": result.valid,
        "reason": result.reason,
        "message": result.message,
        "key": result.key,
        "expiresAt": result.expires_at,
        "days": result.days,
    }


@app.get("/audit")
async def list_audit(_: None = Depends(require_key), limit: int = Query(default=100, le=500)) -> list[dict]:
    return await db.fetch_all("SELECT * FROM audit ORDER BY id DESC LIMIT ?", (limit,))


@app.post("/webhooks/pagamento")
async def payment_webhook(request: Request) -> dict[str, str]:
    payload = await request.json()
    if settings.mp_webhook_secret:
        query = request.query_params
        if query.get("secret") and query.get("secret") != settings.mp_webhook_secret:
            raise HTTPException(status_code=401, detail="Segredo inválido.")
    payment_id = str(payload.get("data", {}).get("id") or payload.get("id") or "")
    if not payment_id:
        return {"status": "ignored"}
    from .payments import PaymentError, payment_status

    try:
        status = await payment_status(payment_id)
    except PaymentError:
        return {"status": "error"}
    if status != "approved":
        return {"status": status}
    order = await db.fetch_one("SELECT * FROM orders WHERE payment_id = ?", (payment_id,))
    if not order:
        return {"status": "order_not_found"}
    await services.confirm_payment(order["id"], payment_id)
    return {"status": "confirmed"}
