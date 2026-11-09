const DETALHES_AULAS = {
    1: { nome: '1ª Aula', horario: '07:30 - 08:30' },
    2: { nome: '2ª Aula', horario: '08:30 - 09:30' },
    3: { nome: '3ª Aula', horario: '09:50 - 10:50' },
    4: { nome: '4ª Aula', horario: '10:50 - 11:50' },
    5: { nome: '5ª Aula', horario: '11:50 - 12:50' },
    6: { nome: '6ª Aula', horario: '13:50 - 14:50' },
    7: { nome: '7ª Aula', horario: '14:50 - 15:50' },
    8: { nome: '8ª Aula', horario: '15:50 - 16:50' }
};

const formatarData = (dataString) => {
    if (!dataString) return '—';
    const data = new Date(dataString + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
};

const escaparHtml = (valor) => String(valor).replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[caractere]));

const obterDetalhesReserva = (reserva, recursos, professorAtual) => {
    const recursoCadastrado = recursos.find((item) => String(item.id) === String(reserva.recursoId));
    const aulaSalva = reserva.aula;
    const aulaDoBanco = Object.entries(DETALHES_AULAS).find(([, item]) =>
        item.horario.startsWith(String(reserva.horario_inicio || '').slice(0, 5))
    );
    const detalhesAula = DETALHES_AULAS[Number(aulaSalva)] || aulaDoBanco?.[1];
    const horarioDaAula = typeof aulaSalva === 'string' ? aulaSalva.match(/\(([^)]+)\)/) : null;

    return {
        recurso: reserva.recurso || reserva.recursoNome || recursoCadastrado?.nome || '—',
        disciplina: reserva.disciplina || '—',
        professor: reserva.professor || professorAtual || 'Não informado',
        data: formatarData(reserva.data),
        aula: reserva.aulaNome || detalhesAula?.nome || aulaSalva || '—',
        horario: reserva.horario || horarioDaAula?.[1] || (reserva.horario_inicio && reserva.horario_fim
            ? `${String(reserva.horario_inicio).slice(0, 5)} - ${String(reserva.horario_fim).slice(0, 5)}`
            : detalhesAula?.horario) || '—',
        status: reserva.status || '—'
    };
};

const exportarRelatorioPdf = () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('A biblioteca de PDF não foi carregada. Verifique a conexão ou recarregue a página.');
        return;
    }

    const reportBody = document.getElementById('reportBody');
    if (!reportBody) {
        alert('Não foi possível localizar a tabela do relatório.');
        return;
    }

    const linhas = Array.from(reportBody.querySelectorAll('tr')).filter((linha) => !linha.querySelector('.empty-state'));
    const dados = linhas.map((linha) => {
        return Array.from(linha.children).map((celula) => celula.textContent.trim());
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Relatório de Uso - CETI', 14, 18);

    const filtro = document.getElementById('filtroPeriodo');
    const periodoSelecionado = filtro ? filtro.options[filtro.selectedIndex].text : 'Últimos 30 dias';
    doc.setFontSize(10);
    doc.text(`Período: ${periodoSelecionado}`, 14, 26);

    if (!dados.length) {
        doc.text('Nenhuma reserva encontrada para o período selecionado.', 14, 40);
        doc.save('relatorio-uso-ceti.pdf');
        return;
    }

    doc.autoTable({
        head: [['Recurso', 'Disciplina', 'Professor', 'Data', 'Aula', 'Horário', 'Status']],
        body: dados,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [27, 54, 93], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save('relatorio-uso-ceti.pdf');
};

const renderReport = async () => {
    const filtro = document.getElementById('filtroPeriodo');
    const periodo = filtro ? Number(filtro.value) : 30;
    const reportBody = document.getElementById('reportBody');
    if (!reportBody) return;

    try {
        const [reservas, recursos] = await Promise.all([
            api.listarReservas(),
            api.listarRecursos()
        ]);
        const usuarioAtual = getCurrentUser();
        const professorAtual = usuarioAtual ? usuarioAtual.nome : '';
        const hoje = new Date();
        const inicio = new Date();
        inicio.setDate(hoje.getDate() - periodo);
        const reservasFiltradas = reservas.filter((reserva) => {
            const dataReserva = new Date(`${reserva.data}T00:00:00`);
            return reserva.status !== 'cancelada' && dataReserva >= inicio && dataReserva <= hoje;
        });

        const totalReservas = reservasFiltradas.length;
        const pendentes = reservasFiltradas.filter((reserva) => reserva.status === 'pendente').length;
        const usoMes = Math.min(100, Math.round((totalReservas / Math.max(1, recursos.length * 4)) * 100));
        const totalReservasElement = document.getElementById('totalReservas');
        const totalRecursosElement = document.getElementById('totalRecursos');
        const usoMesElement = document.getElementById('usoMes');
        const pendentesElement = document.getElementById('reservasPendentes');

        if (totalReservasElement) totalReservasElement.textContent = totalReservas;
        if (totalRecursosElement) totalRecursosElement.textContent = recursos.length;
        if (usoMesElement) usoMesElement.textContent = `${usoMes}%`;
        if (pendentesElement) pendentesElement.textContent = pendentes;

        if (!reservasFiltradas.length) {
            reportBody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma reserva encontrada para este período.</td></tr>';
            return;
        }

        reportBody.innerHTML = reservasFiltradas
            .map((reserva) => {
                const detalhes = obterDetalhesReserva(reserva, recursos, professorAtual);
                return `
            <tr>
                <td>${escaparHtml(detalhes.recurso)}</td>
                <td>${escaparHtml(detalhes.disciplina)}</td>
                <td>${escaparHtml(detalhes.professor)}</td>
                <td>${escaparHtml(detalhes.data)}</td>
                <td>${escaparHtml(detalhes.aula)}</td>
                <td>${escaparHtml(detalhes.horario)}</td>
                <td><span class="badge-status ${escaparHtml(detalhes.status)}">${escaparHtml(detalhes.status)}</span></td>
            </tr>
        `;
            })
            .join('');
    } catch (error) {
        reportBody.innerHTML = '<tr><td colspan="7" class="empty-state">Não foi possível carregar o relatório.</td></tr>';
        console.error('Erro ao carregar relatório:', error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('reportBody')) {
        return;
    }

    const themeToggle = document.getElementById('btnThemeToggle');
    if (themeToggle) {
        const applyTheme = (isDark, savePreference = false) => {
            document.body.classList.toggle('dark-mode', isDark);

            const icon = themeToggle.querySelector('i');
            const label = isDark ? 'Ativar modo claro' : 'Ativar modo noturno';
            if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            themeToggle.setAttribute('aria-pressed', String(isDark));
            themeToggle.setAttribute('aria-label', label);
            themeToggle.title = label;

            if (savePreference) {
                localStorage.setItem('cetiTema', isDark ? 'noturno' : 'claro');
            }
        };

        const savedTheme = localStorage.getItem('cetiTema');
        const prefersDark = savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(savedTheme === 'noturno' || prefersDark);
        themeToggle.addEventListener('click', () => {
            applyTheme(!document.body.classList.contains('dark-mode'), true);
        });
    }

    const filtro = document.getElementById('filtroPeriodo');
    if (filtro) {
        filtro.addEventListener('change', renderReport);
    }

    const btnRefresh = document.getElementById('btnRefreshReport');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', renderReport);
    }

    const btnPdf = document.getElementById('btnExportPdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', exportarRelatorioPdf);
    }

    renderReport();
});
