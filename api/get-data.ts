import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Brokerage, DailyRecord, Goal, Trade } from '../../types';

async function ensureTables(client: any) {
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
        await ensureTables(client);

        const userId = req.query.userId as string;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required.' });
        }
        
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