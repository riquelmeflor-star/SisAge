const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET precisa ser configurado em produção');
}
const SECRET_KEY = process.env.JWT_SECRET || 'desenvolvimento-local-altere-em-producao';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Agendamentos')));

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
if (process.env.NODE_ENV === 'production' && !connectionString) {
    throw new Error('DATABASE_URL precisa ser configurada em produção');
}

const pool = new Pool({
    ...(connectionString ? { connectionString } : {
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        user: process.env.PGUSER || process.env.DB_USER || 'postgres',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
        database: process.env.PGDATABASE || process.env.DB_NAME || 'ceti_agendamento',
        port: Number(process.env.PGPORT || process.env.DB_PORT || 5432)
    }),
    max: process.env.NODE_ENV === 'production' ? 2 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000
});
pool.on('error', (error) => console.error('Erro inesperado no pool PostgreSQL:', error));

const AULAS = {
    1: ['07:30:00', '08:30:00'],
    2: ['08:30:00', '09:30:00'],
    3: ['09:50:00', '10:50:00'],
    4: ['10:50:00', '11:50:00'],
    5: ['11:50:00', '12:50:00'],
    6: ['13:50:00', '14:50:00'],
    7: ['14:50:00', '15:50:00'],
    8: ['15:50:00', '16:50:00']
};

const senhaEstaCriptografada = (senha) => /^\$2[aby]\$/.test(senha);
const verificarSenha = (senha, senhaArmazenada) => senhaEstaCriptografada(senhaArmazenada)
    ? bcryptjs.compare(senha, senhaArmazenada)
    : Promise.resolve(senha === senhaArmazenada);
