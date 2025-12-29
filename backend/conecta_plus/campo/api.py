# -*- coding: utf-8 -*-
"""
API do Conecta Fielder
======================

Endpoints REST para o módulo de campo do Conecta Plus.

Responsável por:
- Armazenar e expor JobTemplates
- Criar JobInstances (jobs reais/OS)
- Registrar execução de steps
- Coletar evidências
- Gerar relatórios
"""

from __future__ import annotations
from typing import Dict, List, Optional
from datetime import datetime
import logging

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from .schemas import (
    JobTemplate,
    JobInstance,
    JobStep,
    StepInstance,
    StepStatus,
    JobStatus,
    JobPriority,
    StepUpdateRequest,
    JobUpdateRequest,
    CreateJobFromTemplateRequest,
    Evidence,
    EvidenceType,
    ChecklistAnswer,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/campo", tags=["Conecta Fielder"])

# =============================================================================
# ARMAZENAMENTO EM MEMÓRIA (substituir por banco de dados em produção)
# =============================================================================

JOB_TEMPLATES_DB: Dict[str, JobTemplate] = {}
JOBS_DB: Dict[str, JobInstance] = {}


# =============================================================================
# ENDPOINTS - JOB TEMPLATES
# =============================================================================

@router.post("/job-templates", response_model=JobTemplate)
def create_job_template(template: JobTemplate) -> JobTemplate:
    """
    Cria/armazena um JobTemplate.
    
    Este endpoint é alimentado pelo Agente Técnico após gerar um template.
    """
    if template.id in JOB_TEMPLATES_DB:
        raise HTTPException(status_code=400, detail="Template com este ID já existe.")
    
    # Calcula duração total
    template.calcular_duracao_total()
    
    JOB_TEMPLATES_DB[template.id] = template
    logger.info(f"JobTemplate criado: {template.id} - {template.name}")
    
    return template


@router.get("/job-templates", response_model=List[JobTemplate])
def list_job_templates(
    job_type: Optional[str] = None,
    condominio: Optional[str] = None,
    limit: int = 50
) -> List[JobTemplate]:
    """Lista todos os JobTemplates, com filtros opcionais."""
    templates = list(JOB_TEMPLATES_DB.values())
    
    if job_type:
        templates = [t for t in templates if t.job_type.value == job_type]
    
    if condominio:
        templates = [t for t in templates if condominio.lower() in t.condominio.nome.lower()]
    
    return templates[:limit]


@router.get("/job-templates/{template_id}", response_model=JobTemplate)
def get_job_template(template_id: str) -> JobTemplate:
    """Busca um JobTemplate pelo ID."""
    template = JOB_TEMPLATES_DB.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    return template


@router.delete("/job-templates/{template_id}")
def delete_job_template(template_id: str) -> Dict[str, str]:
    """Remove um JobTemplate."""
    if template_id not in JOB_TEMPLATES_DB:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    
    del JOB_TEMPLATES_DB[template_id]
    logger.info(f"JobTemplate removido: {template_id}")
    
    return {"status": "ok", "message": f"Template {template_id} removido"}


# =============================================================================
# ENDPOINTS - JOB INSTANCES
# =============================================================================

@router.post("/jobs/from-template", response_model=JobInstance)
def create_job_from_template(request: CreateJobFromTemplateRequest) -> JobInstance:
    """
    Cria uma JobInstance a partir de um JobTemplate.
    
    Este é o "job real" que o app de campo vai executar.
    Converte cada JobStep em um StepInstance pendente.
    """
    template = JOB_TEMPLATES_DB.get(request.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
    
    # Converte cada JobStep em StepInstance
    steps_instances = [
        StepInstance(step_id=step.id)
        for step in sorted(template.steps, key=lambda s: s.order)
    ]
    
    job = JobInstance(
        template_id=template.id,
        os_number=request.os_number,
        condominio_name=template.condominio.nome,
        technician_id=request.technician_id,
        technician_name=request.technician_name,
        priority=request.priority or template.priority,
        status=JobStatus.RELEASED if request.technician_id else JobStatus.DRAFT,
        steps=steps_instances,
        scheduled_date=request.scheduled_date,
    )
    
    JOBS_DB[job.id] = job
    logger.info(f"Job criado: {job.id} - OS: {job.os_number or 'N/A'}")
    
    return job


@router.get("/jobs", response_model=List[JobInstance])
def list_jobs(
    status: Optional[str] = None,
    technician_id: Optional[str] = None,
    condominio: Optional[str] = None,
    limit: int = 50
) -> List[JobInstance]:
    """Lista todos os jobs, com filtros opcionais."""
    jobs = list(JOBS_DB.values())
    
    if status:
        jobs = [j for j in jobs if j.status.value == status]
    
    if technician_id:
        jobs = [j for j in jobs if j.technician_id == technician_id]
    
    if condominio:
        jobs = [j for j in jobs if condominio.lower() in j.condominio_name.lower()]
    
    # Ordena por data de criação (mais recentes primeiro)
    jobs = sorted(jobs, key=lambda j: j.created_at, reverse=True)
    
    return jobs[:limit]


@router.get("/jobs/{job_id}", response_model=JobInstance)
def get_job(job_id: str) -> JobInstance:
    """Busca um job pelo ID."""
    job = JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return job


@router.get("/jobs/{job_id}/progress")
def get_job_progress(job_id: str) -> Dict:
    """Obtém progresso de um job."""
    job = JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    
    return {
        "job_id": job_id,
        "status": job.status.value,
        "progress": job.get_progress()
    }


@router.patch("/jobs/{job_id}", response_model=JobInstance)
def update_job(job_id: str, update: JobUpdateRequest) -> JobInstance:
    """Atualiza um job."""
    job = JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    
    if update.status:
        job.status = update.status
        if update.status == JobStatus.IN_PROGRESS and not job.started_at:
            job.started_at = datetime.now()
        elif update.status == JobStatus.COMPLETED:
            job.completed_at = datetime.now()
    
    if update.technician_id is not None:
        job.technician_id = update.technician_id
    
    if update.technician_name is not None:
        job.technician_name = update.technician_name
    
    if update.scheduled_date is not None:
        job.scheduled_date = update.scheduled_date
    
    if update.notes is not None:
        job.notes = update.notes
    
    job.updated_at = datetime.now()
    
    logger.info(f"Job atualizado: {job_id}")
    return job


# =============================================================================
# ENDPOINTS - STEPS
# =============================================================================

@router.get("/jobs/{job_id}/steps")
def get_job_steps(job_id: str) -> List[Dict]:
    """Lista steps de um job com informações do template."""
    job = JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    
    template = JOB_TEMPLATES_DB.get(job.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template do job não encontrado.")
    
    # Combina informações do template com status da instância
    result = []
    for step_instance in job.steps:
        step_def = next(
            (s for s in template.steps if s.id == step_instance.step_id),
            None
        )
        
        if step_def:
            result.append({
                "step_id": step_instance.step_id,
                "order": step_def.order,
                "title": step_def.title,
                "description": step_def.description,
                "step_type": step_def.step_type.value,
                "status": step_instance.status.value,
                "checklist_items": [item.dict() for item in step_def.checklist_items],
                "evidence_requirements": [req.dict() for req in step_def.evidence_requirements],
                "checklist_answers": [ans.dict() for ans in step_instance.checklist_answers],
                "evidences": [ev.dict() for ev in step_instance.evidences],
                "estimated_duration_min": step_def.estimated_duration_min,
                "blocking": step_def.blocking,
                "ai_instruction": step_def.ai_instruction,
            })
    
    return sorted(result, key=lambda x: x["order"])


@router.patch("/jobs/{job_id}/steps/{step_id}", response_model=JobInstance)
def update_step(
    job_id: str,
    step_id: str,
    update: StepUpdateRequest
) -> JobInstance:
    """
    Atualiza o status, respostas de checklist e evidências de um step.
    
    Este endpoint é chamado pelo app de campo conforme o técnico avança.
    """
    job = JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    
    step_instance = next((s for s in job.steps if s.step_id == step_id), None)
    if not step_instance:
        raise HTTPException(status_code=404, detail="Step não encontrado no job.")
    
    # Atualiza status
    if update.status:
        step_instance.status = update.status
        if update.status == StepStatus.IN_PROGRESS and not step_instance.started_at:
            step_instance.started_at = datetime.now()
        elif update.status == StepStatus.COMPLETED:
            step_instance.completed_at = datetime.now()
    
    # Adiciona respostas de checklist
    if update.checklist_answers:
        for answer in update.checklist_answers:
            # Remove resposta anterior do mesmo item (se existir)
            step_instance.checklist_answers = [
                a for a in step_instance.checklist_answers
                if a.item_code != answer.item_code
            ]
            step_instance.checklist_answers.append(answer)
    
    # Adiciona evidências
    if update.evidences:
        step_instance.evidences.extend(update.evidences)
    
    # Atualiza notas
    if update.notes is not None:
        step_instance.notes = update.notes
    
    job.updated_at = datetime.now()
    
    # Atualiza status do job se necessário
    _update_job_status_from_steps(job)
    
    logger.info(f"Step {step_id} atualizado no job {job_id}")
    return job


def _update_job_status_from_steps(job: JobInstance) -> None:
    """Atualiza status do job baseado nos steps."""
    total = len(job.steps)
    completed = sum(1 for s in job.steps if s.status == StepStatus.COMPLETED)
    in_progress = sum(1 for s in job.steps if s.status == StepStatus.IN_PROGRESS)
    
    if completed == total:
        job.status = JobStatus.PENDING_REVIEW
    elif in_progress > 0 or completed > 0:
        job.status = JobStatus.IN_PROGRESS
        if not job.started_at:
            job.started_at = datetime.now()


# =============================================================================
# ENDPOINTS - EVIDÊNCIAS
# =============================================================================

@router.post("/jobs/{job_id}/steps/{step_id}/evidence")
async def upload_evidence(
    job_id: str,
    step_id: str,
    evidence_type: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(None),
    content: str = Form(None),
    measurement_value: float = Form(None),
    measurement_unit: str = Form(None),
    latitude: float = Form(None),
    longitude: float = Form(None),
) -> Dict:
    """
    Faz upload de evidência para um step.
    
    Suporta: fotos, vídeos, notas, medições, localização.
    """
    job = JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    
    step_instance = next((s for s in job.steps if s.step_id == step_id), None)
    if not step_instance:
        raise HTTPException(status_code=404, detail="Step não encontrado.")
    
    # Cria evidência
    evidence = Evidence(
        type=EvidenceType(evidence_type),
        description=description,
        content=content,
        measurement_value=measurement_value,
        measurement_unit=measurement_unit,
        location_lat=latitude,
        location_lng=longitude,
    )
    
    # Processa arquivo se enviado
    if file:
        # Em produção: salvar em S3, GCS ou storage local
        file_content = await file.read()
        evidence.file_name = file.filename
        evidence.file_size_bytes = len(file_content)
        evidence.file_url = f"/storage/evidences/{job_id}/{step_id}/{evidence.id}_{file.filename}"
        # TODO: Salvar arquivo no storage
    
    step_instance.evidences.append(evidence)
    job.updated_at = datetime.now()
    
    logger.info(f"Evidência adicionada: {evidence.id} ao step {step_id}")
    
    return {
        "status": "ok",
        "evidence_id": evidence.id,
        "message": "Evidência registrada com sucesso"
    }


# =============================================================================
# ENDPOINTS - RELATÓRIOS
# =============================================================================

@router.get("/jobs/{job_id}/report")
def get_job_report(job_id: str) -> Dict:
    """Gera relatório completo de um job."""
    job = JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    
    template = JOB_TEMPLATES_DB.get(job.template_id)
    
    # Calcula estatísticas
    progress = job.get_progress()
    total_evidences = sum(len(s.evidences) for s in job.steps)
    total_answers = sum(len(s.checklist_answers) for s in job.steps)
    
    # Duração real
    duracao_real = None
    if job.started_at and job.completed_at:
        duracao_real = int((job.completed_at - job.started_at).total_seconds() / 60)
    
    return {
        "job_id": job.id,
        "os_number": job.os_number,
        "condominio": job.condominio_name,
        "template_name": template.name if template else "N/A",
        "job_type": template.job_type.value if template else "N/A",
        "status": job.status.value,
        "priority": job.priority.value,
        "technician": {
            "id": job.technician_id,
            "name": job.technician_name
        },
        "progress": progress,
        "statistics": {
            "total_steps": progress["total_steps"],
            "completed_steps": progress["completed"],
            "total_evidences": total_evidences,
            "total_checklist_answers": total_answers,
            "estimated_duration_min": template.estimated_total_duration_min if template else 0,
            "actual_duration_min": duracao_real
        },
        "timeline": {
            "created_at": job.created_at.isoformat(),
            "scheduled_date": job.scheduled_date.isoformat() if job.scheduled_date else None,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        },
        "notes": job.notes
    }


# =============================================================================
# ENDPOINTS - DASHBOARD
# =============================================================================

@router.get("/dashboard/summary")
def get_dashboard_summary() -> Dict:
    """Retorna resumo para dashboard."""
    jobs = list(JOBS_DB.values())
    templates = list(JOB_TEMPLATES_DB.values())
    
    # Conta por status
    status_count = {}
    for job in jobs:
        status = job.status.value
        status_count[status] = status_count.get(status, 0) + 1
    
    # Jobs recentes
    recent_jobs = sorted(jobs, key=lambda j: j.created_at, reverse=True)[:5]
    
    return {
        "total_templates": len(templates),
        "total_jobs": len(jobs),
        "jobs_by_status": status_count,
        "recent_jobs": [
            {
                "id": j.id,
                "os_number": j.os_number,
                "condominio": j.condominio_name,
                "status": j.status.value,
                "progress": j.get_progress()["percent"]
            }
            for j in recent_jobs
        ]
    }


@router.get("/dashboard/technician/{technician_id}")
def get_technician_dashboard(technician_id: str) -> Dict:
    """Retorna dashboard específico de um técnico."""
    jobs = [j for j in JOBS_DB.values() if j.technician_id == technician_id]
    
    active_jobs = [j for j in jobs if j.status in (JobStatus.RELEASED, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS)]
    completed_jobs = [j for j in jobs if j.status == JobStatus.COMPLETED]
    
    return {
        "technician_id": technician_id,
        "total_jobs": len(jobs),
        "active_jobs": len(active_jobs),
        "completed_jobs": len(completed_jobs),
        "jobs": [
            {
                "id": j.id,
                "os_number": j.os_number,
                "condominio": j.condominio_name,
                "status": j.status.value,
                "priority": j.priority.value,
                "progress": j.get_progress()
            }
            for j in active_jobs
        ]
    }
