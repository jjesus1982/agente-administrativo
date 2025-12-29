"""
Testes unitários para app/services/cache.py
"""

import json
from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from app.services.cache import RedisCache, cache_key


class TestCacheKey:
    """Testes para a função cache_key"""

    def test_cache_key_single_part(self):
        """Test cache key com uma única parte"""
        key = cache_key("users")
        assert key == "conecta:users"

    def test_cache_key_multiple_parts(self):
        """Test cache key com múltiplas partes"""
        key = cache_key("user", "123", "profile")
        assert key == "conecta:user:123:profile"

    def test_cache_key_with_numbers(self):
        """Test cache key com números"""
        user_id = 456
        key = cache_key("user", str(user_id), "settings")
        assert key == "conecta:user:456:settings"

    def test_cache_key_empty_parts(self):
        """Test cache key com partes vazias"""
        key = cache_key("tenant", "", "data")
        assert key == "conecta:tenant::data"

    def test_cache_key_many_parts(self):
        """Test cache key com muitas partes"""
        key = cache_key("a", "b", "c", "d", "e")
        assert key == "conecta:a:b:c:d:e"

    def test_cache_key_special_characters(self):
        """Test cache key com caracteres especiais"""
        key = cache_key("tenant", "abc-123", "users")
        assert key == "conecta:tenant:abc-123:users"


class TestRedisCacheInit:
    """Testes para inicialização do RedisCache"""

    def test_redis_cache_init(self):
        """Test que RedisCache inicia sem conexão"""
        redis_cache = RedisCache()
        assert redis_cache._pool is None
        assert redis_cache._client is None
        assert redis_cache.is_connected is False


class TestRedisCacheConnect:
    """Testes para conexão com Redis"""

    @pytest.mark.asyncio
    async def test_connect_success(self):
        """Test conexão bem-sucedida ao Redis"""
        redis_cache = RedisCache()

        mock_client = AsyncMock()
        mock_client.ping = AsyncMock(return_value=True)

        mock_pool = Mock()

        with patch("app.services.cache.redis.Redis") as mock_redis:
            with patch("app.services.cache.ConnectionPool.from_url") as mock_from_url:
                mock_from_url.return_value = mock_pool
                mock_redis.return_value = mock_client

                await redis_cache.connect()

                assert redis_cache._client is not None
                assert redis_cache._pool is not None
                assert redis_cache.is_connected is True
                mock_client.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_failure(self):
        """Test falha ao conectar no Redis"""
        redis_cache = RedisCache()

        with patch("app.services.cache.ConnectionPool.from_url") as mock_from_url:
            mock_from_url.side_effect = Exception("Connection failed")

            await redis_cache.connect()

            assert redis_cache._client is None
            assert redis_cache.is_connected is False

    @pytest.mark.asyncio
    async def test_connect_already_connected(self):
        """Test que não reconecta se já conectado"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()
        redis_cache._client = mock_client

        with patch("app.services.cache.redis.Redis") as mock_redis:
            await redis_cache.connect()
            # Não deve criar novo cliente
            mock_redis.assert_not_called()


class TestRedisCacheDisconnect:
    """Testes para desconexão do Redis"""

    @pytest.mark.asyncio
    async def test_disconnect_success(self):
        """Test desconexão bem-sucedida do Redis"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()
        mock_pool = AsyncMock()

        redis_cache._client = mock_client
        redis_cache._pool = mock_pool

        await redis_cache.disconnect()

        mock_client.close.assert_called_once()
        mock_pool.disconnect.assert_called_once()
        assert redis_cache._client is None
        assert redis_cache._pool is None

    @pytest.mark.asyncio
    async def test_disconnect_not_connected(self):
        """Test desconexão quando não está conectado"""
        redis_cache = RedisCache()

        # Não deve gerar erro
        await redis_cache.disconnect()

        assert redis_cache._client is None
        assert redis_cache._pool is None


class TestRedisCacheGet:
    """Testes para obter valores do cache"""

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

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self):
        """Test obter chave inexistente"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.get = AsyncMock(return_value=None)
        redis_cache._client = mock_client

        result = await redis_cache.get("nonexistent_key")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_not_connected(self):
        """Test get quando não está conectado"""
        redis_cache = RedisCache()

        result = await redis_cache.get("any_key")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_error(self):
        """Test get com erro no Redis"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.get = AsyncMock(side_effect=Exception("Redis error"))
        redis_cache._client = mock_client

        result = await redis_cache.get("error_key")

        assert result is None


