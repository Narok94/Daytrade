import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Brokerage, DailyRecord, Goal, Trade } from '../../types';
import { randomUUID } from 'crypto';

async function ensureTablesAndMigrate(client: any, userId?: number) {
    // CREATE TABLE statements...
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

    // --- MIGRATION CHECKS ---
    const { rows: columns } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'operacoes_daytrade';
    `);
    const existingColumns = columns.map((c: { column_name: string }) => c.column_name);

    // Migration for: record_id
    if (!existingColumns.includes('record_id')) {
        console.log("Applying migration: Adding 'record_id' column.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
        await client.query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD');`);
        await client.query(`ALTER TABLE operacoes_daytrade ALTER COLUMN record_id SET NOT NULL;`);
        console.log("Migration for 'record_id' successful.");
    }

    // Migration for: brokerage_id
    if (!existingColumns.includes('brokerage_id')) {
        console.log("Applying migration: Adding 'brokerage_id' column.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN brokerage_id UUID;`);
        console.log("Migration for 'brokerage_id' column addition successful.");
    }
    
    // Data Population Step (only runs if userId is provided)
    if (userId) {
        const { rows: rowsToMigrate } = await client.query(
            `SELECT 1 FROM operacoes_daytrade WHERE user_id = $1 AND brokerage_id IS NULL LIMIT 1`,
            [userId]
        );
        
        if (rowsToMigrate.length > 0) {
            console.log(`Populating 'brokerage_id' for user ${userId}.`);
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
                console.log(`Created and saved default brokerage for user ${userId}.`);
            }

            await client.query(
                `UPDATE operacoes_daytrade SET brokerage_id = $1 WHERE user_id = $2 AND brokerage_id IS NULL;`,
                [brokerageIdToUse, userId]
            );
            console.log(`Successfully populated 'brokerage_id' for user ${userId}.`);
        }
    }
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const client = await db.connect();
    try {
        const userId = req.query.userId as string;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required.' });
        }
        
        await ensureTablesAndMigrate(client, parseInt(userId, 10));

        // 1. Fetch settings (Brokerages and Goals) from the JSON blob
        const { rows: settingsResult } = await client.query(
            `SELECT settings_json FROM user_settings WHERE user_id = $1;`,
            [userId]
        );
        const settings = settingsResult[0]?.settings_json || {};
        const brokerages: Brokerage[] = settings.brokerages || [];
        const goals: Goal[] = settings.goals || [];

        // 2. Fetch all trades for the user from the flat operations table
        const { rows: operationsResult } = await client.query(
            `SELECT id, record_id, brokerage_id, tipo_operacao, valor_entrada, payout_percentage, resultado, data_operacao 
            FROM operacoes_daytrade WHERE user_id = $1 ORDER BY data_operacao ASC;`,
            [userId]
        );
        
        // 3. Reconstruct the DailyRecord structure from the flat list of trades
        const recordsMap = new Map<string, DailyRecord>();

        for (const op of operationsResult) {
            const trade: Trade = {
                id: op.id,
                result: op.tipo_operacao === 'win' ? 'win' : 'loss',
                entryValue: parseFloat(op.valor_entrada),
                payoutPercentage: op.payout_percentage,
                timestamp: new Date(op.data_operacao).getTime(),
            };

            const recordId = op.record_id; // YYYY-MM-DD
            if (!recordsMap.has(recordId)) {
                // Initialize a new DailyRecord if it's the first trade of the day
                recordsMap.set(recordId, {
                    recordType: 'day',
                    id: recordId,
                    date: recordId,
                    brokerageId: op.brokerage_id,
                    trades: [],
                    // These will be calculated after all trades are grouped
                    startBalanceUSD: 0, 
                    winCount: 0,
                    lossCount: 0,
                    netProfitUSD: 0,
                    endBalanceUSD: 0,
                });
            }

            const record = recordsMap.get(recordId)!;
            record.trades.push(trade);
        }

        const records = Array.from(recordsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // 4. Recalculate balances and stats for each day
        let previousDayEndBalance = brokerages[0]?.initialBalance || 0;
        for (const record of records) {
            record.startBalanceUSD = previousDayEndBalance;
            record.winCount = record.trades.filter(t => t.result === 'win').length;
            record.lossCount = record.trades.filter(t => t.result === 'loss').length;
            record.netProfitUSD = record.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
            record.endBalanceUSD = record.startBalanceUSD + record.netProfitUSD;
            previousDayEndBalance = record.endBalanceUSD;
        }

        return res.status(200).json({ brokerages, records, goals });
    } catch (error) {
        console.error('Error in get-data:', error);
        return res.status(500).json({ error: (error as Error).message });
    } finally {
        client.release();
    }
}