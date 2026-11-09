const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
if (!connectionString) {
    throw new Error('Defina DATABASE_URL antes de aplicar o schema.');
}

const schemaPath = path.join(__dirname, '..', 'Agendamentos', 'sql', 'sql.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });

pool.query(schema)
    .then(() => console.log('Schema PostgreSQL aplicado com sucesso.'))
    .catch((error) => {
        console.error('Falha ao aplicar schema PostgreSQL:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
