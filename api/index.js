require('dotenv').config();

// Para Vercel, precisamos usar uma porta dinâmica
if (process.env.VERCEL) {
    process.env.PORT = process.env.PORT || 3000;
}

const app = require('../helpdesk-api/server');

module.exports = app;
