import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    const client = await db.connect();
    try {
        // 1. Tabela de Usuários (essencial para o login)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 2. Tabela de Operações (baseada no seu schema)
        await client.query(`
            CREATE TABLE IF NOT EXISTS operacoes_daytrade (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                record_id VARCHAR(10) NOT NULL, -- YYYY-MM-DD
                brokerage_id UUID NOT NULL,
                tipo_operacao TEXT NOT NULL, -- 'win' or 'loss'
                valor_entrada DECIMAL(10, 2) NOT NULL,
                payout_percentage INTEGER NOT NULL,
                resultado DECIMAL(10, 2) NOT NULL,
                data_operacao TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 3. Tabela para Configurações do Usuário (salva gestões e metas)
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                settings_json JSONB
            );
        `);

        return response.status(200).json({ message: 'Database tables created/verified successfully.' });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: (error as Error).message });
    } finally {
        client.release();
    }
}
