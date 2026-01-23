import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '@vercel/postgres';
import { Brokerage, DailyRecord, Goal } from '../../types';

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
