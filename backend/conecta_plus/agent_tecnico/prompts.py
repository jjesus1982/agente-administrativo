# -*- coding: utf-8 -*-
"""
Prompts do Agente Técnico
=========================

Todos os prompts utilizados pelo Agente Técnico para gerar
documentação, topologias, checklists e JobTemplates.
"""

from __future__ import annotations
from textwrap import dedent
from typing import Optional

from .schemas import CondominioContext, TopologiaSugestao


# =============================================================================
# PERSONA BASE
# =============================================================================

PERSONA_AGENTE_TECNICO = """
Você é o AGENTE TÉCNICO da plataforma Conecta Plus, um engenheiro virtual full stack especializado em:
- Infraestrutura e redes (Cisco, Ubiquiti, Mikrotik)
- Nuvem (AWS, Google Cloud, Azure)
- Portaria remota e controle de acesso (Intelbras, Hikvision, Control iD, PPA, Garen, Nice)
- Comunicação e telefonia (VoIP, SIP, Asterisk)
- CFTV e videomonitoramento
- Automação de portões e cancelas

Você deve responder sempre em português do Brasil, de forma técnica mas acessível.
Use linguagem clara e objetiva, adequada para técnicos de campo e gestores.
"""


# =============================================================================
# PROMPTS DE TOPOLOGIA E PROJETO
# =============================================================================

def prompt_topologia_solucao(ctx: CondominioContext) -> str:
    """Gera prompt para sugestão de topologia."""
    acessos_str = "\n".join(
        f"- {a.nome} ({a.tipo.value}) | catraca={a.possui_catraca} | "
        f"facial={a.possui_leitor_facial} | cancela={a.possui_cancela} | "
        f"interfone={a.possui_interfone}"
        for a in ctx.acessos
    )
    
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Propor uma arquitetura completa de solução de PORTARIA REMOTA e CONTROLE DE ACESSO
        para o condomínio abaixo, incluindo:
        - Topologia de rede (VLANs, faixas de IP, gateways, QoS quando necessário)
        - Recomendação de equipamentos por área (CFTV, controle de acesso, rede, comunicação)
        - Distribuição lógica (guarita, racks, switches, controladoras, câmeras, interfonia)
        - Pontos de integração com nuvem e servidores de comunicação (Asterisk/VoIP/SIP)
        
        CONDOMÍNIO:
        - Nome: {ctx.nome}
        - Tipo de ambiente: {ctx.tipo_ambiente.value}
        - Cidade/Estado: {ctx.cidade}/{ctx.estado}
        - Número de torres: {ctx.numero_torres}
        - Quantidade de unidades: {ctx.quantidade_unidades}
        - Possui guarita física: {"Sim" if ctx.possui_guarita_fisica else "Não"}
        - CFTV existente: {"Sim" if ctx.possui_cftv_existente else "Não"}
        - Controle de acesso existente: {"Sim" if ctx.possui_controle_acesso_existente else "Não"}
        - Observações: {ctx.observacoes or "N/A"}
        
        ACESSOS:
        {acessos_str or "- Nenhum acesso informado."}
        
        FORMATO DA RESPOSTA:
        1. Comece com um RESUMO EXECUTIVO em 5-10 linhas (linguagem para gestor/síndico)
        2. Detalhe a TOPOLOGIA DE REDE (VLANs, IPs, switches, roteadores)
        3. Liste os EQUIPAMENTOS SUGERIDOS por categoria
        4. Descreva a INTEGRAÇÃO COM NUVEM
        5. Inclua BOAS PRÁTICAS de segurança e disponibilidade
        6. Finalize com ESTIMATIVA DE INVESTIMENTO (faixas de valor)
        
        Use títulos, subtítulos e listas para facilitar a leitura.
    """)


def prompt_lista_materiais(ctx: CondominioContext) -> str:
    """Gera prompt para lista de materiais (BoM)."""
    acessos_str = "\n".join(
        f"- {a.nome} ({a.tipo.value})"
        for a in ctx.acessos
    )
    
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Gerar uma LISTA DE MATERIAIS (Bill of Materials) completa para instalação
        de sistema de portaria remota no condomínio abaixo.
        
        CONDOMÍNIO:
        - Nome: {ctx.nome}
        - Tipo: {ctx.tipo_ambiente.value}
        - Torres: {ctx.numero_torres}
        - Unidades: {ctx.quantidade_unidades}
        
        ACESSOS:
        {acessos_str}
        
        A lista deve incluir:
        1. CFTV (NVR, câmeras, cabos, conectores)
        2. CONTROLE DE ACESSO (controladoras, leitores, fechaduras, fontes)
        3. REDE (switch, roteador, patch panel, cabos, racks)
        4. INTERFONIA (central, ramais, módulos)
        5. AUTOMAÇÃO (motores, centrais, controles)
        6. INFRAESTRUTURA (eletrodutos, caixas, abraçadeiras)
        
        Para cada item, inclua: fabricante sugerido, modelo, quantidade e observações.
        Organize em formato de tabela markdown.
    """)


