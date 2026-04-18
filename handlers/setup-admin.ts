import { query } from '../services/db.js';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    try {
        console.log("--- ODIN: Executando Setup Admin SIMPLIFICADO ---");

        // 1. Criar tabela básica se não existir
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

        // 2. Inserir 'admin' com senha 'admin' (texto puro para teste de conexão)
        console.log("Inserindo usuário admin...");
        await query(`
            INSERT INTO users (username, password_hash, is_admin)
            VALUES ('admin', 'admin', TRUE)
            ON CONFLICT (username) DO UPDATE SET password_hash = 'admin';
        `);

        console.log("Setup admin concluído!");
        return res.status(200).json({ 
            status: "success",
            message: "Setup concluído com sucesso! Tente logar com admin/admin" 
        });
        
    } catch (err: any) {
        console.error("ERRO NO SETUP ADMIN:", err.message);
        return res.status(500).json({ 
            status: "error",
            message: "Falha de proteção: " + err.message
        });
    }
}
