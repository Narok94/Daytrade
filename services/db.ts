import pg from 'pg';
const { Client } = pg;

/**
 * Cria e configura um novo cliente Postgres
 */
async function createClient() {
    // Usar ESTRITAMENTE a variável UNPOOLED (Conexão Direta)
    const connectionString = (process.env.DATABASE_URL_UNPOOLED || '').trim();
    
    if (!connectionString) {
        throw new Error('DATABASE_URL_UNPOOLED is missing.');
    }

    // Garantir sslmode=require
    let finalConnectionString = connectionString;
    if (!finalConnectionString.includes('sslmode=')) {
        const separator = finalConnectionString.includes('?') ? '&' : '?';
        finalConnectionString += `${separator}sslmode=require`;
    }

    const client = new Client({
        connectionString: finalConnectionString,
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000 // Timeout de 5 segundos conforme solicitado
    });

    return client;
}

/**
 * Executa uma query usando um Cliente direto (Conexão e Desconexão por requisição para evitar travamentos)
 */
export async function query(text: string, params?: any[]) {
    let client;
    try {
        console.log(`[DB-CLIENT] Conectando para query: ${text.substring(0, 40)}...`);
        client = await createClient();
        
        // Timer de conexão global
        await client.connect();
        
        console.log(`[DB-CLIENT] Executando query...`);
        const res = await client.query(text, params);
        
        return res;
    } catch (error: any) {
        console.error('--- ERRO DETALHADO NO BANCO (CLIENT) ---');
        console.error('Mensagem:', error.message);
        console.error('Código:', error.code);
        console.error('Query:', text);
        console.error('---------------------------------------');
        throw error;
    } finally {
        if (client) {
            try {
                await client.end();
            } catch (e) {
                console.error('Erro ao fechar cliente:', (e as any).message);
            }
        }
    }
}

/**
 * Fallback para o Pool se algum handler ainda chamar getPool (MUDANDO PARA CLIENT EMULATOR)
 */
export function getPool() {
    return {
        query: (text: string, params?: any[]) => query(text, params)
    } as any;
}
