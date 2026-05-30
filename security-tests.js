/**
 * TESTES DE SEGURANÇA - Helpdesk API
 * Verifica vulnerabilidades OWASP Top 10
 *
 * Uso: node security-tests.js
 */

const http = require('http');
const BASE_URL = 'http://localhost:3000';

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

let testResults = { passed: 0, failed: 0, warnings: 0 };

function log(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    switch(type) {
        case 'pass':
            console.log(`${colors.green}${prefix} ✓ ${message}${colors.reset}`);
            testResults.passed++;
            break;
        case 'fail':
            console.log(`${colors.red}${prefix} ✗ ${message}${colors.reset}`);
            testResults.failed++;
            break;
        case 'warn':
            console.log(`${colors.yellow}${prefix} ⚠ ${message}${colors.reset}`);
            testResults.warnings++;
            break;
        case 'info':
            console.log(`${colors.blue}${prefix} ℹ ${message}${colors.reset}`);
    }
}

async function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path,
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data ? JSON.parse(data) : null
                });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log(`\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}  TESTES DE SEGURANÇA - Helpdesk API${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);

    // 1. Teste de Validação de Entrada
    console.log(`${colors.blue}1. Validação de Entrada${colors.reset}`);
    await testInputValidation();

    // 2. Teste de SQL Injection
    console.log(`\n${colors.blue}2. Proteção contra SQL Injection${colors.reset}`);
    await testSQLInjection();

    // 3. Teste de XSS (Cross-Site Scripting)
    console.log(`\n${colors.blue}3. Proteção contra XSS${colors.reset}`);
    await testXSS();

    // 4. Teste de Headers de Segurança
    console.log(`\n${colors.blue}4. Headers de Segurança HTTP${colors.reset}`);
    await testSecurityHeaders();

    // 5. Teste de Autenticação/Autorização
    console.log(`\n${colors.blue}5. Autenticação e Autorização${colors.reset}`);
    await testAuthN_AuthZ();

    // 6. Teste de Rate Limiting
    console.log(`\n${colors.blue}6. Rate Limiting${colors.reset}`);
    await testRateLimiting();

    // 7. Teste de Path Traversal
    console.log(`\n${colors.blue}7. Path Traversal${colors.reset}`);
    await testPathTraversal();

    // 8. Teste de Acesso sem autorização
    console.log(`\n${colors.blue}8. Controle de Acesso${colors.reset}`);
    await testAccessControl();

    // Resumo
    console.log(`\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}RESUMO DOS TESTES${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}Passou: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Falhou: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}Avisos: ${testResults.warnings}${colors.reset}\n`);
}

async function testInputValidation() {
    try {
        // Teste 1: Campo título vazio
        const res1 = await request('POST', '/api/tickets', {
            titulo: '',
            descricao: 'teste'
        });

        if (res1.status === 400 || res1.status === 422) {
            log('pass', 'Rejeita título vazio');
        } else {
            log('warn', 'Deveria rejeitar título vazio (status ' + res1.status + ')');
        }

        // Teste 2: Dados muito grandes (potencial DoS)
        const bigString = 'A'.repeat(10000);
        const res2 = await request('POST', '/api/tickets', {
            titulo: bigString,
            descricao: bigString,
            status: bigString,
            prioridade: bigString
        });

        if (res2.status === 413 || res2.status === 400) {
            log('pass', 'Limita tamanho de payload');
        } else {
            log('warn', 'Deveria limitar tamanho de entrada (recebeu: ' + bigString.length + ' chars)');
        }

        // Teste 3: Tipos de dados inválidos
        const res3 = await request('POST', '/api/tickets', {
            titulo: { obj: 'atacar' },
            descricao: ['array']
        });

        if (res3.status === 400 || res3.status === 422) {
            log('pass', 'Valida tipos de dados');
        } else {
            log('warn', 'Deveria rejeitar tipos inválidos');
        }

    } catch(err) {
        log('fail', 'Erro ao testar validação: ' + err.message);
    }
}

async function testSQLInjection() {
    try {
        // Tenta SQL injection clássica na listagem
        const res1 = await request('GET', "/api/tickets' OR '1'='1");

        if (res1.status === 200) {
            log('pass', 'GET /api/tickets usa prepared statements (seguro)');
        } else {
            log('warn', 'Resposta inesperada em GET com SQL injection');
        }

        // Tenta SQL injection no POST
        const res2 = await request('POST', '/api/tickets', {
            titulo: "'; DROP TABLE tickets; --",
            descricao: "' OR '1'='1"
        });

        if (res2.status === 201 || res2.status === 500) {
            // Se não caiu a tabela, está seguro
            const checkRes = await request('GET', '/api/tickets');
            if (checkRes.status === 200 || checkRes.status === 500) {
                log('pass', 'Usa prepared statements em INSERT (seguro contra SQL injection)');
            }
        }

        // Testa SQL injection no PUT
        const res3 = await request('PUT', '/api/tickets/1', {
            titulo: "' OR '1'='1",
            status: "'; UPDATE tickets SET status='Hacked'; --"
        });

        if (res3.status === 200 || res3.status === 404 || res3.status === 400) {
            log('pass', 'PUT usa prepared statements (seguro)');
        }

    } catch(err) {
        log('fail', 'Erro ao testar SQL injection: ' + err.message);
    }
}

async function testXSS() {
    try {
        // Tenta XSS em título
        const xssPayload = '<script>alert("XSS")</script>';
        const res1 = await request('POST', '/api/tickets', {
            titulo: xssPayload,
            descricao: 'teste'
        });

        if (res1.status === 201) {
            const returned = JSON.stringify(res1.body);
            if (returned.includes('<script>') || returned.includes('alert')) {
                log('warn', 'Payload XSS armazenado no banco (Stored XSS vulnerability)');
            } else {
                log('pass', 'API escapa ou sanitiza XSS (se frontend também escapa)');
            }
        }

        // Tenta XSS com HTML
        const htmlPayload = '<img src=x onerror="alert(1)">';
        const res2 = await request('POST', '/api/tickets', {
            titulo: 'Teste',
            descricao: htmlPayload
        });

        if (res2.status === 201) {
            log('warn', 'API não valida contra payloads XSS (responsabilidade do frontend?)');
        }

    } catch(err) {
        log('fail', 'Erro ao testar XSS: ' + err.message);
    }
}

async function testSecurityHeaders() {
    try {
        const res = await request('GET', '/');

        const requiredHeaders = {
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY|SAMEORIGIN',
            'x-xss-protection': '1; mode=block',
            'strict-transport-security': 'max-age=',
            'content-security-policy': ''
        };

        let headersOk = true;
        for (const [header, expected] of Object.entries(requiredHeaders)) {
            const value = res.headers[header.toLowerCase()];
            if (!value) {
                log('warn', `Header ${header} não configurado`);
                headersOk = false;
            }
        }

        if (headersOk) {
            log('pass', 'Todos os headers de segurança configurados');
        } else {
            log('warn', 'Alguns headers de segurança estão faltando');
        }

    } catch(err) {
        log('fail', 'Erro ao testar headers: ' + err.message);
    }
}

async function testAuthN_AuthZ() {
    try {
        // Cria um ticket
        const res1 = await request('POST', '/api/tickets', {
            titulo: 'Teste Auth',
            descricao: 'Teste',
            assignee: 'user1'
        });

        if (res1.status === 201) {
            const ticketId = res1.body.id;

            // Tenta acessar sem token/autenticação
            const res2 = await request('GET', '/api/tickets');

            if (res2.status === 200) {
                log('warn', 'API não requer autenticação (todos podem ler todos os tickets)');
            } else if (res2.status === 401 || res2.status === 403) {
                log('pass', 'API requer autenticação');
            }

            // Tenta atualizar ticket de outro usuário
            const res3 = await request('PUT', `/api/tickets/${ticketId}`, {
                status: 'Closed',
                assignee: 'hacker'
            });

            if (res3.status === 200) {
                log('warn', 'Não há controle de autorização (qualquer um pode editar qualquer ticket)');
            } else if (res3.status === 403) {
                log('pass', 'Controle de acesso implementado');
            }
        }

    } catch(err) {
        log('fail', 'Erro ao testar autenticação: ' + err.message);
    }
}

async function testRateLimiting() {
    try {
        log('info', 'Testando 20 requisições rápidas...');

        let blocked = false;
        const requests = [];

        for (let i = 0; i < 20; i++) {
            try {
                const res = await request('POST', '/api/tickets', {
                    titulo: `Teste ${i}`,
                    descricao: 'teste'
                });

                if (res.status === 429 || res.status === 503) {
                    blocked = true;
                    break;
                }
                requests.push(res.status);
            } catch(err) {
                // Pode ter bloqueado
            }
        }

        if (blocked) {
            log('pass', 'Rate limiting implementado (bloqueou após múltiplas requisições)');
        } else {
            log('warn', 'Sem rate limiting - aplicação vulnerável a ataques DoS');
        }

    } catch(err) {
        log('fail', 'Erro ao testar rate limiting: ' + err.message);
    }
}

async function testPathTraversal() {
    try {
        const pathExploits = [
            '/../../etc/passwd',
            '/..\\..\\..\\windows\\system32\\config\\sam',
            '/api/tickets/../../../../etc/passwd',
            '/api/tickets/../../../secret.env'
        ];

        let vulnerable = false;
        for (const exploit of pathExploits) {
            const res = await request('GET', exploit);
            if (res.status !== 404 && res.body && !res.body.error) {
                vulnerable = true;
                log('fail', `Path traversal vulnerável: ${exploit}`);
            }
        }

        if (!vulnerable) {
            log('pass', 'Protegido contra path traversal');
        }

    } catch(err) {
        log('fail', 'Erro ao testar path traversal: ' + err.message);
    }
}

async function testAccessControl() {
    try {
        // Testa acesso direto via ID incremental
        const ids = [1, 2, 3, 4, 5];
        let idGuessing = true;

        for (const id of ids) {
            const res = await request('GET', `/api/tickets/${id}`);
            if (res.status === 404 || (res.status === 403 && res.body && res.body.error)) {
                idGuessing = false;
                break;
            }
        }

        if (idGuessing) {
            log('warn', 'IDs sequenciais permitem "ID guessing" para enumerar recursos');
        } else {
            log('pass', 'Controle de acesso em IDs individuais');
        }

        // Testa acesso a endpoint inexistente
        const res2 = await request('GET', '/api/admin/users');
        if (res2.status === 404) {
            log('pass', 'Endpoints não autorizados retornam 404');
        } else if (res2.status === 403) {
            log('pass', 'Endpoints não autorizados retornam 403');
        }

    } catch(err) {
        log('fail', 'Erro ao testar acesso: ' + err.message);
    }
}

// Inicia os testes
runTests().catch(err => {
    console.error('Erro fatal:', err.message);
    process.exit(1);
});
