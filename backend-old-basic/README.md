# 🏗️ Conecta Plus - Backend API

API RESTful do Portal de Gestão Condominial Conecta Plus.

## 📋 Tecnologias

- **Python 3.12+**
- **FastAPI** - Framework web async
- **SQLAlchemy 2.0** - ORM async
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e sessões
- **JWT** - Autenticação

## 🚀 Início Rápido

### Com Docker (Recomendado)

```bash
# Clone o repositório
cd backend

# Copie o arquivo de ambiente
cp .env.example .env

# Suba os containers
docker-compose up -d

# Acesse a documentação
open http://localhost:8100/docs
```

### Sem Docker

```bash
# Crie ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\venv\Scripts\activate  # Windows

# Instale dependências
pip install -r requirements.txt

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Rode o servidor
uvicorn app.main:app --reload --port 8100
```

## 📁 Estrutura do Projeto

```
backend/
├── app/
│   ├── main.py              # Entry point
│   ├── config.py            # Configurações
│   ├── database.py          # Conexão com DB
│   ├── api/
│   │   ├── deps.py          # Dependências
│   │   └── v1/
│   │       ├── router.py    # Agregador de rotas
│   │       ├── auth.py      # Autenticação
│   │       ├── users.py     # Usuários
│   │       ├── visitors.py  # Visitantes
│   │       ├── dashboard.py # Dashboard
│   │       └── reports.py   # Relatórios
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Lógica de negócio
│   └── core/
│       ├── security.py      # JWT, senhas
│       ├── permissions.py   # RBAC
│       └── exceptions.py    # Exceções
├── scripts/
│   └── seed_data.py         # Dados iniciais
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## 🔐 Autenticação

### Login

```bash
POST /api/v1/auth/login
{
    "email": "admin@conectaplus.com.br",
    "password": "Admin@123"
}
```

### Usando o Token

```bash
GET /api/v1/users
Authorization: Bearer <access_token>
```

## 📊 Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Dados do usuário logado |
| GET | `/api/v1/users` | Listar usuários |
| GET | `/api/v1/visitors` | Listar visitantes |
| GET | `/api/v1/visitors/active` | Visitantes no condomínio |
| POST | `/api/v1/visitors/{id}/entry` | Registrar entrada |
| POST | `/api/v1/visitors/{id}/exit` | Registrar saída |
| GET | `/api/v1/dashboard/stats` | Estatísticas |
| GET | `/api/v1/reports/visitors` | Relatório de visitantes |

## 👥 Níveis de Permissão (RBAC)

| Role | Nível | Permissões |
|------|-------|------------|
| Morador | 1 | Acesso básico |
| Síndico | 2 | Gestão do condomínio |
| Porteiro | 3 | Controle de acesso |
| Administrador | 4 | Acesso total ao tenant |
| Super Admin | 5 | Acesso global |

## 🧪 Usuários de Teste

Após rodar o seed (`python scripts/seed_data.py`):

| Email | Senha | Role |
|-------|-------|------|
| admin@conectaplus.com.br | Admin@123 | Super Admin |
| sindico@conectaplus.com.br | Sindico@123 | Síndico |
| porteiro@conectaplus.com.br | Porteiro@123 | Porteiro |
| maria@email.com | Morador@123 | Morador |

## 📚 Documentação

- **Swagger UI**: http://localhost:8100/docs
- **ReDoc**: http://localhost:8100/redoc
- **OpenAPI JSON**: http://localhost:8100/openapi.json

## 🔧 Comandos Úteis

```bash
# Rodar servidor em desenvolvimento
uvicorn app.main:app --reload --port 8100

# Popular dados iniciais
python scripts/seed_data.py

# Verificar logs do Docker
docker-compose logs -f api

# Acessar banco de dados
docker exec -it conecta-db psql -U postgres -d conecta_plus
```

## 🌐 Integração com Front-end

O front-end (Next.js) deve configurar a URL da API:

```javascript
// next.config.js ou .env.local
NEXT_PUBLIC_API_URL=http://localhost:8100/api/v1
```

## 📄 Licença

Proprietary - Conecta Plus © 2025
