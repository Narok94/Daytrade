
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '@vercel/postgres';
import { Brokerage, DailyRecord, Goal } from '../../types';
import { randomUUID } from 'crypto';

async function ensureTablesAndMigrate(client: any, userId?: number) {
    // 1. Check Schema Integrity for 'operacoes_daytrade'
    const { rows: tableCheck } = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'operacoes_daytrade';
    `);

    if (tableCheck.length > 0) {
        const userIdCol = tableCheck.find((c: any) => c.column_name === 'user_id');
        const brokerageIdCol = tableCheck.find((c: any) => c.column_name === 'brokerage_id');
        const idCol = tableCheck.find((c: any) => c.column_name === 'id');

        // Critical Check: If column types are wrong, we must nuke and recreate
        // This solves the "invalid input syntax for type integer" if a UUID was previously stored in an integer col or vice versa
        const needsNuke = 
            (userIdCol && userIdCol.data_type !== 'integer') || 
            (brokerageIdCol && brokerageIdCol.data_type !== 'uuid') ||
            (idCol && idCol.data_type !== 'uuid');

        if (needsNuke) {
            console.warn("Schema mismatch detected. Nuking 'operacoes_daytrade' for reconstruction.");
            await client.query(`DROP TABLE IF EXISTS operacoes_daytrade CASCADE;`);
        }
    }

    // 2. CREATE TABLES (idempotent)
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    
    // Ensure users.id is indeed SERIAL/INTEGER
    const { rows: userTableCheck } = await client.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id';
    `);
    if (userTableCheck.length > 0 && userTableCheck[0].data_type !== 'integer') {
         await client.query(`DROP TABLE IF EXISTS users CASCADE;`);
         await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
         `);
    }

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

    // 3. POPULATE DATA FOR MIGRATED COLUMNS (if user context is available)
    if (userId) {
        // Double check settings exist
        const { rows: settingsExist } = await client.query(`SELECT 1 FROM user_settings WHERE user_id = $1`, [userId]);
        if (settingsExist.length === 0) {
             const defaultBrokerage: Brokerage = { id: randomUUID(), name: 'Gestão Principal', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' };
             const initialSettings = { brokerages: [defaultBrokerage], goals: [] };
             await client.query(
                `INSERT INTO user_settings (user_id, settings_json) VALUES ($1, $2)
                 ON CONFLICT (user_id) DO UPDATE SET settings_json = $2;`,
                [userId, JSON.stringify(initialSettings)]
            );
        }
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
        const { brokerages, records, goals } = req.body as {
            brokerages: Brokerage[];
            records: DailyRecord[];
            goals: Goal[];
        };
        
        const rawUserId = req.body.userId;
        let userId: number;

        if (rawUserId === null || rawUserId === undefined) {
            return res.status(400).json({ error: 'User ID (userId) é obrigatório.' });
        }

        // Validate userId is strictly an integer
        if (typeof rawUserId === 'number' && Number.isInteger(rawUserId)) {
            userId = rawUserId;
        } else if (typeof rawUserId === 'string') {
            const parsedId = parseInt(rawUserId, 10);
            if (!isNaN(parsedId) && String(parsedId) === rawUserId) {
                userId = parsedId;
            } else {
                return res.status(400).json({ error: `ID de usuário inválido. Esperava um número inteiro, recebeu: "${rawUserId}".` });
            }
        } else {
            return res.status(400).json({ error: `Tipo de ID inválido: ${typeof rawUserId}` });
        }
        
        await ensureTablesAndMigrate(client, userId);
        
        await client.query('BEGIN');

        const settings_json = { brokerages, goals };
        await client.query(
            `INSERT INTO user_settings (user_id, settings_json) VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET settings_json = $2;`,
            [userId, JSON.stringify(settings_json)]
        );

        // Delete previous records for this specific user
        await client.query(`DELETE FROM operacoes_daytrade WHERE user_id = $1;`, [userId]);

        const allTrades = records
            .filter(r => r.recordType === 'day' && r.trades && r.trades.length > 0)
            .flatMap(r => r.trades.map(t => ({
                id: t.id,
                record_id: r.id,
                brokerage_id: r.brokerageId,
                tipo: t.result,
                entrada: parseFloat(String(t.entryValue)) || 0,
                payout: parseInt(String(t.payoutPercentage)) || 0,
                resultado: t.result === 'win' ? (parseFloat(String(t.entryValue)) * (parseInt(String(t.payoutPercentage)) / 100)) : -parseFloat(String(t.entryValue)),
                data: new Date(t.timestamp || Date.now()).toISOString()
            })));

        if (allTrades.length > 0) {
            const values: any[] = [];
            const placeholders = allTrades.map((t, i) => {
                const offset = i * 9;
                values.push(t.id, userId, t.record_id, t.brokerage_id, t.tipo, t.entrada, t.payout, t.resultado, t.data);
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
            }).join(',');

            await client.query(
                `INSERT INTO operacoes_daytrade (id, user_id, record_id, brokerage_id, tipo_operacao, valor_entrada, payout_percentage, resultado, data_operacao)
                 VALUES ${placeholders};`,
                values
            );
        }
        
        await client.query('COMMIT');
        return res.status(200).json({ message: 'Dados salvos com sucesso.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Save Error:', error);
        return res.status(500).json({ error: (error as Error).message });
    } finally {
        client.release();
    }
}
