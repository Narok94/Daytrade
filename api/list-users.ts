
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
        const { rows } = await client.query(
            `SELECT id, username, created_at FROM users ORDER BY created_at DESC;`
        );
        return res.status(200).json({ users: rows });
    } catch (error: any) {
        console.error('List Users Error:', error);
        return res.status(500).json({ 
            error: 'Erro ao listar usuários', 
            details: error.message 
        });
    } finally {
        client.release();
    }
}
