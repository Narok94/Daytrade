import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

async function ensureTablesAndMigrate(client: any) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    await client.query(`
        CREATE TABLE IF NOT EXISTS operacoes_daytrade (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            record_id VARCHAR(10) NOT NULL,
            brokerage_id UUID NOT NULL,
            tipo_operacao TEXT NOT NULL,
            valor_entrada DECIMAL(10, 2) NOT NULL,
            payout_percentage INTEGER NOT NULL,
            resultado DECIMAL(10, 2) NOT NULL,
            data_operacao TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    await client.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            settings_json JSONB
        );
    `);

    // Migração: Adiciona a coluna 'record_id' se ela não existir em uma tabela antiga.
    const { rows } = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'operacoes_daytrade' AND column_name = 'record_id';
    `);

    if (rows.length === 0) {
        console.log("Applying migration: Adding 'record_id' to 'operacoes_daytrade' table.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
        await client.query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD');`);
        await client.query(`ALTER TABLE operacoes_daytrade ALTER COLUMN record_id SET NOT NULL;`);
        console.log("Migration successful.");
    }
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
        if (password.length < 4) {
            return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
        }

        // Garante que as tabelas existam e migra se necessário
        await ensureTablesAndMigrate(client);

        // Check if user already exists
        const { rows: existingUsers } = await client.query('SELECT * FROM users WHERE username = $1', [lowerUsername]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Este nome de usuário já existe.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        await client.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
            [lowerUsername, passwordHash]
        );

        return res.status(201).json({ message: 'Usuário registrado com sucesso.' });
    } catch (error: any) {
        console.error('Register API Error:', error);
        return res.status(500).json({ 
            error: 'Erro ao registrar usuário', 
            details: error.message 
        });
    } finally {
        client.release();
    }
}