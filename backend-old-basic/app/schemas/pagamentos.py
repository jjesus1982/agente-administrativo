"""
Schemas para registro de pagamentos
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import Field

from app.schemas.common import BaseSchema, PaginatedResponse, TimestampSchema

# ==================== CONSTANTES ====================

PAYMENT_METHODS = [
    "dinheiro",
    "pix",
    "transferencia",
    "ted",
    "doc",
    "cheque",
    "cartao_credito",
    "cartao_debito",
    "debito_automatico",
    "boleto_bancario",
    "deposito",
]

PAYMENT_STATUS = [
    "confirmado",
    "estornado",
    "pendente_confirmacao",
]


# ==================== PAGAMENTO ====================


class PaymentCreate(BaseSchema):
    """Registro de pagamento manual"""

    boleto_id: Optional[int] = None  # Se None, é um crédito avulso
    unit_id: int
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_method: str = Field(..., min_length=1)
    payment_date: datetime

    # Dados opcionais
    payer_name: Optional[str] = Field(None, max_length=255)
    payer_document: Optional[str] = Field(None, max_length=20)
    receipt_number: Optional[str] = Field(None, max_length=50)
    external_reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    bank_account_id: Optional[int] = None


class PaymentUpdate(BaseSchema):
    """Atualização de pagamento (limitado)"""

    notes: Optional[str] = Field(None, max_length=1000)
    receipt_url: Optional[str] = Field(None, max_length=500)


class PaymentReverse(BaseSchema):
    """Estorno de pagamento"""

    reason: str = Field(..., min_length=5, max_length=500)


class PaymentResponse(TimestampSchema):
    """Resposta resumida de pagamento"""

    id: int
    protocol: str
    boleto_id: Optional[int] = None
    boleto_protocol: Optional[str] = None
    unit_id: int
    unit_identifier: str  # "Bloco A - 101"
    amount: Decimal
    payment_method: str
    payment_method_label: str  # "PIX", "Transferência", etc.
    payment_date: datetime
    status: str
    status_label: str  # "Confirmado", "Estornado", etc.


class PaymentDetailResponse(PaymentResponse):
    """Resposta detalhada de pagamento"""

    resident_id: Optional[int] = None
    resident_name: Optional[str] = None
    payer_name: Optional[str] = None
    payer_document: Optional[str] = None
    receipt_number: Optional[str] = None
    receipt_url: Optional[str] = None
    external_reference: Optional[str] = None
    notes: Optional[str] = None

    # Valores aplicados
    discount_applied: Decimal = 0
    interest_applied: Decimal = 0
    fine_applied: Decimal = 0

    # Conta bancária
    bank_account_id: Optional[int] = None
    bank_account_name: Optional[str] = None

    # Confirmação
    confirmed_by_id: Optional[int] = None
    confirmed_by_name: Optional[str] = None
    confirmed_at: Optional[datetime] = None

    # Estorno
    reversed_at: Optional[datetime] = None
    reversed_by_name: Optional[str] = None
    reverse_reason: Optional[str] = None


class PaymentListResponse(PaginatedResponse[PaymentResponse]):
    """Lista paginada de pagamentos"""

    pass


# ==================== HISTÓRICO POR UNIDADE ====================


class UnitBoletoHistory(BaseSchema):
    """Boleto no histórico da unidade"""

    id: int
    protocol: str
    reference_month: str
    due_date: date
    original_amount: Decimal
    paid_amount: Decimal
    status: str
    payment_date: Optional[datetime] = None


class UnitPaymentHistory(BaseSchema):
    """Histórico financeiro de uma unidade"""

    unit_id: int
    unit_identifier: str
    resident_name: Optional[str] = None
    resident_phone: Optional[str] = None
    resident_email: Optional[str] = None

    # Resumo
    total_boletos: int
    total_paid: int
    total_pending: int
    total_overdue: int
    total_amount_paid: Decimal
    total_amount_pending: Decimal
    total_amount_overdue: Decimal

    # Últimos boletos
    recent_boletos: List[UnitBoletoHistory] = []

    # Últimos pagamentos
    recent_payments: List[PaymentResponse] = []


# ==================== ESTATÍSTICAS ====================


class PaymentStats(BaseSchema):
    """Estatísticas de pagamentos"""

    total_count: int
    confirmed_count: int
    reversed_count: int
    pending_count: int
    total_amount: Decimal
    total_reversed: Decimal

    # Por método de pagamento
    by_method: List[dict] = []  # [{"method": "pix", "count": 10, "amount": 5000}]

    # Por período
    by_period: List[dict] = []  # [{"date": "2024-01-15", "count": 5, "amount": 2500}]


# ==================== HELPERS ====================


def get_payment_method_label(method: str) -> str:
    """Retorna label amigável do método de pagamento"""
    labels = {
        "dinheiro": "Dinheiro",
        "pix": "PIX",
        "transferencia": "Transferência",
        "ted": "TED",
        "doc": "DOC",
        "cheque": "Cheque",
        "cartao_credito": "Cartão de Crédito",
        "cartao_debito": "Cartão de Débito",
        "debito_automatico": "Débito Automático",
        "boleto_bancario": "Boleto Bancário",
        "deposito": "Depósito",
    }
    return labels.get(method, method.replace("_", " ").title())


def get_payment_status_label(status: str) -> str:
    """Retorna label amigável do status"""
    labels = {
        "confirmado": "Confirmado",
        "estornado": "Estornado",
        "pendente_confirmacao": "Pendente de Confirmação",
    }
    return labels.get(status, status.replace("_", " ").title())
