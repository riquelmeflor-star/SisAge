const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const nome = process.env.SUPERADMIN_NAME?.trim();
const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const senha = process.env.SUPERADMIN_PASSWORD;

if (!connectionString || !nome || !email || !senha) {
    throw new Error('Defina DATABASE_URL, SUPERADMIN_NAME, SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD.');
}
if (nome.length > 100 || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 12) {
    throw new Error('Informe nome e email válidos; a senha do administrador principal deve ter ao menos 12 caracteres.');
}

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });

pool.query(
    `INSERT INTO usuarios (nome, email, senha, cargo)
     VALUES ($1, $2, $3, 'superadmin')
     ON CONFLICT (email) DO UPDATE
     SET nome = EXCLUDED.nome, senha = EXCLUDED.senha, cargo = 'superadmin'
     RETURNING email`,
    [nome, email, bcryptjs.hashSync(senha, 12)]
)
    .then(({ rows }) => console.log(`Administrador principal configurado: ${rows[0].email}.`))
    .catch((error) => {
        console.error('Falha ao configurar administrador principal:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
