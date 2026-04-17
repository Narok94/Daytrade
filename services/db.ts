
import pg from 'pg';
const { Pool } = pg;

// Singleton pattern to reuse the connection pool
let pool: pg.Pool;

export function getPool() {
    if (!pool) {
        // Garantir que a DATABASE_URL seja lida como string pura
        const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        const connectionString = rawUrl ? String(rawUrl).trim() : '';
        
        if (!connectionString) {
            console.error('FALHA CRÍTICA: DATABASE_URL não definida.');
            throw new Error('Database connection string is missing.');
        }

        console.log('--- Conectando ao Banco Neon (SSL: rejectUnauthorized: false) ---');
        pool = new Pool({
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false
            },
            max: 10,
            connectionTimeoutMillis: 10000, // Aumentar um pouco para o handshake
        });

        pool.on('error', (err) => {
            console.error('ERRO NO POOL NEON:', err);
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
