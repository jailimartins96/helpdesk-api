#!/usr/bin/env node

/**
 * TESTE DE SEGURANÇA RÁPIDO - Helpdesk API
 * Script interativo para testar vulnerabilidades
 *
 * Uso: npm run test-security
 * ou: node quick-test.js
 */

const readline = require('readline');
const http = require('http');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

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
                    body: data ? JSON.parse(data) : null
                });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function question(q) {
    return new Promise(resolve => rl.question(q, resolve));
}

async function main() {
    console.log(`
${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}
${colors.blue}║  TESTE RÁPIDO DE SEGURANÇA - Helpdesk API              ║${colors.reset}
${colors.blue}║  Escolha um teste para executar                         ║${colors.reset}
${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}

${colors.yellow}Menu de Testes:${colors.reset}

  1. Verificar Autenticação (precisa de token?)
  2. Verificar Autorização (IDOR - ID prediction)
  3. Teste SQL Injection
  4. Teste XSS (Stored XSS)
  5. Verificar Headers de Segurança
  6. Teste Rate Limiting
  7. Teste de Validação de Entrada
  8. Teste COMPLETO (todos os testes)
  9. Sair

    `);

    const choice = await question(`${colors.cyan}Escolha uma opção (1-9): ${colors.reset}`);

    try {
        switch(choice) {
            case '1':
                await testAuth();
                break;
            case '2':
                await testIDOR();
                break;
            case '3':
                await testSQLInjection();
                break;
            case '4':
                await testXSS();
                break;
            case '5':
                await testHeaders();
                break;
            case '6':
                await testRateLimit();
                break;
            case '7':
                await testValidation();
                break;
            case '8':
                await testComplete();
                break;
            case '9':
                rl.close();
                return;
            default:
                console.log(`${colors.red}Opção inválida${colors.reset}`);
        }

        const cont = await question(`\n${colors.cyan}Voltar ao menu? (s/n): ${colors.reset}`);
        if (cont.toLowerCase() === 's' || cont === '') {
            console.clear();
            await main();
        } else {
            rl.close();
        }
    } catch(err) {
        console.error(`${colors.red}Erro: ${err.message}${colors.reset}`);
        rl.close();
    }
}

async function testAuth() {
    console.log(`\n${colors.blue}═ Teste de Autenticação ═${colors.reset}`);
    console.log('Tentando acessar /api/tickets sem credenciais...');

    const res = await request('GET', '/api/tickets');

    if (res.status === 200) {
        console.log(`${colors.red}✗ VULNERÁVEL: Acesso sem autenticação${colors.reset}`);
        console.log(`  Status: ${res.status}`);
        console.log(`  Dados retornados: ${JSON.stringify(res.body).substring(0, 100)}...`);
    } else if (res.status === 401) {
        console.log(`${colors.green}✓ SEGURO: Autenticação requerida (401)${colors.reset}`);
    } else {
        console.log(`  Status inesperado: ${res.status}`);
    }
}

async function testIDOR() {
    console.log(`\n${colors.blue}═ Teste de IDOR (ID Prediction) ═${colors.reset}`);
    console.log('Criando 2 tickets...');

    const res1 = await request('POST', '/api/tickets', {
        titulo: 'Ticket 1 - Confidencial',
        descricao: 'Dados privados'
    });

    const res2 = await request('POST', '/api/tickets', {
        titulo: 'Ticket 2 - Confidencial',
        descricao: 'Mais dados privados'
    });

    if (res1.status === 201 && res2.status === 201) {
        const id1 = res1.body.id;
        const id2 = res2.body.id;

        console.log(`\nIDs criados: ${id1}, ${id2}`);
        console.log('Tentando acessar com IDs sequenciais...');

        const res3 = await request('GET', `/api/tickets/${id1}`);

        if (res3.status === 200) {
            console.log(`${colors.red}✗ VULNERÁVEL: IDOR - Pode enumerar tickets por ID${colors.reset}`);
            console.log(`  GET /api/tickets/${id1} retornou: ${JSON.stringify(res3.body).substring(0, 100)}...`);
        } else if (res3.status === 404) {
            console.log(`${colors.green}✓ SEGURO: IDs não são enumeráveis${colors.reset}`);
        }
    }
}

