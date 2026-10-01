document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalBooking');
    const resourceModal = document.getElementById('resourceModal');
    const btnOpenModal = document.getElementById('btnOpenModal');
    const btnOpenModalNav = document.getElementById('btnOpenModalNav');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnCloseResourceModal = document.getElementById('btnCloseResourceModal');
    const btnCancelResourceModal = document.getElementById('btnCancelResourceModal');
    const bookingForm = document.getElementById('bookingForm');
    const resourceForm = document.getElementById('resourceForm');
    const emptySlots = document.querySelectorAll('.slot-empty');
    const recursoSelect = document.getElementById('recurso');
    const dataInput = document.getElementById('data');
    const aulaSelect = document.getElementById('aula');
    const disciplinaInput = document.getElementById('disciplina');
    const turmaInput = document.getElementById('turma');
    const resourceFilters = document.querySelectorAll('.resource-filter');
    const resourcesGrid = document.querySelector('.resources-grid');
    const adminTools = document.getElementById('adminTools');
    const btnAddLab = document.getElementById('btnAddLab');
    const btnAddEquipment = document.getElementById('btnAddEquipment');
    const managementRoles = ['coordenador', 'admin'];

    const today = new Date().toISOString().split('T')[0];

    const RESOURCES_KEY = 'cetiRecursos';
    const RESERVAS_KEY = 'cetiReservas';

    const getResources = () => {
        try {
            return JSON.parse(localStorage.getItem(RESOURCES_KEY) || '[]');
        } catch (error) {
            return [];
        }
    };

    const saveResources = (resources) => {
        localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources));
    };

    const getReservations = () => {
        try {
            return JSON.parse(localStorage.getItem(RESERVAS_KEY) || '[]');
        } catch (error) {
            return [];
        }
    };

    const saveReservations = (reservations) => {
        localStorage.setItem(RESERVAS_KEY, JSON.stringify(reservations));
    };

    let resourceEditingId = null; // Rastreia qual recurso está sendo editado

    const userHasManagementAccess = () => {
        const usuarioAtual = getCurrentUser();
        return Boolean(usuarioAtual && managementRoles.includes(usuarioAtual.cargo));
    };

    const toggleManagementControls = () => {
        const allowed = userHasManagementAccess();
        if (adminTools) {
            adminTools.style.display = allowed ? 'flex' : 'none';
        }
        document.querySelectorAll('.btn-remove-resource').forEach((button) => {
            button.style.display = allowed ? 'inline-block' : 'none';
        });
    };

    const createResourceCard = (id, title, description, iconClass, badgeClass, badgeText, category) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.category = category;
        card.dataset.resourceId = id;
        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon ${iconClass}"><i class="fa-solid fa-desktop"></i></div>
                <span class="badge ${badgeClass}"><i class="fa-solid fa-circle"></i> ${badgeText}</span>
            </div>
            <h3>${title}</h3>
            <p class="card-desc">${description}</p>
            <div class="card-footer">
                <span>Disponível para agendamento</span>
                <button class="btn-card-action primary" type="button">Reservar</button>
                <button class="btn-card-action secondary btn-edit-resource" type="button" data-id="${id}"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn-card-action danger btn-remove-resource" type="button" data-id="${id}">Remover</button>
            </div>
        `;
        return card;
    };

    const openResourceModal = (category = 'laboratorio', resourceId = null) => {
        if (!resourceModal) return;
        const categoryField = document.getElementById('resourceCategory');
        const modalHeader = resourceModal.querySelector('.modal-header h3');
        
        resourceEditingId = resourceId;

        if (resourceId) {
            // Modo edição
            modalHeader.textContent = 'Editar Recurso';
            const recursos = getResources();
            const recurso = recursos.find(r => r.id == resourceId);
            
            if (recurso) {
                document.getElementById('resourceName').value = recurso.nome;
                document.getElementById('resourceCategory').value = recurso.categoria;
                document.getElementById('resourceStatus').value = recurso.status;
                document.getElementById('resourceCapacity').value = recurso.capacidade || 0;
                document.getElementById('resourceType').value = recurso.tipo || 'laboratorio';
                document.getElementById('resourceDescription').value = recurso.descricao || '';
            }
        } else {
            // Modo criação
            modalHeader.textContent = 'Gerenciar Recurso';
            if (categoryField) {
                categoryField.value = category;
            }
            document.getElementById('resourceName').value = '';
            document.getElementById('resourceDescription').value = '';
            document.getElementById('resourceCapacity').value = 0;
            document.getElementById('resourceStatus').value = 'disponivel';
            document.getElementById('resourceType').value = 'laboratorio';
        }
        
        resourceModal.classList.add('active');
    };

    const closeResourceModal = () => {
        if (resourceModal) {
            resourceModal.classList.remove('active');
        }
    };

    const addResource = (category) => {
        if (!userHasManagementAccess()) {
            alert('Apenas coordenadores e administradores podem gerenciar recursos.');
            return;
        }

        openResourceModal(category);
    };

    const openModal = () => {
        if (modal) {
            modal.classList.add('active');
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.classList.remove('active');
        }
    };

    const filterCards = (category) => {
        const allCards = document.querySelectorAll('.card');
        allCards.forEach((card) => {
            const matches = !category || card.dataset.category === category;
            card.style.display = matches ? 'block' : 'none';
        });
    };

    const renderResources = () => {
        const recursos = getResources();

        // Atualizar select de recursos
        if (recursoSelect) {
            const opcoesAnteriores = recursoSelect.querySelectorAll('option').length;
            for (let i = opcoesAnteriores; i > 4; i--) {
                recursoSelect.removeChild(recursoSelect.lastChild);
            }

            recursos.forEach((recurso) => {
                const option = document.createElement('option');
                option.value = recurso.id;
                option.textContent = recurso.nome;
                recursoSelect.appendChild(option);
            });
        }

        // Adicionar cards dos recursos
        recursos.forEach((recurso) => {
            const iconClass = recurso.categoria === 'laboratorio' ? 'blue' : 'green';
            const badgeClass = recurso.status === 'disponivel' ? 'available' : 'occupied';
            const badgeText = recurso.status === 'disponivel' ? 'Disponível' : recurso.status === 'manutencao' ? 'Manutenção' : 'Indisponível';
            
            const card = createResourceCard(recurso.id, recurso.nome, recurso.descricao || '', iconClass, badgeClass, badgeText, recurso.categoria);
            resourcesGrid.appendChild(card);

            // Evento de reservar
            card.querySelector('.btn-card-action.primary').addEventListener('click', () => {
                recursoSelect.value = recurso.id;
                openModal();
            });
        });

        toggleManagementControls();
    };

    if (btnAddLab) {
        btnAddLab.addEventListener('click', () => addResource('laboratorio'));
    }

    if (btnAddEquipment) {
        btnAddEquipment.addEventListener('click', () => addResource('equipamento'));
    }

    if (btnCloseResourceModal) {
        btnCloseResourceModal.addEventListener('click', closeResourceModal);
    }

    if (btnCancelResourceModal) {
        btnCancelResourceModal.addEventListener('click', closeResourceModal);
    }

    if (resourceModal) {
        resourceModal.addEventListener('click', (event) => {
            if (event.target === resourceModal) {
                closeResourceModal();
            }
        });
    }

    if (resourceForm) {
        resourceForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const name = document.getElementById('resourceName').value.trim();
            const category = document.getElementById('resourceCategory').value;
            const status = document.getElementById('resourceStatus').value;
            const capacity = Number(document.getElementById('resourceCapacity').value || 0);
            const tipo = document.getElementById('resourceType').value;
            const description = document.getElementById('resourceDescription').value.trim();

            if (!name) {
                alert('Informe o nome do recurso.');
                return;
            }

            const recursos = getResources();

            if (resourceEditingId) {
                // Modo edição
                const index = recursos.findIndex(r => r.id == resourceEditingId);
                if (index !== -1) {
                    recursos[index].nome = name;
                    recursos[index].categoria = category;
                    recursos[index].tipo = tipo;
                    recursos[index].capacidade = capacity;
                    recursos[index].descricao = description;
                    recursos[index].status = status;
                    recursos[index].atualizadoEm = new Date().toISOString();
                }
                saveResources(recursos);
                resourceForm.reset();
                closeResourceModal();
                resourceEditingId = null;
                renderResources();
                alert('Recurso atualizado com sucesso!');
            } else {
                // Modo criação
                const novoRecurso = {
                    id: Date.now(),
                    nome: name,
                    categoria: category,
                    tipo: tipo,
                    capacidade: capacity,
                    descricao: description,
                    status: status,
                    criadoEm: new Date().toISOString()
                };

                recursos.push(novoRecurso);
                saveResources(recursos);

                const badgeText = status === 'disponivel' ? 'Disponível' : status === 'manutencao' ? 'Manutenção' : 'Indisponível';
                const badgeClass = status === 'disponivel' ? 'available' : 'occupied';
                const iconClass = category === 'laboratorio' ? 'blue' : 'green';
                const card = createResourceCard(novoRecurso.id, name, description || '', iconClass, badgeClass, badgeText, category);

                resourcesGrid.appendChild(card);
                
                // Evento de reservar
                card.querySelector('.btn-card-action.primary').addEventListener('click', () => {
                    recursoSelect.value = novoRecurso.id;
                    openModal();
                });

                resourceForm.reset();
                closeResourceModal();
                renderResources();
                alert('Recurso criado com sucesso!');
            }
        });
    }

    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-remove-resource')) {
            const id = event.target.dataset.id;
            if (!confirm('Tem certeza que deseja remover este recurso?')) {
                return;
            }

            const recursos = getResources();
            const novaLista = recursos.filter((r) => r.id != id);
            saveResources(novaLista);
            
            event.target.closest('.card').remove();
            alert('Recurso removido com sucesso!');
        } else if (event.target.classList.contains('btn-edit-resource') || event.target.closest('.btn-edit-resource')) {
            const btnEdit = event.target.classList.contains('btn-edit-resource') ? event.target : event.target.closest('.btn-edit-resource');
            const id = btnEdit.dataset.id;
            
            if (!userHasManagementAccess()) {
                alert('Apenas coordenadores e administradores podem gerenciar recursos.');
                return;
            }

            openResourceModal(null, id);
        }
    });

    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', openModal);
    }

    if (btnOpenModalNav) {
        btnOpenModalNav.addEventListener('click', (event) => {
            event.preventDefault();
            openModal();
        });
    }

    resourceFilters.forEach((filterLink) => {
        filterLink.addEventListener('click', (event) => {
            event.preventDefault();
            const category = filterLink.dataset.filter;
            filterCards(category);
            document.querySelectorAll('.resource-filter').forEach((item) => {
                item.classList.toggle('active', item === filterLink);
            });
        });
    });

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', closeModal);
    }

    if (btnCancelModal) {
        btnCancelModal.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    if (dataInput && !dataInput.value) {
        dataInput.value = today;
    }

    emptySlots.forEach((slot) => {
        slot.addEventListener('click', () => {
            openModal();
            if (dataInput && !dataInput.value) {
                dataInput.value = today;
            }
        });
    });

    if (bookingForm) {
        bookingForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const recursoId = recursoSelect ? recursoSelect.value : null;
            const disciplina = disciplinaInput ? disciplinaInput.value.trim() : '';
            const turma = turmaInput ? turmaInput.value.trim() : '';
            const data = dataInput ? dataInput.value : '';
            const aula = aulaSelect ? aulaSelect.value : '';

            if (!recursoId || !disciplina || !turma || !data || !aula) {
                alert('Preencha todos os campos obrigatórios antes de confirmar a reserva.');
                return;
            }

            const recursoNome = recursoSelect.options[recursoSelect.selectedIndex].text;
            const aulaTexto = aulaSelect.options[aulaSelect.selectedIndex].text;

            const novaReserva = {
                id: Date.now(),
                recursoId,
                recursoNome,
                disciplina,
                turma,
                data,
                aula,
                status: 'confirmada',
                criadoEm: new Date().toISOString()
            };

            const reservas = getReservations();
            reservas.push(novaReserva);
            saveReservations(reservas);

            alert(
                `Reserva realizada com sucesso!\n\nRecurso: ${recursoNome}\nData: ${data}\nHorário: ${aulaTexto}\nDisciplina: ${disciplina}\nTurma: ${turma}`
            );

            bookingForm.reset();
            if (dataInput) {
                dataInput.value = today;
            }

            closeModal();
        });
    }

    renderResources();
});
