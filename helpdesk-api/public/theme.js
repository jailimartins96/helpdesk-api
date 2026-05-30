document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const toggleButton = document.getElementById('theme-toggle');
    const toggleLabel = document.getElementById('theme-toggle-label');

    if (!toggleButton || !toggleLabel) {
        return;
    }

    const savedTheme = localStorage.getItem('helpdesk-theme') || localStorage.getItem('theme') || 'light';
    const theme = savedTheme === 'dark' ? 'dark' : 'light';

    applyTheme(theme);

    toggleButton.addEventListener('click', () => {
        const nextTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(nextTheme);
    });

    function applyTheme(theme) {
        body.classList.toggle('dark-mode', theme === 'dark');
        toggleLabel.textContent = theme === 'dark' ? '🌙 Modo Noturno' : '☀️ Modo Dia';
        localStorage.setItem('helpdesk-theme', theme);
        localStorage.setItem('theme', theme);
    }
});
