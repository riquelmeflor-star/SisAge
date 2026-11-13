// Configuração de API
const API_BASE_URL = '/api';

class APIService {
    constructor() {
        this.token = localStorage.getItem('cetiToken');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('cetiToken', token);
    }

    getToken() {
        return this.token;
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('cetiToken');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401 && this.token) {
                this.removeToken();
                window.location.href = '/login.html';
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('Erro na API:', error);
            throw error;
        }
    }

    // ==================== AUTENTICAÇÃO ====================

    login(email, senha) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha })
        });
    }

    register(nome, email, senha, token) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ nome, email, senha, token })
        });
    }

    gerarTokenCadastro() {
        return this.request('/admin/tokens-cadastro', { method: 'POST' });
    }

    resetPassword(senhaAtual, novaSenha) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ senhaAtual, novaSenha })
        });
    }

    // ==================== RECURSOS ====================

    listarRecursos() {
        return this.request('/recursos');
    }

    criarRecurso(dados) {
        return this.request('/recursos', {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    }

    atualizarRecurso(id, dados) {
        return this.request(`/recursos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });
    }

    deletarRecurso(id) {
        return this.request(`/recursos/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== RESERVAS ====================

    listarReservas() {
        return this.request('/reservas');
    }

    listarAgenda() {
        return this.request('/agenda');
    }

    criarReserva(dados) {
        return this.request('/reservas', {
            method: 'POST',
            body: JSON.stringify(dados)
        });
    }

    atualizarReserva(id, dados) {
        return this.request(`/reservas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dados)
        });
    }

    cancelarReserva(id) {
        return this.request(`/reservas/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== RELATÓRIOS ====================

    gerarRelatorioUso() {
        return this.request('/relatorios/uso');
    }
}

const api = new APIService();