# =============================================================================
# PROMPTS DE CHECKLISTS
# =============================================================================

def prompt_checklists(ctx: CondominioContext) -> str:
    """Gera prompt para checklists técnicos."""
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Criar três checklists técnicos detalhados para o condomínio abaixo:
        
        CONDOMÍNIO:
        - Nome: {ctx.nome}
        - Tipo: {ctx.tipo_ambiente.value}
        - Torres: {ctx.numero_torres}
        - Unidades: {ctx.quantidade_unidades}
        - Acessos: {len(ctx.acessos)} pontos
        
        CHECKLISTS A CRIAR:
        
        # CHECKLIST 1: PRÉ-INSTALAÇÃO (Projeto)
        Itens de verificação antes de ir a campo:
        - Documentação, aprovações, materiais, etc.
        
        # CHECKLIST 2: BANCADA (Pré-configuração)
        Itens para configurar equipamentos antes de levar ao campo:
        - IPs, senhas, testes de mesa, etiquetagem, etc.
        
        # CHECKLIST 3: CAMPO (Instalação)
        Itens de execução e teste em campo:
        - Instalação física, testes, comissionamento, etc.
        
        FORMATO:
        Use códigos como PRE-001, BAN-001, CAM-001.
        Cada item deve ter: código, descrição, se é obrigatório.
        Use markdown com checkboxes: - [ ] CÓDIGO - Descrição
    """)


# =============================================================================
# PROMPTS DE CONFIGURAÇÃO
# =============================================================================

def prompt_template_configuracao(
    fabricante: str,
    modelo: str,
    tipo_equipamento: str,
    contexto: Optional[str] = None
) -> str:
    """Gera prompt para template de configuração."""
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Gerar um TEMPLATE DE CONFIGURAÇÃO para o equipamento:
        
        - Fabricante: {fabricante}
        - Modelo: {modelo}
        - Tipo: {tipo_equipamento}
        - Contexto: {contexto or "Instalação padrão de portaria remota"}
        
        O template deve incluir:
        1. Configurações de REDE (IP, máscara, gateway, DNS)
        2. Configurações de SEGURANÇA (usuários, senhas, níveis de acesso)
        3. Configurações ESPECÍFICAS do equipamento
        4. Integrações (se aplicável)
        5. Comandos ou passos de configuração
        
        Use formato estruturado (JSON, YAML ou texto organizado).
        Inclua comentários explicativos.
    """)


# =============================================================================
# PROMPTS DE CAMPO
# =============================================================================

def prompt_fluxo_instalacao(ctx: CondominioContext, acesso_nome: str) -> str:
    """Gera prompt para fluxo de instalação em campo."""
    acesso = next((a for a in ctx.acessos if a.nome == acesso_nome), None)
    
    if not acesso:
        acesso_info = f"Acesso: {acesso_nome}"
    else:
        acesso_info = f"""
        Acesso: {acesso.nome}
        - Tipo: {acesso.tipo.value}
        - Catraca: {"Sim" if acesso.possui_catraca else "Não"}
        - Leitor Facial: {"Sim" if acesso.possui_leitor_facial else "Não"}
        - Cancela: {"Sim" if acesso.possui_cancela else "Não"}
        - Interfone: {"Sim" if acesso.possui_interfone else "Não"}
        """
    
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Criar um ROTEIRO DE INSTALAÇÃO passo a passo para o técnico de campo.
        
        CONDOMÍNIO: {ctx.nome}
        {acesso_info}
        
        O roteiro deve incluir:
        1. PREPARAÇÃO (ferramentas, materiais, EPIs)
        2. INFRAESTRUTURA (passagem de cabos, fixações)
        3. INSTALAÇÃO DE EQUIPAMENTOS (ordem correta)
        4. LIGAÇÕES ELÉTRICAS (passo a passo seguro)
        5. CONFIGURAÇÕES EM CAMPO
        6. TESTES E VALIDAÇÃO
        7. DOCUMENTAÇÃO (fotos, anotações)
        
        Para cada passo inclua:
        - Tempo estimado
        - Se requer foto de evidência
        - Dicas práticas para o técnico
        
        Use linguagem simples e direta.
    """)


def prompt_esquema_bornes(
    fabricante: str,
    equipamentos: list,
    contexto: Optional[str] = None
) -> str:
    """Gera prompt para esquema de ligação de bornes."""
    equipamentos_str = "\n".join(f"- {eq}" for eq in equipamentos)
    
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Criar um ESQUEMA DE LIGAÇÃO DE BORNES detalhado.
        
        FABRICANTE: {fabricante}
        
        EQUIPAMENTOS:
        {equipamentos_str}
        
        CONTEXTO: {contexto or "Instalação padrão de controle de acesso"}
        
        O esquema deve incluir:
        
        1. DIAGRAMA ASCII mostrando as conexões
        
        2. TABELA DE CONEXÕES com:
           - Equipamento origem / Borne origem
           - Equipamento destino / Borne destino
           - Tipo de cabo
           - Cor sugerida do fio
        
        3. ALIMENTAÇÃO:
           - Tensão necessária
           - Corrente mínima
           - Tipo de fonte
        
        4. ALERTAS DE SEGURANÇA:
           - Polaridade
           - Aterramento
           - Proteções
        
        Use linguagem clara, como se estivesse explicando para um técnico iniciante.
    """)


