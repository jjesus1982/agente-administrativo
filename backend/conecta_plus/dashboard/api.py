# -*- coding: utf-8 -*-
"""
API do Dashboard
================

Endpoints para dashboard e estatísticas do condomínio.
"""

from __future__ import annotations
from typing import Dict, Any
from fastapi import APIRouter, Query
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/dashboard", tags=["dashboard"])

@router.get("/stats-completo")
async def get_stats_completo(tenant_id: int = Query(...)):
    """
    Retorna estatísticas completas do condomínio.

    Args:
        tenant_id: ID do condomínio

    Returns:
        Estatísticas completas do dashboard
    """
    logger.info(f"Buscando stats completo para tenant {tenant_id}")

    # Dados mockados para demonstração
    stats = {
        "gestao": {
            "unidades": 120,
            "moradores": 340,
            "dependentes": 85,
            "veiculos": 180,
            "pets": 45
        },
        "visitantes": {
            "total": 1250,
            "hoje": 15,
            "semana": 95
        },
        "manutencao": {
            "total": 45,
            "abertos": 8,
            "em_andamento": 12,
            "concluidos": 25
        },
        "ocorrencias": {
            "total": 23,
            "abertas": 3,
            "em_andamento": 5,
            "resolvidas": 15
        },
        "comunicados": {
            "total": 28,
            "fixados": 5,
            "visualizacoes": 2340,
            "comentarios": 156
        },
        "pesquisas": {
            "total": 8,
            "ativas": 2,
            "votos": 234
        },
        "documentos": {
            "arquivos": 156,
            "pastas": 12,
            "tamanho_bytes": 1024000000
        },
        "classificados": {
            "total": 18,
            "ativos": 12
        },
        "acessos": {
            "pendentes": 5,
            "aprovados": 145
        },
        "reservas": {
            "areas_comuns": 8,
            "futuras": 15
        },
        "encomendas": {
            "pendentes": 12,
            "entregues": 89,
            "total": 101
        },
        "votacoes": {
            "ativas": 1,
            "total": 5,
            "participacao": 67
        }
    }

    return stats


@router.get("/atividades-recentes")
async def get_atividades_recentes(tenant_id: int = Query(...)):
    """
    Retorna atividades recentes do condomínio.

    Args:
        tenant_id: ID do condomínio

    Returns:
        Lista de atividades recentes
    """
    logger.info(f"Buscando atividades recentes para tenant {tenant_id}")

    # Dados mockados para demonstração
    atividades = [
        {
            "tipo": "visitante",
            "id": 1,
            "titulo": "Visitante João Silva registrou entrada",
            "data": "2024-12-29T14:30:00Z",
            "icone": "user-plus"
        },
        {
            "tipo": "manutencao",
            "id": 2,
            "titulo": "Chamado #123 - Lâmpada queimada Bloco A",
            "data": "2024-12-29T13:45:00Z",
            "icone": "wrench"
        },
        {
            "tipo": "comunicado",
            "id": 3,
            "titulo": "Novo comunicado: Assembleia Geral",
            "data": "2024-12-29T12:15:00Z",
            "icone": "megaphone"
        },
        {
            "tipo": "reserva",
            "id": 4,
            "titulo": "Churrasqueira reservada para dia 31/12",
            "data": "2024-12-29T11:00:00Z",
            "icone": "calendar"
        },
        {
            "tipo": "ocorrencia",
            "id": 5,
            "titulo": "Nova ocorrência: Ruído excessivo Apto 201",
            "data": "2024-12-29T10:30:00Z",
            "icone": "alert-triangle"
        }
    ]

    return atividades


@router.get("/stats")
async def get_stats_basic(tenant_id: int = Query(...)):
    """
    Retorna estatísticas básicas do dashboard.

    Args:
        tenant_id: ID do condomínio

    Returns:
        Estatísticas básicas
    """
    logger.info(f"Buscando stats básico para tenant {tenant_id}")

    return {
        "total_unidades": 120,
        "total_moradores": 340,
        "visitantes_hoje": 15,
        "chamados_abertos": 8,
        "comunicados_nao_lidos": 5
    }