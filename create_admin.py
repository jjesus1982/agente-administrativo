#!/usr/bin/env python3
"""
Script para criar usuário administrador no sistema Agente Administrativo
"""
import asyncio
import asyncpg
from passlib.context import CryptContext
from datetime import datetime
import os
from pathlib import Path

# Configuração da criptografia de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user():
    """Cria usuário administrador no banco de dados"""

    # Configuração do banco (usando credenciais do .env)
    DATABASE_URL = "postgresql://conecta:conecta123@localhost:5432/conecta_plus"

    print("🔗 Conectando ao banco de dados...")

    try:
        # Conectar ao banco
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Conexão estabelecida com sucesso!")

        # Verificar se já existe um tenant
        print("🏢 Verificando tenants...")
        tenant_exists = await conn.fetchval("SELECT COUNT(*) FROM tenants WHERE id = 1")

        if tenant_exists == 0:
            print("📝 Criando tenant padrão...")
            await conn.execute("""
                INSERT INTO tenants (id, nome, tipo_estrutura, created_at, updated_at)
                VALUES (1, 'Condomínio Teste', 'apartamentos', NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """)
            print("✅ Tenant criado com sucesso!")
        else:
            print("ℹ️ Tenant já existe")

        # Verificar se usuário admin já existe
        print("👤 Verificando usuário admin...")
        admin_exists = await conn.fetchval(
            "SELECT COUNT(*) FROM users WHERE email = 'admin@admin.com'"
        )

        if admin_exists > 0:
            print("⚠️ Usuário admin já existe! Atualizando senha...")

            # Hash da nova senha
            password_hash = pwd_context.hash("admin123")

            # Atualizar usuário existente
            await conn.execute("""
                UPDATE users
                SET password_hash = $1, role = 5, is_active = true, updated_at = NOW()
                WHERE email = 'admin@admin.com'
            """, password_hash)

            print("✅ Usuário admin atualizado!")
        else:
            print("📝 Criando usuário admin...")

            # Hash da senha
            password_hash = pwd_context.hash("admin123")

            # Inserir novo usuário
            await conn.execute("""
                INSERT INTO users (
                    email, password_hash, role, tenant_id,
                    is_active, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, NOW(), NOW()
                )
            """,
            "admin@admin.com",  # email
            password_hash,      # password_hash
            5,                  # role (Super Admin)
            1,                  # tenant_id
            True               # is_active
            )

            print("✅ Usuário admin criado com sucesso!")

        # Verificar criação
        user_data = await conn.fetchrow("""
            SELECT id, email, role, tenant_id, is_active, created_at
            FROM users
            WHERE email = 'admin@admin.com'
        """)

        if user_data:
            print("\n📊 DETALHES DO USUÁRIO CRIADO:")
            print(f"   📧 Email: {user_data['email']}")
            print(f"   🔑 ID: {user_data['id']}")
            print(f"   👑 Role: {user_data['role']} (Super Admin)")
            print(f"   🏢 Tenant ID: {user_data['tenant_id']}")
            print(f"   ✅ Ativo: {user_data['is_active']}")
            print(f"   📅 Criado em: {user_data['created_at']}")

        await conn.close()

        print("\n🎉 SUCESSO! Credenciais de acesso:")
        print("   📧 Email: admin@admin.com")
        print("   🔐 Senha: admin123")
        print("   🌐 URL: http://91.108.124.140:3002")
        print("\n✨ Agora você pode fazer login no sistema!")

    except asyncpg.exceptions.InvalidCatalogNameError:
        print("❌ ERRO: Banco de dados 'conecta_plus' não encontrado!")
        print("💡 Certifique-se de que o PostgreSQL está rodando e o banco foi criado.")
        print("   Comando: createdb conecta_plus")

    except asyncpg.exceptions.InvalidPasswordError:
        print("❌ ERRO: Senha incorreta para o PostgreSQL!")
        print("💡 Verifique as credenciais do banco no script.")

    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        print("💡 Verifique se o PostgreSQL está rodando e acessível.")

if __name__ == "__main__":
    print("🚀 Iniciando criação de usuário administrador...")
    print("=" * 50)
    asyncio.run(create_admin_user())
    print("=" * 50)
    print("🏁 Script finalizado!")