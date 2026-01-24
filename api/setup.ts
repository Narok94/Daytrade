import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    const client = await db.connect();
    try {
        // 1. Tabela de Usuários
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 2. Tabela de Operações
        await client.query(`
            CREATE TABLE IF NOT EXISTS operacoes_daytrade (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                record_id VARCHAR(10) NOT NULL,
                brokerage_id UUID NOT NULL,
                tipo_operacao TEXT NOT NULL,
                valor_entrada DECIMAL(10, 2) NOT NULL,
                payout_percentage INTEGER NOT NULL,
                resultado DECIMAL(10, 2) NOT NULL,
                data_operacao TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 3. Tabela de Configurações
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                settings_json JSONB
            );
        `);

        // 4. Migração: Adiciona a coluna 'record_id' se ela não existir em uma tabela antiga.
        const { rows } = await client.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'operacoes_daytrade' AND column_name = 'record_id';
        `);

        if (rows.length === 0) {
            console.log("Applying migration: Adding 'record_id' to 'operacoes_daytrade' table.");
            await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
            // Popula a nova coluna com base na data da operação existente
            await client.query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD');`);
            // Aplica a restrição NOT NULL após a população
            await client.query(`ALTER TABLE operacoes_daytrade ALTER COLUMN record_id SET NOT NULL;`);
            console.log("Migration successful.");
        }


        return response.status(200).json({ message: 'Database tables created/verified successfully.' });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: (error as Error).message });
    } finally {
        client.release();
    }
}