# -*- coding: utf-8 -*-
"""
Schemas do Conecta Fielder
==========================

Modelos de dados para o módulo de campo do Conecta Plus.

O Conecta Fielder é o braço executor em campo, responsável por:
- Receber JobTemplates do Agente Técnico
- Criar JobInstances (OS reais)
- Registrar execução de steps
- Coletar evidências (fotos, vídeos, notas)
- Gerar relatórios de execução
"""

from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from datetime import datetime
from pydantic import BaseModel, Field

from ..agent_tecnico.schemas import CondominioContext, Acesso


# =============================================================================
# ENUMS
# =============================================================================

class JobType(str, Enum):
    """Tipos de job de campo."""
    INSTALACAO = "instalacao"
    MANUTENCAO = "manutencao"
    VISTORIA = "vistoria"
    CORRETIVA = "corretiva"
    PREVENTIVA = "preventiva"
    OUTRO = "outro"


class JobPriority(str, Enum):
    """Prioridades de job."""
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"


class JobStatus(str, Enum):
    """Status de um job."""
    DRAFT = "draft"                  # Rascunho, não liberado
    RELEASED = "released"            # Liberado para execução
    ASSIGNED = "assigned"            # Atribuído a técnico
    IN_PROGRESS = "in_progress"      # Em execução
    PAUSED = "paused"               # Pausado
    PENDING_REVIEW = "pending_review"  # Aguardando revisão
    COMPLETED = "completed"          # Concluído
    CANCELLED = "cancelled"          # Cancelado


