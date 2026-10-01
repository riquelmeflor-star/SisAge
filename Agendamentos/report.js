const REPORTS_KEY = 'cetiReservas';
const RECURSOS_KEY = 'cetiRecursos';

const getStoredReservations = () => {
    try {
        return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    } catch (error) {
        return [];
    }
};

const getStoredResources = () => {
    try {
        return JSON.parse(localStorage.getItem(RECURSOS_KEY) || '[]');
    } catch (error) {
        return [];
    }
};

const ensureSeedData = () => {
    const reservas = getStoredReservations();
    if (reservas.length > 0) {
        return;
    }

    const dadosIniciais = [
        { id: 1, recurso: 'Laboratório de Informática 1', disciplina: 'Matemática', professor: 'Profª Ana Silva', data: '2026-08-29', aula: '2ª Aula', horario: '08:20 - 09:10', status: 'confirmada' },
        { id: 2, recurso: 'Laboratório de Informática 2', disciplina: 'Programação', professor: 'Prof. Marcos Oliveira', data: '2026-08-31', aula: '3ª Aula', horario: '09:30 - 10:20', status: 'confirmada' },
        { id: 3, recurso: 'Projetor Epson X12', disciplina: 'Biologia', professor: 'Coord. Carla Mendes', data: '2026-09-01', aula: '1ª Aula', horario: '07:30 - 08:20', status: 'pendente' },
        { id: 4, recurso: 'Laboratório de Informática 1', disciplina: 'Física', professor: 'Profª Ana Silva', data: '2026-09-03', aula: '4ª Aula', horario: '10:20 - 11:10', status: 'confirmada' },
        { id: 5, recurso: 'Kit Multimídia', disciplina: 'Química', professor: 'Prof. Marcos Oliveira', data: '2026-09-05', aula: '5ª Aula', horario: '11:10 - 12:00', status: 'cancelada' }
    ];

    localStorage.setItem(REPORTS_KEY, JSON.stringify(dadosIniciais));
};

const ensureResourcesSeed = () => {
    const recursos = getStoredResources();
    if (recursos.length > 0) {
        return;
    }

    const lista = [
        { nome: 'Laboratório de Informática 1' },
        { nome: 'Laboratório de Informática 2' },
        { nome: 'Projetor Epson X12' },
        { nome: 'Caixa de Som Ativa' },
        { nome: 'Kit Multimídia' }
    ];

    localStorage.setItem(RECURSOS_KEY, JSON.stringify(lista));
};

const formatarData = (dataString) => {
    if (!dataString) return '—';
    const data = new Date(dataString + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
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

const renderReport = () => {
    ensureSeedData();
    ensureResourcesSeed();

    const filtro = document.getElementById('filtroPeriodo');
    const periodo = filtro ? Number(filtro.value) : 30;
    const reservas = getStoredReservations();
    const recursos = getStoredResources();
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(hoje.getDate() - periodo);

    const reservasFiltradas = reservas.filter((reserva) => {
        const dataReserva = new Date(reserva.data + 'T00:00:00');
        return dataReserva >= inicio && dataReserva <= hoje;
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

    const reportBody = document.getElementById('reportBody');
    if (!reportBody) return;

    if (!reservasFiltradas.length) {
        reportBody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma reserva encontrada para este período.</td></tr>';
        return;
    }

    reportBody.innerHTML = reservasFiltradas
        .map((reserva) => `
            <tr>
                <td>${reserva.recurso}</td>
                <td>${reserva.disciplina}</td>
                <td>${reserva.professor}</td>
                <td>${formatarData(reserva.data)}</td>
                <td>${reserva.aula || '—'}</td>
                <td>${reserva.horario || '—'}</td>
                <td><span class="badge-status ${reserva.status}">${reserva.status}</span></td>
            </tr>
        `)
        .join('');
};

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('reportBody')) {
        return;
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
