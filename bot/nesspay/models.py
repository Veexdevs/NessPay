from __future__ import annotations

from enum import Enum


class OrderStatus(str, Enum):
    PENDING = "pendente"
    PAID = "pago"
    REFUNDED = "reembolsado"
    CANCELLED = "cancelado"
    EXPIRED = "expirado"


class PaymentMethod(str, Enum):
    PIX = "pix"
    CARD = "cartao"
    CRYPTO = "crypto"
    BALANCE = "saldo"


class DeliveryMode(str, Enum):
    AUTO = "auto"
    MANUAL = "manual"


class TicketStatus(str, Enum):
    OPEN = "aberto"
    WAITING = "aguardando"
    CLOSED = "resolvido"


class Priority(str, Enum):
    LOW = "baixa"
    MEDIUM = "media"
    HIGH = "alta"


CATEGORIES = ("Assinaturas", "Contas", "Boosts", "Scripts", "Outros")

DELIVERY_LABEL = {
    DeliveryMode.AUTO.value: "Automática",
    DeliveryMode.MANUAL.value: "Manual",
}

METHOD_LABEL = {
    PaymentMethod.PIX.value: "Pix",
    PaymentMethod.CARD.value: "Cartão",
    PaymentMethod.CRYPTO.value: "Cripto",
    PaymentMethod.BALANCE.value: "Saldo",
}

STATUS_LABEL = {
    OrderStatus.PENDING.value: "Pendente",
    OrderStatus.PAID.value: "Pago",
    OrderStatus.REFUNDED.value: "Reembolsado",
    OrderStatus.CANCELLED.value: "Cancelado",
    OrderStatus.EXPIRED.value: "Expirado",
}
