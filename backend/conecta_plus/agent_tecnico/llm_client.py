# -*- coding: utf-8 -*-
"""
Cliente LLM - Interface Genérica
================================

Interface abstrata e implementações para clientes de LLM.
Suporta OpenAI, Anthropic Claude e modo simulação.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime
import os
import logging
import time

logger = logging.getLogger(__name__)


# =============================================================================
# EXCEPTIONS
# =============================================================================

class LLMError(Exception):
    """Erro base para operações de LLM."""
    pass


class LLMConnectionError(LLMError):
    """Erro de conexão com o provedor."""
    pass


class LLMRateLimitError(LLMError):
    """Erro de rate limit."""
    pass


class LLMAuthError(LLMError):
    """Erro de autenticação."""
    pass


# =============================================================================
# MODELOS DE RESPOSTA
# =============================================================================

@dataclass
class LLMResponse:
    """Resposta de uma chamada ao LLM."""
    texto: str
    tokens_entrada: int = 0
    tokens_saida: int = 0
    tokens_total: int = 0
    modelo: str = ""
    tempo_processamento_ms: int = 0
    metadata: Optional[Dict[str, Any]] = None


# =============================================================================
# INTERFACE BASE
# =============================================================================

class BaseLLMClient(ABC):
    """
    Interface mínima para um cliente de LLM.
    
    Todas as implementações (OpenAI, Claude, etc.) devem herdar desta classe.
    """
    
    @abstractmethod
    def generate(self, prompt: str, *, max_tokens: int = 2048) -> str:
        """
        Gera um texto a partir de um prompt.
        
        Args:
            prompt: Texto do prompt.
            max_tokens: Máximo de tokens na resposta.
        
        Returns:
            Texto gerado.
        """
        raise NotImplementedError
    
    @abstractmethod
    def generate_with_metadata(
        self,
        prompt: str,
        *,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> LLMResponse:
        """
        Gera texto com metadados completos.
        
        Args:
            prompt: Texto do prompt.
            max_tokens: Máximo de tokens na resposta.
            temperature: Temperatura (criatividade) da geração.
        
        Returns:
            LLMResponse com texto e metadados.
        """
        raise NotImplementedError


# =============================================================================
# IMPLEMENTAÇÃO DUMMY (TESTES)
# =============================================================================

class DummyLLMClient(BaseLLMClient):
    """
    Implementação de teste/simulação.
    
    Útil para desenvolvimento e testes sem consumir API real.
    """
    
    def __init__(self):
        logger.info("DummyLLMClient inicializado (modo simulação)")
    
    def generate(self, prompt: str, *, max_tokens: int = 2048) -> str:
        preview = prompt[:400].replace("\n", " ")
        return (
            "[SIMULAÇÃO LLM]\n\n"
            "Este é um retorno simulado do modelo de linguagem. "
            "Configure OPENAI_API_KEY ou ANTHROPIC_API_KEY para usar um provedor real.\n\n"
            f"Pré-visualização do prompt recebido (até 400 caracteres):\n{preview}"
        )
    
    def generate_with_metadata(
        self,
        prompt: str,
        *,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> LLMResponse:
        texto = self.generate(prompt, max_tokens=max_tokens)
        return LLMResponse(
            texto=texto,
            tokens_entrada=len(prompt.split()),
            tokens_saida=len(texto.split()),
            tokens_total=len(prompt.split()) + len(texto.split()),
            modelo="dummy",
            tempo_processamento_ms=10
        )


# =============================================================================
# IMPLEMENTAÇÃO OPENAI
# =============================================================================

class OpenAILLMClient(BaseLLMClient):
    """
    Cliente para API da OpenAI (GPT-4, GPT-4o, etc.).
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o",
        base_url: Optional[str] = None
    ):
        """
        Inicializa cliente OpenAI.
        
        Args:
            api_key: Chave da API (ou usa OPENAI_API_KEY do ambiente).
            model: Modelo a usar (gpt-4o, gpt-4-turbo, etc.).
            base_url: URL base customizada (para proxies).
        """
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("Instale o pacote openai: pip install openai")
        
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise LLMAuthError("OPENAI_API_KEY não configurada")
        
        self.model = model
        self.client = OpenAI(api_key=self.api_key, base_url=base_url)
        
        logger.info(f"OpenAILLMClient inicializado com modelo {model}")
    
    def generate(self, prompt: str, *, max_tokens: int = 2048) -> str:
        response = self.generate_with_metadata(prompt, max_tokens=max_tokens)
        return response.texto
    
    def generate_with_metadata(
        self,
        prompt: str,
        *,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> LLMResponse:
        inicio = time.time()
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Você é um assistente técnico especializado."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            tempo_ms = int((time.time() - inicio) * 1000)
            
            return LLMResponse(
                texto=response.choices[0].message.content or "",
                tokens_entrada=response.usage.prompt_tokens if response.usage else 0,
                tokens_saida=response.usage.completion_tokens if response.usage else 0,
                tokens_total=response.usage.total_tokens if response.usage else 0,
                modelo=response.model,
                tempo_processamento_ms=tempo_ms,
                metadata={"id": response.id}
            )
            
        except Exception as e:
            logger.error(f"Erro OpenAI: {e}")
            if "rate_limit" in str(e).lower():
                raise LLMRateLimitError(str(e))
            if "auth" in str(e).lower() or "api_key" in str(e).lower():
                raise LLMAuthError(str(e))
            raise LLMError(str(e))


# =============================================================================
# IMPLEMENTAÇÃO ANTHROPIC (CLAUDE)
# =============================================================================

class ClaudeLLMClient(BaseLLMClient):
    """
    Cliente para API da Anthropic (Claude).
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-20250514"
    ):
        """
        Inicializa cliente Claude.
        
        Args:
            api_key: Chave da API (ou usa ANTHROPIC_API_KEY do ambiente).
            model: Modelo a usar.
        """
        try:
            from anthropic import Anthropic
        except ImportError:
            raise ImportError("Instale o pacote anthropic: pip install anthropic")
        
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise LLMAuthError("ANTHROPIC_API_KEY não configurada")
        
        self.model = model
        self.client = Anthropic(api_key=self.api_key)
        
        logger.info(f"ClaudeLLMClient inicializado com modelo {model}")
    
    def generate(self, prompt: str, *, max_tokens: int = 2048) -> str:
        response = self.generate_with_metadata(prompt, max_tokens=max_tokens)
        return response.texto
    
    def generate_with_metadata(
        self,
        prompt: str,
        *,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> LLMResponse:
        inicio = time.time()
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            tempo_ms = int((time.time() - inicio) * 1000)
            
            texto = ""
            if response.content:
                texto = response.content[0].text if hasattr(response.content[0], 'text') else str(response.content[0])
            
            return LLMResponse(
                texto=texto,
                tokens_entrada=response.usage.input_tokens if response.usage else 0,
                tokens_saida=response.usage.output_tokens if response.usage else 0,
                tokens_total=(response.usage.input_tokens + response.usage.output_tokens) if response.usage else 0,
                modelo=response.model,
                tempo_processamento_ms=tempo_ms,
                metadata={"id": response.id}
            )
            
        except Exception as e:
            logger.error(f"Erro Claude: {e}")
            if "rate_limit" in str(e).lower():
                raise LLMRateLimitError(str(e))
            if "auth" in str(e).lower() or "api_key" in str(e).lower():
                raise LLMAuthError(str(e))
            raise LLMError(str(e))


# =============================================================================
# FACTORY
# =============================================================================

def create_llm_client(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None
) -> BaseLLMClient:
    """
    Factory para criar cliente LLM baseado em configuração.
    
    Args:
        provider: "openai", "anthropic", "claude", ou "dummy".
        model: Modelo específico a usar.
        api_key: Chave de API.
    
    Returns:
        Instância do cliente apropriado.
    
    A factory tenta detectar automaticamente baseado nas variáveis de ambiente.
    """
    provider = provider or os.getenv("LLM_PROVIDER", "").lower()
    
    # Auto-detect baseado em variáveis de ambiente
    if not provider:
        if os.getenv("OPENAI_API_KEY"):
            provider = "openai"
        elif os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
        else:
            provider = "dummy"
    
    if provider in ("openai", "gpt"):
        return OpenAILLMClient(
            api_key=api_key,
            model=model or os.getenv("OPENAI_MODEL", "gpt-4o")
        )
    
    elif provider in ("anthropic", "claude"):
        return ClaudeLLMClient(
            api_key=api_key,
            model=model or os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        )
    
    else:
        logger.warning("Nenhum provedor LLM configurado, usando DummyLLMClient")
        return DummyLLMClient()
