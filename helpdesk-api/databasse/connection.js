const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const logDir = process.env.LOG_DIR
    ? path.isAbsolute(process.env.LOG_DIR)
        ? process.env.LOG_DIR
        : path.resolve(process.cwd(), process.env.LOG_DIR)
    : path.join(__dirname, '..', 'logs');
const dbLogFile = path.join(logDir, 'db.log');
const authLogFile = path.join(logDir, 'auth.log');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

function appendLog(file, message) {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    try {
        fs.appendFileSync(file, line);
    } catch (err) {
        console.error('Falha ao gravar log:', err.message);
    }
}

function logDatabase(message) {
    appendLog(dbLogFile, message);
}

function logAuth(message) {
    appendLog(authLogFile, message);
}

const isPostgres = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
const dbPath = process.env.DB_PATH
    ? path.isAbsolute(process.env.DB_PATH)
        ? process.env.DB_PATH
        : path.resolve(process.cwd(), process.env.DB_PATH)
    : path.join(__dirname, 'helpdesk.db');

let db;
let pool;

if (isPostgres) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on('error', (err) => {
        console.error('Erro no pool PostgreSQL:', err.message);
        logDatabase('Erro no pool PostgreSQL: ' + err.message);
    });
    console.log('Usando PostgreSQL como banco de dados.');
    logDatabase('Usando PostgreSQL como banco de dados.');
} else {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Erro ao abrir DB SQLite:', err.message);
            logDatabase('Erro ao abrir DB SQLite: ' + err.message);
        } else {
            console.log('Conectado ao banco de dados SQLite.');
            logDatabase('Conectado ao banco de dados SQLite.');
        }
    });
}

function toPostgresQuery(sql, params = []) {
    let index = 0;
    let text = '';

    for (const char of sql) {
        if (char === '?') {
            index += 1;
            text += `$${index}`;
        } else {
            text += char;
        }
    }

    return { text, values: params };
}

