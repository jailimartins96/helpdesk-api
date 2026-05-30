# 🔧 Guia de Correção - Vulnerabilidades

Arquivo com correções passo-a-passo para as vulnerabilidades encontradas.

---

## 1. 🔴 CRÍTICO: Falta de Autenticação

### ❌ Código Atual (Inseguro)
```javascript
// Qualquer um pode acessar
router.get('/api/tickets', (req, res) => {
    db.all('SELECT * FROM tickets...', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows); // SEMPRE retorna dados
    });
});
```

### ✅ Código Corrigido (Seguro)
```javascript
// 1. Instalar JWT
// npm install jsonwebtoken dotenv

// 2. Criar middleware de autenticação
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// 3. Aplicar middleware na rota
router.get('/api/tickets', authMiddleware, (req, res) => {
    // Agora só usuários autenticados podem acessar
    db.all('SELECT * FROM tickets...', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Criar rota de login
router.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Buscar usuário no banco (implementar depois)
    // Comparar senha (usar bcrypt!)
    
    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    res.json({ token });
});
```

---

## 2. 🔴 CRÍTICO: Falta de Autorização

### ❌ Código Atual (Inseguro)
```javascript
router.put('/api/tickets/:id', (req, res) => {
    const { id } = req.params;
    const { status, assignee } = req.body;
    
    // Qualquer um pode editar qualquer ticket
    db.run(`UPDATE tickets SET status = ?, assignee = ? WHERE id = ?`,
        [status, assignee, id],
        (err) => { ... }
    );
});
```

### ✅ Código Corrigido (Seguro)
```javascript
router.put('/api/tickets/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id; // Do token JWT
    const { status, assignee } = req.body;
    
    // Verificar se o usuário é o assignee ou admin
    db.get('SELECT * FROM tickets WHERE id = ? AND assignee = ?', 
        [id, userId],
        (err, ticket) => {
            if (!ticket) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            // Agora sim, atualizar
            db.run(`UPDATE tickets SET status = ?, assignee = ? WHERE id = ?`,
                [status, assignee, id],
                (err) => { ... }
            );
        }
    );
});
```

---

## 3. 🟠 ALTA: Validação de Entrada

### ❌ Código Atual (Inseguro)
```javascript
router.post('/api/tickets', (req, res) => {
    const { titulo, descricao, prioridade } = req.body;
    
    // Sem validação!
    db.run(`INSERT INTO tickets...`, 
        [numero_ticket, titulo, descricao, status, prioridade, assignee],
        ...
    );
});
```

### ✅ Código Corrigido (Seguro)
```javascript
// Instalar
// npm install express-validator

const { body, validationResult } = require('express-validator');

const validateTicket = [
    body('titulo')
        .trim()
        .notEmpty().withMessage('Título obrigatório')
        .isLength({ min: 3, max: 255 }).withMessage('Título entre 3-255 caracteres')
        .isString().withMessage('Título deve ser texto'),
    
    body('descricao')
        .trim()
        .notEmpty().withMessage('Descrição obrigatória')
        .isLength({ min: 10, max: 5000 }).withMessage('Descrição entre 10-5000 caracteres')
        .isString().withMessage('Descrição deve ser texto'),
    
    body('prioridade')
        .optional()
        .isIn(['Low', 'Normal', 'High', 'Urgent'])
        .withMessage('Prioridade inválida'),
    
    body('status')
        .optional()
        .isIn(['To Do', 'In Progress', 'Done', 'Closed'])
        .withMessage('Status inválido'),
];

router.post('/api/tickets', authMiddleware, validateTicket, (req, res) => {
    // Verificar se há erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { titulo, descricao, prioridade, status, assignee } = req.body;
    const numero_ticket = 'TCK-' + Date.now();

    db.run(`INSERT INTO tickets...`,
        [numero_ticket, titulo, descricao, status || 'To Do', prioridade || 'Normal', assignee],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, numero_ticket, titulo, descricao });
        }
    );
});
```

---

## 4. 🟠 ALTA: Headers de Segurança

### ❌ Código Atual (Inseguro)
```javascript
const express = require('express');
const app = express();

app.use(express.json());
// Sem headers de segurança!
```

### ✅ Código Corrigido (Seguro)
```javascript
// Instalar
// npm install helmet

const helmet = require('helmet');
const express = require('express');
const app = express();

// Adicionar headers de segurança
app.use(helmet()); // Isso já configura vários headers

// Ou configurar manualmente
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

app.use(express.json());
```

---

## 5. 🟠 ALTA: Rate Limiting

### ❌ Código Atual (Inseguro)
```javascript
const express = require('express');
const app = express();

// Sem proteção contra DoS!
app.post('/api/tickets', (req, res) => { ... });
```

### ✅ Código Corrigido (Seguro)
```javascript
// Instalar
// npm install express-rate-limit

const rateLimit = require('express-rate-limit');

// Rate limiter para API geral
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP por janela
    message: 'Muitas requisições, tente novamente mais tarde',
    standardHeaders: true, // Retorna info em `RateLimit-*` headers
    legacyHeaders: false,
    skip: (req) => {
        // Opcionalmente pular IPs confiáveis
        return req.ip === '::1'; // localhost
    }
});

// Rate limiter mais estrito para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 tentativas
    message: 'Muitas tentativas de login, tente novamente em 15 minutos'
});

// Aplicar limiters
app.use('/api/', apiLimiter);
app.post('/api/login', loginLimiter, (req, res) => { ... });
```

