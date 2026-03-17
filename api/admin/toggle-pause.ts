
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const client = await db.connect();
    try {
        const { adminId, targetUserId, isPaused } = req.body;

        if (!adminId || !targetUserId) {
            return res.status(400).json({ error: 'Admin ID e Target User ID são obrigatórios.' });
        }

        // Verify if requester is admin
        const { rows: adminCheck } = await client.query('SELECT is_admin FROM users WHERE id = $1', [adminId]);
        if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
        }

        await client.query('UPDATE users SET is_paused = $1 WHERE id = $2', [isPaused, targetUserId]);

        return res.status(200).json({ message: `Usuário ${isPaused ? 'pausado' : 'despausado'} com sucesso.` });
    } catch (error: any) {
        console.error('Admin Toggle Pause Error:', error);
        return res.status(500).json({ error: 'Erro ao alterar status do usuário', details: error.message });
    } finally {
        client.release();
    }
}