function dbAll(sql, params = []) {
    if (isPostgres) {
        const { text, values } = toPostgresQuery(sql, params);
        return pool.query(text, values).then((result) => result.rows);
    }

    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    if (isPostgres) {
        const { text, values } = toPostgresQuery(sql, params);
        return pool.query(text, values).then((result) => result.rows[0]);
    }

    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    if (isPostgres) {
        const { text, values } = toPostgresQuery(sql, params);
        const returningSql = /returning\s+/i.test(text) || !/^\s*INSERT\s+/i.test(text)
            ? text
            : `${text} RETURNING id`;

        return pool.query(returningSql, values).then((result) => ({
            lastID: result.rows?.[0]?.id ?? null,
            rowCount: result.rowCount
        }));
    }

    return new Promise((resolve, reject) => {
        db.run(sql, params, function callback(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function generateUserId() {
    return `user-${crypto.randomBytes(8).toString('hex')}`;
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');

    return { salt, hash };
}

function verifyPassword(password, salt, hash) {
    const derivedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
    return derivedHash === hash;
}

async function ensureUserSchema() {
    const sql = isPostgres
        ? `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
        : `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    if (isPostgres) {
        try {
            await dbRun(sql);
        } catch (createErr) {
            console.error('Erro ao criar tabela users:', createErr.message);
            logDatabase('Erro ao criar tabela users: ' + createErr.message);
            return;
        }

        const demoEmail = process.env.HELPDESK_EMAIL || 'demo@helpdesk.local';
        const demoPassword = process.env.HELPDESK_PASSWORD || 'demo123';
        const demoId = process.env.HELPDESK_USER_ID || 'demo-user';
        const demoName = 'Demo Helpdesk';

        try {
            const row = await dbGet('SELECT id FROM users WHERE email = ?', [demoEmail]);
            if (row) return;

            const { salt, hash } = hashPassword(demoPassword);
            await dbRun(
                'INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, ?)',
                [demoId, demoName, demoEmail, hash, salt, 'user']
            );
        } catch (err) {
            if (err.message.includes('duplicate key') || err.message.includes('UNIQUE')) {
                return;
            }
            console.error('Erro ao criar usuário demo:', err.message);
            logDatabase('Erro ao criar usuário demo: ' + err.message);
        }

        return;
    }

    db.run(sql, (createErr) => {
        if (createErr) {
            console.error('Erro ao criar tabela users:', createErr.message);
            logDatabase('Erro ao criar tabela users: ' + createErr.message);
            return;
        }

        const demoEmail = process.env.HELPDESK_EMAIL || 'demo@helpdesk.local';
        const demoPassword = process.env.HELPDESK_PASSWORD || 'demo123';
        const demoId = process.env.HELPDESK_USER_ID || 'demo-user';
        const demoName = 'Demo Helpdesk';

        db.get('SELECT id FROM users WHERE email = ?', [demoEmail], (err, row) => {
            if (err) {
                console.error('Erro ao verificar usuário demo:', err.message);
                logDatabase('Erro ao verificar usuário demo: ' + err.message);
                return;
            }

            if (row) {
                return;
            }

            const { salt, hash } = hashPassword(demoPassword);

            db.run(
                'INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, ?)',
                [demoId, demoName, demoEmail, hash, salt, 'user'],
                (insertErr) => {
                    if (insertErr) {
                        console.error('Erro ao criar usuário demo:', insertErr.message);
                        logDatabase('Erro ao criar usuário demo: ' + insertErr.message);
                    }
                }
            );
        });
    });
}

async function ensureTicketSchema() {
    const sql = isPostgres
        ? `CREATE TABLE IF NOT EXISTS tickets (
            id SERIAL PRIMARY KEY,
            numero_ticket TEXT NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'To Do',
            prioridade TEXT NOT NULL DEFAULT 'Normal',
            assignee TEXT,
            user_id TEXT NOT NULL DEFAULT 'demo-user',
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
        : `CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_ticket TEXT NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'To Do',
            prioridade TEXT NOT NULL DEFAULT 'Normal',
            assignee TEXT,
            user_id TEXT NOT NULL DEFAULT 'demo-user',
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    if (isPostgres) {
        try {
            await dbRun(sql);
            const columns = await dbAll(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets'"
            );
            const hasAssignee = columns.some((column) => column.column_name === 'assignee');
            const hasUserId = columns.some((column) => column.column_name === 'user_id');

            const applyUserMigration = async () => {
                try {
                    await dbRun(
                        'UPDATE tickets SET user_id = COALESCE(user_id, $1) WHERE user_id IS NULL OR user_id = $2',
                        ['demo-user', '']
                    );
                } catch (updateErr) {
                    console.error('Erro ao atualizar owner dos tickets existentes:', updateErr.message);
                    logDatabase('Erro ao atualizar owner dos tickets existentes: ' + updateErr.message);
                }
            };

            if (!hasAssignee) {
                try {
                    await dbRun('ALTER TABLE tickets ADD COLUMN assignee TEXT');
                } catch (alterErr) {
                    console.error('Erro ao adicionar coluna assignee:', alterErr.message);
                    logDatabase('Erro ao adicionar coluna assignee: ' + alterErr.message);
                }
            }

            if (!hasUserId) {
                try {
                    await dbRun('ALTER TABLE tickets ADD COLUMN user_id TEXT NOT NULL DEFAULT $1', ['demo-user']);
                    await applyUserMigration();
                } catch (alterErr) {
                    console.error('Erro ao adicionar coluna user_id:', alterErr.message);
                    logDatabase('Erro ao adicionar coluna user_id: ' + alterErr.message);
                }
            } else {
                await applyUserMigration();
            }
        } catch (err) {
            console.error('Erro ao criar ou migrar tabela tickets:', err.message);
            logDatabase('Erro ao criar ou migrar tabela tickets: ' + err.message);
        }
        return;
    }

    db.run(sql);

    db.all('PRAGMA table_info(tickets)', (err, columns) => {
        if (err) {
            console.error('Erro ao inspecionar schema:', err.message);
            logDatabase('Erro ao inspecionar schema: ' + err.message);
            return;
        }

        const hasAssignee = columns.some((column) => column.name === 'assignee');
        const hasUserId = columns.some((column) => column.name === 'user_id');

        const applyUserMigration = () => {
            db.run('UPDATE tickets SET user_id = COALESCE(user_id, "demo-user") WHERE user_id IS NULL OR user_id = ""', (updateErr) => {
                if (updateErr) {
                    console.error('Erro ao atualizar owner dos tickets existentes:', updateErr.message);
                    logDatabase('Erro ao atualizar owner dos tickets existentes: ' + updateErr.message);
                }
            });
        };

        if (!hasAssignee) {
            db.run('ALTER TABLE tickets ADD COLUMN assignee TEXT', (alterErr) => {
                if (alterErr) {
                    console.error('Erro ao adicionar coluna assignee:', alterErr.message);
                    logDatabase('Erro ao adicionar coluna assignee: ' + alterErr.message);
                }
            });
        }

        if (!hasUserId) {
            db.run('ALTER TABLE tickets ADD COLUMN user_id TEXT NOT NULL DEFAULT "demo-user"', (alterErr) => {
                if (alterErr) {
                    console.error('Erro ao adicionar coluna user_id:', alterErr.message);
                    logDatabase('Erro ao adicionar coluna user_id: ' + alterErr.message);
                }
                if (!alterErr) {
                    applyUserMigration();
                }
            });
            return;
        }

        applyUserMigration();
    });
}

ensureUserSchema();
ensureTicketSchema();

module.exports = {
    db,
    generateUserId,
    hashPassword,
    verifyPassword,
    logAuth,
    dbAll,
    dbGet,
    dbRun
};
