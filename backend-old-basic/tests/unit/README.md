# Testes Unitários - Backend

Este diretório contém os testes unitários para os módulos principais do backend.

## Arquivos de Teste

### 1. test_security.py (224 linhas, 17 testes)

Testes para `app/core/security.py` - módulo de segurança JWT e hashing de senhas.

**Classes de Teste:**
- `TestPasswordHashing` - Testes de hashing de senhas com bcrypt
  - `test_get_password_hash` - Verifica geração de hash
  - `test_verify_password_correct` - Valida senha correta
  - `test_verify_password_incorrect` - Rejeita senha incorreta
  - `test_different_hashes_for_same_password` - Verifica uso de salt

- `TestAccessToken` - Testes de access tokens JWT
  - `test_create_access_token` - Criação de token
  - `test_create_access_token_with_custom_expiry` - Token com expiração customizada
  - `test_verify_access_token_valid` - Verificação de token válido
  - `test_verify_access_token_invalid` - Rejeição de token inválido
  - `test_verify_access_token_wrong_type` - Rejeição de tipo errado

- `TestRefreshToken` - Testes de refresh tokens JWT
  - `test_create_refresh_token` - Criação de refresh token
  - `test_verify_refresh_token_valid` - Verificação válida
  - `test_verify_refresh_token_invalid` - Rejeição de token inválido
  - `test_verify_refresh_token_wrong_type` - Rejeição de tipo errado

- `TestDecodeToken` - Testes de decodificação genérica
  - `test_decode_token_valid_access` - Decodifica access token
  - `test_decode_token_valid_refresh` - Decodifica refresh token
  - `test_decode_token_invalid` - Rejeita token inválido
  - `test_decode_token_malformed` - Rejeita token malformado

### 2. test_permissions.py (333 linhas, 42 testes)

Testes para `app/core/permissions.py` - sistema de permissões RBAC.

**Classes de Teste:**
- `TestRoleEnum` - Testes do enum Role
  - `test_role_values` - Valores corretos dos roles
  - `test_role_ordering` - Comparação entre roles
  - `test_role_equality` - Igualdade de roles
  - `test_all_roles_in_names` - Mapeamento de nomes

- `TestGetRoleName` - Testes da função get_role_name
  - `test_get_role_name_*` - Nomes para cada role
  - `test_get_role_name_invalid` - Nome para role inválido
  - `test_get_role_name_with_int` - Aceita valores int

- `TestCheckPermission` - Testes de verificação de permissões (25 testes)
  - Testa permissões para diferentes módulos:
    - users (listar, deletar)
    - visitors (entrada, bloqueio)
    - vehicles (criar, deletar)
    - maintenance (atribuir)
    - reports (visualizar)
    - audit (visualizar)
  - Testa diferentes níveis de acesso (Resident, Syndic, Doorman, Admin, Super Admin)

- `TestCheckResourceOwnership` - Testes de propriedade de recursos
  - `test_check_ownership_owner` - Dono tem acesso
  - `test_check_ownership_not_owner` - Não-dono sem acesso
  - `test_check_ownership_admin_not_owner` - Admin sempre tem acesso
  - `test_check_ownership_custom_field` - Campo customizado
  - `test_check_ownership_missing_field` - Campo inexistente

- `TestRequireRoleDecorator` - Testes do decorator @require_role
  - `test_require_role_sufficient` - Role suficiente
  - `test_require_role_exact` - Role exata
  - `test_require_role_insufficient` - Role insuficiente (403)

- `TestRequirePermissionDecorator` - Testes do decorator @require_permission
  - `test_require_permission_allowed` - Permissão concedida
  - `test_require_permission_denied` - Permissão negada (403)
  - `test_require_permission_super_admin` - Super admin tem acesso

### 3. test_cache.py (463 linhas, 35 testes)

Testes para `app/services/cache.py` - serviço de cache Redis.

**Classes de Teste:**
- `TestCacheKey` - Testes da função cache_key
  - `test_cache_key_single_part` - Chave com uma parte
  - `test_cache_key_multiple_parts` - Chave com múltiplas partes
  - `test_cache_key_with_numbers` - Chave com números
  - `test_cache_key_special_characters` - Caracteres especiais

- `TestRedisCacheInit` - Inicialização do RedisCache
  - `test_redis_cache_init` - Estado inicial

- `TestRedisCacheConnect` - Testes de conexão
  - `test_connect_success` - Conexão bem-sucedida
  - `test_connect_failure` - Falha na conexão
  - `test_connect_already_connected` - Já conectado

- `TestRedisCacheDisconnect` - Testes de desconexão
  - `test_disconnect_success` - Desconexão normal
  - `test_disconnect_not_connected` - Sem conexão ativa

