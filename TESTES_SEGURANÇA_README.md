# 🔒 Testes de Segurança - Helpdesk API

## 📋 Resumo Executivo

Foram realizados testes de segurança completos na API Helpdesk usando metodologia OWASP Top 10 2021. 

### 🚨 Achados Críticos

- **10 vulnerabilidades críticas** identificadas
- **5 vulnerabilidades de risco alto** 
- **Recomendação**: Não usar em produção até correções implementadas
- **Risk Score**: ~75/100 (CRÍTICO)

### ✅ O que está seguro

- ✓ SQL Injection: Protegido com prepared statements
- ✓ Path Traversal: Não há acesso a arquivo

### ❌ O que NÃO está seguro

- ✗ Autenticação: Nenhuma implementada
- ✗ Autorização: Qualquer um pode editar qualquer ticket
- ✗ IDOR: IDs sequenciais permitem enumerar recursos
- ✗ XSS: Payloads não são escapados
- ✗ Rate Limiting: Nenhum implementado
- ✗ Headers de Segurança: Não configurados
- ✗ Validação de Entrada: Muito permissiva

---

## 🚀 Como Executar os Testes

### 1. Teste Rápido (Menu Interativo)

```bash
# Rápido e interativo
node quick-test.js
```

Escolha uma opção do menu (1-9) para testar vulnerabilidades específicas.

### 2. Teste Automatizado Completo

```bash
# Executa suite completa de testes
node security-tests.js

# Resultado esperado:
# [timestamp] ✓ Rejeita título vazio
# [timestamp] ⚠ Deveria rejeitar título vazio
# ... mais testes ...
# Passou: 2
# Falhou: 8
# Avisos: 5
```

### 3. Teste Avançado (Penetração)

```bash
# Testes mais profundos com PoC
node advanced-security-tests.js

# Resultado esperado:
# 🔴 CRITICAL: Acesso sem autenticação
# 🟠 HIGH: Sem rate limiting
# 🟡 MEDIUM: Missing X-Content-Type-Options
# ...
# Total de vulnerabilidades: 10
# Risk Score: 75/100
```

### 4. Testes Manuais com CURL

Veja o arquivo `SEGURANÇA.md` para comandos CURL detalhados.

Exemplos rápidos:

```bash
# Teste autenticação
curl http://localhost:3000/api/tickets

# Teste IDOR (enumerar IDs)
curl http://localhost:3000/api/tickets/1
curl http://localhost:3000/api/tickets/2
curl http://localhost:3000/api/tickets/3

# Teste XSS
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"titulo":"<script>alert(1)</script>","descricao":"teste"}'

# Teste SQL Injection
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"titulo":"test","descricao":"'\''  OR 1=1"}'
```

---

## 🔍 Estrutura dos Testes

### Arquivo: `security-tests.js`
- Testes básicos e automatizados
- Foco em vulnerabilidades OWASP
- Requer servidor rodando na porta 3000
- Output colorido e resumo final

**Testes inclusos:**
1. Validação de entrada (campos vazios, tamanho, tipos)
2. SQL Injection
3. XSS (Cross-Site Scripting)
4. Headers de segurança HTTP
5. Autenticação/Autorização
6. Rate Limiting
7. Path Traversal
8. Controle de Acesso

### Arquivo: `advanced-security-tests.js`
- Testes aprofundados de penetração
- Análise detalhada de cada vulnerabilidade
- PoC (Proof of Concept) para cada exploit
- Risk scoring

**Testes inclusos:**
1. Broken Authentication
2. Broken Access Control (IDOR)
3. Sensitive Data Exposure
4. Input Validation
5. Stored XSS
6. CORS/CSRF
7. Rate Limiting (avançado)
8. Security Headers (detalhado)
9. Error Handling

### Arquivo: `quick-test.js`
- Menu interativo
- Teste individual de vulnerabilidades
- Ideal para diagnóstico rápido
- Output simples e direto

---

## 📊 Matriz de Vulnerabilidades

| # | Vulnerabilidade | Severidade | Status | CVSS |
|---|---|---|---|---|
| 1 | Falta de Autenticação | CRÍTICA | ❌ | 9.8 |
| 2 | Falta de Autorização | CRÍTICA | ❌ | 9.1 |
| 3 | IDOR (ID Enumeration) | ALTA | ❌ | 7.5 |
| 4 | Sem Validação de Entrada | ALTA | ❌ | 7.3 |
| 5 | Sem Rate Limiting | ALTA | ❌ | 7.5 |
| 6 | Stored XSS | MÉDIA-ALTA | ❌ | 6.1 |
| 7 | Missing Security Headers | MÉDIA | ❌ | 5.3 |
| 8 | CORS Permissivo | MÉDIA | ❌ | 5.7 |
| 9 | Database Público | MÉDIA | ❌ | 5.3 |
| 10 | Sem Logging | MÉDIA | ❌ | 3.7 |

---

## 🛠️ Próximos Passos (Roadmap)

### Fase 1: CRÍTICO (Imediato - 1 semana)

```javascript
// 1. Adicionar autenticação JWT
npm install jsonwebtoken
const jwt = require('jsonwebtoken');

// 2. Adicionar autorização
app.use(authMiddleware);

// 3. Validar entrada
app.use(validationMiddleware);
```

### Fase 2: IMPORTANTE (2 semanas)

```javascript
// 1. Headers de segurança
npm install helmet
app.use(helmet());

// 2. Rate limiting
npm install express-rate-limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// 3. CORS correto
npm install cors
app.use(cors({ origin: 'https://seu-site.com' }));
```

### Fase 3: MANUTENÇÃO (60 dias)

```javascript
// 1. UUIDs ao invés de IDs sequenciais
npm install uuid

// 2. Sanitizar XSS
npm install sanitize-html

// 3. Logging
npm install winston

// 4. Testes de segurança automatizados
npm install --save-dev jest supertest
```

---

## 📖 Documentação

- **`SEGURANÇA.md`** - Análise detalhada de cada vulnerabilidade
- **`security-tests.js`** - Suite de testes automatizados
- **`advanced-security-tests.js`** - Testes avançados de penetração
- **`quick-test.js`** - Menu interativo de testes

---

## 🔗 Referências

### OWASP
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)

### Ferramentas Recomendadas
- **Burp Suite Community** - Teste de segurança manual
- **OWASP ZAP** - Scanner automático
- **Postman** - Teste de API
- **npm audit** - Verificar vulnerabilidades em dependências

### Padrões de Segurança
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [CVSS - Vulnerability Scoring](https://www.first.org/cvss/)

---

## 💡 Dicas de Segurança para Express.js

```javascript
// 1. Use helmet para headers
npm install helmet
app.use(helmet());

// 2. Limpe inputs
npm install express-validator
const { body, validationResult } = require('express-validator');

// 3. Use JWT para auth
npm install jsonwebtoken
const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

// 4. Rate limiting
npm install express-rate-limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// 5. CORS restrito
npm install cors
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));

// 6. Logging
npm install winston
const logger = winston.createLogger({ ... });

// 7. Variáveis de ambiente
npm install dotenv
require('dotenv').config();

// 8. Testes de segurança
npm install --save-dev jest supertest
```

---

## ✉️ Contato & Suporte

Para dúvidas sobre os testes de segurança:
1. Veja a documentação em `SEGURANÇA.md`
2. Execute `node quick-test.js` para teste interativo
3. Verifique os comandos CURL em `SEGURANÇA.md`

---

**Data do Relatório:** 2026-05-22  
**Status:** Em Revisão  
**Próxima Revisão:** Após implementação de correções
