from __future__ import annotations

import logging

import httpx

from .config import settings

log = logging.getLogger("nesspay.payments")

MP_API = "https://api.mercadopago.com"


class PaymentError(RuntimeError):
    pass


class PixCharge:
    def __init__(self, payment_id: str, copy_paste: str, qr_base64: str | None, ticket_url: str | None, expires_at: str | None):
        self.payment_id = payment_id
        self.copy_paste = copy_paste
        self.qr_base64 = qr_base64
        self.ticket_url = ticket_url
        self.expires_at = expires_at


def gateway_enabled() -> bool:
    return settings.gateway_enabled


async def create_pix(order: dict, payer_email: str) -> PixCharge | None:
    if not gateway_enabled():
        return None
    payload = {
        "transaction_amount": round(order["amount_cents"] / 100, 2),
        "description": f"NessPay {order['id']} - {order['product_name']}",
        "payment_method_id": "pix",
        "external_reference": order["id"],
        "notification_url": settings.public_webhook_url or None,
        "payer": {"email": payer_email, "first_name": order["user_name"][:60]},
    }
    headers = {
        "Authorization": f"Bearer {settings.mp_access_token}",
        "Content-Type": "application/json",
        "X-Idempotency-Key": f"nesspay-{order['id']}",
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(f"{MP_API}/v1/payments", json=payload, headers=headers)
    except httpx.HTTPError as exc:
        raise PaymentError("Não foi possível falar com o gateway de pagamento.") from exc
    if response.status_code >= 400:
        log.warning("mercadopago error %s: %s", response.status_code, response.text[:300])
        raise PaymentError("O gateway recusou a cobrança. Verifique as credenciais.")
    data = response.json()
    pix = (data.get("point_of_interaction") or {}).get("transaction_data") or {}
    copy_paste = pix.get("qr_code") or data.get("id")
    return PixCharge(
        payment_id=str(data.get("id")),
        copy_paste=copy_paste,
        qr_base64=pix.get("qr_code_base64"),
        ticket_url=data.get("transaction_details", {}).get("external_resource_url"),
        expires_at=data.get("date_of_expiration"),
    )


async def fetch_payment(payment_id: str) -> dict:
    if not gateway_enabled():
        raise PaymentError("Gateway não configurado.")
    headers = {"Authorization": f"Bearer {settings.mp_access_token}"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(f"{MP_API}/v1/payments/{payment_id}", headers=headers)
    except httpx.HTTPError as exc:
        raise PaymentError("Falha ao consultar o pagamento.") from exc
    if response.status_code >= 400:
        raise PaymentError("Pagamento não encontrado no gateway.")
    return response.json()


async def refund(payment_id: str) -> bool:
    if not gateway_enabled() or not payment_id:
        return False
    headers = {"Authorization": f"Bearer {settings.mp_access_token}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(f"{MP_API}/v1/payments/{payment_id}/refunds", json={}, headers=headers)
    except httpx.HTTPError:
        return False
    return response.status_code < 400


async def payment_status(payment_id: str) -> str:
    data = await fetch_payment(payment_id)
    return str(data.get("status", "unknown"))