async function testSQLInjection() {
    console.log(`\n${colors.blue}═ Teste de SQL Injection ═${colors.reset}`);

    const payload = "'; DROP TABLE tickets; --";
    console.log(`Testando payload: ${payload}`);

    const res = await request('POST', '/api/tickets', {
        titulo: payload,
        descricao: 'teste'
    });

    if (res.status === 201) {
        console.log('Payload aceito. Verificando se tabela foi deletada...');

        const checkRes = await request('GET', '/api/tickets');

        if (checkRes.status === 200) {
            console.log(`${colors.green}✓ SEGURO: Prepared statements protegem contra SQL injection${colors.reset}`);
        } else {
            console.log(`${colors.red}✗ VULNERÁVEL: Tabela pode ter sido deletada!${colors.reset}`);
        }
    }
}

async function testXSS() {
    console.log(`\n${colors.blue}═ Teste de XSS ═${colors.reset}`);

    const payload = '<script>alert("XSS")</script>';
    console.log(`Testando payload: ${payload}`);

    const res = await request('POST', '/api/tickets', {
        titulo: payload,
        descricao: 'teste'
    });

    if (res.status === 201) {
        if (res.body.titulo.includes('<script>')) {
            console.log(`${colors.red}✗ VULNERÁVEL: XSS armazenado no banco${colors.reset}`);
            console.log(`  Payload retornou sem escape: ${res.body.titulo}`);
        } else {
            console.log(`${colors.green}✓ SEGURO: Payload escapado${colors.reset}`);
        }
    }
}

async function testHeaders() {
    console.log(`\n${colors.blue}═ Teste de Headers de Segurança ═${colors.reset}`);

    // Nota: Em Node, fazer HTTP não retorna headers exatamente como o navegador vê
    // Este é um teste simplificado
    console.log(`${colors.yellow}ℹ Headers de segurança esperados:${colors.reset}`);
    console.log('  - X-Content-Type-Options: nosniff');
    console.log('  - X-Frame-Options: DENY ou SAMEORIGIN');
    console.log('  - X-XSS-Protection: 1; mode=block');
    console.log('  - Strict-Transport-Security');
    console.log('  - Content-Security-Policy');
    console.log('\n${colors.yellow}Para verificar, abra em um navegador:${colors.reset}');
    console.log('  curl -i http://localhost:3000/');
}

async function testRateLimit() {
    console.log(`\n${colors.blue}═ Teste de Rate Limiting ═${colors.reset}`);
    console.log('Enviando 10 requisições rápidas...');

    let blocked = false;
    for (let i = 0; i < 10; i++) {
        const res = await request('POST', '/api/tickets', {
            titulo: `Teste ${i}`,
            descricao: 'teste'
        });

        if (res.status === 429) {
            blocked = true;
            console.log(`✓ Bloqueado após ${i + 1} requisições (429)`);
            break;
        }
    }

    if (!blocked) {
        console.log(`${colors.red}✗ VULNERÁVEL: Sem rate limiting implementado${colors.reset}`);
    } else {
        console.log(`${colors.green}✓ SEGURO: Rate limiting ativo${colors.reset}`);
    }
}

async function testValidation() {
    console.log(`\n${colors.blue}═ Teste de Validação de Entrada ═${colors.reset}`);

    console.log('Testando campo vazio...');
    const res1 = await request('POST', '/api/tickets', {
        titulo: '',
        descricao: ''
    });

    if (res1.status === 201) {
        console.log(`${colors.red}✗ VULNERÁVEL: Campos vazios aceitos${colors.reset}`);
    } else if (res1.status === 400 || res1.status === 422) {
        console.log(`${colors.green}✓ SEGURO: Campos vazios rejeitados (${res1.status})${colors.reset}`);
    }

    console.log('\\nTestando tipo de dado inválido...');
    const res2 = await request('POST', '/api/tickets', {
        titulo: { objeto: 'injection' },
        descricao: ['array']
    });

    if (res2.status === 201) {
        console.log(`${colors.yellow}⚠ Tipos inválidos aceitos${colors.reset}`);
    } else {
        console.log(`${colors.green}✓ SEGURO: Tipos inválidos rejeitados${colors.reset}`);
    }
}

async function testComplete() {
    console.log(`\n${colors.blue}═════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}TESTE COMPLETO DE SEGURANÇA${colors.reset}`);
    console.log(`${colors.blue}═════════════════════════════════════════════${colors.reset}\\n`);

    await testAuth();
    await testIDOR();
    await testSQLInjection();
    await testXSS();
    await testRateLimit();
    await testValidation();

    console.log(`\n${colors.blue}═════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}TESTES CONCLUÍDOS${colors.reset}`);
    console.log(`${colors.blue}═════════════════════════════════════════════${colors.reset}`);
}

main();
