const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'seu_segredo_super_secreto_mude_isso';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Agendamentos')));

// Pool de conexão MySQL
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // Ajuste conforme necessário
    database: 'ceti_agendamento',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware para verificar token
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuarioId = decoded.usuarioId;
        req.usuarioCargo = decoded.cargo;
        next();
    } catch (error) {
        res.status(401).json({ erro: 'Token inválido' });
    }
};

// ==================== AUTENTICAÇÃO ====================

app.get('/api/auth/google/config', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ erro: 'Login Google não configurado' });
    }

    res.json({ clientId: process.env.GOOGLE_CLIENT_ID });
});

const verificarTokenGoogle = (idToken) => new Promise((resolve, reject) => {
    const tokenInfoUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
    tokenInfoUrl.searchParams.set('id_token', idToken);

    const request = https.get(tokenInfoUrl, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
            if (response.statusCode !== 200) {
                reject(new Error('Token Google inválido'));
                return;
            }

            try {
                const payload = JSON.parse(body);
                const emissorValido = ['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss);

                if (
                    payload.aud !== process.env.GOOGLE_CLIENT_ID ||
                    !emissorValido ||
                    ![true, 'true'].includes(payload.email_verified) ||
                    !payload.email ||
                    !payload.sub
                ) {
                    reject(new Error('Token Google inválido'));
                    return;
                }

                resolve(payload);
            } catch (error) {
                reject(error);
            }
        });
    });

    request.setTimeout(5000, () => request.destroy(new Error('Tempo esgotado ao validar token Google')));
    request.on('error', reject);
});

app.post('/api/auth/google', async (req, res) => {
    const { credential } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ erro: 'Login Google não configurado no servidor' });
    }

    if (!credential) {
        return res.status(400).json({ erro: 'Credencial Google não fornecida' });
    }

    try {
        const contaGoogle = await verificarTokenGoogle(credential);
        const email = contaGoogle.email.toLowerCase();
        const [usuarios] = await pool.query(
            'SELECT id, nome, email, cargo FROM usuarios WHERE email = ?',
            [email]
        );

        let usuario = usuarios[0];
        if (!usuario) {
            const nome = contaGoogle.name || email;
            const senhaAleatoria = crypto.randomBytes(32).toString('hex');
            const senhaHash = await bcryptjs.hash(senhaAleatoria, 10);
            const [resultado] = await pool.query(
                'INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, ?)',
                [nome, email, senhaHash, 'docente']
            );
            usuario = { id: resultado.insertId, nome, email, cargo: 'docente' };
        }

        const token = jwt.sign(
            { usuarioId: usuario.id, cargo: usuario.cargo },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            sucesso: true,
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                cargo: usuario.cargo
            }
        });
    } catch (error) {
        if (error.message === 'Token Google inválido') {
            return res.status(401).json({ erro: 'Não foi possível validar sua conta Google' });
        }

        console.error(error);
        res.status(500).json({ erro: 'Erro ao processar login com Google' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    try {
        const conn = await pool.getConnection();
        const [usuarios] = await conn.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        conn.release();

        if (usuarios.length === 0) {
            return res.status(401).json({ erro: 'Email ou senha incorretos' });
        }

        const usuario = usuarios[0];
        const senhaCorreta = await bcryptjs.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ erro: 'Email ou senha incorretos' });
        }

        const token = jwt.sign(
            { usuarioId: usuario.id, cargo: usuario.cargo },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({
            sucesso: true,
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                cargo: usuario.cargo
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao processar login' });
    }
});

// Registrar
app.post('/api/auth/register', async (req, res) => {
    const { nome, email, senha, cargo = 'docente' } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }

    try {
        const conn = await pool.getConnection();
        const [usuarios] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);

        if (usuarios.length > 0) {
            conn.release();
            return res.status(400).json({ erro: 'Email já cadastrado' });
        }

        const senhaHash = await bcryptjs.hash(senha, 10);
        await conn.query(
            'INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, ?)',
            [nome, email, senhaHash, cargo]
        );
        conn.release();

        res.json({ sucesso: true, mensagem: 'Usuário registrado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao registrar usuário' });
    }
});

// Reset de senha
app.post('/api/auth/reset-password', async (req, res) => {
    const { email, novaSenha } = req.body;

    if (!email || !novaSenha) {
        return res.status(400).json({ erro: 'Email e nova senha são obrigatórios' });
    }

    try {
        const conn = await pool.getConnection();
        const senhaHash = await bcryptjs.hash(novaSenha, 10);
        const [result] = await conn.query(
            'UPDATE usuarios SET senha = ? WHERE email = ?',
            [senhaHash, email]
        );
        conn.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        res.json({ sucesso: true, mensagem: 'Senha redefinida com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao redefinir senha' });
    }
});

// ==================== RECURSOS ====================

// Listar recursos
app.get('/api/recursos', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [recursos] = await conn.query('SELECT * FROM recursos ORDER BY nome');
        conn.release();

        res.json(recursos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao listar recursos' });
    }
});

