"""
Schemas para boletos de cobrança
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import Field

from app.schemas.common import BaseSchema, PaginatedResponse, TimestampSchema

# ==================== ITEM DO BOLETO ====================


class BoletoItem(BaseSchema):
    """Item de cobrança do boleto"""

    description: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0, decimal_places=2)


# ==================== CONTA BANCÁRIA ====================


class BankAccountBase(BaseSchema):
    """Base para conta bancária"""

    name: str = Field(..., min_length=1, max_length=100)
    bank_code: Optional[str] = Field(None, max_length=10)
    bank_name: Optional[str] = Field(None, max_length=100)
    agency: Optional[str] = Field(None, max_length=20)
    account_number: Optional[str] = Field(None, max_length=30)
    account_digit: Optional[str] = Field(None, max_length=5)
    account_type: str = Field("corrente", pattern="^(corrente|poupanca)$")
    pix_key: Optional[str] = Field(None, max_length=100)
    pix_key_type: Optional[str] = Field(None, pattern="^(cpf|cnpj|email|telefone|aleatoria)$")


class BankAccountCreate(BankAccountBase):
    """Criação de conta bancária"""

    is_primary: bool = False


class BankAccountUpdate(BaseSchema):
    """Atualização de conta bancária"""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    bank_code: Optional[str] = Field(None, max_length=10)
    bank_name: Optional[str] = Field(None, max_length=100)
    agency: Optional[str] = Field(None, max_length=20)
    account_number: Optional[str] = Field(None, max_length=30)
    account_digit: Optional[str] = Field(None, max_length=5)
    account_type: Optional[str] = Field(None, pattern="^(corrente|poupanca)$")
    pix_key: Optional[str] = Field(None, max_length=100)
    pix_key_type: Optional[str] = Field(None, pattern="^(cpf|cnpj|email|telefone|aleatoria)$")
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None
    current_balance: Optional[Decimal] = None


class BankAccountResponse(BankAccountBase, TimestampSchema):
    """Resposta de conta bancária"""

    id: int
    is_primary: bool
    is_active: bool
    current_balance: Decimal
    last_balance_update: Optional[datetime] = None
    integration_enabled: bool = False
    integration_provider: Optional[str] = None


class BankAccountListResponse(PaginatedResponse[BankAccountResponse]):
    """Lista paginada de contas bancárias"""

    pass


# ==================== BOLETO ====================


class BoletoCreate(BaseSchema):
    """Criação de boleto individual"""

    unit_id: int
    resident_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    reference_month: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")  # YYYY-MM
    due_date: date
    description: str = Field(..., min_length=1, max_length=500)
    items: List[BoletoItem]

    # Opcionais
    discount_percent: Decimal = Field(0, ge=0, le=100, decimal_places=2)
    discount_due_date: Optional[date] = None
    daily_interest_rate: Decimal = Field(0.033, ge=0, le=1, decimal_places=4)  # 0.033% ao dia
    late_fine_percent: Decimal = Field(2.0, ge=0, le=20, decimal_places=2)  # 2% multa


class BoletoBatchCreate(BaseSchema):
    """Geração de boletos em lote"""

    reference_month: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    due_date: date
    description: str = Field(..., min_length=1, max_length=500)
    items: List[BoletoItem]

    # Seleção de unidades
    unit_ids: Optional[List[int]] = None  # Se None, todas as unidades ativas
    exclude_unit_ids: Optional[List[int]] = None  # Unidades a excluir

    # Configurações
    discount_percent: Decimal = Field(0, ge=0, le=100, decimal_places=2)
    discount_due_date: Optional[date] = None
    daily_interest_rate: Decimal = Field(0.033, ge=0, le=1, decimal_places=4)
    late_fine_percent: Decimal = Field(2.0, ge=0, le=20, decimal_places=2)
    bank_account_id: Optional[int] = None


class BoletoUpdate(BaseSchema):
    """Atualização de boleto"""

    description: Optional[str] = Field(None, min_length=1, max_length=500)
    due_date: Optional[date] = None
    items: Optional[List[BoletoItem]] = None
    discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_due_date: Optional[date] = None


class BoletoCancel(BaseSchema):
    """Cancelamento de boleto"""

    reason: str = Field(..., min_length=5, max_length=500)


class BoletoResponse(TimestampSchema):
    """Resposta resumida de boleto"""

    id: int
    protocol: str
    unit_id: int
    unit_identifier: str  # "Bloco A - 101"
    resident_id: Optional[int] = None
    resident_name: Optional[str] = None
    reference_month: str
    due_date: date
    original_amount: Decimal
    final_amount: Decimal
    paid_amount: Decimal
    status: str
    days_overdue: int = 0  # Calculado


class BoletoDetailResponse(BoletoResponse):
    """Resposta detalhada de boleto"""

    nosso_numero: Optional[str] = None
    linha_digitavel: Optional[str] = None
    codigo_barras: Optional[str] = None
    description: Optional[str] = None
    items: List[BoletoItem] = []

    # Valores calculados
    discount_amount: Decimal = 0
    interest_amount: Decimal = 0
    fine_amount: Decimal = 0
    current_amount: Decimal = 0  # Valor atual com juros/multa

    # Configurações
    discount_percent: Decimal = 0
    discount_due_date: Optional[date] = None
    daily_interest_rate: Decimal = 0.033
    late_fine_percent: Decimal = 2.0

    # Datas
    payment_date: Optional[datetime] = None
    pdf_url: Optional[str] = None

    # Conta bancária
    bank_account_id: Optional[int] = None
    bank_account_name: Optional[str] = None

    # Cancelamento
    cancel_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None

    # Pagamentos vinculados
    payments: List["PaymentSummary"] = []


class BoletoListResponse(PaginatedResponse[BoletoResponse]):
    """Lista paginada de boletos"""

    pass


class BoletoBatchResult(BaseSchema):
    """Resultado da geração em lote"""

    total_created: int
    total_failed: int
    total_amount: Decimal
    boletos_created: List[BoletoResponse]
    errors: List[dict] = []  # [{"unit_id": 1, "error": "..."}]


class BoletoStats(BaseSchema):
    """Estatísticas de boletos"""

    total_count: int
    pending_count: int
    paid_count: int
    partial_count: int
    overdue_count: int
    cancelled_count: int
    total_receivable: Decimal  # Pendente + Vencido
    total_received: Decimal  # Pago
    total_overdue: Decimal  # Vencido

    # Por mês de referência (últimos 6 meses)
    by_month: List[dict] = []  # [{"month": "2024-01", "expected": 1000, "received": 800}]


class BoletoRecalculate(BaseSchema):
    """Resultado do recálculo de boleto"""

    original_amount: Decimal
    discount_amount: Decimal
    interest_amount: Decimal
    fine_amount: Decimal
    paid_amount: Decimal
    current_amount: Decimal  # Valor a pagar hoje
    days_overdue: int


# ==================== PAGAMENTO (Summary para BoletoDetail) ====================


class PaymentSummary(BaseSchema):
    """Resumo de pagamento (para uso em BoletoDetailResponse)"""

    id: int
    protocol: str
    amount: Decimal
    payment_method: str
    payment_date: datetime
    status: str


# Atualizar forward references
BoletoDetailResponse.model_rebuild()
