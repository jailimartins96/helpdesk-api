# Helpdesk API — Security Lab

API REST de helpdesk construída com Node.js + Express + SQLite, projetada como laboratório de segurança para identificar, documentar e corrigir vulnerabilidades reais seguindo a metodologia OWASP Top 10 2021.

## 📌 Sobre o Projeto

Este projeto nasceu com um objetivo claro: aprender segurança de APIs na prática.
A API simula um sistema de tickets de suporte e foi deliberadamente construída com vulnerabilidades reais — depois auditada com uma suíte de testes de penetração própria, que cobre desde autenticação até rate limiting e XSS.
Ideal para quem quer entender como APIs são atacadas e como defendê-las.

## ⚙️ Stack

| Tecnologia | Uso |
| --- | --- |
| Node.js + Express 5 | Servidor HTTP |
| SQLite / better-sqlite3 | Banco de dados |
| JWT (jsonwebtoken) | Autenticação |
| express-validator | Validação de entrada |
| express-rate-limit | Proteção contra DoS |
| dotenv | Gerenciamento de variáveis |

## 🚀 Como rodar

### Pré-requisitos

- Node.js 18+
- npm

### Instalação

```bash
git clone https://github.com/jailimartins96/helpdesk-api.git
cd helpdesk-api
npm install
cp .env.example .env
# Edite o .env com seus valores, especialmente JWT_SECRET
```

### Rodando o servidor localmente

```bash
npm start
```

A API ficará disponível em `http://localhost:3000`.

## 🚄 Deploy no Railway

Este projeto já está preparado para rodar no Railway como um app Node.js.

### Passos rápidos

1. Crie um novo projeto no Railway e importe este repositório do GitHub.
2. Configure as variáveis de ambiente:
   - `DATABASE_URL` (para PostgreSQL no Railway)
   - `JWT_SECRET`
   - `JWT_EXPIRY`
   - `HELPDESK_EMAIL`
   - `HELPDESK_PASSWORD`
   - `HELPDESK_USER_ID`
   - `RATE_LIMIT_WINDOW_MS`
   - `RATE_LIMIT_MAX_REQUESTS`
3. Defina o comando de start como `npm start`, ou use o `Procfile` já presente no repositório.
4. Deploy.

## Deploy no Fly.io

1. Instale o CLI do Fly: `curl -L https://fly.io/install.sh | sh` ou use o instalador oficial.
2. No diretório do projeto, inicialize o app:
   - `flyctl launch --name helpdesk-api --region gru --no-deploy`
3. Crie um volume persistente para SQLite e logs:
   - `flyctl volumes create helpdesk-data --size 1 --region gru`
4. Defina as variáveis de ambiente no Fly:
   - `flyctl secrets set JWT_SECRET=seu_seguro_secret` \
     `DB_PATH=/data/helpdesk.db` \
     `LOG_DIR=/data/logs`
5. Faça deploy:
   - `flyctl deploy`

### Notas
- Para usar SQLite no Fly, mantenha `DB_PATH=/data/helpdesk.db` e `LOG_DIR=/data/logs`.
- Se preferir PostgreSQL, crie um banco no Fly e use `DATABASE_URL` em vez de `DB_PATH`.

### Dica
Use o plugin PostgreSQL do Railway para criar o banco e obter a `DATABASE_URL` automaticamente.

### Observação importante

SQLite não é ideal em ambientes serverless como Railway, porque o armazenamento local pode ser temporário e não persistir entre instâncias.

Para produção, recomendo usar um banco remoto como PostgreSQL via plugin Railway ou Supabase.

## 🔒 Testes de Segurança

Este projeto inclui 3 scripts de teste baseados no OWASP Top 10:

```bash
# Menu interativo (recomendado para começar)
npm run test:security:quick

# Suite completa automatizada
npm run test:security

# Testes avançados de penetração com PoC
npm run test:security:advanced
```

> Os testes devem ser executados com o servidor rodando em `localhost:3000`.

## 📊 Vulnerabilidades Mapeadas

| # | Vulnerabilidade | Severidade | Status |
| --- | --- | --- | --- |
| 1 | Falta de Autenticação | 🔴 CRÍTICO | Documentada |
| 2 | Falta de Autorização | 🔴 CRÍTICO | Documentada |
| 3 | IDOR (ID Enumeration) | 🟠 ALTA | Documentada |
| 4 | Sem Validação de Entrada | 🟠 ALTA | Documentada |
| 5 | Sem Rate Limiting | 🟠 ALTA | Corrigida ✅ |
| 6 | Stored XSS | 🟡 MÉDIA | Documentada |
| 7 | Missing Security Headers | 🟡 MÉDIA | Documentada |
| 8 | CORS Permissivo | 🟡 MÉDIA | Documentada |
| 9 | Database público | 🟡 MÉDIA | Documentada |
| 10 | Sem Logging | 🟡 MÉDIA | Documentada |

**Risk Score:** 75/100 (CRÍTICO — ambiente de estudo)

## 📁 Estrutura do Projeto

```text
helpdesk-api/
├── server.js                    # Entry point
├── routes/                      # Rotas da API
├── security-tests.js            # Suite básica de testes OWASP
├── advanced-security-tests.js   # Testes de penetração avançados
├── quick-test.js                # Menu interativo de testes
├── SEGURANÇA.md                 # Análise detalhada de cada vulnerabilidade
├── GUIA_CORRECOES.md            # Código inseguro vs. seguro (passo a passo)
├── RESUMO_EXECUTIVO.md          # Relatório executivo dos testes
├── .env.example                 # Template de variáveis de ambiente
└── package.json
```

## 📋 Endpoints da API

- `GET /api/tickets` — Listar tickets
- `GET /api/tickets/:id` — Buscar ticket por ID
- `POST /api/tickets` — Criar ticket
- `PUT /api/tickets/:id` — Atualizar ticket
- `DELETE /api/tickets/:id` — Remover ticket

## 📖 Documentação de Segurança

| Arquivo | Conteúdo |
| --- | --- |
| `SEGURANÇA.md` | Análise técnica de cada vulnerabilidade + comandos CURL para reproduzir |
| `GUIA_CORRECOES.md` | Código antes/depois para cada correção |
| `RESUMO_EXECUTIVO.md` | Relatório executivo com matriz de risco e timeline |
| `TESTES_SEGURANÇA_README.md` | Como executar cada teste e o que ele verifica |

## 🌐 Deploy

Este projeto está configurado para deploy no Vercel e Railway.

Variáveis de ambiente necessárias:

- `PORT`
- `NODE_ENV=production`
- `JWT_SECRET`
- `JWT_EXPIRY`
- `ALLOWED_ORIGINS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

## 🎓 O que você vai aprender

- Como identificar vulnerabilidades em APIs REST
- Como escrever testes de penetração automatizados
- Como corrigir cada classe de vulnerabilidade (OWASP Top 10)
- Boas práticas de segurança com Express.js

## 📚 Referências

- OWASP Top 10 2021
- OWASP API Security Top 10
- Express.js Security Best Practices

## 📄 Licença

MIT — use, estude, modifique à vontade.
