
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
            // statement_timeout: 5000, // 5 seconds timeout for queries
            connectionTimeoutMillis: 5000, // 5 seconds timeout for establishing connection
            max: 10, // Limit number of concurrent connections
            idleTimeoutMillis: 30000,
        });

        console.log('Database pool initialized successfully.');
    }
    return pool;
}

/**
 * Execute a query with a 5-second timeout
 */
export async function query(text: string, params?: any[]) {
    const client = await getPool().connect();
    try {
        // Set a statement timeout specifically for this query execution if needed
        // Or it can be set at the pool level
        await client.query('SET statement_timeout = 5000');
        const res = await client.query(text, params);
        return res;
    } catch (error: any) {
        console.error('Database Query Error:', {
            text,
            params,
            errorMessage: error.message,
            stack: error.stack
        });
        throw error;
    } finally {
        client.release();
    }
}
