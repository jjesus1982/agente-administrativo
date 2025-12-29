"""
Configurações da aplicação
Todas as configurações sensíveis devem ser definidas via variáveis de ambiente
"""

import os
import secrets
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

# Base directory for uploads - uses environment variable or defaults to local uploads folder
UPLOAD_BASE_DIR = os.environ.get("UPLOAD_BASE_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))


class Settings(BaseSettings):
    """Configurações da aplicação"""

    # App
    APP_NAME: str = "Conecta Plus API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = Field(default="development", description="development, staging, production")

    # API
    API_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:3005",  # ✅ Adicionar porta do frontend atual
        "http://91.108.124.140:3000",  # ✅ Frontend externo
        "http://91.108.124.140:3002",  # ✅ Frontend externo alternativo
        "http://91.108.124.140:3005",  # ✅ Frontend externo porta 3005
    ]

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/conecta_plus",
        description="URL de conexão com o PostgreSQL",
    )
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # 30 minutos

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 10
    CACHE_TTL_SECONDS: int = 300  # 5 minutos

    # JWT - IMPORTANTE: Defina SECRET_KEY via variável de ambiente em produção!
    SECRET_KEY: str = Field(
        ...,  # ✅ OBRIGATÓRIO - sem default para forçar configuração via env
        min_length=32,
        description="Chave secreta para JWT. OBRIGATÓRIO via variável de ambiente SECRET_KEY!",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100  # requisições
    RATE_LIMIT_WINDOW: int = 60  # segundos
    RATE_LIMIT_AUTH_REQUESTS: int = 5  # tentativas de login
    RATE_LIMIT_AUTH_WINDOW: int = 300  # 5 minutos

    # Security
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_MAX_AGE: int = 600
    @property
    def SECURE_COOKIES(self) -> bool:
        """✅ Cookies seguros automáticos: True em prod/staging, False em dev"""
        return self.ENVIRONMENT in ("production", "staging")
    TRUSTED_HOSTS: List[str] = ["localhost", "127.0.0.1"]

    # MinIO/S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = Field(default="minioadmin", description="MinIO access key")
    MINIO_SECRET_KEY: str = Field(default="minioadmin", description="MinIO secret key")
    MINIO_BUCKET: str = "conecta-plus"
    MINIO_SECURE: bool = False
    MINIO_PUBLIC_URL: str = "http://localhost:9000"

    # Firebase (opcional)
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_ENABLED: bool = False

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = Field(default="", description="Senha SMTP")
    SMTP_FROM_EMAIL: str = "noreply@conectaplus.com.br"
    SMTP_USE_TLS: bool = True

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json ou text
    LOG_FILE: Optional[str] = None

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx"]

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT deve ser um de: {allowed}")
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY deve ter pelo menos 32 caracteres")
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
