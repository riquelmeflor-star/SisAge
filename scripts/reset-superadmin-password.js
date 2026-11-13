const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const senha = process.env.SUPERADMIN_PASSWORD;

if (!connectionString || !email || !senha) {
    throw new Error('Defina DATABASE_URL, SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD.');
}
if (senha.length < 12) {
    throw new Error('A senha do administrador principal deve ter ao menos 12 caracteres.');
}

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });

pool.query(
    `UPDATE usuarios SET senha = $1
     WHERE email = $2 AND cargo = 'superadmin'
     RETURNING email`,
    [bcryptjs.hashSync(senha, 12), email]
)
    .then(({ rows }) => {
        if (!rows.length) {
            throw new Error('Administrador principal não encontrado para esse email.');
        }
        console.log(`Senha redefinida para o administrador principal ${rows[0].email}.`);
    })
    .catch((error) => {
        console.error('Falha ao redefinir a senha:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
