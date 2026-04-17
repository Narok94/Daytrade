import { query } from '../../services/db';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const auth = (req as any).auth;
        if (!auth || !auth.userId) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        }

        const adminId = auth.userId;

        // Verify if requester is admin
        const { rows: adminCheck } = await query('SELECT is_admin FROM users WHERE id = $1', [adminId]);
        if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
        }

        const { rows: users } = await query('SELECT id, username, is_admin, is_paused, created_at, last_login_at FROM users ORDER BY username ASC');
        
        const formattedUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            isAdmin: u.is_admin,
            isPaused: u.is_paused,
            createdAt: u.created_at,
            lastLoginAt: u.last_login_at
        }));

        return res.status(200).json({ users: formattedUsers });
    } catch (error: any) {
        console.error('Admin Get Users Error:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuários', details: error.message });
    }
}
