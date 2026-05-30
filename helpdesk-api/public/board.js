async function fetchTickets() {
    return helpdeskAuth.fetchJson('/api/tickets');
}

function createCard(ticket) {
    const priority = String(ticket.prioridade || 'Normal').toLowerCase();
    const el = document.createElement('div');
    el.className = `card priority-${priority}`;
    el.draggable = true;
    el.dataset.id = ticket.id;
    el.innerHTML = `
        <strong class="ticket-title">${ticket.titulo}</strong>
        <div class="ticket-meta">${ticket.numero_ticket}${ticket.assignee ? ' • ' + ticket.assignee : ''}</div>
        <div class="ticket-meta">Prioridade: ${ticket.prioridade}</div>
    `;
    el.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', ticket.id);
    });
    return el;
}

async function loadBoard() {
    try {
        const tickets = await fetchTickets();
        const todo = document.getElementById('todo');
        const inprogress = document.getElementById('inprogress');
        const done = document.getElementById('done');

        todo.innerHTML = '';
        inprogress.innerHTML = '';
        done.innerHTML = '';

        tickets.forEach((ticket) => {
            const card = createCard(ticket);
            const status = (ticket.status || 'To Do').toLowerCase();

            if (status.includes('in')) {
                inprogress.appendChild(card);
            } else if (status.includes('done')) {
                done.appendChild(card);
            } else {
                todo.appendChild(card);
            }
        });
    } catch (error) {
        if (error.message.includes('Sessão expirada')) {
            return;
        }

        console.error(error);
    }
}

function enableDrop() {
    document.querySelectorAll('.list').forEach((list) => {
        list.addEventListener('dragover', (event) => {
            event.preventDefault();
        });

        list.addEventListener('drop', async (event) => {
            event.preventDefault();

            const id = event.dataTransfer.getData('text/plain');
            const column = event.currentTarget.closest('.column');
            const status = column.dataset.status;

            try {
                await helpdeskAuth.fetchJson('/api/tickets/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                await loadBoard();
            } catch (error) {
                if (error.message.includes('Sessão expirada')) {
                    return;
                }

                console.error('Erro ao mover ticket', error);
                alert(error.message || 'Erro ao atualizar ticket');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    helpdeskAuth.updateAuthUI();
    await loadBoard();
    enableDrop();
});

window.addEventListener('helpdesk-auth-changed', () => {
    loadBoard();
});
