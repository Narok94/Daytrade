
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Brokerage, DailyRecord, Goal, Trade } from '../types';
import { randomUUID } from 'crypto';

async function ensureTablesAndMigrate(client: any, userId?: number) {
    const { rows: tableCheck } = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'operacoes_daytrade';
    `);

    if (tableCheck.length > 0) {
        const userIdCol = tableCheck.find((c: any) => c.column_name === 'user_id');
        const brokerageIdCol = tableCheck.find((c: any) => c.column_name === 'brokerage_id');
        const idCol = tableCheck.find((c: any) => c.column_name === 'id');

        const needsNuke = 
            (userIdCol && userIdCol.data_type !== 'integer') || 
            (brokerageIdCol && brokerageIdCol.data_type !== 'uuid') ||
            (idCol && idCol.data_type !== 'uuid');

        if (needsNuke) {
            await client.query(`DROP TABLE IF EXISTS operacoes_daytrade CASCADE;`);
        }
    }

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
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const client = await db.connect();
    try {
        const rawUserId = req.query.userId as string;
        if (!rawUserId) {
            return res.status(400).json({ error: 'User ID é obrigatório.' });
        }
        
        const userId = Number(rawUserId);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ error: `ID de usuário inválido: "${rawUserId}".` });
        }
        
        await ensureTablesAndMigrate(client, userId);

        const { rows: settingsResult } = await client.query(
            `SELECT settings_json FROM user_settings WHERE user_id = $1;`,
            [userId]
        );
        const settings = settingsResult[0]?.settings_json || {};
        const brokerages: Brokerage[] = settings.brokerages || [];
        const goals: Goal[] = settings.goals || [];

        const { rows: operationsResult } = await client.query(
            `SELECT id, record_id, brokerage_id, tipo_operacao, valor_entrada, payout_percentage, resultado, data_operacao 
            FROM operacoes_daytrade WHERE user_id = $1 ORDER BY data_operacao ASC;`,
            [userId]
        );
        
        const dailyRecordsMap = new Map<string, DailyRecord>();
        const transactionRecords: any[] = [];

        for (const op of operationsResult) {
            const recordId = op.record_id;
            const brokerageId = op.brokerage_id;
            const compositeKey = `${recordId}-${brokerageId}`;

            if (op.tipo_operacao === 'win' || op.tipo_operacao === 'loss') {
                const trade: Trade = {
                    id: op.id,
                    result: op.tipo_operacao === 'win' ? 'win' : 'loss',
                    entryValue: parseFloat(op.valor_entrada),
                    payoutPercentage: op.payout_percentage,
                    timestamp: new Date(op.data_operacao).getTime(),
                };

                if (!dailyRecordsMap.has(compositeKey)) {
                    dailyRecordsMap.set(compositeKey, {
                        recordType: 'day',
                        id: recordId,
                        date: recordId,
                        brokerageId: brokerageId,
                        trades: [],
                        startBalanceUSD: 0, 
                        winCount: 0,
                        lossCount: 0,
                        netProfitUSD: 0,
                        endBalanceUSD: 0,
                    });
                }

                const record = dailyRecordsMap.get(compositeKey)!;
                record.trades.push(trade);
            } else if (op.tipo_operacao === 'deposit' || op.tipo_operacao === 'withdrawal') {
                transactionRecords.push({
                    recordType: op.tipo_operacao,
                    brokerageId: brokerageId,
                    id: op.id,
                    date: recordId,
                    displayDate: new Date(recordId + 'T12:00:00').toLocaleDateString('pt-BR'),
                    amountUSD: parseFloat(op.valor_entrada),
                    notes: '',
                    timestamp: new Date(op.data_operacao).getTime()
                });
            }
        }

        const allParsedRecords = [...Array.from(dailyRecordsMap.values()), ...transactionRecords];
        const finalRecords: any[] = [];

        // Recalibrate history for EACH brokerage independently
        for (const brokerage of brokerages) {
            const brokerageRecords = allParsedRecords
                .filter(r => r.brokerageId === brokerage.id)
                .sort((a, b) => {
                    const dateA = a.recordType === 'day' ? a.id : a.date;
                    const dateB = b.recordType === 'day' ? b.id : b.date;
                    if (dateA !== dateB) return dateA.localeCompare(dateB);
                    return (a.timestamp || 0) - (b.timestamp || 0);
                });

            let previousDayEndBalance = brokerage.initialBalance || 0;
            for (const record of brokerageRecords) {
                if (record.recordType === 'day') {
                    record.startBalanceUSD = previousDayEndBalance;
                    record.winCount = record.trades.filter((t: any) => t.result === 'win').length;
                    record.lossCount = record.trades.filter((t: any) => t.result === 'loss').length;
                    record.netProfitUSD = record.trades.reduce((acc: number, t: any) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
                    record.endBalanceUSD = record.startBalanceUSD + record.netProfitUSD;
                    previousDayEndBalance = record.endBalanceUSD;
                } else {
                    // Transaction
                    const amount = record.recordType === 'deposit' ? record.amountUSD : -record.amountUSD;
                    previousDayEndBalance += amount;
                    record.runningBalanceUSD = previousDayEndBalance;
                }
                finalRecords.push(record);
            }
        }

        return res.status(200).json({ brokerages, records: finalRecords, goals });
    } catch (error) {
        console.error('Error in get-data:', error);
        return res.status(500).json({ error: (error as Error).message });
    } finally {
        client.release();
    }
}
