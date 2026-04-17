
import pg from 'pg';
const { Pool } = pg;

// Singleton pattern to reuse the connection pool
let pool: pg.Pool;

export function getPool() {
    if (!pool) {
        // Neon standard is DATABASE_URL, Vercel standard is often POSTGRES_URL
        const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        
        if (!connectionString) {
            console.error('FALHA CRÍTICA: DATABASE_URL ou POSTGRES_URL não definida.');
            throw new Error('Database connection string is not defined.');
        }

        console.log('Iniciando Pool de conexões com o banco...');
        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false, // Required for Neon
            },
            statement_timeout: 5000, 
            query_timeout: 5000,
            connectionTimeoutMillis: 5000, 
            max: 5, 
            idleTimeoutMillis: 1000, 
        });

        pool.on('error', (err) => {
            console.error('FALHA DE CONEXÃO NEON (Pool Error):', err);
        });

        console.log('Pool do banco configurado.');
    }
    return pool;
}

/**
 * Execute a query with a 5-second timeout
 */
export async function query(text: string, params?: any[]) {
    console.log(`[DB QUERY START] ${text.substring(0, 50)}...`);
    
    let client;
    try {
        // Timeout protection for the connection attempt itself
        client = await getPool().connect();
        console.log(`[DB CLIENT ACQUIRED]`);
        
        await client.query('SET statement_timeout = 5000');
        const res = await client.query(text, params);
        console.log(`[DB QUERY END] SUCCESS`);
        return res;
    } catch (error: any) {
        console.error('FALHA DE CONEXÃO NEON:', error.message);
        throw error;
    } finally {
        if (client) client.release();
    }
}
