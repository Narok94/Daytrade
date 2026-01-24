import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '@vercel/postgres';
import { Brokerage, DailyRecord, Goal } from '../../types';

async function ensureTablesAndMigrate(client: any) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
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
    await client.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            settings_json JSONB
        );
    `);

    // Migração: Adiciona a coluna 'record_id' se ela não existir em uma tabela antiga.
    const { rows } = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operacoes_daytrade' AND column_name = 'record_id';
    `);

    if (rows.length === 0) {
        console.log("Applying migration during save: Adding 'record_id' to 'operacoes_daytrade' table.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
        await client.query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD');`);
        await client.query(`ALTER TABLE operacoes_daytrade ALTER COLUMN record_id SET NOT NULL;`);
        console.log("Save-data migration successful.");
    }
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const client = await db.connect();

    try {
        // Garante que a estrutura do DB esteja correta antes de tentar salvar
        await ensureTablesAndMigrate(client);
        
        const { userId, brokerages, records, goals } = req.body as {
            userId: number;
            brokerages: Brokerage[];
            records: DailyRecord[];
            goals: Goal[];
        };

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required.' });
        }
        
        await client.query('BEGIN');

        // 1. Clear old data for the user
        await client.query(`DELETE FROM user_settings WHERE user_id = $1;`, [userId]);
        await client.query(`DELETE FROM operacoes_daytrade WHERE user_id = $1;`, [userId]);

        // 2. Insert new settings object
        if (brokerages || goals) {
            const settings_json = { brokerages, goals };
            await client.query(
                `INSERT INTO user_settings (user_id, settings_json) VALUES ($1, $2);`,
                [userId, JSON.stringify(settings_json)]
            );
        }

        // 3. Flatten records and insert trades into operacoes_daytrade
        if (records) {
            for (const r of records.filter(rec => rec.recordType === 'day')) {
                for (const t of r.trades) {
                    const resultado = t.result === 'win' 
                        ? t.entryValue * (t.payoutPercentage / 100) 
                        : -t.entryValue;

                    await client.query(
                        `INSERT INTO operacoes_daytrade (id, user_id, record_id, brokerage_id, tipo_operacao, valor_entrada, payout_percentage, resultado, data_operacao)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
                        [
                            t.id, 
                            userId, 
                            r.id, // record_id (YYYY-MM-DD)
                            r.brokerageId,
                            t.result, // tipo_operacao
                            t.entryValue, // valor_entrada
                            t.payoutPercentage,
                            resultado, // resultado
                            new Date(t.timestamp || Date.now()) // data_operacao
                        ]
                    );
                }
            }
        }
        
        await client.query('COMMIT');
        
        return res.status(200).json({ message: 'Data saved successfully.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in save-data:', error);
        return res.status(500).json({ error: (error as Error).message });
    } finally {
        client.release();
    }
}