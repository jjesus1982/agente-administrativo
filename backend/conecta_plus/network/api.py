# -*- coding: utf-8 -*-
"""
Network API
===========

Endpoints REST para o módulo de rede:
- Scan de rede
- CMDB (CIs)
- Change Records
- Configuração de dispositivos
- Relatórios ITIL
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field

from .schemas import (
    NetworkScanRequest,
    NetworkScanResult,
    NetworkDeviceCI,
    NetworkConfig,
    NetworkChangeRecord,
    DeviceCredentials,
    ApplyConfigRequest,
    CICreateRequest,
    CIUpdateRequest,
    DeviceType,
    DeviceStatus,
    ChangeStatus,
)
from .cmdb import get_cmdb
from .orchestrator import get_network_orchestrator
from .itil_reporter import (
    gerar_change_record_itil,
    gerar_resumo_cliente,
    gerar_historico_ci,
)

router = APIRouter(prefix="/network", tags=["Network - CMDB & ITIL"])


# =============================================================================
# MODELOS DE REQUEST/RESPONSE
# =============================================================================

class ScanResponse(BaseModel):
    """Resposta do scan."""
    scan_id: str
    total_devices: int
    devices: List[Dict]
    duration_seconds: float
    cis_updated: int


class ProvisionRequest(BaseModel):
    """Request para provisionamento em lote."""
    condominio_nome: str
    ip_plan: Dict[str, str] = Field(..., description="Mapa IP atual -> novo IP")
    username: str = "admin"
    password: str = "admin"
    job_id: Optional[str] = None


class ReportRequest(BaseModel):
    """Request para gerar relatório."""
    job_id: Optional[str] = None
    ci_ids: Optional[List[str]] = None
    change_ids: Optional[List[str]] = None
    aprovador: Optional[str] = None
    riscos: Optional[List[str]] = None


# =============================================================================
# ENDPOINTS - SCAN
# =============================================================================

@router.post("/scan", response_model=ScanResponse)
async def scan_network(request: NetworkScanRequest) -> ScanResponse:
    """
    Escaneia a rede e atualiza o CMDB.
    
    Descobre dispositivos IP, identifica fabricante e tipo,
    e atualiza o banco de dados de Configuration Items.
    """
    orchestrator = get_network_orchestrator()
    
    result = await orchestrator.discover_network(request)
    
    # Conta CIs atualizados
    cmdb = get_cmdb()
    cis = cmdb.list_cis(condominio_nome=request.condominio_nome)
    
    return ScanResponse(
        scan_id=result.id,
        total_devices=result.total_devices_found,
        devices=[
            {
                "ip": d.ip_address,
                "mac": d.mac_address,
                "vendor": d.vendor,
                "type": d.device_type.value,
                "hostname": d.hostname,
                "ports": d.open_ports,
            }
            for d in result.devices
        ],
        duration_seconds=result.duration_seconds,
        cis_updated=len(cis)
    )


@router.post("/scan/quick")
async def quick_scan(
    subnet: str = Query(..., description="Subnet CIDR"),
    condominio: str = Query("Desconhecido", description="Nome do condomínio")
) -> Dict:
    """
    Scan rápido de uma subnet.
    
    Retorna lista simplificada de dispositivos encontrados.
    """
    request = NetworkScanRequest(
        condominio_nome=condominio,
        subnets=[subnet],
        scan_ports=False
    )
    
    orchestrator = get_network_orchestrator()
    result = await orchestrator.discover_network(request)
    
    return {
        "subnet": subnet,
        "total": result.total_devices_found,
        "devices": [
            {"ip": d.ip_address, "mac": d.mac_address, "vendor": d.vendor}
            for d in result.devices
        ]
    }


# =============================================================================
# ENDPOINTS - CMDB (CIs)
# =============================================================================

@router.get("/cis", response_model=List[Dict])
def list_cis(
    condominio: Optional[str] = None,
    device_type: Optional[DeviceType] = None,
    status: Optional[DeviceStatus] = None,
    managed_only: bool = False,
    critical_only: bool = False,
) -> List[Dict]:
    """
    Lista Configuration Items com filtros.
    """
    cmdb = get_cmdb()
    
    cis = cmdb.list_cis(
        condominio_nome=condominio,
        device_type=device_type,
        status=status,
        managed_only=managed_only,
        critical_only=critical_only,
    )
    
    return [
        {
            "id": ci.id,
            "ip": ci.ip_address,
            "mac": ci.mac_address,
            "type": ci.device_type.value,
            "fabricante": ci.fabricante,
            "modelo": ci.modelo,
            "localizacao": ci.localizacao,
            "condominio": ci.condominio_nome,
            "status": ci.status.value,
            "critical": ci.critical,
            "managed": ci.managed_by_conecta,
            "last_seen": ci.last_seen_at.isoformat() if ci.last_seen_at else None,
        }
        for ci in cis
    ]


@router.get("/cis/{ci_id}")
def get_ci(ci_id: str) -> Dict:
    """
    Obtém detalhes de um CI.
    """
    cmdb = get_cmdb()
    ci = cmdb.get_ci_by_id(ci_id)
    
    if not ci:
        raise HTTPException(404, "CI não encontrado")
    
    return {
        "id": ci.id,
        "ip": ci.ip_address,
        "mac": ci.mac_address,
        "hostname": ci.hostname,
        "type": ci.device_type.value,
        "fabricante": ci.fabricante,
        "modelo": ci.modelo,
        "firmware": ci.firmware_version,
        "serial": ci.serial_number,
        "localizacao": ci.localizacao,
        "nome_amigavel": ci.nome_amigavel,
        "condominio": ci.condominio_nome,
        "status": ci.status.value,
        "critical": ci.critical,
        "managed": ci.managed_by_conecta,
        "tags": ci.tags,
        "network_config": ci.network_config.dict() if ci.network_config else None,
        "last_seen": ci.last_seen_at.isoformat() if ci.last_seen_at else None,
        "last_config_change": ci.last_config_change_at.isoformat() if ci.last_config_change_at else None,
        "created_at": ci.created_at.isoformat(),
        "updated_at": ci.updated_at.isoformat(),
    }


@router.post("/cis")
def create_ci(request: CICreateRequest) -> Dict:
    """
    Cria um novo CI manualmente.
    """
    cmdb = get_cmdb()
    
    # Verifica se já existe
    existing = cmdb.get_ci_by_ip(request.ip_address)
    if existing:
        raise HTTPException(400, f"Já existe CI com IP {request.ip_address}")
    
    ci = NetworkDeviceCI(
        condominio_nome=request.condominio_nome,
        ip_address=request.ip_address,
        device_type=request.device_type,
        localizacao=request.localizacao,
        nome_amigavel=request.nome_amigavel,
        fabricante=request.fabricante,
        modelo=request.modelo,
        mac_address=request.mac_address,
        tags=request.tags,
        managed_by_conecta=request.managed_by_conecta,
        critical=request.critical,
    )
    
    cmdb.create_ci(ci)
    
    return {"id": ci.id, "message": "CI criado com sucesso"}


@router.patch("/cis/{ci_id}")
def update_ci(ci_id: str, request: CIUpdateRequest) -> Dict:
    """
    Atualiza um CI.
    """
    cmdb = get_cmdb()
    
    updates = request.dict(exclude_unset=True, exclude_none=True)
    
    ci = cmdb.update_ci(ci_id, updates)
    
    if not ci:
        raise HTTPException(404, "CI não encontrado")
    
    return {"id": ci.id, "message": "CI atualizado com sucesso"}


@router.delete("/cis/{ci_id}")
def delete_ci(ci_id: str) -> Dict:
    """
    Remove um CI.
    """
    cmdb = get_cmdb()
    
    if not cmdb.delete_ci(ci_id):
        raise HTTPException(404, "CI não encontrado")
    
    return {"message": "CI removido com sucesso"}


@router.get("/cis/by-ip/{ip}")
def get_ci_by_ip(ip: str) -> Dict:
    """
    Busca CI por IP.
    """
    cmdb = get_cmdb()
    ci = cmdb.get_ci_by_ip(ip)
    
    if not ci:
        raise HTTPException(404, "CI não encontrado")
    
    return {"id": ci.id, "ip": ci.ip_address, "type": ci.device_type.value}


# =============================================================================
# ENDPOINTS - CONFIGURAÇÃO
# =============================================================================

@router.post("/cis/{ci_id}/apply-config")
async def apply_config(ci_id: str, request: ApplyConfigRequest) -> Dict:
    """
    Aplica configuração de rede em um CI.
    
    Conecta no dispositivo, faz backup, aplica config e registra change record.
    """
    request.ci_id = ci_id
    
    orchestrator = get_network_orchestrator()
    
    try:
        change = await orchestrator.apply_network_config(request)
        
        return {
            "change_id": change.id,
            "success": change.success,
            "status": change.status.value,
            "message": change.error_message if not change.success else "Configuração aplicada",
            "backup_id": change.backup_id if change.backup_created else None,
        }
        
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/provision")
async def provision_devices(request: ProvisionRequest) -> Dict:
    """
    Provisiona múltiplos dispositivos com novo plano de IPs.
    """
    orchestrator = get_network_orchestrator()
    
    credentials = DeviceCredentials(
        username=request.username,
        password=request.password
    )
    
    changes = await orchestrator.provision_devices(
        condominio_nome=request.condominio_nome,
        ip_plan=request.ip_plan,
        credentials=credentials,
        job_id=request.job_id
    )
    
    return {
        "total": len(changes),
        "success": sum(1 for c in changes if c.success),
        "failed": sum(1 for c in changes if not c.success),
        "changes": [
            {
                "id": c.id,
                "ci_id": c.ci_id,
                "success": c.success,
                "error": c.error_message,
            }
            for c in changes
        ]
    }


# =============================================================================
# ENDPOINTS - CHANGE RECORDS
# =============================================================================

@router.get("/changes", response_model=List[Dict])
def list_changes(
    ci_id: Optional[str] = None,
    condominio: Optional[str] = None,
    job_id: Optional[str] = None,
    status: Optional[ChangeStatus] = None,
    limit: int = 50,
) -> List[Dict]:
    """
    Lista Change Records com filtros.
    """
    cmdb = get_cmdb()
    
    changes = cmdb.list_changes(
        ci_id=ci_id,
        condominio_nome=condominio,
        job_id=job_id,
        status=status,
        limit=limit,
    )
    
    return [
        {
            "id": c.id,
            "ci_id": c.ci_id,
            "condominio": c.condominio_nome,
            "type": c.change_type.value,
            "title": c.title,
            "status": c.status.value,
            "success": c.success,
            "risk": c.risk_level.value,
            "started_at": c.started_at.isoformat() if c.started_at else None,
            "finished_at": c.finished_at.isoformat() if c.finished_at else None,
        }
        for c in changes
    ]


@router.get("/changes/{change_id}")
def get_change(change_id: str) -> Dict:
    """
    Obtém detalhes de um Change Record.
    """
    cmdb = get_cmdb()
    change = cmdb.get_change_by_id(change_id)
    
    if not change:
        raise HTTPException(404, "Change Record não encontrado")
    
    return {
        "id": change.id,
        "ci_id": change.ci_id,
        "condominio": change.condominio_nome,
        "job_id": change.job_id,
        "type": change.change_type.value,
        "title": change.title,
        "description": change.description,
        "risk_level": change.risk_level.value,
        "approval_status": change.approval_status.value,
        "status": change.status.value,
        "success": change.success,
        "error_message": change.error_message,
        "backup_created": change.backup_created,
        "backup_id": change.backup_id,
        "previous_config": change.previous_config.dict() if change.previous_config else None,
        "new_config": change.new_config.dict() if change.new_config else None,
        "requested_by": change.requested_by,
        "executed_by": change.executed_by,
        "started_at": change.started_at.isoformat() if change.started_at else None,
        "finished_at": change.finished_at.isoformat() if change.finished_at else None,
        "tests_performed": change.tests_performed,
        "tests_passed": change.tests_passed,
    }


# =============================================================================
# ENDPOINTS - RELATÓRIOS ITIL
# =============================================================================

@router.post("/reports/change-record")
def generate_change_record_report(request: ReportRequest) -> Dict:
    """
    Gera relatório ITIL Change Record em Markdown.
    """
    cmdb = get_cmdb()
    
    # Busca changes
    if request.change_ids:
        changes = [cmdb.get_change_by_id(cid) for cid in request.change_ids]
        changes = [c for c in changes if c]
    elif request.job_id:
        changes = cmdb.list_changes(job_id=request.job_id)
    else:
        raise HTTPException(400, "Informe change_ids ou job_id")
    
    if not changes:
        raise HTTPException(404, "Nenhum change record encontrado")
    
    # Busca CIs
    cis = []
    if request.ci_ids:
        cis = [cmdb.get_ci_by_id(cid) for cid in request.ci_ids]
        cis = [c for c in cis if c]
    
    # Gera relatório
    report = gerar_change_record_itil(
        changes=changes,
        cis=cis,
        job_id=request.job_id,
        riscos_identificados=request.riscos,
        aprovador=request.aprovador,
    )
    
    return {
        "format": "markdown",
        "report": report
    }


@router.post("/reports/cliente")
def generate_client_report(request: ReportRequest) -> Dict:
    """
    Gera relatório simplificado para o cliente.
    """
    cmdb = get_cmdb()
    
    if request.job_id:
        changes = cmdb.list_changes(job_id=request.job_id)
    elif request.change_ids:
        changes = [cmdb.get_change_by_id(cid) for cid in request.change_ids]
        changes = [c for c in changes if c]
    else:
        raise HTTPException(400, "Informe change_ids ou job_id")
    
    if not changes:
        raise HTTPException(404, "Nenhum change record encontrado")
    
    condominio = changes[0].condominio_nome
    
    report = gerar_resumo_cliente(
        changes=changes,
        condominio=condominio,
    )
    
    return {
        "format": "markdown",
        "report": report
    }


@router.get("/reports/ci/{ci_id}/history")
def get_ci_history_report(ci_id: str) -> Dict:
    """
    Gera relatório de histórico de um CI.
    """
    cmdb = get_cmdb()
    
    ci = cmdb.get_ci_by_id(ci_id)
    if not ci:
        raise HTTPException(404, "CI não encontrado")
    
    changes = cmdb.list_changes(ci_id=ci_id)
    
    report = gerar_historico_ci(ci, changes)
    
    return {
        "format": "markdown",
        "report": report
    }


# =============================================================================
# ENDPOINTS - ESTATÍSTICAS
# =============================================================================

@router.get("/stats")
def get_stats() -> Dict:
    """
    Estatísticas do módulo de rede.
    """
    orchestrator = get_network_orchestrator()
    return orchestrator.get_stats()


@router.get("/stats/condominio/{nome}")
def get_stats_condominio(nome: str) -> Dict:
    """
    Estatísticas de um condomínio específico.
    """
    cmdb = get_cmdb()
    
    cis = cmdb.list_cis(condominio_nome=nome)
    changes = cmdb.list_changes(condominio_nome=nome)
    
    # Contagem por tipo
    by_type = {}
    for ci in cis:
        tipo = ci.device_type.value
        by_type[tipo] = by_type.get(tipo, 0) + 1
    
    # Contagem por status
    by_status = {}
    for ci in cis:
        status = ci.status.value
        by_status[status] = by_status.get(status, 0) + 1
    
    return {
        "condominio": nome,
        "total_cis": len(cis),
        "total_changes": len(changes),
        "cis_by_type": by_type,
        "cis_by_status": by_status,
        "managed_cis": sum(1 for ci in cis if ci.managed_by_conecta),
        "critical_cis": sum(1 for ci in cis if ci.critical),
        "changes_success": sum(1 for c in changes if c.success),
        "changes_failed": sum(1 for c in changes if not c.success),
    }