# =============================================================================
# PROMPTS DE DOCUMENTAÇÃO
# =============================================================================

def prompt_documentacao_itil(ctx: CondominioContext, topologia: TopologiaSugestao) -> str:
    """Gera prompt para documentação ITIL/COBIT."""
    redes_str = ", ".join(r.nome for r in topologia.redes_logicas) if topologia.redes_logicas else "N/A"
    
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Criar um documento de "PACOTE DE MUDANÇA" seguindo práticas ITIL/COBIT
        para implantação de sistema de portaria remota.
        
        CONDOMÍNIO:
        - Nome: {ctx.nome}
        - Tipo: {ctx.tipo_ambiente.value}
        - Cidade: {ctx.cidade}
        
        TOPOLOGIA APROVADA:
        - Descrição: {topologia.descricao_geral}
        - Redes: {redes_str}
        - IP CFTV: {topologia.faixa_ip_cftv or "N/A"}
        - IP Controle Acesso: {topologia.faixa_ip_controle_acesso or "N/A"}
        
        ESTRUTURA DO DOCUMENTO:
        
        # 1. IDENTIFICAÇÃO DA MUDANÇA
        (Código, data, solicitante, aprovador)
        
        # 2. ESCOPO
        (O que será feito, o que NÃO será feito)
        
        # 3. RISCOS E IMPACTOS
        (Riscos identificados, mitigações, impacto em caso de falha)
        
        # 4. PLANO DE IMPLEMENTAÇÃO
        (Cronograma, responsáveis, dependências)
        
        # 5. PLANO DE TESTES
        (Testes a realizar, critérios de aceite)
        
        # 6. PLANO DE RETROCESSO (ROLLBACK)
        (Como desfazer se der errado)
        
        # 7. APROVAÇÕES NECESSÁRIAS
        (Quem precisa aprovar cada fase)
        
        # 8. REGISTROS PARA AUDITORIA
        (O que documentar, onde armazenar)
        
        Use papéis genéricos (Gestor Técnico, Supervisor, Técnico, Síndico).
    """)


def prompt_as_built(ctx: CondominioContext, topologia: TopologiaSugestao) -> str:
    """Gera prompt para template de As-Built."""
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Criar um TEMPLATE DE AS-BUILT para documentar a instalação real.
        
        CONDOMÍNIO: {ctx.nome}
        
        O template deve ter seções para documentar:
        
        1. DADOS GERAIS
           - Data da instalação
           - Equipe responsável
           - OS/Projeto vinculado
        
        2. TOPOLOGIA REAL INSTALADA
           - IPs atribuídos (tabela)
           - VLANs configuradas
           - Equipamentos instalados (com serial)
        
        3. CREDENCIAIS (formato seguro)
           - Usuários criados
           - Observações de acesso
        
        4. DESVIOS DO PROJETO
           - O que foi alterado em relação ao projeto original
           - Motivo da alteração
        
        5. PENDÊNCIAS
           - O que ficou pendente
           - Prazo para resolução
        
        6. FOTOS E EVIDÊNCIAS
           - Lista de fotos tiradas
           - Descrição de cada uma
        
        7. ACEITE DO CLIENTE
           - Nome do responsável
           - Assinatura
           - Data
        
        Crie em formato markdown, pronto para preenchimento.
    """)


# =============================================================================
# PROMPTS DE TROUBLESHOOTING
# =============================================================================

