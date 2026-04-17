import { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from '../services/db.js';
import { Brokerage, AppRecord, Goal } from '../types';
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

    // 2. Ensure brokerage_id column exists and is UUID
    const { rows: columnsResult } = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'operacoes_daytrade' AND column_name = 'brokerage_id';
    `);
    if (columnsResult.length === 0) {
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN brokerage_id UUID;`);
    } else if (columnsResult[0].data_type !== 'uuid') {
        await client.query(`ALTER TABLE operacoes_daytrade ALTER COLUMN brokerage_id TYPE UUID USING brokerage_id::uuid;`);
    }

    if (userId) {
        const { rows: settingsExist } = await client.query(`SELECT 1 FROM user_settings WHERE user_id = $1`, [userId]);
        if (settingsExist.length === 0) {
             const defaultBrokerage: Brokerage = { id: randomUUID(), name: 'Gestão Principal', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD', dailyGoalMode: 'percentage', dailyGoalValue: 3 };
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

    const client = await getPool().connect();

    try {
        const { brokerages, records, goals } = req.body as {
            brokerages: Brokerage[];
            records: AppRecord[];
            goals: Goal[];
        };
        
        // userId is now provided by the authenticate middleware
        const auth = (req as any).auth;
        if (!auth || !auth.userId) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        }

        const userId = Number(auth.userId);
        
        await ensureTablesAndMigrate(client, userId);
        
        await client.query('BEGIN');
        await client.query('SET statement_timeout = 5000');

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
            .flatMap((r: any) => r.trades.map((t: any) => ({
                id: t.id,
                record_id: r.id,
                brokerage_id: r.brokerageId || brokerages[0]?.id,
                tipo: t.result,
                entrada: parseFloat(String(t.entryValue)) || 0,
                payout: parseInt(String(t.payoutPercentage)) || 0,
                resultado: t.result === 'win' ? (parseFloat(String(t.entryValue)) * (parseInt(String(t.payoutPercentage)) / 100)) : -parseFloat(String(t.entryValue)),
                data: new Date(t.timestamp || Date.now()).toISOString()
            })));

        const allTransactions = records
            .filter(r => (r.recordType as string) === 'deposit' || (r.recordType as string) === 'withdrawal')
            .map((r: any) => ({
                id: r.id,
                record_id: r.date,
                brokerage_id: r.brokerageId || brokerages[0]?.id,
                tipo: r.recordType,
                entrada: parseFloat(String(r.amountUSD)) || 0,
                payout: 0,
                resultado: (r.recordType as string) === 'deposit' ? parseFloat(String(r.amountUSD)) : -parseFloat(String(r.amountUSD)),
                data: new Date(r.timestamp || Date.now()).toISOString()
            }));

        const allEntries = [...allTrades, ...allTransactions];

        console.log(`Saving ${allEntries.length} entries (${allTrades.length} trades, ${allTransactions.length} transactions) for user ${userId}`);

        if (allEntries.length > 0) {
            const values: any[] = [];
            const placeholders = allEntries.map((t, i) => {
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

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Save Error:', error);
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
}
