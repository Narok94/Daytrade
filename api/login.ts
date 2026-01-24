import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    const client = await db.connect();
    try {
        const { username, password } = req.body;
        const lowerUsername = username.toLowerCase();

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        // Find user
        const { rows } = await client.query('SELECT * FROM users WHERE username = $1', [lowerUsername]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }
        
        const user = rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }

        const userData = {
            id: user.id,
            username: user.username,
        };

        return res.status(200).json({ message: 'Login successful.', user: userData });
    } catch (error) {
        console.error('Login API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
}
