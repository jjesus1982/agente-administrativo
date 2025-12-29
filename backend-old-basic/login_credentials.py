#!/usr/bin/env python3
"""
Credenciais de Login - Conecta Plus
Credenciais padrão para acessar o sistema
"""

print("🔐 CREDENCIAIS DE LOGIN - CONECTA PLUS")
print("=" * 70)
print()

print("👤 USUÁRIO ADMINISTRADOR:")
print("   📧 Email: admin@conectaplus.com")
print("   🔑 Senha: admin123")
print("   🏅 Nível: Super Administrador (acesso total)")
print()

print("👥 USUÁRIOS DE TESTE:")
print()

print("🏢 SÍNDICO - Condomínio Alpha:")
print("   📧 Email: sindico.alpha@teste.com")
print("   🔑 Senha: sindico123")
print("   🏅 Nível: Síndico")
print()

print("🏢 SÍNDICO - Condomínio Beta:")
print("   📧 Email: sindico.beta@teste.com")
print("   🔑 Senha: sindico123")
print("   🏅 Nível: Síndico")
print()

print("🚪 PORTEIRO:")
print("   📧 Email: porteiro@teste.com")
print("   🔑 Senha: porteiro123")
print("   🏅 Nível: Porteiro")
print()

print("🏠 MORADOR:")
print("   📧 Email: morador@teste.com")
print("   🔑 Senha: morador123")
print("   🏅 Nível: Morador")
print()

print("🌐 COMO FAZER LOGIN:")
print("=" * 70)
print()

print("1️⃣ VIA API (CURL):")
print("curl -X POST 'http://localhost:8101/api/v1/auth/login' \\")
print("  -H 'Content-Type: application/json' \\")
print("  -d '{")
print('    "email": "admin@conectaplus.com",')
print('    "password": "admin123"')
print("  }'")
print()

print("2️⃣ VIA SWAGGER UI:")
print("   🌐 Abra: http://localhost:8101/docs")
print("   🔓 Clique em 'Authorize' (cadeado verde)")
print("   📝 Digite: admin@conectaplus.com / admin123")
print("   ✅ Clique em 'Login'")
print()

print("3️⃣ VIA FRONTEND:")
print("   🌐 Abra: http://localhost:3000/login")
print("   📝 Digite as credenciais admin")
print("   🏠 Acesse /admin/condominios/criar")
print()

print("🔑 TOKEN JWT:")
print("   Após login bem-sucedido, você receberá um token JWT")
print("   Use este token no header: Authorization: Bearer <token>")
print()

print("🛡️ NÍVEIS DE ACESSO:")
print("   • Super Admin (5): Acesso total ao sistema")
print("   • Admin (4): Gestão de condomínios")
print("   • Porteiro (3): Controle de acesso")
print("   • Síndico (2): Gestão do próprio condomínio")
print("   • Morador (1): Acesso básico do próprio condomínio")
print()

print("⚠️ SEGURANÇA:")
print("   • Estas são credenciais de DESENVOLVIMENTO")
print("   • MUDE as senhas em produção!")
print("   • O sistema tem isolação multi-tenant")
print("   • Cada usuário só acessa seu próprio condomínio")
print()

print("🎯 TESTANDO O SISTEMA:")
print("=" * 70)
print("1. Login como admin → Criar condomínios")
print("2. Login como síndico → Gerenciar seu condomínio")
print("3. Testar APIs públicas → Validar integração App Simples")
print("4. Verificar isolação → Usuário A não vê dados do B")
print("5. Testar sincronização → Webhooks funcionando")