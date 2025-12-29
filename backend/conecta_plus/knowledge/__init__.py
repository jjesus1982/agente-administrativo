# -*- coding: utf-8 -*-
"""
Base de Conhecimento - Conecta Plus
===================================

Módulo para armazenar e consultar conhecimento técnico acumulado.
"""

__version__ = "1.0.0"

from .api import router, Conhecimento, HistoricoAtendimento, CategoriaConhecimento

__all__ = [
    "router",
    "Conhecimento",
    "HistoricoAtendimento",
    "CategoriaConhecimento",
]
