
import pg from 'pg';
const { Pool } = pg;

// Singleton pattern to reuse the connection pool
let pool: pg.Pool;

export function getPool() {
    if (!pool) {
        // Usar ESTRITAMENTE a variável UNPOOLED (Conexão Direta) para evitar travas no pooler do Neon
        const connectionString = (process.env.DATABASE_URL_UNPOOLED || '').trim();
        
        if (!connectionString) {
            console.error('FALHA CRÍTICA: DATABASE_URL_UNPOOLED não definida no ambiente.');
            throw new Error('Database connection string (UNPOOLED) is missing.');
        }

        // Garantir sslmode=require
        let finalConnectionString = connectionString;
        if (!finalConnectionString.includes('sslmode=')) {
            const separator = finalConnectionString.includes('?') ? '&' : '?';
            finalConnectionString += `${separator}sslmode=require`;
        }

        console.log('--- Conexão Neon: USANDO ESTRITAMENTE DATABASE_URL_UNPOOLED (Direta) ---');
        pool = new Pool({
            connectionString: finalConnectionString,
            ssl: {
                rejectUnauthorized: false
            },
            max: 10,
            connectionTimeoutMillis: 3000, 
            idleTimeoutMillis: 10000,
            allowExitOnIdle: true,
            // @ts-ignore
            keepAlive: true
        });

        pool.on('error', (err) => {
            console.error('FALHA CRÍTICA NO POOL NEON:', err.message);
        });
    }
    return pool;
}

/**
 * Executa uma query de forma direta e simplificada
 */
export async function query(text: string, params?: any[]) {
    try {
        console.log(`[DB] Executando query: ${text.substring(0, 40)}...`);
        const res = await getPool().query(text, params);
        return res;
    } catch (error: any) {
        console.error('FALHA NA QUERY NEON:', error.message);
        throw error;
    }
}
