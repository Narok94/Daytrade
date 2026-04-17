
import pg from 'pg';
const { Pool } = pg;

// Singleton pattern to reuse the connection pool
let pool: pg.Pool;

export function getPool() {
    if (!pool) {
        // Usar exclusivamente a variável UNPOOLED para evitar travas no pooler do Neon
        let connectionString = (process.env.DATABASE_URL_UNPOOLED || '').trim();
        
        if (!connectionString) {
            // Fallback apenas para não quebrar o build, mas o erro será logado
            connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
            if (!connectionString) {
                console.error('FALHA CRÍTICA: DATABASE_URL_UNPOOLED não definida.');
                throw new Error('Database connection string (UNPOOLED) is missing.');
            }
        }

        // Adicionar sslmode=require se necessário
        if (!connectionString.includes('sslmode=')) {
            const separator = connectionString.includes('?') ? '&' : '?';
            connectionString += `${separator}sslmode=require`;
        }

        console.log('--- Conexão Neon: USANDO DATABASE_URL_UNPOOLED ---');
        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false
            },
            max: 10,
            connectionTimeoutMillis: 3000, // Timeout agressivo de 3 segundos para o handshake
            idleTimeoutMillis: 10000,
            allowExitOnIdle: true,
            // @ts-ignore - 'keepAlive' pode não estar em algumas versões de tipagem, mas o pg suporta
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