- `TestRedisCacheGet` - Testes de leitura
  - `test_get_existing_key` - Chave existente
  - `test_get_nonexistent_key` - Chave inexistente
  - `test_get_not_connected` - Sem conexão
  - `test_get_error` - Erro no Redis

- `TestRedisCacheSet` - Testes de escrita
  - `test_set_success` - Escrita bem-sucedida
  - `test_set_with_timedelta` - TTL como timedelta
  - `test_set_default_ttl` - TTL padrão
  - `test_set_not_connected` - Sem conexão
  - `test_set_error` - Erro no Redis

- `TestRedisCacheDelete` - Testes de deleção
  - `test_delete_success` - Deleção bem-sucedida
  - `test_delete_not_connected` - Sem conexão
  - `test_delete_error` - Erro no Redis

- `TestRedisCacheDeletePattern` - Testes de deleção por padrão
  - `test_delete_pattern_success` - Deleção múltipla
  - `test_delete_pattern_not_connected` - Sem conexão
  - `test_delete_pattern_error` - Erro no Redis

- `TestRedisCacheExists` - Testes de existência
  - `test_exists_true` - Chave existe
  - `test_exists_false` - Chave não existe
  - `test_exists_not_connected` - Sem conexão

- `TestRedisCacheIncr` - Testes de incremento
  - `test_incr_success` - Incremento bem-sucedido
  - `test_incr_default_amount` - Incremento padrão
  - `test_incr_not_connected` - Sem conexão

- `TestRedisCacheExpire` - Testes de TTL
  - `test_expire_success` - Define TTL
  - `test_expire_not_connected` - Sem conexão

## Como Executar os Testes

### Pré-requisitos

Certifique-se de ter as dependências instaladas:

```bash
pip install -r requirements.txt
```

As principais dependências para testes são:
- pytest
- pytest-asyncio
- httpx

### Executar Todos os Testes Unitários

```bash
# Do diretório backend/
pytest tests/unit/ -v
```

### Executar Arquivo Específico

```bash
# Testes de segurança
pytest tests/unit/test_security.py -v

# Testes de permissões
pytest tests/unit/test_permissions.py -v

# Testes de cache
pytest tests/unit/test_cache.py -v
```

### Executar Teste Específico

```bash
# Executar apenas uma classe de testes
pytest tests/unit/test_security.py::TestPasswordHashing -v

# Executar apenas um teste
pytest tests/unit/test_security.py::TestPasswordHashing::test_get_password_hash -v
```

### Com Cobertura

```bash
pytest tests/unit/ --cov=app/core --cov=app/services --cov-report=html
```

### Executar Testes Assíncronos

Os testes já estão configurados para executar testes assíncronos automaticamente através do `pytest-asyncio`. O arquivo `pyproject.toml` contém a configuração:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

## Estrutura dos Testes

Os testes seguem o padrão AAA (Arrange-Act-Assert):

1. **Arrange**: Prepara os dados e mocks necessários
2. **Act**: Executa a função/método a ser testado
3. **Assert**: Verifica se o resultado é o esperado

### Exemplo de Teste

```python
def test_verify_password_correct(self):
    """Test que verifica senha correta"""
    # Arrange
    password = "senha_teste_123"
    hashed = get_password_hash(password)

    # Act
    result = verify_password(password, hashed)

    # Assert
    assert result is True
```

## Mocks e Isolamento

Os testes unitários usam mocks para isolar as unidades testadas:

- **unittest.mock.AsyncMock**: Para funções/métodos assíncronos
- **unittest.mock.Mock**: Para objetos e métodos síncronos
- **unittest.mock.patch**: Para substituir dependências

### Exemplo de Mock

```python
@pytest.mark.asyncio
async def test_get_existing_key(self):
    """Test obter valor existente do cache"""
    redis_cache = RedisCache()
    mock_client = AsyncMock()

    test_data = {"name": "Test User", "id": 123}
    mock_client.get = AsyncMock(return_value=json.dumps(test_data))
    redis_cache._client = mock_client

    result = await redis_cache.get("test_key")

    assert result == test_data
    mock_client.get.assert_called_once_with("test_key")
```

## Estatísticas

- **Total de testes**: 94 testes
- **Total de linhas**: 1.020 linhas
- **Cobertura planejada**:
  - `app/core/security.py`: 100%
  - `app/core/permissions.py`: 100%
  - `app/services/cache.py`: ~95%

## Boas Práticas Aplicadas

1. **Nomes descritivos**: Cada teste tem um nome que descreve claramente o que está sendo testado
2. **Um assert por conceito**: Cada teste foca em um comportamento específico
3. **Isolamento**: Testes não dependem uns dos outros
4. **Mocks adequados**: Dependências externas são mockadas (Redis, etc.)
5. **Testes positivos e negativos**: Testam tanto casos de sucesso quanto de falha
6. **Documentação**: Docstrings explicam o propósito de cada teste
