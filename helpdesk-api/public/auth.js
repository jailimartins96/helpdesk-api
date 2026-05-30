const AUTH_TOKEN_KEY = 'helpdesk-auth-token';
const AUTH_USER_KEY = 'helpdesk-auth-user';
const DEFAULT_LOGIN_REDIRECT = '/tickets';

function getStoredToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getStoredUser() {
    const stored = localStorage.getItem(AUTH_USER_KEY);

    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored);
    } catch (error) {
        return null;
    }
}

function setStoredAuth(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearStoredAuth() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function getLoginRedirect() {
    return window.helpdeskAuthRedirect || DEFAULT_LOGIN_REDIRECT;
}

function getLoginMessage() {
    return window.helpdeskAuthMessage || 'Faça login para acessar a API do helpdesk.';
}

async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getStoredToken();

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearStoredAuth();
        updateAuthUI();

        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.assign('/login?expired=1');
        }

        throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || errorPayload.message || 'Erro na requisição');
    }

    return response;
}

async function fetchJson(url, options = {}) {
    const response = await apiFetch(url, options);
    return response.json();
}

function updateAuthUI() {
    const status = document.getElementById('auth-status');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutButton = document.getElementById('logout-btn');
    const user = getStoredUser();

    if (!status) {
        return;
    }

    if (user) {
        status.textContent = `Logado como ${user.email}`;

        if (loginForm) {
            loginForm.hidden = true;
        }

        if (registerForm) {
            registerForm.hidden = true;
        }

        if (logoutButton) {
            logoutButton.hidden = false;
        }

        return;
    }

    status.textContent = getLoginMessage();

    if (loginForm) {
        loginForm.hidden = false;
    }

    if (registerForm) {
        registerForm.hidden = false;
    }

    if (logoutButton) {
        logoutButton.hidden = true;
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    if (!emailInput || !passwordInput) {
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                password: passwordInput.value
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || 'Falha ao autenticar');
        }

        setStoredAuth(payload.token, payload.user);
        updateAuthUI();
        window.dispatchEvent(new CustomEvent('helpdesk-auth-changed'));
        passwordInput.value = '';

        if (window.location.pathname === '/login') {
            window.location.assign(getLoginRedirect());
        }
    } catch (error) {
        alert(error.message || 'Erro ao autenticar');
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();

    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');

    if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
        return;
    }

    if (passwordInput.value !== confirmPasswordInput.value) {
        alert('As senhas não conferem.');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                password: passwordInput.value,
                confirmPassword: confirmPasswordInput.value
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || 'Falha ao criar conta');
        }

        setStoredAuth(payload.token, payload.user);
        updateAuthUI();
        window.dispatchEvent(new CustomEvent('helpdesk-auth-changed'));
        passwordInput.value = '';
        confirmPasswordInput.value = '';

        if (window.location.pathname === '/register') {
            window.location.assign(getLoginRedirect());
        }
    } catch (error) {
        alert(error.message || 'Erro ao criar conta');
    }
}

function bindLoginForm() {
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            clearStoredAuth();
            updateAuthUI();
            window.dispatchEvent(new CustomEvent('helpdesk-auth-changed'));
        });
    }
}

function bindRegisterForm() {
    const registerForm = document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
}

window.helpdeskAuth = {
    apiFetch,
    fetchJson,
    updateAuthUI,
    bindLoginForm,
    bindRegisterForm
};

document.addEventListener('DOMContentLoaded', () => {
    bindLoginForm();
    bindRegisterForm();
    updateAuthUI();
});