// Criar recurso
app.post('/api/recursos', verificarToken, async (req, res) => {
    const { nome, categoria, tipo, capacidade, descricao, status = 'disponivel' } = req.body;

    // Apenas coordenadores e admins podem criar
    if (!['coordenador', 'admin'].includes(req.usuarioCargo)) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }

    if (!nome || !categoria) {
        return res.status(400).json({ erro: 'Nome e categoria são obrigatórios' });
    }

    try {
        const conn = await pool.getConnection();
        const [result] = await conn.query(
            'INSERT INTO recursos (nome, categoria, tipo, capacidade, descricao, status) VALUES (?, ?, ?, ?, ?, ?)',
            [nome, categoria, tipo, capacidade || 0, descricao || '', status]
        );
        conn.release();

        res.json({ sucesso: true, id: result.insertId, mensagem: 'Recurso criado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao criar recurso' });
    }
});

// Atualizar recurso
app.put('/api/recursos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const { nome, categoria, tipo, capacidade, descricao, status } = req.body;

    if (!['coordenador', 'admin'].includes(req.usuarioCargo)) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }

    try {
        const conn = await pool.getConnection();
        await conn.query(
            'UPDATE recursos SET nome = ?, categoria = ?, tipo = ?, capacidade = ?, descricao = ?, status = ? WHERE id = ?',
            [nome, categoria, tipo, capacidade, descricao, status, id]
        );
        conn.release();

        res.json({ sucesso: true, mensagem: 'Recurso atualizado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao atualizar recurso' });
    }
});

// Deletar recurso
app.delete('/api/recursos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    if (!['coordenador', 'admin'].includes(req.usuarioCargo)) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }

    try {
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM recursos WHERE id = ?', [id]);
        conn.release();

        res.json({ sucesso: true, mensagem: 'Recurso deletado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao deletar recurso' });
    }
});

// ==================== RESERVAS ====================

// Listar reservas
app.get('/api/reservas', verificarToken, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [reservas] = await conn.query(
            'SELECT r.*, u.nome, rec.nome as recurso_nome FROM reservas r JOIN usuarios u ON r.usuario_id = u.id JOIN recursos rec ON r.recurso_id = rec.id ORDER BY r.data DESC'
        );
        conn.release();

        res.json(reservas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao listar reservas' });
    }
});

// Criar reserva
app.post('/api/reservas', verificarToken, async (req, res) => {
    const { recurso_id, data, aula, disciplina, turma } = req.body;

    if (!recurso_id || !data || !aula || !disciplina || !turma) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    try {
        const conn = await pool.getConnection();

        // Verificar disponibilidade
        const [conflitos] = await conn.query(
            'SELECT id FROM reservas WHERE recurso_id = ? AND data = ? AND aula = ?',
            [recurso_id, data, aula]
        );

        if (conflitos.length > 0) {
            conn.release();
            return res.status(400).json({ erro: 'Horário já reservado' });
        }

        const [result] = await conn.query(
            'INSERT INTO reservas (usuario_id, recurso_id, data, aula, disciplina, turma, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.usuarioId, recurso_id, data, aula, disciplina, turma, 'confirmada']
        );
        conn.release();

        res.json({ sucesso: true, id: result.insertId, mensagem: 'Reserva criada com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao criar reserva' });
    }
});

// Cancelar reserva
app.delete('/api/reservas/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    try {
        const conn = await pool.getConnection();
        const [reservas] = await conn.query('SELECT usuario_id FROM reservas WHERE id = ?', [id]);

        if (reservas.length === 0) {
            conn.release();
            return res.status(404).json({ erro: 'Reserva não encontrada' });
        }

        // Apenas o criador ou admin pode cancelar
        if (reservas[0].usuario_id !== req.usuarioId && req.usuarioCargo !== 'admin') {
            conn.release();
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        await conn.query('DELETE FROM reservas WHERE id = ?', [id]);
        conn.release();

        res.json({ sucesso: true, mensagem: 'Reserva cancelada com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao cancelar reserva' });
    }
});

// ==================== RELATÓRIOS ====================

// Relatório de uso
app.get('/api/relatorios/uso', verificarToken, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [relatorio] = await conn.query(`
            SELECT 
                rec.id,
                rec.nome,
                rec.categoria,
                COUNT(r.id) as total_reservas,
                COUNT(CASE WHEN r.data >= CURDATE() THEN 1 END) as reservas_futuras,
                COUNT(CASE WHEN r.data < CURDATE() THEN 1 END) as reservas_passadas
            FROM recursos rec
            LEFT JOIN reservas r ON rec.id = r.recurso_id
            GROUP BY rec.id, rec.nome, rec.categoria
            ORDER BY total_reservas DESC
        `);
        conn.release();

        res.json(relatorio);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
});

// ==================== INICIALIZAÇÃO ====================

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Certifique-se de que o MySQL está rodando com a base de dados "ceti_agendamento"');
});
