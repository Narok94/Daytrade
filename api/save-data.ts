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
        console.log("Applying migration: Adding 'user_id' column.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN user_id INTEGER;`);
    }
    if (!existingColumns.includes('record_id')) {
        console.log("Applying migration: Adding 'record_id' column.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
    }
    if (!existingColumns.includes('brokerage_id')) {
        console.log("Applying migration: Adding 'brokerage_id' column.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN brokerage_id UUID;`);
    }
    if (!existingColumns.includes('payout_percentage')) {
        console.log("Applying migration: Adding 'payout_percentage' column.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN payout_percentage INTEGER;`);
    }
    
    // 3. POPULATE DATA FOR MIGRATED COLUMNS (if user context is available)
    if (userId) {
        // Populate user_id for any orphaned records
        await client.query(`UPDATE operacoes_daytrade SET user_id = $1 WHERE user_id IS NULL`, [userId]);

        // Populate record_id for any records missing it
        await client.query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD') WHERE record_id IS NULL;`);
        
        // Populate payout_percentage with a default value if missing
        await client.query(`UPDATE operacoes_daytrade SET payout_percentage = 80 WHERE payout_percentage IS NULL;`);

        // Populate brokerage_id for records belonging to this user that are missing it
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
        const { userId, brokerages, records, goals } = req.body as {
            userId: number;
            brokerages: Brokerage[];
            records: DailyRecord[];
            goals: Goal[];
        };
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required.' });
        }
        
        // Garante que a estrutura do DB esteja correta antes de tentar salvar
        await ensureTablesAndMigrate(client, userId);
        
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