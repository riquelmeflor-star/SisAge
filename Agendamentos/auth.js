const USERS_KEY = 'cetiUsuarios';
const SESSION_KEY = 'cetiUsuarioAtual';

const getUsers = () => {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (error) {
        return [];
    }
};

const saveUsers = (users) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const ensureDefaultUsers = () => {
    const usuarios = getUsers();

    if (usuarios.length > 0) {
        return;
    }

    const defaults = [
        {
            nome: 'Profª Ana Silva',
            email: 'ana@ceti.edu.br',
            senha: '123456',
            cargo: 'docente'
        },
        {
            nome: 'Prof. Marcos Oliveira',
            email: 'marcos@ceti.edu.br',
            senha: '123456',
            cargo: 'docente'
        },
        {
            nome: 'Coord. Carla Mendes',
            email: 'carla@ceti.edu.br',
            senha: '123456',
            cargo: 'coordenador'
        }
    ];

    saveUsers(defaults);
};

const getCurrentUser = () => {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (error) {
        return null;
    }
};

const setCurrentUser = (usuario) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
};

const clearCurrentUser = () => {
    localStorage.removeItem(SESSION_KEY);
};

const redirectToLogin = () => {
    window.location.href = 'login.html';
};

const renderUserProfile = () => {
    const user = getCurrentUser();
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    const userAvatar = document.querySelector('.avatar');

    if (!user) {
        return;
    }

    if (userName) {
        userName.textContent = user.nome;
    }

    if (userRole) {
        userRole.textContent = user.cargo === 'coordenador' ? 'Coordenador' : user.cargo === 'admin' ? 'Administrador' : 'Docente';
    }

    if (userAvatar) {
        userAvatar.textContent = user.nome
            .split(' ')
            .slice(0, 2)
            .map((parte) => parte.charAt(0).toUpperCase())
            .join('');
    }
};

const initLoginPage = () => {
    const form = document.getElementById('loginForm');
    if (!form) return;

    ensureDefaultUsers();

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const email = document.getElementById('emailLogin').value.trim().toLowerCase();
        const senha = document.getElementById('senhaLogin').value.trim();

        if (!email || !senha) {
            alert('Informe seu e-mail e senha para continuar.');
            return;
        }

        const usuarios = getUsers();
        const usuario = usuarios.find((item) => item.email.toLowerCase() === email && item.senha === senha);

        if (!usuario) {
            alert('E-mail ou senha inválidos.');
            return;
        }

        setCurrentUser({
            nome: usuario.nome,
            email: usuario.email,
            cargo: usuario.cargo
        });

        alert(`Bem-vindo(a), ${usuario.nome}!`);
        window.location.href = 'index.html';
    });
};

const initRegisterPage = () => {
    const form = document.getElementById('registerForm');
    if (!form) return;

    ensureDefaultUsers();

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const senha = document.getElementById('senha').value.trim();
        const confirmarSenha = document.getElementById('confirmarSenha').value.trim();
        const cargo = document.getElementById('cargo').value;

        if (!nome || !email || !senha || !confirmarSenha) {
            alert('Preencha todos os campos para concluir o cadastro.');
            return;
        }

        if (senha.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (senha !== confirmarSenha) {
            alert('As senhas não coincidem.');
            return;
        }

        const usuarios = getUsers();
        const jaExiste = usuarios.some((usuario) => usuario.email.toLowerCase() === email);

        if (jaExiste) {
            alert('Este e-mail já está cadastrado.');
            return;
        }

        usuarios.push({
            nome,
            email,
            senha,
            cargo
        });

        saveUsers(usuarios);
        alert('Usuário cadastrado com sucesso!');
        window.location.href = 'login.html';
    });
};

const initResetPage = () => {
    const form = document.getElementById('resetForm');
    if (!form) return;

    ensureDefaultUsers();

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const email = document.getElementById('emailReset').value.trim().toLowerCase();
        const novaSenha = document.getElementById('novaSenha').value.trim();
        const confirmarNovaSenha = document.getElementById('confirmarNovaSenha').value.trim();

        if (!email || !novaSenha || !confirmarNovaSenha) {
            alert('Preencha todos os campos para redefinir a senha.');
            return;
        }

        if (novaSenha.length < 6) {
            alert('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (novaSenha !== confirmarNovaSenha) {
            alert('As senhas não coincidem.');
            return;
        }

        const usuarios = getUsers();
        const index = usuarios.findIndex((usuario) => usuario.email.toLowerCase() === email);

        if (index === -1) {
            alert('E-mail não encontrado. Cadastre-se primeiro ou verifique o endereço informado.');
            return;
        }

        usuarios[index].senha = novaSenha;
        saveUsers(usuarios);

        alert('Senha redefinida com sucesso!');
        window.location.href = 'login.html';
    })
};

const initLogout = () => {
    const btnLogout = document.getElementById('btnLogout');
    if (!btnLogout) return;

    btnLogout.addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = 'login.html';
    });
};

const initProtectedPage = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        redirectToLogin();
        return;
    }

    renderUserProfile();
    initLogout();
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
        initLoginPage();
    }

    if (document.getElementById('registerForm')) {
        initRegisterPage();
    }

    if (document.getElementById('resetForm')) {
        initResetPage();
    }

    if (document.getElementById('btnLogout')) {
        initProtectedPage();
    }
});
