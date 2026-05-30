const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { db, generateUserId, hashPassword, verifyPassword, logAuth } = require('../databasse/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-helpdesk-secret-change-me';
const DEMO_USER = {
    id: process.env.HELPDESK_USER_ID || 'demo-user',
    email: process.env.HELPDESK_EMAIL || 'demo@helpdesk.local',
    role: 'user'
};

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function callback(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

function autenticar(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Token necessário' });
    }

    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

function ensureTicketOwnership(ticket, userId) {
    if (!ticket) {
        return { status: 404, payload: { error: 'Ticket não encontrado' } };
    }

    if (ticket.user_id !== userId) {
        return { status: 403, payload: { error: 'Acesso negado' } };
    }

    return { ticket };
}

function serializeUser(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name || null
    };
}

function generateToken(user) {
    return jwt.sign(serializeUser(user), JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '24h' });
}

async function getUserByEmail(email) {
    return dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
}

async function buildAuthResponse(user) {
    return {
        token: generateToken(user),
        user: serializeUser(user)
    };
}

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

router.get('/tickets', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/tickets.html'));
});

router.get('/board', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/board.html'));
});

router.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/about.html'));
});

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/register.html'));
});

router.get('/api/status', (req, res) => {
    res.json({ message: 'API rodando com sucesso!', status: 200 });
});

router.post('/api/auth/login', [
    body('email').trim().normalizeEmail().isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha obrigatória')
], validateRequest, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await getUserByEmail(email);

        if (user && verifyPassword(password, user.password_salt, user.password_hash)) {
            logAuth(`login success email=${email} userId=${user.id}`);
            return res.json(await buildAuthResponse(user));
        }

        if (email === DEMO_USER.email && password === process.env.HELPDESK_PASSWORD) {
            logAuth(`login success email=${email} userId=${DEMO_USER.id}`);
            return res.json(await buildAuthResponse(DEMO_USER));
        }

        logAuth(`login failure email=${email}`);
        return res.status(401).json({ error: 'Credenciais inválidas' });
    } catch (error) {
        logAuth(`login error email=${req.body.email || 'unknown'} error=${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

router.post('/api/auth/register', [
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Nome inválido'),
    body('email').trim().normalizeEmail().isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('A senha precisa ter pelo menos 8 caracteres'),
    body('confirmPassword').notEmpty().withMessage('Confirme a senha')
], validateRequest, async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            logAuth(`register failure email=${email.toLowerCase()} reason=password mismatch`);
            return res.status(400).json({ error: 'As senhas não conferem' });
        }

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            logAuth(`register failure email=${email.toLowerCase()} reason=email exists`);
            return res.status(409).json({ error: 'Email já cadastrado' });
        }

        const userId = generateUserId();
        const { salt, hash } = hashPassword(password);

        await dbRun(
            'INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, name.trim(), email.toLowerCase(), hash, salt, 'user']
        );

        const createdUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        logAuth(`register success email=${email.toLowerCase()} userId=${userId}`);

        return res.status(201).json(await buildAuthResponse(createdUser));
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Email já cadastrado' });
        }

        return res.status(500).json({ error: error.message });
    }
});

router.get('/api/tickets', autenticar, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM tickets WHERE user_id = ? ORDER BY criado_em DESC', [req.usuario.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/tickets', autenticar, [
    body('titulo').trim().notEmpty().isLength({ max: 200 }).withMessage('Título inválido'),
    body('descricao').trim().notEmpty().isLength({ max: 2000 }).withMessage('Descrição inválida'),
    body('status').optional().isIn(['To Do', 'In Progress', 'Done']).withMessage('Status inválido'),
    body('prioridade').optional().isIn(['Baixa', 'Normal', 'Alta']).withMessage('Prioridade inválida'),
    body('assignee').optional().trim().isLength({ max: 100 }).withMessage('Responsável inválido')
], validateRequest, async (req, res) => {
    try {
        const { titulo, descricao, prioridade, status, assignee } = req.body;
        const numero_ticket = 'TCK-' + Date.now();
        const sql = `INSERT INTO tickets (numero_ticket, titulo, descricao, status, prioridade, assignee, user_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const result = await dbRun(sql, [
            numero_ticket,
            titulo.trim(),
            descricao.trim(),
            status || 'To Do',
            prioridade || 'Normal',
            assignee || null,
            req.usuario.id
        ]);

        const created = await dbGet('SELECT * FROM tickets WHERE id = ?', [result.lastID]);
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/api/tickets/:id', autenticar, [
    body('status').optional().isIn(['To Do', 'In Progress', 'Done']).withMessage('Status inválido'),
    body('assignee').optional().trim().isLength({ max: 100 }).withMessage('Responsável inválido'),
    body('prioridade').optional().isIn(['Baixa', 'Normal', 'Alta']).withMessage('Prioridade inválida'),
    body('titulo').optional().trim().isLength({ max: 200 }).withMessage('Título inválido'),
    body('descricao').optional().trim().isLength({ max: 2000 }).withMessage('Descrição inválida')
], validateRequest, async (req, res) => {
    try {
        const ticket = await dbGet('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
        const ownership = ensureTicketOwnership(ticket, req.usuario.id);

        if (ownership.status) {
            return res.status(ownership.status).json(ownership.payload);
        }

        const { status, assignee, prioridade, titulo, descricao } = req.body;
        const updates = [];
        const params = [];

        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }

        if (assignee !== undefined) {
            updates.push('assignee = ?');
            params.push(assignee);
        }

        if (prioridade !== undefined) {
            updates.push('prioridade = ?');
            params.push(prioridade);
        }

        if (titulo !== undefined) {
            updates.push('titulo = ?');
            params.push(titulo.trim());
        }

        if (descricao !== undefined) {
            updates.push('descricao = ?');
            params.push(descricao.trim());
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(req.params.id);
        const sql = `UPDATE tickets SET ${updates.join(', ')}, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`;
        await dbRun(sql, params);

        const updated = await dbGet('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
