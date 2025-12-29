# -*- coding: utf-8 -*-
"""
Base de Conhecimento
====================

Módulo para armazenar e consultar conhecimento técnico acumulado.

Responsabilidades:
- Armazenar soluções de troubleshooting
- FAQ técnico por fabricante/cenário
- Histórico de atendimentos
- Aprendizado contínuo
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List, Any
from uuid import uuid4
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge", tags=["Base de Conhecimento"])


# =============================================================================
# MODELOS
# =============================================================================

class CategoriaConhecimento(str, Enum):
    FAQ = "faq"
    TROUBLESHOOTING = "troubleshooting"
    PROCEDIMENTO = "procedimento"
    CONFIGURACAO = "configuracao"
    DICA = "dica"


class Conhecimento(BaseModel):
    """Registro na base de conhecimento."""
    id: str = Field(default_factory=lambda: f"kb_{uuid4().hex[:8]}")
    titulo: str
    categoria: CategoriaConhecimento
    fabricante: Optional[str] = None
    modelo: Optional[str] = None
    tags: List[str] = []
    problema: Optional[str] = None
    solucao: str
    passos: List[str] = []
    relevancia: int = Field(default=0, description="Quantas vezes foi útil")
    criado_em: datetime = Field(default_factory=datetime.now)
    atualizado_em: datetime = Field(default_factory=datetime.now)
    criado_por: Optional[str] = None
    fonte: Optional[str] = Field(None, description="Job ID, atendimento, manual, etc.")


class HistoricoAtendimento(BaseModel):
    """Registro de atendimento/resolução."""
    id: str = Field(default_factory=lambda: f"hist_{uuid4().hex[:8]}")
    condominio: str
    data: datetime = Field(default_factory=datetime.now)
    tipo: str  # troubleshooting, instalacao, manutencao
    problema_relatado: str
    solucao_aplicada: str
    tempo_resolucao_min: Optional[int] = None
    tecnico_id: Optional[str] = None
    tecnico_nome: Optional[str] = None
    job_id: Optional[str] = None
    conhecimento_id: Optional[str] = Field(None, description="ID do conhecimento criado/usado")
    sucesso: bool = True
    observacoes: Optional[str] = None


# =============================================================================
# ARMAZENAMENTO EM MEMÓRIA
# =============================================================================

CONHECIMENTOS_DB: Dict[str, Conhecimento] = {}
HISTORICO_DB: Dict[str, HistoricoAtendimento] = {}


# =============================================================================
# ENDPOINTS - CONHECIMENTO
# =============================================================================

@router.post("/artigos", response_model=Conhecimento)
def criar_artigo(artigo: Conhecimento) -> Conhecimento:
    """Cria um novo artigo na base de conhecimento."""
    CONHECIMENTOS_DB[artigo.id] = artigo
    logger.info(f"Artigo criado: {artigo.id} - {artigo.titulo}")
    return artigo


@router.get("/artigos", response_model=List[Conhecimento])
def listar_artigos(
    categoria: Optional[str] = None,
    fabricante: Optional[str] = None,
    tag: Optional[str] = None,
    busca: Optional[str] = None,
    limit: int = 50
) -> List[Conhecimento]:
    """Lista artigos com filtros."""
    artigos = list(CONHECIMENTOS_DB.values())
    
    if categoria:
        artigos = [a for a in artigos if a.categoria.value == categoria]
    
    if fabricante:
        artigos = [a for a in artigos if a.fabricante and fabricante.lower() in a.fabricante.lower()]
    
    if tag:
        artigos = [a for a in artigos if tag.lower() in [t.lower() for t in a.tags]]
    
    if busca:
        busca_lower = busca.lower()
        artigos = [
            a for a in artigos
            if busca_lower in a.titulo.lower()
            or busca_lower in a.solucao.lower()
            or (a.problema and busca_lower in a.problema.lower())
        ]
    
    # Ordena por relevância
    artigos = sorted(artigos, key=lambda a: a.relevancia, reverse=True)
    
    return artigos[:limit]


@router.get("/artigos/{artigo_id}", response_model=Conhecimento)
def obter_artigo(artigo_id: str) -> Conhecimento:
    """Obtém um artigo específico."""
    artigo = CONHECIMENTOS_DB.get(artigo_id)
    if not artigo:
        raise HTTPException(404, "Artigo não encontrado")
    return artigo


@router.post("/artigos/{artigo_id}/util")
def marcar_util(artigo_id: str) -> Dict:
    """Marca um artigo como útil (incrementa relevância)."""
    artigo = CONHECIMENTOS_DB.get(artigo_id)
    if not artigo:
        raise HTTPException(404, "Artigo não encontrado")
    
    artigo.relevancia += 1
    artigo.atualizado_em = datetime.now()
    
    return {"status": "ok", "relevancia": artigo.relevancia}


@router.get("/faq")
def listar_faq(fabricante: Optional[str] = None) -> List[Dict]:
    """Lista FAQ (artigos mais relevantes)."""
    artigos = [
        a for a in CONHECIMENTOS_DB.values()
        if a.categoria == CategoriaConhecimento.FAQ
    ]
    
    if fabricante:
        artigos = [a for a in artigos if a.fabricante and fabricante.lower() in a.fabricante.lower()]
    
    artigos = sorted(artigos, key=lambda a: a.relevancia, reverse=True)[:20]
    
    return [
        {
            "id": a.id,
            "pergunta": a.titulo,
            "resposta": a.solucao,
            "fabricante": a.fabricante,
            "relevancia": a.relevancia
        }
        for a in artigos
    ]


# =============================================================================
# ENDPOINTS - HISTÓRICO
# =============================================================================

@router.post("/historico", response_model=HistoricoAtendimento)
def registrar_atendimento(registro: HistoricoAtendimento) -> HistoricoAtendimento:
    """Registra um atendimento no histórico."""
    HISTORICO_DB[registro.id] = registro
    logger.info(f"Atendimento registrado: {registro.id} - {registro.condominio}")
    return registro


@router.get("/historico", response_model=List[HistoricoAtendimento])
def listar_historico(
    condominio: Optional[str] = None,
    tecnico_id: Optional[str] = None,
    tipo: Optional[str] = None,
    limit: int = 50
) -> List[HistoricoAtendimento]:
    """Lista histórico de atendimentos."""
    registros = list(HISTORICO_DB.values())
    
    if condominio:
        registros = [r for r in registros if condominio.lower() in r.condominio.lower()]
    
    if tecnico_id:
        registros = [r for r in registros if r.tecnico_id == tecnico_id]
    
    if tipo:
        registros = [r for r in registros if r.tipo == tipo]
    
    # Ordena por data (mais recente primeiro)
    registros = sorted(registros, key=lambda r: r.data, reverse=True)
    
    return registros[:limit]


@router.get("/historico/condominio/{condominio}")
def historico_condominio(condominio: str) -> Dict:
    """Obtém histórico completo de um condomínio."""
    registros = [
        r for r in HISTORICO_DB.values()
        if condominio.lower() in r.condominio.lower()
    ]
    
    registros = sorted(registros, key=lambda r: r.data, reverse=True)
    
    # Estatísticas
    total = len(registros)
    sucesso = sum(1 for r in registros if r.sucesso)
    tempo_medio = 0
    if registros:
        tempos = [r.tempo_resolucao_min for r in registros if r.tempo_resolucao_min]
        if tempos:
            tempo_medio = sum(tempos) / len(tempos)
    
    return {
        "condominio": condominio,
        "total_atendimentos": total,
        "taxa_sucesso": (sucesso / total * 100) if total > 0 else 0,
        "tempo_medio_resolucao_min": round(tempo_medio, 1),
        "ultimos_atendimentos": [
            {
                "id": r.id,
                "data": r.data.isoformat(),
                "tipo": r.tipo,
                "problema": r.problema_relatado,
                "sucesso": r.sucesso
            }
            for r in registros[:10]
        ]
    }


# =============================================================================
# ENDPOINTS - BUSCA INTELIGENTE
# =============================================================================

@router.get("/busca")
def busca_inteligente(
    q: str,
    incluir_historico: bool = True
) -> Dict:
    """
    Busca inteligente na base de conhecimento e histórico.
    
    Retorna artigos e atendimentos relacionados à busca.
    """
    q_lower = q.lower()
    
    # Busca em artigos
    artigos = [
        a for a in CONHECIMENTOS_DB.values()
        if q_lower in a.titulo.lower()
        or q_lower in a.solucao.lower()
        or (a.problema and q_lower in a.problema.lower())
        or any(q_lower in tag.lower() for tag in a.tags)
    ]
    artigos = sorted(artigos, key=lambda a: a.relevancia, reverse=True)[:10]
    
    resultado = {
        "query": q,
        "artigos": [
            {
                "id": a.id,
                "titulo": a.titulo,
                "categoria": a.categoria.value,
                "fabricante": a.fabricante,
                "relevancia": a.relevancia
            }
            for a in artigos
        ]
    }
    
    # Busca em histórico
    if incluir_historico:
        historicos = [
            h for h in HISTORICO_DB.values()
            if q_lower in h.problema_relatado.lower()
            or q_lower in h.solucao_aplicada.lower()
            or q_lower in h.condominio.lower()
        ]
        historicos = sorted(historicos, key=lambda h: h.data, reverse=True)[:5]
        
        resultado["historico"] = [
            {
                "id": h.id,
                "condominio": h.condominio,
                "data": h.data.isoformat(),
                "problema": h.problema_relatado[:100],
                "sucesso": h.sucesso
            }
            for h in historicos
        ]
    
    return resultado
