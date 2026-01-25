
import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '@vercel/postgres';
import { Brokerage, DailyRecord, Goal } from '../../types';
import { randomUUID } from 'crypto';

async function ensureTablesAndMigrate(client: any, userId?: number) {
    // 1. CREATE TABLES (idempotent)
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

    // 2. CHECK & ADD ALL POTENTIALLY MISSING COLUMNS
    const { rows: columnsResult } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'operacoes_daytrade';
    `);
    const existingColumns = columnsResult.map((c: { column_name: string }) => c.column_name);

    if (!existingColumns.includes('user_id')) {
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN user_id INTEGER;`);
    }
    if (!existingColumns.includes('record_id')) {
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
    }
    if (!existingColumns.includes('brokerage_id')) {
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN brokerage_id UUID;`);
    }
    if (!existingColumns.includes('payout_percentage')) {
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN payout_percentage INTEGER;`);
    }
    
    // 3. POPULATE DATA FOR MIGRATED COLUMNS (if user context is available)
    if (userId) {
        await client.query(`UPDATE operacoes_daytrade SET user_id = $1 WHERE user_id IS NULL`, [userId]);
        await client.query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD') WHERE record_id IS NULL;`);
        await client.query(`UPDATE operacoes_daytrade SET payout_percentage = 80 WHERE payout_percentage IS NULL;`);
        const { rows: brokeragelessRows } = await client.query(
            `SELECT 1 FROM operacoes_daytrade WHERE user_id = $1 AND brokerage_id IS NULL LIMIT 1`,
            [userId]
        );
        if (brokeragelessRows.length > 0) {
            const { rows: settingsResult } = await client.query(
                `SELECT settings_json FROM user_settings WHERE user_id = $1;`,
                [userId]
            );
            const settings = settingsResult[0]?.settings_json || {};
            let brokerages: Brokerage[] = settings.brokerages || [];
            let brokerageIdToUse: string;
            if (brokerages.length > 0 && brokerages[0].id) {
                brokerageIdToUse = brokerages[0].id;
            } else {
                const defaultBrokerage: Brokerage = { id: randomUUID(), name: 'Gestão Principal', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' };
                brokerageIdToUse = defaultBrokerage.id;
                const goals = settings.goals || [];
                const newSettings = { brokerages: [defaultBrokerage], goals };
                await client.query(
                    `INSERT INTO user_settings (user_id, settings_json) VALUES ($1, $2)
                     ON CONFLICT (user_id) DO UPDATE SET settings_json = $2;`,
                    [userId, JSON.stringify(newSettings)]
                );
            }
            await client.query(
                `UPDATE operacoes_daytrade SET brokerage_id = $1 WHERE user_id = $2 AND brokerage_id IS NULL;`,
                [brokerageIdToUse, userId]
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
        
        // --- BUG FIX: Robust validation for userId to prevent DB errors ---
        const rawUserId = req.body.userId;
        if (rawUserId === null || rawUserId === undefined) {
            return res.status(400).json({ error: 'User ID (userId) é obrigatório no corpo da requisição.' });
        }

        let userId: number;
        if (typeof rawUserId === 'number') {
            userId = rawUserId;
        } else if (typeof rawUserId === 'string') {
            userId = parseInt(rawUserId, 10);
            if (isNaN(userId)) {
                return res.status(400).json({ error: `Formato de User ID inválido. Esperava-se um inteiro, mas recebeu a string: "${rawUserId}".` });
            }
        } else {
            return res.status(400).json({ error: `Tipo de User ID inválido. Esperava-se um número ou string, mas recebeu ${typeof rawUserId}.` });
        }

        if (!Number.isInteger(userId)) {
             return res.status(400).json({ error: `User ID deve ser um inteiro. Recebido: ${rawUserId}`});
        }
        // --- END BUG FIX ---
        
        await ensureTablesAndMigrate(client, userId);
        
        await client.query('BEGIN');

        const settings_json = { brokerages, goals };
        await client.query(
            `INSERT INTO user_settings (user_id, settings_json) VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET settings_json = $2;`,
            [userId, JSON.stringify(settings_json)]
        );

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
        return res.status(200).json({ message: 'Saved successfully.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Save Error:', error);
        return res.status(500).json({ error: (error as Error).message });
    } finally {
        client.release();
    }
}