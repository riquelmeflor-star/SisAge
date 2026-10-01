CREATE DATABASE IF NOT EXISTS ceti_agendamento
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE ceti_agendamento;

-- -----------------------------------------------------
-- Tabela de usuários
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    cargo ENUM('docente', 'coordenador', 'admin') NOT NULL DEFAULT 'docente',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usuario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------
-- Tabela de recursos
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS recursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria ENUM('laboratorio', 'projetor', 'som', 'kit_multimidia') NOT NULL,
    descricao VARCHAR(255) NULL,
    capacidade INT NOT NULL DEFAULT 0,
    status ENUM('disponivel', 'manutencao', 'indisponivel') NOT NULL DEFAULT 'disponivel',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recurso_categoria (categoria),
    INDEX idx_recurso_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------
-- Tabela de reservas
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    recurso_id INT NOT NULL,
    data_reserva DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    turma VARCHAR(50) NOT NULL,
    status ENUM('confirmada', 'cancelada', 'pendente') NOT NULL DEFAULT 'confirmada',
    observacoes TEXT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reserva_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_reserva_recurso
        FOREIGN KEY (recurso_id) REFERENCES recursos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_horario_reserva
        CHECK (horario_fim > horario_inicio),
    INDEX idx_reserva_data (data_reserva),
    INDEX idx_reserva_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------
-- Dados iniciais de usuários
-- -----------------------------------------------------
INSERT INTO usuarios (nome, email, senha, cargo) VALUES
('Profª Ana Silva', 'ana@ceti.edu.br', '123456', 'docente'),
('Prof. Marcos Oliveira', 'marcos@ceti.edu.br', '123456', 'docente'),
('Coord. Carla Mendes', 'carla@ceti.edu.br', '123456', 'coordenador'),
('Administração CETI', 'admin@ceti.edu.br', 'admin123', 'admin')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), senha = VALUES(senha), cargo = VALUES(cargo);

-- -----------------------------------------------------
-- Dados iniciais de recursos
-- -----------------------------------------------------
INSERT INTO recursos (nome, categoria, descricao, capacidade, status) VALUES
('Laboratório de Informática 1', 'laboratorio', '25 PCs, ar-condicionado e projetor', 25, 'disponivel'),
('Laboratório de Informática 2', 'laboratorio', '20 PCs e internet fibra', 20, 'disponivel'),
('Projetor Epson X12', 'projetor', 'HDMI / VGA móvel', 0, 'disponivel'),
('Caixa de Som Ativa', 'som', 'Conexão Bluetooth e P2', 0, 'disponivel'),
('Kit Multimídia', 'kit_multimidia', 'Notebook, projetor e caixa de som para apresentações', 0, 'disponivel')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), categoria = VALUES(categoria), descricao = VALUES(descricao), capacidade = VALUES(capacidade), status = VALUES(status);

-- -----------------------------------------------------
-- Dados iniciais de reservas
-- -----------------------------------------------------
INSERT INTO reservas (usuario_id, recurso_id, data_reserva, horario_inicio, horario_fim, disciplina, turma, status, observacoes) VALUES
(1, 1, '2026-08-31', '07:30:00', '08:20:00', 'Matemática', '3º Ano A', 'confirmada', 'Aula de reforço em laboratório'),
(2, 2, '2026-08-31', '08:20:00', '09:10:00', 'Programação', '2º Ano B', 'confirmada', 'Trabalho prático de lógica'),
(1, 1, '2026-09-01', '09:30:00', '10:20:00', 'Física', '1º Ano C', 'pendente', 'Uso do laboratório para prática'),
(3, 3, '2026-09-02', '10:20:00', '11:10:00', 'Biologia', '3º Ano D', 'confirmada', 'Apresentação de slides e vídeos')
ON DUPLICATE KEY UPDATE disciplina = VALUES(disciplina), turma = VALUES(turma), status = VALUES(status), observacoes = VALUES(observacoes);

-- -----------------------------------------------------
-- Consultas úteis
-- -----------------------------------------------------
-- SELECT * FROM usuarios;
-- SELECT * FROM recursos;
-- SELECT * FROM reservas;

-- -----------------------------------------------------
-- Exemplo de consulta para ver reservas por data
-- -----------------------------------------------------
-- SELECT r.id, u.nome, rec.nome AS recurso, r.data_reserva, r.horario_inicio, r.horario_fim, r.disciplina, r.turma
-- FROM reservas r
-- INNER JOIN usuarios u ON u.id = r.usuario_id
-- INNER JOIN recursos rec ON rec.id = r.recurso_id
-- ORDER BY r.data_reserva, r.horario_inicio;