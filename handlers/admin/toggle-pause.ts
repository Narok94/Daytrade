import { query } from '../../services/db';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const auth = (req as any).auth;
        if (!auth || !auth.userId) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        }

        const adminId = auth.userId;
        const { targetUserId, isPaused } = req.body;

        if (!targetUserId) {
            return res.status(400).json({ error: 'Target User ID é obrigatório.' });
        }

        // Verify if requester is admin
        const { rows: adminCheck } = await query('SELECT is_admin FROM users WHERE id = $1', [adminId]);
        if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
        }

        await query('UPDATE users SET is_paused = $1 WHERE id = $2', [isPaused, targetUserId]);

        return res.status(200).json({ message: `Usuário ${isPaused ? 'pausado' : 'despausado'} com sucesso.` });
    } catch (error: any) {
        console.error('Admin Toggle Pause Error:', error);
        return res.status(500).json({ error: 'Erro ao alterar status do usuário', details: error.message });
    }
}
