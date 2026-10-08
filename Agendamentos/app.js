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
    const recursoSelect = document.getElementById('recurso');
    const dataInput = document.getElementById('data');
    const aulaSelect = document.getElementById('aula');
    const disciplinaInput = document.getElementById('disciplina');
    const turmaInput = document.getElementById('turma');
    const resourceFilters = document.querySelectorAll('.resource-filter');
    const resourcesGrid = document.querySelector('.resources-grid');
    const scheduleTable = document.querySelector('.schedule-table');
    const scheduleHead = scheduleTable ? scheduleTable.querySelector('thead tr') : null;
    const scheduleBody = scheduleTable ? scheduleTable.querySelector('tbody') : null;
    const weekLabel = document.querySelector('.week-label');
    const adminTools = document.getElementById('adminTools');
    const btnAddLab = document.getElementById('btnAddLab');
    const btnAddEquipment = document.getElementById('btnAddEquipment');
    const managementRoles = ['coordenador', 'admin'];

    const getDateKey = (date) => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
    const getMonday = (date) => {
        const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        return monday;
    };
    const todayFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
    let today = getDateKey(new Date());
    let weekStart = getMonday(new Date());

    const aulas = [
        { id: '1', nome: '1ª Aula', horario: '07:30 - 08:30' },
        { id: '2', nome: '2ª Aula', horario: '08:30 - 09:30' },
        { id: '3', nome: '3ª Aula', horario: '09:50 - 10:50' },
        { id: '4', nome: '4ª Aula', horario: '10:50 - 11:50' },
        { id: '5', nome: '5ª Aula', horario: '11:50 - 12:50' },
        { id: '6', nome: '6ª Aula', horario: '13:50 - 14:50' },
        { id: '7', nome: '7ª Aula', horario: '14:50 - 15:50' },
        { id: '8', nome: '8ª Aula', horario: '15:50 - 16:50' }
    ];

    const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);

    const renderSchedule = () => {
        if (!scheduleHead || !scheduleBody) return;

        const reservasAtivas = getReservations()
            .filter((reserva) => reserva.status !== 'cancelada')
            .sort((a, b) => String(a.criadoEm || a.id).localeCompare(String(b.criadoEm || b.id)));
        const corPorReserva = new Map(reservasAtivas.map((reserva, index) => [
            String(reserva.id), (index * 137.508) % 360
        ]));
        const weekDays = Array.from({ length: 5 }, (_, index) => {
            const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
            return { date, key: getDateKey(date) };
        });
        const weekEnd = weekDays[weekDays.length - 1].date;
        if (weekLabel) {
            weekLabel.textContent = `${todayFormatter.format(weekDays[0].date)} – ${todayFormatter.format(weekEnd)}, ${weekEnd.getFullYear()}`;
        }

        scheduleHead.innerHTML = `<th>Horário</th>${weekDays.map(({ date, key }) => {
            const weekday = weekdayFormatter.format(date);
            const title = weekday.charAt(0).toUpperCase() + weekday.slice(1);
            const isToday = key === today;
            const dateLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            return `<th class="${isToday ? 'active-day' : ''}">${title} (${dateLabel})${isToday ? '<br><small>Hoje</small>' : ''}</th>`;
        }).join('')}`;

        const rows = [];
        aulas.forEach((aula, index) => {
            const cells = weekDays.map(({ key }) => {
                const reservas = reservasAtivas.filter((reserva) =>
                    String(reserva.data).slice(0, 10) === key &&
                    String(reserva.aula) === aula.id
                );
                if (!reservas.length) {
                    return `<td><button class="slot-empty" type="button" data-slot-date="${key}" data-slot-aula="${aula.id}">+ Reservar</button></td>`;
                }

                const blocos = reservas.map((reserva) => `
                    <div class="slot-reserved" style="--reservation-hue: ${corPorReserva.get(String(reserva.id)) ?? 210}">
                        <strong>${escapeHTML(reserva.professor || 'Reserva')} • ${escapeHTML(reserva.disciplina || '')}</strong><br>
                        ${escapeHTML(reserva.recursoNome || reserva.recurso || 'Recurso')} (${escapeHTML(reserva.turma || '—')})
                    </div>
                `).join('');
                return `<td>${blocos}</td>`;
            }).join('');

            rows.push(`<tr><td class="time-slot"><strong>${aula.nome}</strong><br>${aula.horario}</td>${cells}</tr>`);
            if (index === 1) rows.push('<tr class="break-row"><td colspan="6">INTERVALO / RECREIO (09:30 - 09:50)</td></tr>');
            if (index === 4) rows.push('<tr class="break-row"><td colspan="6">ALMOÇO (12:50 - 13:50)</td></tr>');
        });
        scheduleBody.innerHTML = rows.join('');
    };

    const refreshCurrentDate = () => {
        const currentDate = getDateKey(new Date());
        if (currentDate === today) return;

        const previousDate = today;
        today = currentDate;
        weekStart = getMonday(new Date());
        if (dataInput && dataInput.value === previousDate) dataInput.value = today;
        renderSchedule();
    };

    const RESOURCES_KEY = 'cetiRecursos';
    const RESERVAS_KEY = 'cetiReservas';

    const getResources = () => {
        try {
            const recursos = JSON.parse(localStorage.getItem(RESOURCES_KEY) || '[]');

            if (!Array.isArray(recursos) || recursos.length === 0) {
                const defaultResources = [
                    {
                        id: 1,
                        nome: 'Laboratório de Info 1',
                        categoria: 'laboratorio',
                        tipo: 'laboratorio',
                        capacidade: 25,
                        descricao: '25 PCs • Ar-condicionado • Projetor',
                        status: 'disponivel',
                        criadoEm: new Date().toISOString()
                    },
                    {
                        id: 2,
                        nome: 'Laboratório de Info 2',
                        categoria: 'laboratorio',
                        tipo: 'laboratorio',
                        capacidade: 20,
                        descricao: '20 PCs • Internet Fibra de Alta Velocidade',
                        status: 'ocupado',
                        criadoEm: new Date().toISOString()
                    },
                    {
                        id: 3,
                        nome: 'Kits de Projetor & Som',
                        categoria: 'equipamento',
                        tipo: 'equipamento',
                        capacidade: 2,
                        descricao: 'Epson HDMI + Caixa Amplificada Móvel',
                        status: 'disponivel',
                        criadoEm: new Date().toISOString()
                    }
                ];

                saveResources(defaultResources);
                return defaultResources;
            }

            const precisaNormalizar = recursos.some((recurso) => !recurso.categoria || !recurso.status || !recurso.tipo);

            if (precisaNormalizar) {
                const normalizedResources = recursos.map((recurso, index) => {
                    const categoria = recurso.categoria || (/(lab|laborat|informatica|informática|computador)/i.test(recurso.nome) ? 'laboratorio' : 'equipamento');
                    return {
                        id: recurso.id || Date.now() + index,
                        nome: recurso.nome || `Recurso ${index + 1}`,
                        categoria,
                        tipo: recurso.tipo || categoria,
                        capacidade: Number(recurso.capacidade || 0),
                        descricao: recurso.descricao || '',
                        status: recurso.status || 'disponivel',
                        criadoEm: recurso.criadoEm || new Date().toISOString()
                    };
                });

                saveResources(normalizedResources);
                return normalizedResources;
            }

            return recursos;
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

    const getReservationStatusLabel = (status) => {
        switch (status) {
            case 'pendente':
                return 'Pendente';
            case 'cancelada':
                return 'Cancelada';
            default:
                return 'Confirmada';
        }
    };

    const renderMyReservations = () => {
        const currentUser = getCurrentUser();
        const list = document.getElementById('reservationsList');
        const summary = document.getElementById('reservationsSummary');
        const section = document.getElementById('minhas-reservas');

        if (!list || !summary || !section) return;

        const reservas = getReservations().filter((reserva) => {
            if (!currentUser) return false;
            return reserva.professor === currentUser.nome || reserva.usuarioEmail === currentUser.email;
        });

        summary.textContent = `${reservas.length} reserva${reservas.length === 1 ? '' : 's'}`;

        if (!reservas.length) {
            list.innerHTML = '<div class="empty-state">Você ainda não possui reservas.</div>';
            return;
        }

        list.innerHTML = reservas
            .slice()
            .sort((a, b) => new Date(b.data) - new Date(a.data))
            .map((reserva) => `
                <article class="reservation-card">
                    <div class="reservation-main">
                        <span class="reservation-tag">${reserva.recursoNome || reserva.recurso || 'Recurso'}</span>
                        <h4>${reserva.disciplina || 'Sem disciplina'}</h4>
                        <p>${reserva.data} • ${reserva.aulaNome || reserva.aula || 'Aula'} • ${reserva.horario || ''}</p>
                        <small>Turma ${reserva.turma || '—'} • Professor: ${reserva.professor || '—'}</small>
                    </div>
                    <div class="reservation-actions">
                        <span class="badge-status ${reserva.status || 'confirmada'}">${getReservationStatusLabel(reserva.status)}</span>
                        <button class="btn-card-action secondary btn-cancel-reservation" type="button" data-id="${reserva.id}">Cancelar</button>
                    </div>
                </article>
            `)
            .join('');
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

        if (!resourcesGrid) return;

        resourcesGrid.innerHTML = '';

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

                resourceForm.reset();
                closeResourceModal();
                renderResources();
                alert('Recurso criado com sucesso!');
            }
        });
    }

    document.addEventListener('click', (event) => {
        const cancelButton = event.target.closest('.btn-cancel-reservation');
        if (cancelButton) {
            const id = cancelButton.dataset.id;
            const reservas = getReservations().filter((reserva) => String(reserva.id) !== String(id));
            saveReservations(reservas);
            renderMyReservations();
            renderSchedule();
            alert('Reserva cancelada com sucesso!');
            return;
        }

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

    const sectionMinhasReservas = document.getElementById('minhas-reservas');
    const sectionSchedule = document.querySelector('.schedule-section');

    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', openModal);
    }

    if (btnOpenModalNav) {
        btnOpenModalNav.addEventListener('click', (event) => {
            event.preventDefault();
            openModal();
        });
    }

    const showDashboardResources = () => {
        if (resourcesGrid) {
            resourcesGrid.style.display = 'grid';
        }
        if (sectionSchedule) {
            sectionSchedule.style.display = 'block';
        }
        if (sectionMinhasReservas) {
            sectionMinhasReservas.classList.add('hidden');
        }
    };

    const btnMyReservations = document.getElementById('btnMyReservations');
    if (btnMyReservations) {
        btnMyReservations.addEventListener('click', (event) => {
            event.preventDefault();
            renderMyReservations();
            if (resourcesGrid) {
                resourcesGrid.style.display = 'none';
            }
            if (sectionSchedule) {
                sectionSchedule.style.display = 'none';
            }
            if (sectionMinhasReservas) {
                sectionMinhasReservas.classList.remove('hidden');
            }
            document.querySelectorAll('.nav-item').forEach((item) => {
                item.classList.toggle('active', item === btnMyReservations);
            });
        });
    }

    resourceFilters.forEach((filterLink) => {
        filterLink.addEventListener('click', (event) => {
            event.preventDefault();
            const category = filterLink.dataset.filter;
            showDashboardResources();
            filterCards(category);
            document.querySelectorAll('.nav-item').forEach((item) => {
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

    if (scheduleBody) {
        scheduleBody.addEventListener('click', (event) => {
            const slot = event.target.closest('[data-slot-date]');
            if (!slot) return;

            if (dataInput) dataInput.value = slot.dataset.slotDate;
            if (aulaSelect) aulaSelect.value = slot.dataset.slotAula;
            openModal();
        });
    }

    const weekPicker = document.querySelector('.week-picker');
    if (weekPicker) {
        weekPicker.addEventListener('click', (event) => {
            const offsetButton = event.target.closest('[data-week-offset]');
            if (offsetButton) {
                weekStart.setDate(weekStart.getDate() + Number(offsetButton.dataset.weekOffset) * 7);
                renderSchedule();
                return;
            }

            if (event.target.closest('[data-week-today]')) {
                refreshCurrentDate();
                weekStart = getMonday(new Date());
                renderSchedule();
            }
        });
    }

    window.setInterval(refreshCurrentDate, 60000);
    window.addEventListener('focus', refreshCurrentDate);

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
            const horario = aulaTexto.match(/\(([^)]+)\)/);
            const usuarioAtual = getCurrentUser();

            const novaReserva = {
                id: Date.now(),
                recursoId,
                recursoNome,
                professor: usuarioAtual ? usuarioAtual.nome : '',
                usuarioEmail: usuarioAtual ? usuarioAtual.email : '',
                disciplina,
                turma,
                data,
                aula,
                aulaNome: aulaTexto.split(' (')[0],
                horario: horario ? horario[1] : '',
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
            renderMyReservations();
            renderSchedule();
        });
    }

    renderResources();
    renderMyReservations();
    renderSchedule();
    showDashboardResources();
});
