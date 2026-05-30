🛡️ Helpdesk API — Security Lab

API REST de helpdesk construída com Node.js + Express + SQLite, projetada como laboratório de segurança para identificar, documentar e corrigir vulnerabilidades reais seguindo a metodologia OWASP Top 10 2021.


📌 Sobre o Projeto
Este projeto nasceu com um objetivo claro: aprender segurança de APIs na prática.
A API simula um sistema de tickets de suporte e foi deliberadamente construída com vulnerabilidades reais — depois auditada com uma suíte de testes de penetração própria, que cobre desde autenticação até rate limiting e XSS.
Ideal para quem quer entender como APIs são atacadas e como defendê-las.

⚙️ Stack
TecnologiaUsoNode.js + Express 5Servidor HTTPSQLite (better-sqlite3)Banco de dadosJWT (jsonwebtoken)Autenticaçãoexpress-validatorValidação de entradaexpress-rate-limitProteção contra DoSdotenvGerenciamento de variáveis

🚀 Como rodar
Pré-requisitos

Node.js 18+
npm

Instalação
bashgit clone https://github.com/seu-usuario/helpdesk-api.git
cd helpdesk-api

npm install

cp .env.example .env
# Edite o .env com seus valores, especialmente JWT_SECRET
Rodando o servidor
bashnpm start
# Servidor em http://localhost:3000

🔒 Testes de Segurança
Este projeto inclui 3 scripts de teste baseados no OWASP Top 10:
bash# Menu interativo (recomendado para começar)
npm run test:security:quick

# Suite completa automatizada
npm run test:security

# Testes avançados de penetração com PoC
npm run test:security:advanced

⚠️ Os testes devem ser executados com o servidor rodando em localhost:3000.


📊 Vulnerabilidades Mapeadas
#VulnerabilidadeSeveridadeStatus1Falta de Autenticação🔴 CRÍTICADocumentada2Falta de Autorização🔴 CRÍTICADocumentada3IDOR (ID Enumeration)🟠 ALTADocumentada4Sem Validação de Entrada🟠 ALTADocumentada5Sem Rate Limiting🟠 ALTACorrigida ✅6Stored XSS🟡 MÉDIADocumentada7Missing Security Headers🟡 MÉDIADocumentada8CORS Permissivo🟡 MÉDIADocumentada9Database público🟡 MÉDIADocumentada10Sem Logging🟡 MÉDIADocumentada
Risk Score: 75/100 (CRÍTICO — ambiente de estudo)

📁 Estrutura do Projeto
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

📋 Endpoints da API
GET    /api/tickets          # Listar tickets
GET    /api/tickets/:id      # Buscar ticket por ID
POST   /api/tickets          # Criar ticket
PUT    /api/tickets/:id      # Atualizar ticket
DELETE /api/tickets/:id      # Remover ticket

📖 Documentação de Segurança
ArquivoConteúdoSEGURANÇA.mdAnálise técnica de cada vulnerabilidade + comandos CURL para reproduzirGUIA_CORRECOES.mdCódigo antes/depois para cada correçãoRESUMO_EXECUTIVO.mdRelatório executivo com matriz de risco e timelineTESTES_SEGURANÇA_README.mdComo executar cada teste e o que ele verifica

🌐 Deploy
Este projeto está configurado para deploy na Vercel.
Variáveis de ambiente necessárias (configurar no painel da Vercel):
PORT
NODE_ENV=production
JWT_SECRET
JWT_EXPIRY
ALLOWED_ORIGINS
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX_REQUESTS

🎓 O que você vai aprender

Como identificar vulnerabilidades em APIs REST
Como escrever testes de penetração automatizados
Como corrigir cada classe de vulnerabilidade (OWASP Top 10)
Boas práticas de segurança com Express.js


📚 Referências

OWASP Top 10 2021
OWASP API Security Top 10
Express.js Security Best Practices


📄 Licença
MIT — use, estude, modifique à vontade.
