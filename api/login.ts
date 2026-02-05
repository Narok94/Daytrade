
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const client = await db.connect();
    try {
        const { username, password } = req.body;
        const lowerUsername = username?.toLowerCase();

        const result = await client.query('SELECT * FROM users WHERE LOWER(username) = $1', [lowerUsername]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas.' });
        
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Credenciais inválidas.' });

        const userData = {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin || false,
            permissions: user.permissions || { ai_access: true, compound_access: true, goals_access: true, reports_access: true }
        };

        return res.status(200).json({ user: userData });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
}
