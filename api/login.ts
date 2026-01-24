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
        const lowerUsername = username?.toLowerCase();

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
        }

        // Tenta buscar o usuário. Se a tabela não existir, cairá no catch.
        let result;
        try {
            result = await client.query('SELECT * FROM users WHERE username = $1', [lowerUsername]);
        } catch (dbError: any) {
            // Se o erro for "tabela não existe", tenta rodar o setup automaticamente
            if (dbError.message.includes('relation "users" does not exist')) {
                console.log('Tabela "users" não encontrada. Iniciando auto-setup...');
                await client.query(`
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `);
                // Tenta novamente após criar a tabela
                result = await client.query('SELECT * FROM users WHERE username = $1', [lowerUsername]);
            } else {
                throw dbError;
            }
        }

        const rows = result.rows;
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

        return res.status(200).json({ message: 'Login realizado com sucesso.', user: userData });
    } catch (error: any) {
        console.error('Login API Error:', error);
        return res.status(500).json({ 
            error: 'Erro Interno no Servidor', 
            details: error.message 
        });
    } finally {
        client.release();
    }
}
