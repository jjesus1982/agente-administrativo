# -*- coding: utf-8 -*-
"""
Núcleo do Agente Técnico
========================

Classe principal que orquestra todas as funcionalidades do Agente Técnico.
"""

from __future__ import annotations
from typing import Optional, List, Dict, Any
import json
import logging
from datetime import datetime

from .llm_client import BaseLLMClient, LLMResponse
from .schemas import (
    CondominioContext,
    DocumentoTecnico,
    ResultadoLLM,
    TopologiaSugestao,
    Checklist,
    TroubleshootingGuia,
    EsquemaBornes,
    FluxoInstalacao,
    RedeLogica,
)
from . import prompts

logger = logging.getLogger(__name__)


class AgentTecnico:
    """
    Núcleo do Agente Técnico do Conecta Plus.
    
    Esta classe é independente de frameworks web. Ela pode ser usada em:
    - APIs (FastAPI, Flask, etc.)
    - Scripts de automação
    - Orquestradores de IA
    - CLI tools
    
    Responsabilidades:
    - Gerar topologias e soluções técnicas
    - Criar checklists e documentação
    - Produzir JobTemplates para o Conecta Fielder
    - Auxiliar em troubleshooting
    - Gerar esquemas de ligação
    """
    
    def __init__(self, llm_client: BaseLLMClient) -> None:
        """
        Inicializa o Agente Técnico.
        
        Args:
            llm_client: Cliente LLM para geração de texto.
        """
        self.llm = llm_client
        logger.info("AgentTecnico inicializado")
    
    # =========================================================================
    # FASE 1 - PROJETO / PRÉ-INSTALAÇÃO
    # =========================================================================
    
    def gerar_topologia_solucao(self, ctx: CondominioContext) -> ResultadoLLM:
        """
        Gera uma proposta de topologia e solução de portaria remota
        para o condomínio informado.
        
        Args:
            ctx: Contexto do condomínio.
        
        Returns:
            ResultadoLLM com a topologia sugerida.
        """
        logger.info(f"Gerando topologia para {ctx.nome}")
        
        prompt = prompts.prompt_topologia_solucao(ctx)
        response = self.llm.generate_with_metadata(prompt, max_tokens=4096)
        
        return ResultadoLLM(
            texto_bruto=response.texto,
            tokens_utilizados=response.tokens_total,
            modelo_utilizado=response.modelo,
            tempo_processamento_ms=response.tempo_processamento_ms
        )
    
    def gerar_lista_materiais(self, ctx: CondominioContext) -> ResultadoLLM:
        """
        Gera lista de materiais (Bill of Materials) para o projeto.
        
        Args:
            ctx: Contexto do condomínio.
        
        Returns:
            ResultadoLLM com a lista de materiais.
        """
        logger.info(f"Gerando lista de materiais para {ctx.nome}")
        
        prompt = prompts.prompt_lista_materiais(ctx)
        response = self.llm.generate_with_metadata(prompt, max_tokens=4096)
        
        return ResultadoLLM(
            texto_bruto=response.texto,
            tokens_utilizados=response.tokens_total,
            modelo_utilizado=response.modelo,
            tempo_processamento_ms=response.tempo_processamento_ms
        )
    
    # =========================================================================
    # FASE 2 - BANCADA / PRÉ-CONFIGURAÇÃO
    # =========================================================================
    
    def gerar_checklists(self, ctx: CondominioContext) -> DocumentoTecnico:
        """
        Gera checklists técnicos (pré-instalação, bancada, campo).
        
        Args:
            ctx: Contexto do condomínio.
        
        Returns:
            DocumentoTecnico com os checklists em markdown.
        """
        logger.info(f"Gerando checklists para {ctx.nome}")
        
        prompt = prompts.prompt_checklists(ctx)
        response = self.llm.generate_with_metadata(prompt, max_tokens=4096)
        
        return DocumentoTecnico(
            titulo=f"Checklists Técnicos - {ctx.nome}",
            conteudo_markdown=response.texto,
            metadata={
                "tokens": response.tokens_total,
                "modelo": response.modelo
            }
        )
    
    def gerar_template_configuracao(
        self,
        fabricante: str,
        modelo: str,
        tipo_equipamento: str,
        contexto: Optional[str] = None
    ) -> DocumentoTecnico:
        """
        Gera template de configuração para um equipamento específico.
        
        Args:
            fabricante: Fabricante do equipamento.
            modelo: Modelo do equipamento.
            tipo_equipamento: Tipo (NVR, câmera, controladora, etc.).
            contexto: Contexto adicional da instalação.
        
        Returns:
            DocumentoTecnico com o template de configuração.
        """
        logger.info(f"Gerando template de config para {fabricante} {modelo}")
        
        prompt = prompts.prompt_template_configuracao(
            fabricante, modelo, tipo_equipamento, contexto
        )
        response = self.llm.generate_with_metadata(prompt, max_tokens=3000)
        
        return DocumentoTecnico(
            titulo=f"Template de Configuração - {fabricante} {modelo}",
            conteudo_markdown=response.texto,
            metadata={
                "fabricante": fabricante,
                "modelo": modelo,
                "tipo": tipo_equipamento
            }
        )
    
    # =========================================================================
    # FASE 3 - CAMPO / INSTALAÇÃO
    # =========================================================================
    
    def gerar_fluxo_instalacao(
        self,
        ctx: CondominioContext,
        acesso_nome: str
    ) -> DocumentoTecnico:
        """
        Gera roteiro de instalação para um ponto de acesso específico.
        
        Args:
            ctx: Contexto do condomínio.
            acesso_nome: Nome do acesso a instalar.
        
        Returns:
            DocumentoTecnico com o fluxo de instalação.
        """
        logger.info(f"Gerando fluxo de instalação para {acesso_nome}")
        
        prompt = prompts.prompt_fluxo_instalacao(ctx, acesso_nome)
        response = self.llm.generate_with_metadata(prompt, max_tokens=4096)
        
        return DocumentoTecnico(
            titulo=f"Roteiro de Instalação - {acesso_nome}",
            conteudo_markdown=response.texto,
            metadata={
                "condominio": ctx.nome,
                "acesso": acesso_nome
            }
        )
    
    def gerar_esquema_bornes(
        self,
        fabricante: str,
        equipamentos: List[str],
        contexto: Optional[str] = None
    ) -> DocumentoTecnico:
        """
        Gera esquema de ligação de bornes.
        
        Args:
            fabricante: Fabricante principal dos equipamentos.
            equipamentos: Lista de equipamentos a conectar.
            contexto: Contexto adicional.
        
        Returns:
            DocumentoTecnico com o esquema de bornes.
        """
        logger.info(f"Gerando esquema de bornes para {fabricante}")
        
        prompt = prompts.prompt_esquema_bornes(fabricante, equipamentos, contexto)
        response = self.llm.generate_with_metadata(prompt, max_tokens=3000)
        
        return DocumentoTecnico(
            titulo=f"Esquema de Bornes - {fabricante}",
            conteudo_markdown=response.texto,
            metadata={
                "fabricante": fabricante,
                "equipamentos": equipamentos
            }
        )
    
    # =========================================================================
    # FASE 4 - PÓS-INSTALAÇÃO / DOCUMENTAÇÃO
    # =========================================================================
    
    def gerar_documentacao_itil(
        self,
        ctx: CondominioContext,
        topologia_resumo: str,
        redes_logicas: Optional[List[str]] = None,
        faixa_ip_cftv: Optional[str] = None,
        faixa_ip_controle_acesso: Optional[str] = None,
    ) -> DocumentoTecnico:
        """
        Gera documento de Pacote de Mudança seguindo práticas ITIL/COBIT.
        
        Args:
            ctx: Contexto do condomínio.
            topologia_resumo: Resumo da topologia aprovada.
            redes_logicas: Lista de redes lógicas.
            faixa_ip_cftv: Faixa de IP do CFTV.
            faixa_ip_controle_acesso: Faixa de IP do controle de acesso.
        
        Returns:
            DocumentoTecnico com a documentação ITIL.
        """
        logger.info(f"Gerando documentação ITIL para {ctx.nome}")
        
        # Monta objeto TopologiaSugestao
        redes = []
        if redes_logicas:
            for nome in redes_logicas:
                redes.append(RedeLogica(nome=nome, faixa_ip=""))
        
        topologia = TopologiaSugestao(
            descricao_geral=topologia_resumo,
            redes_logicas=redes,
            faixa_ip_cftv=faixa_ip_cftv,
            faixa_ip_controle_acesso=faixa_ip_controle_acesso,
        )
        
        prompt = prompts.prompt_documentacao_itil(ctx, topologia)
        response = self.llm.generate_with_metadata(prompt, max_tokens=4096)
        
        return DocumentoTecnico(
            titulo=f"Pacote de Mudança ITIL - {ctx.nome}",
            conteudo_markdown=response.texto,
            metadata={
                "condominio": ctx.nome,
                "tipo": "itil_change_package"
            }
        )
    
    def gerar_as_built(
        self,
        ctx: CondominioContext,
        topologia_resumo: str
    ) -> DocumentoTecnico:
        """
        Gera template de As-Built para documentar a instalação real.
        
        Args:
            ctx: Contexto do condomínio.
            topologia_resumo: Resumo da topologia instalada.
        
        Returns:
            DocumentoTecnico com o template de As-Built.
        """
        logger.info(f"Gerando template As-Built para {ctx.nome}")
        
        topologia = TopologiaSugestao(
            descricao_geral=topologia_resumo,
            redes_logicas=[]
        )
        
        prompt = prompts.prompt_as_built(ctx, topologia)
        response = self.llm.generate_with_metadata(prompt, max_tokens=4096)
        
        return DocumentoTecnico(
            titulo=f"As-Built - {ctx.nome}",
            conteudo_markdown=response.texto,
            metadata={
                "condominio": ctx.nome,
                "tipo": "as_built"
            }
        )
    
    # =========================================================================
    # SUPORTE / TROUBLESHOOTING
    # =========================================================================
    
    def gerar_troubleshooting(
        self,
        sintoma: str,
        categoria: str,
        fabricante: Optional[str] = None,
        urgencia: str = "media"
    ) -> DocumentoTecnico:
        """
        Gera guia de troubleshooting para um problema.
        
        Args:
            sintoma: Descrição do problema/sintoma.
            categoria: Categoria (hardware, software, rede, etc.).
            fabricante: Fabricante relacionado (opcional).
            urgencia: Nível de urgência.
        
        Returns:
            DocumentoTecnico com o guia de troubleshooting.
        """
        logger.info(f"Gerando troubleshooting para: {sintoma}")
        
        prompt = prompts.prompt_troubleshooting(
            sintoma, categoria, fabricante, urgencia
        )
        response = self.llm.generate_with_metadata(prompt, max_tokens=4096)
        
        return DocumentoTecnico(
            titulo=f"Troubleshooting - {sintoma[:50]}",
            conteudo_markdown=response.texto,
            metadata={
                "sintoma": sintoma,
                "categoria": categoria,
                "fabricante": fabricante,
                "urgencia": urgencia
            }
        )
    
    # =========================================================================
    # CONECTA FIELDER - GERAÇÃO DE JOB TEMPLATES
    # =========================================================================
    
    def gerar_job_template(
        self,
        ctx: CondominioContext,
        tipo_job: str = "instalacao",
        prioridade: str = "media"
    ) -> Dict[str, Any]:
        """
        Gera um JobTemplate completo para o Conecta Fielder.
        
        O JobTemplate é o contrato entre o Agente Técnico e o módulo de campo.
        Ele define todos os passos, checklists e evidências necessárias para
        execução de um job em campo.
        
        Args:
            ctx: Contexto do condomínio.
            tipo_job: Tipo do job (instalacao, manutencao, vistoria).
            prioridade: Prioridade (baixa, media, alta, critica).
        
        Returns:
            Dict com o JobTemplate em formato JSON.
        """
        logger.info(f"Gerando JobTemplate para {ctx.nome} - tipo: {tipo_job}")
        
        prompt = prompts.prompt_gerar_job_template(ctx, tipo_job, prioridade)
        response = self.llm.generate_with_metadata(prompt, max_tokens=8000, temperature=0.3)
        
        # Tenta extrair JSON da resposta
        texto = response.texto.strip()
        
        # Remove possíveis marcadores de código
        if texto.startswith("```json"):
            texto = texto[7:]
        if texto.startswith("```"):
            texto = texto[3:]
        if texto.endswith("```"):
            texto = texto[:-3]
        
        try:
            job_template = json.loads(texto.strip())
            
            # Adiciona/atualiza metadata
            job_template.setdefault("metadata", {})
            job_template["metadata"]["generated_by"] = "agente_tecnico"
            job_template["metadata"]["generated_at"] = datetime.now().isoformat()
            job_template["metadata"]["tokens_utilizados"] = response.tokens_total
            job_template["metadata"]["modelo_utilizado"] = response.modelo
            
            return job_template
            
        except json.JSONDecodeError as e:
            logger.error(f"Erro ao parsear JSON do JobTemplate: {e}")
            # Retorna estrutura mínima com o texto bruto
            return {
                "id": f"tmpl_error_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "name": f"JobTemplate - {ctx.nome}",
                "error": str(e),
                "raw_response": texto,
                "metadata": {
                    "generated_by": "agente_tecnico",
                    "generated_at": datetime.now().isoformat(),
                    "parse_error": True
                }
            }
    
    # =========================================================================
    # UTILITÁRIOS
    # =========================================================================
    
    def gerar_resumo_executivo(self, ctx: CondominioContext) -> str:
        """
        Gera um resumo executivo rápido para gestores.
        
        Args:
            ctx: Contexto do condomínio.
        
        Returns:
            Texto com resumo executivo.
        """
        prompt = f"""
        Gere um RESUMO EXECUTIVO em 5-7 linhas para o síndico/gestor sobre
        a solução de portaria remota para o condomínio:
        
        - Nome: {ctx.nome}
        - Tipo: {ctx.tipo_ambiente.value}
        - Unidades: {ctx.quantidade_unidades}
        - Acessos: {len(ctx.acessos)} pontos
        
        Foque em: benefícios, segurança, economia e modernização.
        Linguagem clara e objetiva para leigos.
        """
        
        return self.llm.generate(prompt, max_tokens=500)
    
    def processar_consulta_livre(self, pergunta: str) -> str:
        """
        Processa uma consulta técnica livre.
        
        Args:
            pergunta: Pergunta do usuário.
        
        Returns:
            Resposta do agente.
        """
        prompt = f"""
        {prompts.PERSONA_AGENTE_TECNICO}
        
        PERGUNTA DO USUÁRIO:
        {pergunta}
        
        Responda de forma técnica mas acessível.
        Se a pergunta for sobre equipamentos específicos, inclua dicas práticas.
        Se não souber algo com certeza, diga que precisa verificar.
        """
        
        return self.llm.generate(prompt, max_tokens=2000)
