
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../utils/auth';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const client = await db.connect();
    try {
        const admin = verifyAdmin(req);
        if (!admin) {
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
