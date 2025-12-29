# -*- coding: utf-8 -*-
"""
Conecta Fielder - Módulo de Campo
=================================

Módulo de execução em campo do Conecta Plus.

Responsabilidades:
- Receber JobTemplates do Agente Técnico
- Criar e gerenciar JobInstances (OS reais)
- Registrar execução de steps
- Coletar evidências (fotos, vídeos, notas)
- Gerar relatórios de execução
"""

__version__ = "1.0.0"

from .schemas import (
    JobType,
    JobPriority,
    JobStatus,
    StepStatus,
    StepType,
    EvidenceType,
    ChecklistResponseType,
    ChecklistItem,
    ChecklistAnswer,
    EvidenceRequirement,
    Evidence,
    JobStep,
    StepInstance,
    JobTemplate,
    JobInstance,
    StepUpdateRequest,
    JobUpdateRequest,
    CreateJobFromTemplateRequest,
)
from .api import router

__all__ = [
    # Enums
    "JobType",
    "JobPriority",
    "JobStatus",
    "StepStatus",
    "StepType",
    "EvidenceType",
    "ChecklistResponseType",
    # Models
    "ChecklistItem",
    "ChecklistAnswer",
    "EvidenceRequirement",
    "Evidence",
    "JobStep",
    "StepInstance",
    "JobTemplate",
    "JobInstance",
    "StepUpdateRequest",
    "JobUpdateRequest",
    "CreateJobFromTemplateRequest",
    # API
    "router",
]
