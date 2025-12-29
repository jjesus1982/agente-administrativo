# Testes de Segurança Multi-Tenant

Este diretório contém testes abrangentes de segurança para o sistema Conecta Plus, com foco especial na isolação multi-tenant e prevenção de vulnerabilidades.

## 🛡️ Tipos de Testes

### 1. Testes de Isolação Multi-Tenant (`test_multi_tenant_security.py`)
- **Isolação de Dados**: Verifica que usuários não acessam dados de outros condomínios
- **APIs Públicas**: Valida que apenas condomínios permitidos aparecem na API pública
- **Privilégios de Admin**: Testa que administradores podem acessar qualquer tenant
- **Sincronização**: Verifica isolação no sistema de webhooks

### 2. Testes do Middleware (`test_tenant_security_middleware.py`)
- **Headers de Segurança**: Validação de headers aplicados pelo middleware
- **Cross-tenant Access**: Bloqueio de acesso entre tenants
- **Rate Limiting**: Limitação de requests por tenant
- **Logging de Segurança**: Verificação de eventos logados
- **Performance**: Impacto do middleware na performance

### 3. Testes de Penetração (`test_penetration_simulation.py`)
- **SQL Injection**: Tentativas de injeção SQL em todos os endpoints
- **XSS**: Cross-Site Scripting em campos de entrada
- **Directory Traversal**: Tentativas de acesso a arquivos do sistema
- **CSRF**: Cross-Site Request Forgery
- **Bypass de Autenticação**: Tentativas de contornar autenticação
- **Privilege Escalation**: Escalação de privilégios

## 🚀 Executando os Testes

### Configuração do Ambiente

```bash
# Instalar dependências de teste
pip install pytest pytest-asyncio pytest-cov

# Configurar banco de teste
export DATABASE_URL="postgresql://user:pass@localhost/conectaplus_test"
export ENVIRONMENT="testing"
```

### Executar Todos os Testes de Segurança

```bash
# Executar todos os testes de segurança
pytest tests/security/ -v

# Com cobertura de código
pytest tests/security/ --cov=app --cov-report=html

# Executar apenas testes críticos
pytest tests/security/ -m "critical"
```

### Executar Testes Específicos

```bash
# Apenas isolação multi-tenant
pytest tests/security/test_multi_tenant_security.py -v

# Apenas testes de penetração
pytest tests/security/test_penetration_simulation.py -v

# Apenas middleware
pytest tests/security/test_tenant_security_middleware.py -v
```

### Executar com Diferentes Níveis de Log

```bash
# Log detalhado para debugging
pytest tests/security/ -v -s --log-level=DEBUG

# Apenas falhas
pytest tests/security/ --tb=short
```

## 📊 Interpretando os Resultados

### ✅ Testes Passaram
- **Verde**: Sistema está seguro contra o tipo de ataque testado
- Verificar logs para confirmar que medidas de segurança estão ativas

### ❌ Testes Falharam
- **Vermelho**: Vulnerabilidade detectada
- Revisar logs detalhados e corrigir vulnerabilidade
- **Crítico**: Falhas em testes marcados como `critical` precisam correção imediata

### ⚠️ Testes Pulados
- **Amarelo**: Teste foi pulado (ex: feature não implementada)
- Avaliar se teste é necessário para o ambiente atual

## 🔐 Cenários de Teste Cobertos

### Isolação Multi-Tenant
- [ ] Usuário A não acessa dados do Tenant B
- [ ] APIs públicas filtram apenas tenants permitidos
- [ ] Validação de unidade é isolada por tenant
- [ ] Admin pode acessar qualquer tenant
- [ ] Sincronização não vaza dados entre tenants

### Ataques de Injeção
- [ ] SQL Injection em parâmetros de busca
- [ ] NoSQL Injection em campos JSONB
- [ ] Command Injection em campos de texto
- [ ] LDAP Injection em filtros

### Cross-Site Attacks
- [ ] XSS Refletido em parâmetros
- [ ] XSS Armazenado em campos persistidos
- [ ] CSRF em operações de estado
- [ ] Clickjacking via headers

### Bypass de Autenticação
- [ ] Manipulação de JWT
- [ ] Injeção via headers
- [ ] Session Fixation
- [ ] Privilege Escalation

### Vazamento de Informações
- [ ] Mensagens de erro não vazam dados sensíveis
- [ ] Debug info não é exposta
- [ ] Informações de versão não são divulgadas

## 🏗️ Adicionando Novos Testes

### Estrutura dos Testes

```python
class TestNovaFuncionalidade:
    """Testes para nova funcionalidade"""

    def test_cenario_positivo(self, client, fixtures):
        """Teste que deve passar"""
        # Arrange
        data = {"campo": "valor"}

        # Act
        response = client.post("/endpoint", json=data)

        # Assert
        assert response.status_code == 200

    def test_cenario_vulnerabilidade(self, client):
        """Teste que deve falhar se houver vulnerabilidade"""
        # Arrange
        malicious_data = {"campo": "<script>alert('xss')</script>"}

        # Act
        response = client.post("/endpoint", json=malicious_data)

        # Assert - não deve aceitar dados maliciosos
        assert response.status_code in [400, 422]
```

### Marcadores de Teste

```python
@pytest.mark.critical  # Teste crítico para segurança
@pytest.mark.slow      # Teste que demora para executar
@pytest.mark.integration  # Teste de integração
```

## 🚨 Alertas de Segurança

### Falhas Críticas
Se algum teste marcado como `@pytest.mark.critical` falhar:

1. **Parar deployment imediatamente**
2. **Investigar logs detalhados**
3. **Corrigir vulnerabilidade**
4. **Re-executar todos os testes**
5. **Documentar correção**

### Monitoramento Contínuo
- Execute testes de segurança em todo push
- Configure alertas para falhas críticas
- Revise logs de segurança regularmente

## 📝 Logs de Segurança

### Eventos Logados
- Tentativas de acesso cross-tenant
- Tentativas de injeção detectadas
- Falhas de autenticação suspeitas
- Rate limiting ativado
- Privilege escalation tentada

### Análise de Logs

```bash
# Buscar eventos de segurança
grep "SECURITY_VIOLATION" logs/app.log

# Buscar tentativas de SQL injection
grep "sql.*injection\|DROP\|UNION" logs/app.log -i

# Buscar tentativas de XSS
grep "script\|onerror\|javascript:" logs/app.log -i
```

## 🔧 Troubleshooting

### Testes Falhando Incorretamente

1. **Verificar configuração do banco de teste**
2. **Verificar variáveis de ambiente**
3. **Verificar se middleware está configurado**
4. **Verificar se fixtures estão corretos**

### Performance dos Testes

Se testes estão lentos:

1. **Usar fixtures para dados repetidos**
2. **Mockar operações de banco quando possível**
3. **Executar testes em paralelo**: `pytest -n 4`
4. **Usar markers para separar testes lentos**

## 📚 Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Multi-tenant Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_KeyCloak_Cheat_Sheet.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

## 🤝 Contribuindo

Ao adicionar novos testes de segurança:

1. **Documente o cenário de ataque**
2. **Adicione comentários explicativos**
3. **Use fixtures para dados de teste**
4. **Marque testes críticos adequadamente**
5. **Teste tanto cenários positivos quanto negativos**

---

**⚠️ Importante**: Estes testes simulam ataques reais. Execute apenas em ambientes de desenvolvimento e teste. Nunca execute contra sistemas de produção sem autorização explícita.