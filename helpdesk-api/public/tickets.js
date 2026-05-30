async function fetchTickets() {
    return helpdeskAuth.fetchJson('/api/tickets');
}

function ticketElement(ticket) {
    const priority = String(ticket.prioridade || 'Normal').toLowerCase();
    const div = document.createElement('div');
    div.className = `card priority-${priority}`;
    div.innerHTML = `
        <strong class="ticket-title">${ticket.titulo}</strong>
        <div class="ticket-meta">${ticket.numero_ticket} • ${ticket.prioridade}${ticket.assignee ? ' • ' + ticket.assignee : ''}</div>
        <div class="ticket-description">${ticket.descricao}</div>
        <div class="ticket-status">Status: ${ticket.status}</div>
    `;
    return div;
}

async function loadTickets() {
    const list = document.getElementById('tickets-list');
    list.innerHTML = '';

    try {
        const tickets = await fetchTickets();
        if (!tickets || tickets.length === 0) {
            list.innerHTML = '<p>Nenhum ticket no momento.</p>';
            return;
        }

        tickets.forEach((ticket) => list.appendChild(ticketElement(ticket)));
    } catch (error) {
        if (error.message.includes('Sessão expirada')) {
            return;
        }

        list.innerHTML = '<p>Erro ao carregar tickets.</p>';
        console.error(error);
    }
}

async function createTicket(data) {
    return helpdeskAuth.fetchJson('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

document.addEventListener('DOMContentLoaded', () => {
    helpdeskAuth.updateAuthUI();
    loadTickets();

    const form = document.getElementById('ticket-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const titulo = document.getElementById('titulo').value.trim();
        const descricao = document.getElementById('descricao').value.trim();
        const prioridade = document.getElementById('prioridade').value;
        const assignee = document.getElementById('assignee').value.trim() || null;

        if (!titulo || !descricao) {
            return;
        }

        try {
            await createTicket({ titulo, descricao, prioridade, assignee });
            form.reset();
            await loadTickets();
        } catch (error) {
            if (error.message.includes('Sessão expirada')) {
                return;
            }

            console.error('Erro criando ticket', error);
            alert(error.message || 'Erro ao criar ticket');
        }
    });
});

window.addEventListener('helpdesk-auth-changed', () => {
    loadTickets();
});
