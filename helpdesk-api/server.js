require('dotenv').config();
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET não configurado. Usando segredo padrão de desenvolvimento.');
}

const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições, tente novamente mais tarde.' }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use('/api', limiter);

// Health check para Vercel
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(routes);

app.use((req, res) => {
    res.status(404).json({ error: 'Página não encontrada' });
});

// Error handler para Vercel
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro interno do servidor', message: err.message });
});

// Para desenvolvimento local
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

// Exporta para Vercel
module.exports = app;

