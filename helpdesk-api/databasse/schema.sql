CREATE TABLE IF NOT EXISTS tickets (
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
);

