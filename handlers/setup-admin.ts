import { query } from '../services/db.js';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    const username = 'henrique';
    const password = '[@Manu9860]';
    
    try {
        console.log("--- ODIN: Executando Rota de Setup Admin ---");

        // Garantir que a tabela existe (com as colunas necessárias)
        await query(`
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
        await query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
        `);

        // Gerar o hash da senha
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Inserir ou atualizar o usuário administrador
        const sql = `
            INSERT INTO users (username, password_hash, is_admin)
            VALUES ($1, $2, $3)
            ON CONFLICT (username) 
            DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                is_admin = TRUE,
                is_paused = FALSE
            RETURNING id, username;
        `;
        
        const hashAdmin = await bcrypt.hash('admin', salt);
        await query(sql, ['admin', hashAdmin, true]);

        const result = await query(sql, [username.toLowerCase(), hash, true]);
        
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
        const isConnError = err.message.toLowerCase().includes('connect') || 
                           err.message.toLowerCase().includes('connection') ||
                           err.message.toLowerCase().includes('pool');
        
        return res.status(500).json({ 
            status: "error",
            message: isConnError ? "Erro de Conexão com o Banco" : "Falha ao configurar administrador.",
            details: err.message 
        });
    }
}
