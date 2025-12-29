# -*- coding: utf-8 -*-
"""
ITIL Reporter
=============

Gerador de relatórios em formato ITIL Change Record.
Gera Markdown formatado para documentação.
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime
from textwrap import dedent

from .schemas import (
    NetworkChangeRecord,
    NetworkDeviceCI,
    ChangeStatus,
    RiskLevel,
)


def gerar_change_record_itil(
    changes: List[NetworkChangeRecord],
    cis: List[NetworkDeviceCI] = None,
    job_id: str = None,
    job_info: Dict[str, Any] = None,
    riscos_identificados: List[str] = None,
    aprovador: str = None,
) -> str:
    """
    Gera relatório ITIL Change Record em Markdown.
    
    Args:
        changes: Lista de mudanças realizadas.
        cis: Lista de CIs afetados.
        job_id: ID do Job relacionado.
        job_info: Informações do Job (os_number, technician, etc).
        riscos_identificados: Lista de riscos.
        aprovador: Nome do aprovador.
    
    Returns:
        Relatório em formato Markdown.
    """
    cis = cis or []
    job_info = job_info or {}
    riscos_identificados = riscos_identificados or []
    
    # Determina status geral
    total = len(changes)
    sucesso = sum(1 for c in changes if c.success)
    falha = total - sucesso
    
    if falha == 0:
        status_geral = "✅ SUCESSO"
    elif sucesso == 0:
        status_geral = "❌ FALHA"
    else:
        status_geral = "⚠️ PARCIAL"
    
    # Condomínio
    condominio = changes[0].condominio_nome if changes else job_info.get("condominio", "N/A")
    
    # Gera seções de mudanças
    changes_md = ""
    for i, ch in enumerate(changes, 1):
        status = "✅ SUCESSO" if ch.success else "❌ FALHA"
        
        changes_md += f"""
### {i}. Mudança {ch.id}

| Campo | Valor |
|-------|-------|
| **CI** | {ch.ci_id} |
| **Tipo** | {ch.change_type.value} |
| **Título** | {ch.title} |
| **Descrição** | {ch.description} |
| **Risco** | {ch.risk_level.value.upper()} |
| **Solicitado por** | {ch.requested_by or '-'} |
| **Executado por** | {ch.executed_by or '-'} |
| **Início** | {ch.started_at.isoformat() if ch.started_at else '-'} |
| **Fim** | {ch.finished_at.isoformat() if ch.finished_at else '-'} |
| **Status** | **{status}** |
| **Backup** | {'Sim (' + ch.backup_id + ')' if ch.backup_created else 'Não'} |
| **Erro** | {ch.error_message or '-'} |

"""
        
        # Configs
        if ch.previous_config or ch.new_config:
            changes_md += "**Configuração:**\n\n"
            changes_md += "| Parâmetro | Anterior | Novo |\n"
            changes_md += "|-----------|----------|------|\n"
            
            prev = ch.previous_config or {}
            new = ch.new_config or {}
            
            if hasattr(prev, 'ip_address'):
                changes_md += f"| IP | {prev.ip_address or '-'} | {new.ip_address if hasattr(new, 'ip_address') else '-'} |\n"
                changes_md += f"| Máscara | {prev.netmask or '-'} | {new.netmask if hasattr(new, 'netmask') else '-'} |\n"
                changes_md += f"| Gateway | {prev.gateway or '-'} | {new.gateway if hasattr(new, 'gateway') else '-'} |\n"
            
            changes_md += "\n"
    
    # Gera seção de CIs
    cis_md = ""
    if cis:
        cis_md = "\n| ID | IP | Tipo | Fabricante | Localização |\n"
        cis_md += "|----|----|------|------------|-------------|\n"
        for ci in cis:
            cis_md += f"| {ci.id} | {ci.ip_address} | {ci.device_type.value} | {ci.fabricante or '-'} | {ci.localizacao or '-'} |\n"
    else:
        cis_md = "Nenhum CI específico listado."
    
    # Gera seção de riscos
    riscos_md = ""
    if riscos_identificados:
        riscos_md = "\n".join(f"- {r}" for r in riscos_identificados)
    else:
        riscos_md = "- Nenhum risco relevante identificado."
    
    # Monta relatório completo
    report = dedent(f"""
# CHANGE RECORD – ITIL

## Identificação

| Campo | Valor |
|-------|-------|
| **ID do Relatório** | CR-{datetime.now().strftime('%Y%m%d-%H%M%S')} |
| **Job ID** | {job_id or job_info.get('id', 'N/A')} |
| **OS** | {job_info.get('os_number', 'N/A')} |
| **Condomínio** | {condominio} |
| **Técnico** | {job_info.get('technician_id', job_info.get('technician', 'N/A'))} |
| **Data** | {datetime.now().strftime('%d/%m/%Y %H:%M')} |
| **Status Geral** | **{status_geral}** |

---

## Resumo Executivo

- **Total de mudanças:** {total}
- **Sucesso:** {sucesso}
- **Falha:** {falha}
- **Taxa de sucesso:** {(sucesso/total*100) if total > 0 else 0:.1f}%

---

## CIs Afetados (Configuration Items)

