
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { Brokerage } from '../../types';
import { randomUUID } from 'crypto';

async function ensureTablesAndMigrate(client: any, userId?: number) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            permissions JSONB DEFAULT '{"ai_access": true, "compound_access": true, "goals_access": true, "reports_access": true}',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
}


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
        const lowerUsername = username?.toLowerCase();

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
        }
        
        await ensureTablesAndMigrate(client);

        const result = await client.query('SELECT * FROM users WHERE LOWER(username) = $1', [lowerUsername]);
        const rows = result.rows;
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }

        const userData = {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin || false,
            permissions: user.permissions || { ai_access: true, compound_access: true, goals_access: true, reports_access: true }
        };

        return res.status(200).json({ message: 'Login realizado com sucesso.', user: userData });
    } catch (error: any) {
        console.error('Login API Error:', error);
        return res.status(500).json({ error: 'Erro Interno no Servidor', details: error.message });
    } finally {
        client.release();
    }
}
