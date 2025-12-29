"""
Pytest Configuration and Fixtures
Conecta Plus API - Test Suite
"""

import asyncio
from datetime import datetime
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import Tenant, User
from app.models.unit import Unit

# Use a separate test database
TEST_DATABASE_URL = settings.DATABASE_URL.replace("/conecta_plus", "/conecta_plus_test")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for each test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=NullPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a new database session for a test"""
    async_session = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database session override"""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_tenant(db_session: AsyncSession) -> Tenant:
    """Create a test tenant"""
    tenant = Tenant(
        name="Condominio Teste",
        cnpj="12.345.678/0001-90",
        address="Rua Teste, 123",
        city="Sao Paulo",
        state="SP",
        zip_code="01234-567",
        is_active=True,
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest_asyncio.fixture
async def test_unit(db_session: AsyncSession, test_tenant: Tenant) -> Unit:
    """Create a test unit"""
    unit = Unit(
        tenant_id=test_tenant.id,
        block="A",
        number="101",
        floor=1,
        unit_type="apartment",
        is_active=True,
    )
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)
    return unit


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession, test_tenant: Tenant) -> User:
    """Create a test user (morador)"""
    user = User(
        tenant_id=test_tenant.id,
        name="Usuario Teste",
        email="teste@example.com",
        password_hash=pwd_context.hash("Senha123!"),
        cpf="123.456.789-00",
        phone="11999999999",
        role=1,  # Morador
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession, test_tenant: Tenant) -> User:
    """Create a test admin user"""
    admin = User(
        tenant_id=test_tenant.id,
        name="Admin Teste",
        email="admin@example.com",
        password_hash=pwd_context.hash("Admin123!"),
        cpf="987.654.321-00",
        phone="11988888888",
        role=4,  # Admin
        is_active=True,
        is_verified=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def test_sindico(db_session: AsyncSession, test_tenant: Tenant) -> User:
    """Create a test sindico user"""
    sindico = User(
        tenant_id=test_tenant.id,
        name="Sindico Teste",
        email="sindico@example.com",
        password_hash=pwd_context.hash("Sindico123!"),
        cpf="111.222.333-44",
        phone="11977777777",
        role=2,  # Sindico
        is_active=True,
        is_verified=True,
    )
    db_session.add(sindico)
    await db_session.commit()
    await db_session.refresh(sindico)
    return sindico


@pytest_asyncio.fixture
async def test_porteiro(db_session: AsyncSession, test_tenant: Tenant) -> User:
    """Create a test porteiro user"""
    porteiro = User(
        tenant_id=test_tenant.id,
        name="Porteiro Teste",
        email="porteiro@example.com",
        password_hash=pwd_context.hash("Porteiro123!"),
        cpf="555.666.777-88",
        phone="11966666666",
        role=3,  # Porteiro
        is_active=True,
        is_verified=True,
    )
    db_session.add(porteiro)
    await db_session.commit()
    await db_session.refresh(porteiro)
    return porteiro


@pytest_asyncio.fixture
async def inactive_user(db_session: AsyncSession, test_tenant: Tenant) -> User:
    """Create an inactive user for testing"""
    user = User(
        tenant_id=test_tenant.id,
        name="Usuario Inativo",
        email="inativo@example.com",
        password_hash=pwd_context.hash("Senha123!"),
        cpf="999.888.777-66",
        role=1,
        is_active=False,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def deleted_user(db_session: AsyncSession, test_tenant: Tenant) -> User:
    """Create a soft-deleted user for testing"""
    user = User(
        tenant_id=test_tenant.id,
        name="Usuario Deletado",
        email="deletado@example.com",
        password_hash=pwd_context.hash("Senha123!"),
        cpf="444.555.666-77",
        role=1,
        is_active=True,
        is_verified=True,
        is_deleted=True,
        deleted_at=datetime.utcnow(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def get_auth_token(client: AsyncClient, email: str, password: str) -> str:
    """Helper function to get auth token"""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    if response.status_code != 200:
        raise Exception(f"Failed to authenticate: {response.json()}")
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def user_headers(client: AsyncClient, test_user: User) -> dict:
    """Get authentication headers for regular user"""
    token = await get_auth_token(client, "teste@example.com", "Senha123!")
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient, test_admin: User) -> dict:
    """Get authentication headers for admin user"""
    token = await get_auth_token(client, "admin@example.com", "Admin123!")
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def sindico_headers(client: AsyncClient, test_sindico: User) -> dict:
    """Get authentication headers for sindico user"""
    token = await get_auth_token(client, "sindico@example.com", "Sindico123!")
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def porteiro_headers(client: AsyncClient, test_porteiro: User) -> dict:
    """Get authentication headers for porteiro user"""
    token = await get_auth_token(client, "porteiro@example.com", "Porteiro123!")
    return {"Authorization": f"Bearer {token}"}
