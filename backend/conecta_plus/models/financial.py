"""
Models para o módulo financeiro
- BankAccount: Contas bancárias do condomínio
- Boleto: Boletos de cobrança
- Payment: Registro de pagamentos
- FinancialCategory: Categorias de receitas/despesas
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Column, Date, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import backref, relationship

from conecta_plus.database import Base
from conecta_plus.models.base import AuditMixin, SoftDeleteMixin, TenantMixin, TimestampMixin


class BankAccount(Base, TenantMixin, TimestampMixin, AuditMixin, SoftDeleteMixin):
    """Conta bancária do condomínio"""

    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    name = Column(String(100), nullable=False)  # "Conta Principal", "Conta Reserva"
    bank_code = Column(String(10))  # Código do banco (ex: "341" Itaú)
    bank_name = Column(String(100))
    agency = Column(String(20))
    account_number = Column(String(30))
    account_digit = Column(String(5))
    account_type = Column(String(20), default="corrente")  # corrente, poupanca

    # PIX
    pix_key = Column(String(100))
    pix_key_type = Column(String(20))  # cpf, cnpj, email, telefone, aleatoria

    # Integração (preparação para APIs bancárias)
    integration_enabled = Column(Boolean, default=False)
    integration_provider = Column(String(50))  # cora, inter, bb, santander, bradesco
    integration_config = Column(JSONB, default={})  # client_id, ambiente, webhook_url, etc.

    # Saldo (atualizado manualmente ou via integração)
    current_balance = Column(Numeric(12, 2), default=0)
    last_balance_update = Column(DateTime)

    # Status
    is_primary = Column(Boolean, default=False)  # Conta principal do condomínio
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    boletos = relationship("Boleto", back_populates="bank_account")
    payments = relationship("Payment", back_populates="bank_account")

    __table_args__ = (Index("ix_bank_accounts_tenant_active", "tenant_id", "is_active"),)


class Boleto(Base, TenantMixin, TimestampMixin, AuditMixin, SoftDeleteMixin):
    """Boleto de cobrança"""

    __tablename__ = "boletos"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    protocol = Column(String(30), unique=True, nullable=False, index=True)  # BOL-20241220-ABC123
    nosso_numero = Column(String(30), index=True)  # Número interno do banco
    linha_digitavel = Column(String(60))
    codigo_barras = Column(String(50))

    # Vinculação
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    resident_id = Column(Integer, ForeignKey("users.id"))  # Responsável pelo pagamento
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"))

    # Valores
    original_amount = Column(Numeric(10, 2), nullable=False)  # Valor original
    discount_amount = Column(Numeric(10, 2), default=0)  # Desconto por antecipação
    interest_amount = Column(Numeric(10, 2), default=0)  # Juros acumulados
    fine_amount = Column(Numeric(10, 2), default=0)  # Multa
    other_deductions = Column(Numeric(10, 2), default=0)  # Outras deduções
    other_additions = Column(Numeric(10, 2), default=0)  # Outros acréscimos
    final_amount = Column(Numeric(10, 2), nullable=False)  # Valor final a pagar
    paid_amount = Column(Numeric(10, 2), default=0)  # Valor já pago

    # Datas
    reference_month = Column(String(7), nullable=False, index=True)  # "2024-01" formato YYYY-MM
    due_date = Column(Date, nullable=False, index=True)
    discount_due_date = Column(Date)  # Data limite para desconto
    payment_date = Column(DateTime)  # Quando foi pago (última vez)

    # Regras financeiras (padrão: 1% ao mês + 2% multa)
    daily_interest_rate = Column(Numeric(6, 4), default=0.033)  # 0.033% ao dia ≈ 1% ao mês
    late_fine_percent = Column(Numeric(5, 2), default=2.0)  # 2% de multa única
    discount_percent = Column(Numeric(5, 2), default=0)  # % desconto antecipação

    # Descrição
    description = Column(Text)  # "Taxa de Condomínio - Janeiro/2024"
    items = Column(JSONB, default=[])
    """
    items exemplo:
    [
        {"description": "Taxa Condominial", "amount": 500.00},
        {"description": "Fundo de Reserva", "amount": 100.00},
        {"description": "Taxa Extra - Obra Elevador", "amount": 150.00}
    ]
    """

    # Status
    status = Column(String(20), nullable=False, default="pendente", index=True)
    # pendente, pago, pago_parcial, vencido, cancelado

    # Documentos
    pdf_url = Column(String(500))  # URL do PDF gerado
    pdf_generated_at = Column(DateTime)

    # Motivo de cancelamento
    cancel_reason = Column(Text)
    cancelled_at = Column(DateTime)
    cancelled_by_id = Column(Integer, ForeignKey("users.id"))

    # Integração bancária (para futuro)
    external_id = Column(String(100))  # ID no banco/gateway
    integration_status = Column(String(30))  # registered, confirmed, rejected
    integration_response = Column(JSONB, default={})

    # Relacionamentos
    unit = relationship("Unit", backref=backref("boletos", lazy="dynamic"))
    resident = relationship("User", foreign_keys=[resident_id], backref="boletos_responsavel")
    bank_account = relationship("BankAccount", back_populates="boletos")
    payments = relationship("Payment", back_populates="boleto", order_by="Payment.payment_date")
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_id])

    __table_args__ = (
        Index("ix_boletos_tenant_status", "tenant_id", "status"),
        Index("ix_boletos_tenant_due_date", "tenant_id", "due_date"),
        Index("ix_boletos_unit_reference", "unit_id", "reference_month"),
        Index("ix_boletos_tenant_reference", "tenant_id", "reference_month"),
    )


class Payment(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Registro de pagamento"""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    protocol = Column(String(30), unique=True, nullable=False, index=True)  # PAG-20241220-XYZ789

    # Vinculação
    boleto_id = Column(Integer, ForeignKey("boletos.id"))  # Pode ser null para créditos avulsos
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    resident_id = Column(Integer, ForeignKey("users.id"))
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"))

    # Valores
    amount = Column(Numeric(10, 2), nullable=False)
    discount_applied = Column(Numeric(10, 2), default=0)
    interest_applied = Column(Numeric(10, 2), default=0)
    fine_applied = Column(Numeric(10, 2), default=0)

    # Forma de pagamento
    payment_method = Column(String(30), nullable=False)
    # dinheiro, pix, transferencia, ted, doc, cheque, cartao_credito, cartao_debito, debito_automatico, boleto_bancario

    # Dados do pagamento
    payment_date = Column(DateTime, nullable=False)
    payer_name = Column(String(255))  # Quem pagou (pode ser diferente do morador)
    payer_document = Column(String(20))  # CPF/CNPJ de quem pagou

    # Comprovante
    receipt_number = Column(String(50))  # Número do comprovante
    receipt_url = Column(String(500))  # Upload do comprovante
    external_reference = Column(String(100))  # ID transação PIX, autenticação bancária, etc.

    # Observações
    notes = Column(Text)

    # Status
    status = Column(String(20), default="confirmado", index=True)
    # confirmado, estornado, pendente_confirmacao

    # Confirmação
    confirmed_by_id = Column(Integer, ForeignKey("users.id"))
    confirmed_at = Column(DateTime)

    # Estorno
    reversed_at = Column(DateTime)
    reversed_by_id = Column(Integer, ForeignKey("users.id"))
    reverse_reason = Column(Text)

    # Integração bancária
    bank_transaction_id = Column(String(100))  # ID da transação no banco
    bank_response = Column(JSONB, default={})

    # Relacionamentos
    boleto = relationship("Boleto", back_populates="payments")
    unit = relationship("Unit", backref=backref("payments", lazy="dynamic"))
    resident = relationship("User", foreign_keys=[resident_id])
    bank_account = relationship("BankAccount", back_populates="payments")
    confirmed_by = relationship("User", foreign_keys=[confirmed_by_id])
    reversed_by = relationship("User", foreign_keys=[reversed_by_id])

    __table_args__ = (
        Index("ix_payments_tenant_date", "tenant_id", "payment_date"),
        Index("ix_payments_tenant_status", "tenant_id", "status"),
        Index("ix_payments_unit", "unit_id", "payment_date"),
        Index("ix_payments_boleto", "boleto_id"),
    )


class FinancialCategory(Base, TenantMixin, TimestampMixin):
    """Categorias de receitas/despesas para fluxo de caixa"""

    __tablename__ = "financial_categories"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    description = Column(Text)
    category_type = Column(String(20), nullable=False)  # receita, despesa
    parent_id = Column(Integer, ForeignKey("financial_categories.id"))  # Subcategorias
    code = Column(String(20))  # Código contábil opcional

    # Visual
    color = Column(String(7))  # Hex color para gráficos (#3B82F6)
    icon = Column(String(50))  # Nome do ícone (lucide-react)

    # Controle
    is_system = Column(Boolean, default=False)  # Categorias do sistema (não editáveis)
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)  # Ordem de exibição

    # Relacionamentos
    children = relationship("FinancialCategory", backref=backref("parent", remote_side=[id]), lazy="dynamic")

    __table_args__ = (Index("ix_financial_categories_tenant_type", "tenant_id", "category_type"),)
