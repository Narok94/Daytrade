
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const client = await db.connect();
    try {
        const { adminId, targetUserId, is_admin, permissions } = req.body;

        const { rows: admins } = await client.query('SELECT is_admin FROM users WHERE id = $1', [adminId]);
        if (!admins[0]?.is_admin) return res.status(403).json({ error: 'Acesso negado.' });

        await client.query(
            'UPDATE users SET is_admin = $1, permissions = $2 WHERE id = $3',
            [is_admin, JSON.stringify(permissions), targetUserId]
        );

        return res.status(200).json({ message: 'Usuário atualizado.' });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
}