def prompt_troubleshooting(
    sintoma: str,
    categoria: str,
    fabricante: Optional[str] = None,
    urgencia: str = "media"
) -> str:
    """Gera prompt para guia de troubleshooting."""
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Criar um GUIA DE TROUBLESHOOTING para o problema relatado.
        
        SINTOMA RELATADO: {sintoma}
        CATEGORIA: {categoria}
        FABRICANTE: {fabricante or "Não especificado"}
        URGÊNCIA: {urgencia}
        
        O guia deve incluir:
        
        1. ANÁLISE INICIAL
           - Possíveis causas (lista ordenada por probabilidade)
        
        2. SOLUÇÕES RÁPIDAS
           - Ações imediatas que podem resolver (5 min ou menos)
        
        3. DIAGNÓSTICO PASSO A PASSO
           - Verificações em ordem lógica
           - O que verificar em cada passo
           - Resultado esperado
           - O que fazer se o passo falhar
        
        4. ÁRVORE DE DECISÃO
           - Fluxo lógico: "Se X, então Y"
        
        5. QUANDO ESCALAR
           - Critérios para escalar para N2/N3
           - Informações a coletar antes de escalar
        
        6. BASE DE CONHECIMENTO
           - Links ou referências úteis (manuais, suporte fabricante)
        
        Seja prático e direto. O técnico está em campo e precisa resolver rápido.
    """)


# =============================================================================
# PROMPTS DE JOB TEMPLATE (CONECTA FIELDER)
# =============================================================================

def prompt_gerar_job_template(
    ctx: CondominioContext,
    tipo_job: str,
    prioridade: str = "media"
) -> str:
    """
    Gera prompt para criar um JobTemplate completo para o Conecta Fielder.
    
    O JobTemplate é o contrato entre o Agente Técnico e o módulo de campo.
    """
    acessos_json = [
        {
            "nome": a.nome,
            "tipo": a.tipo.value,
            "possui_catraca": a.possui_catraca,
            "possui_leitor_facial": a.possui_leitor_facial,
            "possui_cancela": a.possui_cancela
        }
        for a in ctx.acessos
    ]
    
    return dedent(f"""
        {PERSONA_AGENTE_TECNICO}
        
        TAREFA: Gerar um JOB TEMPLATE completo em formato JSON para execução em campo.
        
        Este JobTemplate será usado pelo app Conecta Fielder para guiar o técnico.
        
        DADOS DO CONDOMÍNIO:
        - Nome: {ctx.nome}
        - Tipo: {ctx.tipo_ambiente.value}
        - Cidade: {ctx.cidade}/{ctx.estado}
        - Torres: {ctx.numero_torres}
        - Unidades: {ctx.quantidade_unidades}
        - Acessos: {acessos_json}
        
        TIPO DE JOB: {tipo_job}
        PRIORIDADE: {prioridade}
        
        ESTRUTURA DO JSON:
        
        {{
          "id": "tmpl_<nome_curto>_<tipo>_v1",
          "name": "<Nome descritivo do job>",
          "description": "<Descrição do que será feito>",
          "version": "1.0.0",
          "job_type": "{tipo_job}",
          "priority": "{prioridade}",
          "condominio": {{ <dados do condomínio> }},
          "steps": [
            {{
              "id": "step_<categoria>_<numero>",
              "order": 1,
              "title": "<Título do passo>",
              "description": "<O que fazer neste passo>",
              "step_type": "infraestrutura|rede|equipamento|teste|checklist",
              "access_point_name": "<nome do acesso relacionado ou null>",
              "checklist_items": [
                {{
                  "code": "<COD-001>",
                  "title": "<Título do item>",
                  "description": "<Descrição detalhada>",
                  "required": true,
                  "response_type": "boolean|text|number|choice"
                }}
              ],
              "evidence_requirements": [
                {{
                  "type": "photo|video|note|measurement|signature",
                  "description": "<O que fotografar/registrar>",
                  "required": true,
                  "min_items": 1,
                  "tags": ["<tag1>", "<tag2>"]
                }}
              ],
              "estimated_duration_min": 30,
              "blocking": true,
              "ai_instruction": "<Instrução para IA auxiliar o técnico>",
              "tags": ["<tag1>", "<tag2>"]
            }}
          ],
          "metadata": {{
            "generated_by": "agente_tecnico",
            "generated_at": "<timestamp ISO>",
            "template_category": "<categoria>",
            "estimated_total_duration_min": <total>
          }}
        }}
        
        REGRAS:
        1. Crie steps para CADA acesso do condomínio
        2. Inclua steps de infraestrutura, equipamentos, rede e testes
        3. Cada step deve ter pelo menos 2 checklist_items
        4. Peça fotos em pontos críticos (antes/depois)
        5. O campo ai_instruction deve dar dicas úteis ao técnico
        6. Steps com blocking=true impedem avançar sem completar
        
        Responda APENAS com o JSON válido, sem explicações adicionais.
    """)