const hashTokenCadastro = (token) => crypto.createHmac('sha256', SECRET_KEY).update(token).digest('hex');
const cargosGerenciadores = ['coordenador', 'admin', 'superadmin'];

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
        const { rows: usuarios } = await pool.query(
            'SELECT id, nome, email, cargo FROM usuarios WHERE email = $1',
            [email]
        );

        const usuario = usuarios[0];
        if (!usuario) {
            return res.status(403).json({
                erro: 'Cadastre-se com um token de convite antes de usar o login Google.'
            });
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
        const { rows: usuarios } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

        if (usuarios.length === 0) {
            return res.status(401).json({ erro: 'Email ou senha incorretos' });
        }

        const usuario = usuarios[0];
        const senhaCorreta = await verificarSenha(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ erro: 'Email ou senha incorretos' });
        }

        if (!senhaEstaCriptografada(usuario.senha)) {
            const senhaHash = await bcryptjs.hash(senha, 10);
            await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [senhaHash, usuario.id]);
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
    const { nome, email, senha, token: tokenCadastro } = req.body || {};
    const nomeNormalizado = typeof nome === 'string' ? nome.trim() : '';
    const emailNormalizado = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (
        !nomeNormalizado ||
        nomeNormalizado.length > 100 ||
        !emailNormalizado ||
        emailNormalizado.length > 120 ||
        typeof senha !== 'string' ||
        !senha ||
        typeof tokenCadastro !== 'string' ||
        !/^\d{4}$/.test(tokenCadastro)
    ) {
        return res.status(400).json({ erro: 'Nome, email, senha e token de 4 dígitos são obrigatórios' });
    }
    if (senha.length < 6) {
        return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const ipHash = crypto.createHash('sha256').update(`${SECRET_KEY}:${req.ip}`).digest('hex');
    let client;
    let transacaoIniciada = false;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        transacaoIniciada = true;
        const tokenHash = hashTokenCadastro(tokenCadastro);
        const { rows: tokens } = await client.query(
            `SELECT token_hash FROM tokens_cadastro
             WHERE token_hash = $1 AND utilizado_em IS NULL AND expira_em > CURRENT_TIMESTAMP
             FOR UPDATE`,
            [tokenHash]
        );
        if (!tokens.length) {
            await client.query('ROLLBACK');
            transacaoIniciada = false;
            const { rows: tentativas } = await pool.query(
                `INSERT INTO tentativas_cadastro (ip_hash, tentativas)
                 VALUES ($1, 1)
                 ON CONFLICT (ip_hash) DO UPDATE SET
                    tentativas = CASE
                        WHEN tentativas_cadastro.inicio_janela < CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN 1
                        ELSE tentativas_cadastro.tentativas + 1
                    END,
                    inicio_janela = CASE
                        WHEN tentativas_cadastro.inicio_janela < CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN CURRENT_TIMESTAMP
                        ELSE tentativas_cadastro.inicio_janela
                    END
                 RETURNING tentativas`,
                [ipHash]
            );
            if (tentativas[0].tentativas > 5) {
                return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos para tentar novamente.' });
            }
            return res.status(400).json({ erro: 'Token inválido, expirado ou já utilizado.' });
        }

        const { rows: usuarios } = await client.query(
            `INSERT INTO usuarios (nome, email, senha, cargo)
             VALUES ($1, $2, $3, 'docente')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [nomeNormalizado, emailNormalizado, await bcryptjs.hash(senha, 10)]
        );
        if (!usuarios.length) {
            await client.query('ROLLBACK');
            transacaoIniciada = false;
            return res.status(400).json({ erro: 'Email já cadastrado' });
        }

        await client.query(
            `UPDATE tokens_cadastro
             SET utilizado_em = CURRENT_TIMESTAMP, usuario_id = $1
             WHERE token_hash = $2`,
            [usuarios[0].id, tokenHash]
        );
        await client.query('COMMIT');
        transacaoIniciada = false;
        res.json({ sucesso: true, mensagem: 'Usuário registrado com sucesso' });
    } catch (error) {
        if (client && transacaoIniciada) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Falha ao desfazer transação de cadastro:', rollbackError);
            }
        }
        console.error(error);
        res.status(500).json({ erro: 'Erro ao registrar usuário' });
    } finally {
        if (client) client.release();
    }
});

app.post('/api/admin/tokens-cadastro', verificarToken, async (req, res) => {
    if (req.usuarioCargo !== 'superadmin') {
        return res.status(403).json({ erro: 'Apenas o administrador principal pode gerar tokens.' });
    }

    try {
        await pool.query(
            'DELETE FROM tokens_cadastro WHERE utilizado_em IS NOT NULL OR expira_em <= CURRENT_TIMESTAMP'
        );
        for (let tentativa = 0; tentativa < 10; tentativa += 1) {
            const codigo = String(crypto.randomInt(0, 10000)).padStart(4, '0');
            const tokenHash = hashTokenCadastro(codigo);
            try {
                await pool.query(
                    'INSERT INTO tokens_cadastro (token_hash, criado_por) VALUES ($1, $2)',
                    [tokenHash, req.usuarioId]
                );
                return res.status(201).json({ token: codigo, expiraEmHoras: 24 });
            } catch (error) {
                if (error.code !== '23505') throw error;
            }
        }
        res.status(503).json({ erro: 'Não foi possível gerar um token único. Tente novamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao gerar token de cadastro' });
    }
});

// Reset de senha
app.post('/api/auth/reset-password', verificarToken, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
    }
    try {
        const { rows: usuarios } = await pool.query('SELECT id, senha, cargo FROM usuarios WHERE id = $1', [req.usuarioId]);
        const tamanhoMinimo = usuarios[0]?.cargo === 'superadmin' ? 12 : 6;
        if (novaSenha.length < tamanhoMinimo) {
            return res.status(400).json({
                erro: `A nova senha deve ter pelo menos ${tamanhoMinimo} caracteres`
            });
        }
        if (usuarios.length === 0 || !(await verificarSenha(senhaAtual, usuarios[0].senha))) {
            return res.status(401).json({ erro: 'Senha atual incorreta' });
        }

        const senhaHash = await bcryptjs.hash(novaSenha, 10);
        await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [senhaHash, req.usuarioId]);

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
        const { rows: recursos } = await pool.query('SELECT * FROM recursos ORDER BY nome');

        res.json(recursos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao listar recursos' });
    }
});

app.get('/api/agenda', verificarToken, async (req, res) => {
    try {
        const podeVerDetalhes = cargosGerenciadores.includes(req.usuarioCargo);
        const { rows: reservas } = await pool.query(
            `SELECT r.id, r.usuario_id, r.recurso_id AS "recursoId",
                to_char(r.data_reserva, 'YYYY-MM-DD') AS data,
                to_char(r.horario_inicio, 'HH24:MI:SS') AS horario_inicio,
                to_char(r.horario_fim, 'HH24:MI:SS') AS horario_fim,
                CASE WHEN r.usuario_id = $1 OR $2::boolean THEN r.disciplina ELSE '' END AS disciplina,
                CASE WHEN r.usuario_id = $1 OR $2::boolean THEN r.turma ELSE '' END AS turma,
                CASE WHEN r.usuario_id = $1 OR $2::boolean THEN u.nome ELSE 'Reservado' END AS professor,
                r.status, rec.nome AS "recursoNome"
             FROM reservas r
             JOIN usuarios u ON r.usuario_id = u.id
             JOIN recursos rec ON r.recurso_id = rec.id
             ORDER BY r.data_reserva, r.horario_inicio`,
            [req.usuarioId, podeVerDetalhes]
        );
        res.json(reservas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao carregar agenda' });
    }
});

// Criar recurso
app.post('/api/recursos', verificarToken, async (req, res) => {
    const { nome, categoria, capacidade, descricao, status = 'disponivel' } = req.body;

    // Apenas coordenadores e admins podem criar
    if (!cargosGerenciadores.includes(req.usuarioCargo)) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }

    if (!nome || !categoria) {
        return res.status(400).json({ erro: 'Nome e categoria são obrigatórios' });
    }

    try {
        const { rows } = await pool.query(
            'INSERT INTO recursos (nome, categoria, capacidade, descricao, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [nome, categoria, capacidade || 0, descricao || '', status]
        );

        res.json({ sucesso: true, id: rows[0].id, mensagem: 'Recurso criado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao criar recurso' });
    }
});

// Atualizar recurso
app.put('/api/recursos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const { nome, categoria, capacidade, descricao, status } = req.body;

    if (!cargosGerenciadores.includes(req.usuarioCargo)) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }

    try {
        const { rowCount } = await pool.query(
            'UPDATE recursos SET nome = $1, categoria = $2, capacidade = $3, descricao = $4, status = $5 WHERE id = $6',
            [nome, categoria, capacidade, descricao, status, id]
        );
        if (!rowCount) return res.status(404).json({ erro: 'Recurso não encontrado' });

        res.json({ sucesso: true, mensagem: 'Recurso atualizado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao atualizar recurso' });
    }
});

// Deletar recurso
app.delete('/api/recursos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    if (!cargosGerenciadores.includes(req.usuarioCargo)) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }

    try {
        const { rowCount } = await pool.query('DELETE FROM recursos WHERE id = $1', [id]);
        if (!rowCount) return res.status(404).json({ erro: 'Recurso não encontrado' });

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
        const filtroUsuario = cargosGerenciadores.includes(req.usuarioCargo) ? '' : 'WHERE r.usuario_id = $1';
        const parametros = filtroUsuario ? [req.usuarioId] : [];
        const { rows: reservas } = await pool.query(
            `SELECT r.id, r.usuario_id, r.recurso_id AS "recursoId",
                    to_char(r.data_reserva, 'YYYY-MM-DD') AS data,
                    to_char(r.horario_inicio, 'HH24:MI:SS') AS horario_inicio,
                    to_char(r.horario_fim, 'HH24:MI:SS') AS horario_fim,
                    r.disciplina, r.turma, r.status, u.nome AS professor,
                    u.email AS "usuarioEmail", rec.nome AS "recursoNome"
             FROM reservas r
             JOIN usuarios u ON r.usuario_id = u.id
             JOIN recursos rec ON r.recurso_id = rec.id
             ${filtroUsuario}
             ORDER BY r.data_reserva, r.horario_inicio`
            , parametros
        );

        res.json(reservas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao listar reservas' });
    }
});

// Criar reserva
app.post('/api/reservas', verificarToken, async (req, res) => {
    const { recurso_id, data, aula, disciplina, turma } = req.body;
    const horario = AULAS[Number(aula)];

    if (!recurso_id || !data || !horario || !disciplina || !turma) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    try {
        const { rows: conflitos } = await pool.query(
            `SELECT id FROM reservas
             WHERE recurso_id = $1 AND data_reserva = $2 AND status <> 'cancelada'
               AND horario_inicio < $3 AND horario_fim > $4`,
            [recurso_id, data, horario[1], horario[0]]
        );

        if (conflitos.length > 0) {
            return res.status(400).json({ erro: 'Horário já reservado' });
        }

        const { rows } = await pool.query(
            'INSERT INTO reservas (usuario_id, recurso_id, data_reserva, horario_inicio, horario_fim, disciplina, turma, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [req.usuarioId, recurso_id, data, horario[0], horario[1], disciplina, turma, 'confirmada']
        );

        res.json({ sucesso: true, id: rows[0].id, mensagem: 'Reserva criada com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao criar reserva' });
    }
});

app.put('/api/reservas/:id', verificarToken, async (req, res) => {
    if (!cargosGerenciadores.includes(req.usuarioCargo)) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }

    const { recurso_id, data, aula, disciplina, turma } = req.body;
    const horario = AULAS[Number(aula)];
    if (!recurso_id || !data || !horario || !disciplina || !turma) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    try {
                const { rows: conflitos } = await pool.query(
            `SELECT id FROM reservas
                         WHERE recurso_id = $1 AND data_reserva = $2 AND id <> $3 AND status <> 'cancelada'
                             AND horario_inicio < $4 AND horario_fim > $5`,
            [recurso_id, data, req.params.id, horario[1], horario[0]]
        );
        if (conflitos.length) {
            return res.status(409).json({ erro: 'Horário já reservado' });
        }

        const { rowCount } = await pool.query(
            `UPDATE reservas SET recurso_id = $1, data_reserva = $2, horario_inicio = $3,
             horario_fim = $4, disciplina = $5, turma = $6 WHERE id = $7`,
            [recurso_id, data, horario[0], horario[1], disciplina, turma, req.params.id]
        );
        if (!rowCount) {
            return res.status(404).json({ erro: 'Reserva não encontrada' });
        }
        res.json({ sucesso: true, mensagem: 'Reserva atualizada com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao atualizar reserva' });
    }
});

// Cancelar reserva
app.delete('/api/reservas/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    try {
        const { rows: reservas } = await pool.query('SELECT usuario_id FROM reservas WHERE id = $1', [id]);

        if (reservas.length === 0) {
            return res.status(404).json({ erro: 'Reserva não encontrada' });
        }

        // Apenas o criador ou admin pode cancelar
        if (reservas[0].usuario_id !== req.usuarioId && !cargosGerenciadores.includes(req.usuarioCargo)) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        await pool.query("UPDATE reservas SET status = 'cancelada' WHERE id = $1", [id]);

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
        const { rows: relatorio } = await pool.query(`
            SELECT 
                rec.id,
                rec.nome,
                rec.categoria,
                COUNT(r.id) AS total_reservas,
                COUNT(r.id) FILTER (WHERE r.data_reserva >= CURRENT_DATE) AS reservas_futuras,
                COUNT(r.id) FILTER (WHERE r.data_reserva < CURRENT_DATE) AS reservas_passadas
            FROM recursos rec
            LEFT JOIN reservas r ON rec.id = r.recurso_id
            GROUP BY rec.id, rec.nome, rec.categoria
            ORDER BY total_reservas DESC
        `);

        res.json(relatorio);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
});

// ==================== INICIALIZAÇÃO ====================

if (require.main === module) app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Configure DATABASE_URL para conectar ao banco PostgreSQL');
});

module.exports = app;
