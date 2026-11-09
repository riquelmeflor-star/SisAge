const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const email = process.argv[2]?.trim().toLowerCase();
if (!connectionString || !email) {
    throw new Error('Uso: npm run db:promote-admin -- email@dominio.com, com DATABASE_URL definida.');
}

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });

pool.query(
    "UPDATE usuarios SET cargo = 'admin' WHERE email = $1 RETURNING email",
    [email]
)
    .then(({ rows }) => {
        if (!rows.length) {
            throw new Error('Usuário não encontrado. Cadastre a conta antes de promovê-la.');
        }
        console.log(`Acesso administrador concedido para ${rows[0].email}.`);
    })
    .catch((error) => {
        console.error('Falha ao promover administrador:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
