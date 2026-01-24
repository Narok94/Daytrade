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
        console.log("Applying migration during login: Adding 'record_id' to 'operacoes_daytrade' table.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
        await client.query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD');`);
        await client.query(`ALTER TABLE operacoes_daytrade ALTER COLUMN record_id SET NOT NULL;`);
        console.log("Login migration successful.");
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
        
        // Garante que todas as tabelas e colunas estejam corretas ANTES de tentar o login.
        await ensureTablesAndMigrate(client);

        const result = await client.query('SELECT * FROM users WHERE username = $1', [lowerUsername]);
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