const USERS_KEY = 'cetiUsuarios';
const SESSION_KEY = 'cetiUsuarioAtual';
const PROFILE_PHOTO_KEY_PREFIX = 'cetiFotoPerfil:';
const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
    localStorage.removeItem('cetiToken');
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
        const initials = user.nome
            .split(' ')
            .slice(0, 2)
            .map((parte) => parte.charAt(0).toUpperCase())
            .join('');
        const initialsElement = userAvatar.querySelector('.avatar-initials');
        if (initialsElement) initialsElement.textContent = initials;

        userAvatar.hidden = false;
        userAvatar.setAttribute('aria-label', 'Visualizar ou alterar foto do perfil');
        userAvatar.title = 'Visualizar ou alterar foto do perfil';

        const photo = localStorage.getItem(`${PROFILE_PHOTO_KEY_PREFIX}${user.email.toLowerCase()}`);
        userAvatar.style.backgroundImage = photo ? `url("${photo}")` : '';
        if (initialsElement) initialsElement.hidden = Boolean(photo);
    }
};

const initProfilePhotoUpload = () => {
    const user = getCurrentUser();
    const button = document.getElementById('btnProfilePhoto');
    const input = document.getElementById('profilePhotoInput');
    if (!user || !button || !input) return;

    let modal = document.getElementById('profilePhotoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profilePhotoModal';
        modal.className = 'modal-overlay profile-photo-modal';
        modal.innerHTML = `
            <div class="modal profile-photo-modal-content" role="dialog" aria-modal="true" aria-labelledby="profilePhotoTitle">
                <div class="modal-header">
                    <h3 id="profilePhotoTitle">Foto do perfil</h3>
                    <button class="close-modal" id="btnCloseProfilePhoto" type="button" aria-label="Fechar">&times;</button>
                </div>
                <div class="modal-body profile-photo-body">
                    <div id="profilePhotoPreview" class="profile-photo-preview" aria-label="Foto do perfil"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" id="btnCloseProfilePhotoFooter">Fechar</button>
                        <button type="button" class="btn-primary" id="btnChangeProfilePhoto">
                            <i class="fa-solid fa-camera" aria-hidden="true"></i> Alterar foto
                        </button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    const preview = document.getElementById('profilePhotoPreview');
    const openModal = () => {
        const photo = localStorage.getItem(`${PROFILE_PHOTO_KEY_PREFIX}${user.email.toLowerCase()}`);
        preview.style.backgroundImage = '';
        preview.textContent = '';
        preview.classList.toggle('has-photo', Boolean(photo));

        if (photo) {
            preview.style.backgroundImage = `url("${photo}")`;
        } else {
            preview.textContent = user.nome
                .split(' ')
                .slice(0, 2)
                .map((parte) => parte.charAt(0).toUpperCase())
                .join('');
        }

        modal.classList.add('active');
        document.getElementById('btnCloseProfilePhoto').focus();
    };
    const closeModal = () => modal.classList.remove('active');

    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', openModal);
    document.getElementById('btnCloseProfilePhoto').addEventListener('click', closeModal);
    document.getElementById('btnCloseProfilePhotoFooter').addEventListener('click', closeModal);
    document.getElementById('btnChangeProfilePhoto').addEventListener('click', () => input.click());
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });

    input.addEventListener('change', () => {
        const file = input.files[0];
        input.value = '';
        if (!file) return;

        if (!PROFILE_PHOTO_TYPES.includes(file.type)) {
            alert('Escolha uma imagem JPG, PNG ou WebP.');
            return;
        }

        if (file.size > MAX_PROFILE_PHOTO_SIZE) {
            alert('A foto deve ter no máximo 2 MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                alert('Não foi possível carregar a foto. Tente novamente.');
                return;
            }

            try {
                localStorage.setItem(
                    `${PROFILE_PHOTO_KEY_PREFIX}${user.email.toLowerCase()}`,
                    reader.result
                );
                renderUserProfile();
                if (preview) {
                    preview.textContent = '';
                    preview.classList.add('has-photo');
                    preview.style.backgroundImage = `url("${reader.result}")`;
                }
            } catch (error) {
                console.error('Erro ao salvar foto do perfil:', error);
                alert('Não foi possível salvar a foto neste navegador. Escolha um arquivo menor.');
            }
        };
        reader.onerror = () => {
            alert('Não foi possível ler a foto. Tente outro arquivo.');
        };
        reader.readAsDataURL(file);
    });
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

    initGoogleLogin();
};

const initGoogleLogin = async () => {
    const button = document.getElementById('googleLoginButton');
    const status = document.getElementById('googleLoginStatus');
    if (!button || !status) return;

    try {
        const configResponse = await fetch('/api/auth/google/config');
        const config = await configResponse.json();
        if (!configResponse.ok || !config.clientId) {
            status.textContent = config.erro || 'Login Google indisponível.';
            return;
        }

        const googleScript = document.createElement('script');
        googleScript.src = 'https://accounts.google.com/gsi/client';
        googleScript.async = true;
        googleScript.defer = true;
        googleScript.onload = () => {
            if (!window.google?.accounts?.id) {
                status.textContent = 'Não foi possível carregar o login Google.';
                return;
            }

            window.google.accounts.id.initialize({
                client_id: config.clientId,
                callback: async ({ credential }) => {
                    status.textContent = 'Entrando...';
                    try {
                        const response = await fetch('/api/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ credential })
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.erro || 'Falha no login Google.');

                        localStorage.setItem('cetiToken', result.token);
                        setCurrentUser(result.usuario);
                        window.location.href = 'index.html';
                    } catch (error) {
                        status.textContent = error.message;
                    }
                }
            });

            window.google.accounts.id.renderButton(button, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                width: 320
            });
        };
        googleScript.onerror = () => {
            status.textContent = 'Não foi possível carregar o login Google.';
        };
        document.head.appendChild(googleScript);
    } catch (error) {
        status.textContent = 'Não foi possível conectar ao servidor de autenticação.';
    }
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
    initProfilePhotoUpload();
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
