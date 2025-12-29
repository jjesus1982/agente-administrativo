"""
Testes unitários para app/core/security.py
"""

from datetime import timedelta

import pytest
from jose import jwt

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_access_token,
    verify_password,
    verify_refresh_token,
)


class TestPasswordHashing:
    """Testes para hashing de senhas"""

    def test_get_password_hash(self):
        """Test que gera hash de senha"""
        password = "minha_senha_secreta"
        hashed = get_password_hash(password)

        # Hash deve ser diferente da senha original
        assert hashed != password
        # Hash deve ter conteúdo
        assert len(hashed) > 0
        # Hash deve começar com $2b$ (bcrypt)
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self):
        """Test que verifica senha correta"""
        password = "senha_teste_123"
        hashed = get_password_hash(password)

        # Senha correta deve ser verificada
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test que rejeita senha incorreta"""
        password = "senha_correta"
        wrong_password = "senha_errada"
        hashed = get_password_hash(password)

        # Senha incorreta deve falhar
        assert verify_password(wrong_password, hashed) is False

    def test_different_hashes_for_same_password(self):
        """Test que o mesmo password gera hashes diferentes (salt)"""
        password = "mesma_senha"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # Hashes devem ser diferentes devido ao salt
        assert hash1 != hash2
        # Mas ambos devem verificar corretamente
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestAccessToken:
    """Testes para access tokens JWT"""

    def test_create_access_token(self):
        """Test criação de access token"""
        data = {"sub": "user@example.com", "user_id": 123}
        token = create_access_token(data)

        # Token deve ser uma string não vazia
        assert isinstance(token, str)
        assert len(token) > 0

        # Decodificar e verificar payload
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "user@example.com"
        assert payload["user_id"] == 123
        assert payload["type"] == "access"
        assert "exp" in payload

    def test_create_access_token_with_custom_expiry(self):
        """Test access token com expiração customizada"""
        data = {"sub": "user@example.com"}
        custom_delta = timedelta(minutes=60)
        token = create_access_token(data, expires_delta=custom_delta)

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

        assert payload["type"] == "access"
        assert "exp" in payload

    def test_verify_access_token_valid(self):
        """Test verificação de access token válido"""
        data = {"sub": "user@example.com", "user_id": 123}
        token = create_access_token(data)

        payload = verify_access_token(token)

        assert payload is not None
        assert payload["sub"] == "user@example.com"
        assert payload["user_id"] == 123
        assert payload["type"] == "access"

    def test_verify_access_token_invalid(self):
        """Test rejeição de token inválido"""
        invalid_token = "token.invalido.aqui"
        payload = verify_access_token(invalid_token)

        assert payload is None

    def test_verify_access_token_wrong_type(self):
        """Test rejeição de refresh token como access token"""
        data = {"sub": "user@example.com"}
        refresh_token = create_refresh_token(data)

        # Refresh token não deve passar na verificação de access token
        payload = verify_access_token(refresh_token)

        assert payload is None


class TestRefreshToken:
    """Testes para refresh tokens JWT"""

    def test_create_refresh_token(self):
        """Test criação de refresh token"""
        data = {"sub": "user@example.com", "user_id": 456}
        token = create_refresh_token(data)

        # Token deve ser uma string não vazia
        assert isinstance(token, str)
        assert len(token) > 0

        # Decodificar e verificar payload
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "user@example.com"
        assert payload["user_id"] == 456
        assert payload["type"] == "refresh"
        assert "exp" in payload

    def test_verify_refresh_token_valid(self):
        """Test verificação de refresh token válido"""
        data = {"sub": "user@example.com", "user_id": 789}
        token = create_refresh_token(data)

        payload = verify_refresh_token(token)

        assert payload is not None
        assert payload["sub"] == "user@example.com"
        assert payload["user_id"] == 789
        assert payload["type"] == "refresh"

    def test_verify_refresh_token_invalid(self):
        """Test rejeição de token inválido"""
        invalid_token = "refresh.token.invalido"
        payload = verify_refresh_token(invalid_token)

        assert payload is None

    def test_verify_refresh_token_wrong_type(self):
        """Test rejeição de access token como refresh token"""
        data = {"sub": "user@example.com"}
        access_token = create_access_token(data)

        # Access token não deve passar na verificação de refresh token
        payload = verify_refresh_token(access_token)

        assert payload is None


class TestDecodeToken:
    """Testes para decodificação de tokens"""

    def test_decode_token_valid_access(self):
        """Test decodificação de access token válido"""
        data = {"sub": "user@example.com", "role": "admin"}
        token = create_access_token(data)

        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == "user@example.com"
        assert payload["role"] == "admin"
        assert payload["type"] == "access"

    def test_decode_token_valid_refresh(self):
        """Test decodificação de refresh token válido"""
        data = {"sub": "admin@example.com"}
        token = create_refresh_token(data)

        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == "admin@example.com"
        assert payload["type"] == "refresh"

    def test_decode_token_invalid(self):
        """Test decodificação de token inválido"""
        invalid_token = "token.completamente.invalido"
        payload = decode_token(invalid_token)

        assert payload is None

    def test_decode_token_malformed(self):
        """Test decodificação de token malformado"""
        malformed_token = "apenas_uma_string_qualquer"
        payload = decode_token(malformed_token)

        assert payload is None
