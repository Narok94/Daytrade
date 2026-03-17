
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const client = await db.connect();
    try {
        const adminId = req.query.adminId as string;
        if (!adminId) {
            return res.status(400).json({ error: 'Admin ID é obrigatório.' });
        }

        // Verify if requester is admin
        const { rows: adminCheck } = await client.query('SELECT is_admin FROM users WHERE id = $1', [adminId]);
        if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
        }

        const { rows: users } = await client.query('SELECT id, username, is_admin, is_paused, created_at FROM users ORDER BY username ASC');
        
        const formattedUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            isAdmin: u.is_admin,
            isPaused: u.is_paused,
            createdAt: u.created_at
        }));

        return res.status(200).json({ users: formattedUsers });
    } catch (error: any) {
        console.error('Admin Get Users Error:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuários', details: error.message });
    } finally {
        client.release();
    }
}
