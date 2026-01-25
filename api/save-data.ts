
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
        const { brokerages, records, goals } = req.body as {
            brokerages: Brokerage[];
            records: DailyRecord[];
            goals: Goal[];
        };
        
        // --- BUG FIX: Add strict validation for userId ---
        const userIdStr = req.body.userId as string;
        if (!userIdStr) {
            return res.status(400).json({ error: 'User ID is required.' });
        }
        
        const userId = parseInt(userIdStr, 10);
        if (isNaN(userId)) {
            // This will catch if userIdStr is something invalid like a UUID
            return res.status(400).json({ error: `Invalid User ID format. Expected integer, got "${userIdStr}".` });
        }
        // --- END BUG FIX ---
        
        await client.query('BEGIN');

        // 1. Salva as configurações (JSONB) - Otimizado
        const settings_json = { brokerages, goals };
        await client.query(
            `INSERT INTO user_settings (user_id, settings_json) VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET settings_json = $2;`,
            [userId, JSON.stringify(settings_json)]
        );

        // 2. Limpa as operações antigas
        await client.query(`DELETE FROM operacoes_daytrade WHERE user_id = $1;`, [userId]);

        // 3. Monta o BATCH INSERT (MUITO mais rápido)
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
            // Constrói a query de múltiplos valores
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