class TestRedisCacheSet:
    """Testes para definir valores no cache"""

    @pytest.mark.asyncio
    async def test_set_success(self):
        """Test definir valor no cache com sucesso"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.setex = AsyncMock()
        redis_cache._client = mock_client

        test_data = {"user": "test", "active": True}
        result = await redis_cache.set("test_key", test_data, ttl=300)

        assert result is True
        mock_client.setex.assert_called_once()
        call_args = mock_client.setex.call_args
        assert call_args[0][0] == "test_key"
        assert call_args[0][1] == 300
        assert json.loads(call_args[0][2]) == test_data

    @pytest.mark.asyncio
    async def test_set_with_timedelta(self):
        """Test definir valor com TTL como timedelta"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.setex = AsyncMock()
        redis_cache._client = mock_client

        result = await redis_cache.set("test_key", "value", ttl=timedelta(minutes=5))

        assert result is True
        call_args = mock_client.setex.call_args
        assert call_args[0][1] == 300  # 5 minutos = 300 segundos

    @pytest.mark.asyncio
    async def test_set_default_ttl(self):
        """Test definir valor com TTL padrão"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.setex = AsyncMock()
        redis_cache._client = mock_client

        with patch("app.services.cache.settings") as mock_settings:
            mock_settings.CACHE_TTL_SECONDS = 600

            result = await redis_cache.set("test_key", "value")

            assert result is True
            call_args = mock_client.setex.call_args
            assert call_args[0][1] == 600

    @pytest.mark.asyncio
    async def test_set_not_connected(self):
        """Test set quando não está conectado"""
        redis_cache = RedisCache()

        result = await redis_cache.set("any_key", "any_value")

        assert result is False

    @pytest.mark.asyncio
    async def test_set_error(self):
        """Test set com erro no Redis"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.setex = AsyncMock(side_effect=Exception("Redis error"))
        redis_cache._client = mock_client

        result = await redis_cache.set("error_key", "value")

        assert result is False


class TestRedisCacheDelete:
    """Testes para deletar valores do cache"""

    @pytest.mark.asyncio
    async def test_delete_success(self):
        """Test deletar chave com sucesso"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.delete = AsyncMock()
        redis_cache._client = mock_client

        result = await redis_cache.delete("test_key")

        assert result is True
        mock_client.delete.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_delete_not_connected(self):
        """Test delete quando não está conectado"""
        redis_cache = RedisCache()

        result = await redis_cache.delete("any_key")

        assert result is False

    @pytest.mark.asyncio
    async def test_delete_error(self):
        """Test delete com erro no Redis"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.delete = AsyncMock(side_effect=Exception("Redis error"))
        redis_cache._client = mock_client

        result = await redis_cache.delete("error_key")

        assert result is False


class TestRedisCacheDeletePattern:
    """Testes para deletar por padrão"""

    @pytest.mark.asyncio
    async def test_delete_pattern_success(self):
        """Test deletar por padrão com sucesso"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        # Mock scan_iter que retorna 3 chaves
        async def mock_scan_iter(match):
            for key in ["user:1", "user:2", "user:3"]:
                yield key

        mock_client.scan_iter = mock_scan_iter
        mock_client.delete = AsyncMock()
        redis_cache._client = mock_client

        result = await redis_cache.delete_pattern("user:*")

        assert result == 3
        assert mock_client.delete.call_count == 3

    @pytest.mark.asyncio
    async def test_delete_pattern_not_connected(self):
        """Test delete pattern quando não está conectado"""
        redis_cache = RedisCache()

        result = await redis_cache.delete_pattern("any:*")

        assert result == 0

    @pytest.mark.asyncio
    async def test_delete_pattern_error(self):
        """Test delete pattern com erro"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.scan_iter = AsyncMock(side_effect=Exception("Redis error"))
        redis_cache._client = mock_client

        result = await redis_cache.delete_pattern("error:*")

        assert result == 0


class TestRedisCacheExists:
    """Testes para verificar existência de chave"""

    @pytest.mark.asyncio
    async def test_exists_true(self):
        """Test que chave existe"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.exists = AsyncMock(return_value=1)
        redis_cache._client = mock_client

        result = await redis_cache.exists("existing_key")

        assert result is True

    @pytest.mark.asyncio
    async def test_exists_false(self):
        """Test que chave não existe"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.exists = AsyncMock(return_value=0)
        redis_cache._client = mock_client

        result = await redis_cache.exists("nonexistent_key")

        assert result is False

    @pytest.mark.asyncio
    async def test_exists_not_connected(self):
        """Test exists quando não está conectado"""
        redis_cache = RedisCache()

        result = await redis_cache.exists("any_key")

        assert result is False


class TestRedisCacheIncr:
    """Testes para incrementar valores"""

    @pytest.mark.asyncio
    async def test_incr_success(self):
        """Test incrementar valor com sucesso"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.incr = AsyncMock(return_value=5)
        redis_cache._client = mock_client

        result = await redis_cache.incr("counter", 2)

        assert result == 5
        mock_client.incr.assert_called_once_with("counter", 2)

    @pytest.mark.asyncio
    async def test_incr_default_amount(self):
        """Test incrementar com valor padrão"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.incr = AsyncMock(return_value=1)
        redis_cache._client = mock_client

        result = await redis_cache.incr("counter")

        assert result == 1
        mock_client.incr.assert_called_once_with("counter", 1)

    @pytest.mark.asyncio
    async def test_incr_not_connected(self):
        """Test incr quando não está conectado"""
        redis_cache = RedisCache()

        result = await redis_cache.incr("any_key")

        assert result is None


class TestRedisCacheExpire:
    """Testes para definir TTL"""

    @pytest.mark.asyncio
    async def test_expire_success(self):
        """Test definir TTL com sucesso"""
        redis_cache = RedisCache()
        mock_client = AsyncMock()

        mock_client.expire = AsyncMock(return_value=True)
        redis_cache._client = mock_client

        result = await redis_cache.expire("test_key", 300)

        assert result is True
        mock_client.expire.assert_called_once_with("test_key", 300)

    @pytest.mark.asyncio
    async def test_expire_not_connected(self):
        """Test expire quando não está conectado"""
        redis_cache = RedisCache()

        result = await redis_cache.expire("any_key", 100)

        assert result is False
