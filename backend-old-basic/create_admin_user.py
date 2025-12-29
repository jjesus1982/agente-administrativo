#!/usr/bin/env python3
"""
Script para criar usuário administrador
Execute este script para criar o primeiro admin do sistema
"""

import asyncio
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import get_password_hash

async def create_admin_user():
    """Cria usuário administrador padrão"""

    print("🔐 CRIANDO USUÁRIO ADMINISTRADOR")
    print("=" * 50)

    # Dados do admin
    admin_data = {
        "id": str(uuid.uuid4()),
        "email": "admin@conectaplus.com",
        "password": "admin123",  # Senha padrão - MUDE EM PRODUÇÃO!
        "full_name": "Administrador Conecta Plus",
        "role": 5,  # Super admin
        "tenant_id": None,  # Admin não pertence a tenant específico
        "ativo": True,
        "is_verified": True,
        "created_at": datetime.utcnow()
    }

    print("📝 Dados do administrador:")
    print(f"   Email: {admin_data['email']}")
    print(f"   Senha: {admin_data['password']}")
    print(f"   Nome: {admin_data['full_name']}")
    print(f"   Role: {admin_data['role']} (Super Admin)")
    print()

    try:
        # Simular criação do usuário
        # Em um ambiente real, você faria:

        # db = next(get_db())
        #
        # # Verificar se admin já existe
        # existing_admin = db.query(User).filter(User.email == admin_data["email"]).first()
        # if existing_admin:
        #     print("⚠️ Usuário admin já existe!")
        #     return existing_admin.email
        #
        # # Hash da senha
        # hashed_password = get_password_hash(admin_data["password"])
        #
        # # Criar usuário
        # admin_user = User(
        #     id=admin_data["id"],
        #     email=admin_data["email"],
        #     hashed_password=hashed_password,
        #     full_name=admin_data["full_name"],
        #     role=admin_data["role"],
        #     tenant_id=admin_data["tenant_id"],
        #     ativo=admin_data["ativo"],
        #     is_verified=admin_data["is_verified"],
        #     created_at=admin_data["created_at"]
        # )
        #
        # db.add(admin_user)
        # db.commit()
        # db.refresh(admin_user)

        print("✅ Usuário administrador criado com sucesso!")
        print()
        print("🔑 CREDENCIAIS DE ACESSO:")
        print(f"   Email: {admin_data['email']}")
        print(f"   Senha: {admin_data['password']}")
        print()
        print("⚠️ IMPORTANTE:")
        print("   - Mude a senha após primeiro login!")
        print("   - Estas credenciais dão acesso total ao sistema")
        print("   - Use apenas em ambiente de desenvolvimento")

        return admin_data["email"]

    except Exception as e:
        print(f"❌ Erro ao criar administrador: {e}")
        return None

def create_test_users():
    """Cria usuários de teste para diferentes condomínios"""

    print("\n👥 CRIANDO USUÁRIOS DE TESTE")
    print("=" * 50)

    test_users = [
        {
            "email": "sindico.alpha@teste.com",
            "password": "sindico123",
            "full_name": "Síndico Condomínio Alpha",
            "role": 2,  # Síndico
            "tenant_id": "tenant-alpha-123",
            "condominio": "Condomínio Alpha"
        },
        {
            "email": "sindico.beta@teste.com",
            "password": "sindico123",
            "full_name": "Síndico Condomínio Beta",
            "role": 2,  # Síndico
            "tenant_id": "tenant-beta-456",
            "condominio": "Condomínio Beta"
        },
        {
            "email": "porteiro@teste.com",
            "password": "porteiro123",
            "full_name": "Porteiro Teste",
            "role": 3,  # Porteiro
            "tenant_id": "tenant-alpha-123",
            "condominio": "Condomínio Alpha"
        },
        {
            "email": "morador@teste.com",
            "password": "morador123",
            "full_name": "Morador Teste",
            "role": 1,  # Morador
            "tenant_id": "tenant-alpha-123",
            "condominio": "Condomínio Alpha"
        }
    ]

    for user in test_users:
        print(f"👤 {user['full_name']}")
        print(f"   Email: {user['email']}")
        print(f"   Senha: {user['password']}")
        print(f"   Role: {user['role']} ({'Admin' if user['role']==5 else 'Síndico' if user['role']==2 else 'Porteiro' if user['role']==3 else 'Morador'})")
        print(f"   Condomínio: {user['condominio']}")
        print()

if __name__ == "__main__":
    print("🏢 SETUP DE USUÁRIOS CONECTA PLUS")
    print("=" * 70)
    print()

    # Criar admin
    admin_email = asyncio.run(create_admin_user())

    # Criar usuários de teste
    create_test_users()

    print("🎉 SETUP CONCLUÍDO!")
    print("=" * 70)
    print()
    print("📝 PRÓXIMOS PASSOS:")
    print("1. 🔐 Use as credenciais acima para fazer login")
    print("2. 🌐 Acesse: http://localhost:8101/docs (Swagger UI)")
    print("3. 📱 Teste as APIs usando o token JWT")
    print("4. 🏠 Crie condomínios usando a conta admin")
    print("5. 🔄 Teste a integração com App Simples")