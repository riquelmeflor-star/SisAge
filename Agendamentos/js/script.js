document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalBooking');
    const btnOpenModal = document.getElementById('btnOpenModal');
    const btnOpenModalNav = document.getElementById('btnOpenModalNav');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const bookingForm = document.getElementById('bookingForm');
    const emptySlots = document.querySelectorAll('.slot-empty');

    // Funções para abrir/fechar modal
    const openModal = () => modal.classList.add('active');
    const closeModal = () => modal.classList.remove('active');

    btnOpenModal.addEventListener('click', openModal);
    btnOpenModalNav.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });

    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);

    // Abrir modal ao clicar em qualquer slot vazio do calendário
    emptySlots.forEach(slot => {
        slot.addEventListener('click', () => {
            openModal();
        });
    });

    // Submissão do formulário
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const recurso = document.getElementById('recurso').options[document.getElementById('recurso').selectedIndex].text;
        const disciplina = document.getElementById('disciplina').value;
        const turma = document.getElementById('turma').value;

        alert(`Reserva realizada com sucesso!\n\nRecurso: ${recurso}\nDisciplina: ${disciplina}\nTurma: ${turma}`);
        
        bookingForm.reset();
        closeModal();
    });
});