class StepStatus(str, Enum):
    """Status de um step."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


class StepType(str, Enum):
    """Tipos de step."""
    INFRAESTRUTURA = "infraestrutura"
    REDE = "rede"
    EQUIPAMENTO = "equipamento"
    TESTE = "teste"
    CHECKLIST = "checklist"
    DOCUMENTACAO = "documentacao"
    OUTRO = "outro"


class EvidenceType(str, Enum):
    """Tipos de evidência."""
    PHOTO = "photo"
    VIDEO = "video"
    NOTE = "note"
    MEASUREMENT = "measurement"
    FILE = "file"
    SIGNATURE = "signature"
    LOCATION = "location"
    AUDIO = "audio"


class ChecklistResponseType(str, Enum):
    """Tipos de resposta de checklist."""
    BOOLEAN = "boolean"
    TEXT = "text"
    NUMBER = "number"
    CHOICE = "choice"
    MULTI_CHOICE = "multi_choice"


# =============================================================================
# MODELOS DE CHECKLIST
# =============================================================================

class ChecklistItem(BaseModel):
    """Item de checklist em um step."""
    code: str = Field(..., description="Código único do item, ex: INF-001")
    title: str
    description: Optional[str] = None
    required: bool = True
    response_type: ChecklistResponseType = ChecklistResponseType.BOOLEAN
    options: Optional[List[str]] = Field(
        default=None,
        description="Opções válidas para choice/multi_choice"
    )
    ai_hint: Optional[str] = Field(
        default=None,
        description="Dica para o Agente Técnico explicar/validar este item"
    )


class ChecklistAnswer(BaseModel):
    """Resposta de um item de checklist."""
    item_code: str
    value: Any = Field(..., description="Valor da resposta (bool, str, int, list)")
    notes: Optional[str] = None
    answered_at: datetime = Field(default_factory=datetime.now)
    answered_by: Optional[str] = None


# =============================================================================
# MODELOS DE EVIDÊNCIA
# =============================================================================

class EvidenceRequirement(BaseModel):
    """Requisito de evidência em um step."""
    type: EvidenceType
    description: str
    required: bool = True
    min_items: int = 1
    tags: Optional[List[str]] = None


class Evidence(BaseModel):
    """Evidência registrada pelo técnico."""
    id: str = Field(default_factory=lambda: f"ev_{uuid4().hex[:8]}")
    type: EvidenceType
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    content: Optional[str] = Field(None, description="Conteúdo textual (para notes)")
    measurement_value: Optional[float] = None
    measurement_unit: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    tags: List[str] = []
    captured_at: datetime = Field(default_factory=datetime.now)
    captured_by: Optional[str] = None


# =============================================================================
# MODELOS DE STEP
# =============================================================================

class JobStep(BaseModel):
    """
    Definição de um passo em um JobTemplate.
    
    Cada step representa uma etapa de trabalho com:
    - Checklists a responder
    - Evidências a coletar
    - Instruções de IA para auxiliar o técnico
    """
    id: str = Field(default_factory=lambda: f"step_{uuid4().hex[:8]}")
    order: int = Field(..., description="Ordem de execução no fluxo")
    title: str
    description: Optional[str] = None
    step_type: StepType = StepType.CHECKLIST
    access_point_name: Optional[str] = Field(
        default=None,
        description="Nome do acesso relacionado (se aplicável)"
    )
    checklist_items: List[ChecklistItem] = []
    evidence_requirements: List[EvidenceRequirement] = []
    estimated_duration_min: int = 30
    blocking: bool = Field(
        default=True,
        description="Se True, impede avançar sem completar"
    )
    ai_instruction: Optional[str] = Field(
        default=None,
        description="Instrução para IA auxiliar o técnico"
    )
    tags: List[str] = []
    dependencies: List[str] = Field(
        default=[],
        description="IDs de steps que devem ser concluídos antes"
    )


class StepInstance(BaseModel):
    """
    Instância de execução de um step em um job.
    
    Registra a execução real: status, respostas, evidências.
    """
    step_id: str
    status: StepStatus = StepStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    checklist_answers: List[ChecklistAnswer] = []
    evidences: List[Evidence] = []
    notes: Optional[str] = None
    executed_by: Optional[str] = None


# =============================================================================
# MODELOS DE JOB TEMPLATE
# =============================================================================

class JobTemplate(BaseModel):
    """
    Template de job gerado pelo Agente Técnico.
    
    Define a estrutura completa de um tipo de trabalho,
    podendo ser reutilizado para múltiplos condomínios.
    """
    id: str = Field(default_factory=lambda: f"tmpl_{uuid4().hex[:8]}")
    name: str
    description: Optional[str] = None
    version: str = "1.0.0"
    job_type: JobType = JobType.INSTALACAO
    priority: JobPriority = JobPriority.MEDIA
    condominio: CondominioContext
    steps: List[JobStep] = []
    estimated_total_duration_min: int = 0
    tags: List[str] = []
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[str] = None
    
    def calcular_duracao_total(self) -> int:
        """Calcula duração total estimada."""
        total = sum(step.estimated_duration_min for step in self.steps)
        self.estimated_total_duration_min = total
        return total


# =============================================================================
# MODELOS DE JOB INSTANCE
# =============================================================================

class JobInstance(BaseModel):
    """
    Instância real de um job (OS em execução).
    
    Criada a partir de um JobTemplate para execução específica.
    """
    id: str = Field(default_factory=lambda: f"job_{uuid4().hex[:8]}")
    template_id: str
    os_number: Optional[str] = Field(None, description="Número da OS no sistema legado")
    condominio_name: str
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    supervisor_id: Optional[str] = None
    status: JobStatus = JobStatus.DRAFT
    priority: JobPriority = JobPriority.MEDIA
    steps: List[StepInstance] = []
    notes: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def get_progress(self) -> Dict[str, int]:
        """Calcula progresso do job."""
        total = len(self.steps)
        completed = sum(1 for s in self.steps if s.status == StepStatus.COMPLETED)
        in_progress = sum(1 for s in self.steps if s.status == StepStatus.IN_PROGRESS)
        
        return {
            "total_steps": total,
            "completed": completed,
            "in_progress": in_progress,
            "pending": total - completed - in_progress,
            "percent": int((completed / total) * 100) if total > 0 else 0
        }


# =============================================================================
# MODELOS DE REQUEST/UPDATE
# =============================================================================

class StepUpdateRequest(BaseModel):
    """Request para atualizar um step."""
    status: Optional[StepStatus] = None
    checklist_answers: Optional[List[ChecklistAnswer]] = None
    evidences: Optional[List[Evidence]] = None
    notes: Optional[str] = None


class JobUpdateRequest(BaseModel):
    """Request para atualizar um job."""
    status: Optional[JobStatus] = None
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = None


class CreateJobFromTemplateRequest(BaseModel):
    """Request para criar job a partir de template."""
    template_id: str
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    os_number: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    priority: Optional[JobPriority] = None
