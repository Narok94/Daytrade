
import pg from 'pg';
const { Pool } = pg;

// Singleton pattern to reuse the connection pool
let pool: pg.Pool;

export function getPool() {
    if (!pool) {
        const connectionString = process.env.POSTGRES_URL;
        
        if (!connectionString) {
            throw new Error('POSTGRES_URL environment variable is not defined.');
        }

        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false, // Required for Neon
            },
            statement_timeout: 5000, // 5 seconds timeout for queries
            query_timeout: 5000,
            connectionTimeoutMillis: 5000, // 5 seconds timeout for establishing connection
            max: 5, // Keep it low for serverless
            idleTimeoutMillis: 1000, // Release connections quickly
        });

        console.log('Database pool initialized successfully.');
    }
    return pool;
}

/**
 * Execute a query with a 5-second timeout
 */
export async function query(text: string, params?: any[]) {
    console.log(`[DB QUERY START] ${text.substring(0, 50)}...`);
    const client = await getPool().connect();
    console.log(`[DB CLIENT ACQUIRED]`);
    try {
        await client.query('SET statement_timeout = 5000');
        const res = await client.query(text, params);
        console.log(`[DB QUERY END] SUCCESS`);
        return res;
    } catch (error: any) {
        console.error('[DB QUERY ERROR] ', error.message);
        throw error;
    } finally {
        client.release();
    }
}
