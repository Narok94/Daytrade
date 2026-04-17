import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    const client = await db.connect();
    
    const username = 'henrique';
    const password = '[@Manu9860]';
    
    try {
        console.log("--- ODIN: Executando Rota de Setup Admin ---");

        // Garantir que a tabela existe (com as colunas necessárias)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                is_paused BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                last_login_at TIMESTAMPTZ
            );
        `);

        // Adicionar colunas caso a tabela já exista e não as tenha
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
        `);

        // Gerar o hash da senha
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Inserir ou atualizar o usuário administrador
        const query = `
            INSERT INTO users (username, password_hash, is_admin)
            VALUES ($1, $2, $3)
            ON CONFLICT (username) 
            DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                is_admin = TRUE,
                is_paused = FALSE
            RETURNING id, username;
        `;
        
        const result = await client.query(query, [username.toLowerCase(), hash, true]);
        
        return res.status(200).json({ 
            status: "success",
            message: "Administrador configurado com sucesso!",
            user: {
                id: result.rows[0].id,
                username: result.rows[0].username,
                role: "ADMINISTRADOR"
            }
        });
        
    } catch (err: any) {
        console.error("Erro na rota de setup admin:", err);
        return res.status(500).json({ 
            status: "error",
            message: "Falha ao configurar administrador.",
            details: err.message 
        });
    } finally {
        client.release();
    }
}
