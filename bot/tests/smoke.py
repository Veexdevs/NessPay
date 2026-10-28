from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("DATABASE_PATH", "data/smoke.db")
os.environ.setdefault("API_KEY", "smoke")

from fastapi.testclient import TestClient

from nesspay import database as db
from nesspay import keys, services
from nesspay.api import app


async def scenario() -> None:
    await db.connect()
    await db.execute("DELETE FROM orders")
    await db.execute("DELETE FROM stock")
    await db.execute("DELETE FROM products")
    await db.execute("DELETE FROM coupons")
    await db.execute("DELETE FROM licenses")

    auto = await services.create_product(700, "Produto Auto", 3490, "Assinaturas", "", "auto")
    manual = await services.create_product(700, "Produto Manual", 9900, "Scripts", "", "manual")
    await services.add_stock(auto["id"], ["item-1", "item-2"])
    assert await services.stock_count(auto["id"]) == 2

    await services.create_coupon(700, "SMOKE10", "percent", 10)
    order = await services.create_order(700, 42, "cliente", auto, "pix", "SMOKE10")
    assert order["amount_cents"] == int(3490 * 0.9)

    delivered: dict[str, str] = {}

    async def listener(row: dict) -> None:
        if row["delivery_mode"] != "auto":
            return
        content = await services.take_stock(row["product_id"], row["id"])
        await services.mark_delivered(row["id"], content)
        delivered["content"] = content or ""

    services.on_paid(listener)
    await services.confirm_payment(order["id"])
    await asyncio.sleep(0.1)
    assert delivered["content"] == "item-1"
    assert await services.stock_count(auto["id"]) == 1

    manual_order = await services.create_order(700, 43, "cliente2", manual, "saldo", None)
    await services.confirm_payment(manual_order["id"])
    await asyncio.sleep(0.1)
    manual_row = await services.get_order(manual_order["id"])
    assert manual_row["status"] == "pago"
    assert manual_row["delivered_at"] is None

    refunded = await services.refund_order(order["id"])
    assert refunded["status"] == "reembolsado"
    assert await services.stock_count(auto["id"]) == 2

    row = await keys.create(42, 3, 1, "smoke")
    assert (await keys.check(row["key"], 42)).valid
    assert (await keys.check(row["key"], 99)).reason == "outro_usuario"
    await db.execute("UPDATE licenses SET expires_at = '2020-01-01T00:00:00+00:00' WHERE key = ?", (row["key"],))
    purged = await keys.purge_expired()
    assert [item["key"] for item in purged] == [row["key"]]
    assert await keys.has_access(42) is False

    ticket = await services.create_ticket(700, 42, "cliente", "Teste", "Produto Auto", order["id"])
    rows = await services.list_tickets(700)
    assert rows and rows[0]["id"] == ticket["id"]

    stats = await services.stats(700)
    assert stats["paid_orders"] == 1
    assert stats["total_orders"] == 2
    assert stats["products"] == 2
    await db.close()


def api_scenario() -> None:
    headers = {"X-API-Key": "smoke"}
    with TestClient(app) as client:
        assert client.get("/health").json()["ok"] is True
        assert client.get("/products?guild=700").status_code == 401
        assert client.get("/products?guild=700", headers=headers).status_code == 200
        created = client.post(
            "/products?guild=700",
            headers=headers,
            json={"name": "API Produto", "price": 10.5, "category": "Outros", "deliveryMode": "manual"},
        )
        assert created.status_code == 200
        product_id = created.json()["id"]
        assert client.post(f"/products/{product_id}/stock", headers=headers, json={"items": ["a", "b"]}).json()["available"] == 2
        client.patch("/settings?guild=700", headers=headers, json={"salesChannel": "<#123>", "maintenance": True})
        settings_row = client.get("/settings?guild=700", headers=headers).json()
        assert settings_row["salesChannel"] == "123" and settings_row["maintenance"] is True
        license_row = client.post("/licenses", headers=headers, json={"userId": "42", "days": 5}).json()
        verified = client.post("/license/verify", json={"key": license_row["key"], "userId": "42"}).json()
        assert verified["valid"] is True
        foreign = client.post("/license/verify", json={"key": license_row["key"], "userId": "7"}).json()
        assert foreign["valid"] is False
        client.post(f"/licenses/{license_row['key']}/revoke", headers=headers)
        revoked = client.post("/license/verify", json={"key": license_row["key"], "userId": "42"}).json()
        assert revoked["reason"] == "revogada"
        assert client.delete(f"/products/{product_id}", headers=headers).json()["ok"] is True


if __name__ == "__main__":
    asyncio.run(scenario())
    api_scenario()
    print("smoke ok")
