const SESSION_KEY = 'cetiUsuarioAtual';
const PROFILE_PHOTO_KEY_PREFIX = 'cetiFotoPerfil:';
const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
    api.removeToken();
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
        userRole.textContent = user.cargo === 'superadmin' ? 'Administrador principal' :
            user.cargo === 'coordenador' ? 'Coordenador' :
                user.cargo === 'admin' ? 'Administrador' : 'Docente';
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
        userAvatar.setAttribute('aria-label', 'Visualizar ou editar foto do perfil');
        userAvatar.title = 'Visualizar ou editar foto do perfil';

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
                    <div id="profilePhotoEditor" class="profile-photo-editor" hidden>
                        <canvas id="profilePhotoCropCanvas" width="400" height="400" aria-label="Prévia do enquadramento"></canvas>
                        <div class="crop-control">
                            <label for="profilePhotoZoom">Zoom</label>
                            <input id="profilePhotoZoom" type="range" min="1" max="3" step="0.01" value="1">
                        </div>
                        <div class="crop-control">
                            <label for="profilePhotoPositionX">Posição horizontal</label>
                            <input id="profilePhotoPositionX" type="range" min="-100" max="100" step="1" value="0">
                        </div>
                        <div class="crop-control">
                            <label for="profilePhotoPositionY">Posição vertical</label>
                            <input id="profilePhotoPositionY" type="range" min="-100" max="100" step="1" value="0">
                        </div>
                        <div class="modal-footer profile-photo-actions">
                            <button type="button" class="btn-secondary" id="btnCancelProfilePhotoCrop">Cancelar</button>
                            <button type="button" class="btn-primary" id="btnSaveProfilePhotoCrop">Salvar enquadramento</button>
                        </div>
                    </div>
                    <div class="modal-footer profile-photo-actions" id="profilePhotoActions">
                        <button type="button" class="btn-secondary" id="btnCloseProfilePhotoFooter">Fechar</button>
                        <button type="button" class="btn-danger" id="btnRemoveProfilePhoto">
                            <i class="fa-solid fa-trash" aria-hidden="true"></i> Remover foto
                        </button>
                        <button type="button" class="btn-primary" id="btnChangeProfilePhoto">
                            <i class="fa-solid fa-pen" aria-hidden="true"></i> Editar foto
                        </button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    const preview = document.getElementById('profilePhotoPreview');
    const editor = document.getElementById('profilePhotoEditor');
    const actions = document.getElementById('profilePhotoActions');
    const canvas = document.getElementById('profilePhotoCropCanvas');
    const zoomInput = document.getElementById('profilePhotoZoom');
    const positionXInput = document.getElementById('profilePhotoPositionX');
    const positionYInput = document.getElementById('profilePhotoPositionY');
    let cropImage = null;
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragPositionX = 0;
    let dragPositionY = 0;

    const drawCrop = () => {
        if (!cropImage || !canvas) return;
        const context = canvas.getContext('2d');
        const size = canvas.width;
        context.clearRect(0, 0, size, size);
        const zoom = Number(zoomInput.value);
        const baseScale = Math.max(size / cropImage.naturalWidth, size / cropImage.naturalHeight);
        const scale = baseScale * zoom;
        const width = cropImage.naturalWidth * scale;
        const height = cropImage.naturalHeight * scale;
        const positionX = Number(positionXInput.value) / 100;
        const positionY = Number(positionYInput.value) / 100;
        const x = (size - width) / 2 + (size - width) * positionX;
        const y = (size - height) / 2 + (size - height) * positionY;
        context.drawImage(cropImage, x, y, width, height);
    };

    const openCropEditor = (imageUrl) => {
        cropImage = new Image();
        cropImage.onload = () => {
            zoomInput.value = '1';
            positionXInput.value = '0';
            positionYInput.value = '0';
            preview.hidden = true;
            actions.hidden = true;
            editor.hidden = false;
            drawCrop();
        };
        cropImage.src = imageUrl;
    };

    const closeCropEditor = () => {
        editor.hidden = true;
        preview.hidden = false;
        actions.hidden = false;
    };

    const openModal = () => {
        if (!editor.hidden) closeCropEditor();
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

        document.getElementById('btnRemoveProfilePhoto').hidden = !photo;
        modal.classList.add('active');
        document.getElementById('btnCloseProfilePhoto').focus();
    };
    const closeModal = () => {
        if (!editor.hidden) closeCropEditor();
        modal.classList.remove('active');
    };

    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', openModal);
    [zoomInput, positionXInput, positionYInput].forEach((control) => control.addEventListener('input', drawCrop));

    canvas.addEventListener('pointerdown', (event) => {
        dragging = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        dragPositionX = Number(positionXInput.value);
        dragPositionY = Number(positionYInput.value);
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        positionXInput.value = String(Math.max(-100, Math.min(100, dragPositionX + (event.clientX - dragStartX) / 2)));
        positionYInput.value = String(Math.max(-100, Math.min(100, dragPositionY + (event.clientY - dragStartY) / 2)));
        drawCrop();
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });

    document.getElementById('btnCancelProfilePhotoCrop').addEventListener('click', closeCropEditor);
    document.getElementById('btnSaveProfilePhotoCrop').addEventListener('click', () => {
        try {
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = 500;
            outputCanvas.height = 500;
            outputCanvas.getContext('2d').drawImage(canvas, 0, 0, 500, 500);
            const croppedPhoto = outputCanvas.toDataURL('image/jpeg', 0.9);
            localStorage.setItem(`${PROFILE_PHOTO_KEY_PREFIX}${user.email.toLowerCase()}`, croppedPhoto);
            renderUserProfile();
            preview.classList.add('has-photo');
            preview.style.backgroundImage = `url("${croppedPhoto}")`;
            preview.textContent = '';
            document.getElementById('btnRemoveProfilePhoto').hidden = false;
            closeCropEditor();
        } catch (error) {
            console.error('Erro ao salvar enquadramento:', error);
            alert('Não foi possível salvar o enquadramento da foto.');
        }
    });
    document.getElementById('btnCloseProfilePhoto').addEventListener('click', closeModal);
    document.getElementById('btnCloseProfilePhotoFooter').addEventListener('click', closeModal);
    document.getElementById('btnChangeProfilePhoto').addEventListener('click', () => input.click());
    document.getElementById('btnRemoveProfilePhoto').addEventListener('click', () => {
        localStorage.removeItem(`${PROFILE_PHOTO_KEY_PREFIX}${user.email.toLowerCase()}`);
        renderUserProfile();

        const initials = user.nome
            .split(' ')
            .slice(0, 2)
            .map((parte) => parte.charAt(0).toUpperCase())
            .join('');
        preview.classList.remove('has-photo');
        preview.style.backgroundImage = '';
        preview.textContent = initials;
        document.getElementById('btnRemoveProfilePhoto').hidden = true;
    });
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

            openCropEditor(reader.result);
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

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('emailLogin').value.trim().toLowerCase();
        const senha = document.getElementById('senhaLogin').value.trim();

        if (!email || !senha) {
            alert('Informe seu e-mail e senha para continuar.');
            return;
        }

        try {
            const resultado = await api.login(email, senha);
            api.setToken(resultado.token);
            setCurrentUser(resultado.usuario);
            window.location.href = 'index.html';
        } catch (error) {
            alert(error.message || 'Não foi possível entrar.');
        }
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

                        api.setToken(result.token);
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

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const senha = document.getElementById('senha').value.trim();
        const confirmarSenha = document.getElementById('confirmarSenha').value.trim();
        const tokenCadastro = document.getElementById('tokenCadastro').value.trim();

        if (!nome || !email || !senha || !confirmarSenha || !/^\d{4}$/.test(tokenCadastro)) {
            alert('Preencha todos os campos e informe o token de convite de 4 dígitos.');
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

        try {
            await api.register(nome, email, senha, tokenCadastro);
            alert('Usuário cadastrado com sucesso!');
            window.location.href = 'login.html';
        } catch (error) {
            alert(error.message || 'Não foi possível cadastrar.');
        }
    });
};

const initResetPage = () => {
    const form = document.getElementById('resetForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const senhaAtual = document.getElementById('senhaAtual').value;
        const novaSenha = document.getElementById('novaSenha').value.trim();
        const confirmarNovaSenha = document.getElementById('confirmarNovaSenha').value.trim();

        if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
            alert('Preencha todos os campos para redefinir a senha.');
            return;
        }

        const tamanhoMinimo = getCurrentUser()?.cargo === 'superadmin' ? 12 : 6;
        if (novaSenha.length < tamanhoMinimo) {
            alert(`A nova senha deve ter pelo menos ${tamanhoMinimo} caracteres.`);
            return;
        }

        if (novaSenha !== confirmarNovaSenha) {
            alert('As senhas não coincidem.');
            return;
        }

        if (!api.getToken()) {
            alert('Entre na sua conta antes de alterar a senha.');
            window.location.href = 'login.html';
            return;
        }

        try {
            await api.resetPassword(senhaAtual, novaSenha);
            alert('Senha redefinida com sucesso!');
            form.reset();
        } catch (error) {
            alert(error.message || 'Não foi possível redefinir a senha.');
        }
    });
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
    if (!currentUser || !api.getToken()) {
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