---

## 6. 🟠 ALTA: CORS Seguro

### ❌ Código Atual (Inseguro)
```javascript
const express = require('express');
const app = express();

// Sem CORS = qualquer origem pode acessar
app.use(express.json());
```

### ✅ Código Corrigido (Seguro)
```javascript
// Instalar
// npm install cors

const cors = require('cors');

const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600 // Preflight cache por 1 hora
};

app.use(cors(corsOptions));
app.use(express.json());
```

---

## 7. 🟡 MÉDIO: UUIDs ao invés de IDs Sequenciais

### ❌ Código Atual (Inseguro - Previsível)
```javascript
db.all('SELECT * FROM tickets ORDER BY criado_em DESC', [], (err, rows) => {
    // IDs são: 1, 2, 3, 4, 5... muito fácil de enumerar
    res.json(rows);
});
```

### ✅ Código Corrigido (Seguro)
```javascript
// Instalar
// npm install uuid

const { v4: uuidv4 } = require('uuid');

// Ao criar ticket
const ticketId = uuidv4();

// Ao buscar
db.get('SELECT * FROM tickets WHERE id = ?', [ticketId], (err, row) => {
    res.json(row);
});

// Atualizar schema do banco
// ALTER TABLE tickets ADD COLUMN uuid TEXT UNIQUE DEFAULT (lower(hex(randomblob(16))))
```

---

## 8. 🟡 MÉDIO: Sanitizar XSS

### ❌ Código Atual (Inseguro)
```javascript
router.post('/api/tickets', (req, res) => {
    const { titulo } = req.body;
    // Armazena como está, sem sanitizar
    db.run(`INSERT INTO tickets (titulo) VALUES (?)`, [titulo], ...);
});
```

### ✅ Código Corrigido (Seguro - Backend)
```javascript
// Instalar
// npm install sanitize-html

const sanitizeHtml = require('sanitize-html');

router.post('/api/tickets', (req, res) => {
    let { titulo, descricao } = req.body;
    
    // Sanitizar inputs
    titulo = sanitizeHtml(titulo, { allowedTags: [], allowedAttributes: {} });
    descricao = sanitizeHtml(descricao, { 
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'], 
        allowedAttributes: { 'a': ['href'] }
    });

    db.run(`INSERT INTO tickets...`, [titulo, descricao, ...], ...);
});

// IMPORTANTE: Também escapar no Frontend (HTML encode)
// Usar innerText ao invés de innerHTML
// document.querySelector('#titulo').innerText = data.titulo; // Seguro
// document.querySelector('#titulo').innerHTML = data.titulo; // Inseguro!
```

---

## 9. 🟡 MÉDIO: Logging de Segurança

### ❌ Código Atual (Sem logs)
```javascript
router.put('/api/tickets/:id', (req, res) => {
    // Ninguém sabe o que aconteceu
    db.run(`UPDATE tickets...`);
});
```

### ✅ Código Corrigido (Com logs)
```javascript
// Instalar
// npm install winston

const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'helpdesk-api' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Usar nos endpoints
router.put('/api/tickets/:id', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const ticketId = req.params.id;
    
    logger.info(`User ${userId} updating ticket ${ticketId}`);

    db.run(`UPDATE tickets...`, (err) => {
        if (err) {
            logger.error(`Error updating ticket ${ticketId}:`, err);
            return res.status(500).json({ error: 'Erro ao atualizar' });
        }
        logger.info(`Ticket ${ticketId} updated successfully by ${userId}`);
        res.json({ success: true });
    });
});
```

---

## 10. Exemplo Completo (Server.js Seguro)

```javascript
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Security Middlewares
app.use(helmet());

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true
}));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições'
}));

// ✅ Body parsing
app.use(express.json({ limit: '1mb' })); // Limita tamanho

// ✅ Static files (protegido)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Routes com autenticação
const routes = require('./routes');
app.use(routes);

// ✅ Error handling
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Página não encontrada' });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;
```

---

## ✅ Checklist de Implementação

- [ ] 1. Instalar dependências de segurança
- [ ] 2. Implementar JWT e autenticação
- [ ] 3. Adicionar verificação de autorização
- [ ] 4. Validar toda entrada com express-validator
- [ ] 5. Adicionar helmet para headers
- [ ] 6. Configurar rate limiting
- [ ] 7. Limpar CORS
- [ ] 8. Usar UUIDs para recursos
- [ ] 9. Sanitizar XSS
- [ ] 10. Implementar logging
- [ ] 11. Testar com os scripts de segurança
- [ ] 12. Fazer code review
- [ ] 13. Deploy em staging
- [ ] 14. Teste final de penetração
- [ ] 15. Deploy em produção

---

## 📚 Referências

- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [npm Security](https://docs.npmjs.com/packages-and-modules/security)