{cis_md}

---

## Mudanças Realizadas

{changes_md}

---

## Riscos e Impactos

{riscos_md}

---

## Plano de Implementação (Executado)

1. Verificação de topologia e acessos físicos
2. Backup de configurações (quando aplicável)
3. Aplicação de configurações de rede
4. Testes de conectividade
5. Validação de funcionamento
6. Registro de evidências

---

## Testes Realizados

| Teste | Resultado |
|-------|-----------|
| Conectividade de rede | {'✅ OK' if sucesso > 0 else '❌ Falha'} |
| Acesso remoto | {'✅ OK' if sucesso > 0 else '⚠️ Verificar'} |
| Backup realizado | {'✅ Sim' if any(c.backup_created for c in changes) else '⚠️ Não'} |

---

## Plano de Retrocesso

Os backups gerados podem ser utilizados para restaurar as configurações originais
em caso de necessidade:

| Mudança | Backup ID |
|---------|-----------|
""")
    
    for ch in changes:
        if ch.backup_created:
            report += f"| {ch.id} | {ch.backup_id} |\n"
        else:
            report += f"| {ch.id} | Não realizado |\n"
    
    report += f"""

---

## Aprovações

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Gestor Técnico | {aprovador or '________________'} | {datetime.now().strftime('%d/%m/%Y') if aprovador else '____/____/____'} | ____________ |
| Cliente (Síndico/Zelador) | ________________ | ____/____/____ | ____________ |

---

## Observações

{job_info.get('notes', '_Nenhuma observação adicional._')}

---

*Relatório gerado automaticamente pelo Conecta Plus em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}*
"""
    
    return report.strip()


def gerar_resumo_cliente(
    changes: List[NetworkChangeRecord],
    condominio: str,
    job_info: Dict[str, Any] = None,
) -> str:
    """
    Gera resumo simplificado para o cliente (síndico/zelador).
    
    Args:
        changes: Lista de mudanças.
        condominio: Nome do condomínio.
        job_info: Informações do job.
    
    Returns:
        Resumo em Markdown.
    """
    job_info = job_info or {}
    
    total = len(changes)
    sucesso = sum(1 for c in changes if c.success)
    
    if sucesso == total:
        status = "✅ Todos os serviços foram realizados com sucesso"
    elif sucesso > 0:
        status = f"⚠️ {sucesso} de {total} serviços realizados com sucesso"
    else:
        status = "❌ Houve problemas na execução dos serviços"
    
    report = dedent(f"""
# Relatório de Serviço

**Condomínio:** {condominio}  
**Data:** {datetime.now().strftime('%d/%m/%Y')}  
**OS:** {job_info.get('os_number', 'N/A')}  
**Técnico:** {job_info.get('technician', 'Conecta Plus')}

---

## Status

{status}

---

## Serviços Realizados

""")
    
    for i, ch in enumerate(changes, 1):
        emoji = "✅" if ch.success else "❌"
        report += f"{i}. {emoji} {ch.title}\n"
    
    report += f"""

---

## Próximos Passos

- Sistema de monitoramento ativo 24h
- Suporte disponível pelo chat ou telefone
- Próxima manutenção preventiva agendada conforme contrato

---

*Conecta Plus - Segurança Inteligente*  
*Suporte: 0800-XXX-XXXX | suporte@conectaplus.com.br*
"""
    
    return report.strip()


def gerar_historico_ci(
    ci: NetworkDeviceCI,
    changes: List[NetworkChangeRecord]
) -> str:
    """
    Gera histórico de mudanças de um CI.
    
    Args:
        ci: Configuration Item.
        changes: Lista de mudanças.
    
    Returns:
        Histórico em Markdown.
    """
    report = dedent(f"""
# Histórico do CI: {ci.id}

## Informações do Dispositivo

| Campo | Valor |
|-------|-------|
| **IP** | {ci.ip_address} |
| **MAC** | {ci.mac_address or '-'} |
| **Tipo** | {ci.device_type.value} |
| **Fabricante** | {ci.fabricante or '-'} |
| **Modelo** | {ci.modelo or '-'} |
| **Localização** | {ci.localizacao or '-'} |
| **Condomínio** | {ci.condominio_nome} |
| **Status** | {ci.status.value} |
| **Crítico** | {'Sim' if ci.critical else 'Não'} |
| **Gerenciado** | {'Sim' if ci.managed_by_conecta else 'Não'} |

---

## Histórico de Mudanças

""")
    
    if changes:
        report += "| Data | Tipo | Descrição | Status |\n"
        report += "|------|------|-----------|--------|\n"
        
        for ch in sorted(changes, key=lambda x: x.created_at, reverse=True):
            status = "✅" if ch.success else "❌"
            data = ch.started_at.strftime('%d/%m/%Y %H:%M') if ch.started_at else '-'
            report += f"| {data} | {ch.change_type.value} | {ch.title} | {status} |\n"
    else:
        report += "*Nenhuma mudança registrada.*\n"
    
    report += f"""

---

*Última atualização: {ci.updated_at.strftime('%d/%m/%Y %H:%M:%S') if ci.updated_at else '-'}*
"""
    
    return report.strip()
