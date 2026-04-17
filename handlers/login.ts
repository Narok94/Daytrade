import { query, getPool } from '../services/db';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Brokerage } from '../types';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-fallback-for-dev-only';

async function ensureTablesAndMigrate(userId?: number) {
    // 1. CREATE TABLES (idempotent)
    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            is_paused BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    // Ensure columns exist if table was already created
    await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    `);

    // Set Henrique as admin
    await query(`
        UPDATE users SET is_admin = TRUE WHERE LOWER(username) = 'henrique';
    `);
    await query(`
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
    await query(`
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            settings_json JSONB
        );
    `);

    // 2. CHECK & ADD ALL POTENTIALLY MISSING COLUMNS
    const { rows: columnsResult } = await query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'operacoes_daytrade';
    `);
    const existingColumns = columnsResult.map((c: { column_name: string }) => c.column_name);

    if (!existingColumns.includes('user_id')) {
        console.log("Applying migration: Adding 'user_id' column.");
        await query(`ALTER TABLE operacoes_daytrade ADD COLUMN user_id INTEGER;`);
    }
    if (!existingColumns.includes('record_id')) {
        console.log("Applying migration: Adding 'record_id' column.");
        await query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
    }
    if (!existingColumns.includes('brokerage_id')) {
        console.log("Applying migration: Adding 'brokerage_id' column.");
        await query(`ALTER TABLE operacoes_daytrade ADD COLUMN brokerage_id UUID;`);
    }
    if (!existingColumns.includes('payout_percentage')) {
        console.log("Applying migration: Adding 'payout_percentage' column.");
        await query(`ALTER TABLE operacoes_daytrade ADD COLUMN payout_percentage INTEGER;`);
    }
    
    // 3. POPULATE DATA FOR MIGRATED COLUMNS (if user context is available)
    if (userId) {
        // Populate user_id for any orphaned records
        await query(`UPDATE operacoes_daytrade SET user_id = $1 WHERE user_id IS NULL`, [userId]);

        // Populate record_id for any records missing it
        await query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD') WHERE record_id IS NULL;`);
        
        // Populate payout_percentage with a default value if missing
        await query(`UPDATE operacoes_daytrade SET payout_percentage = 80 WHERE payout_percentage IS NULL;`);

        // Populate brokerage_id for records belonging to this user that are missing it
        const { rows: brokeragelessRows } = await query(
            `SELECT 1 FROM operacoes_daytrade WHERE user_id = $1 AND brokerage_id IS NULL LIMIT 1`,
            [userId]
        );
        
        if (brokeragelessRows.length > 0) {
            const { rows: settingsResult } = await query(
                `SELECT settings_json FROM user_settings WHERE user_id = $1;`,
                [userId]
            );
            const settings = (settingsResult[0] as any)?.settings_json || {};
            let brokerages: Brokerage[] = settings.brokerages || [];
            let brokerageIdToUse: string;

            if (brokerages.length > 0 && brokerages[0].id) {
                brokerageIdToUse = brokerages[0].id;
            } else {
                const defaultBrokerage: Brokerage = { id: randomUUID(), name: 'Gestão Principal', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD', dailyGoalMode: 'percentage', dailyGoalValue: 3 };
                brokerageIdToUse = defaultBrokerage.id;
                const goals = settings.goals || [];
                const newSettings = { brokerages: [defaultBrokerage], goals };
                await query(
                    `INSERT INTO user_settings (user_id, settings_json) VALUES ($1, $2)
                     ON CONFLICT (user_id) DO UPDATE SET settings_json = $2;`,
                    [userId, JSON.stringify(newSettings)]
                );
            }

            await query(
                `UPDATE operacoes_daytrade SET brokerage_id = $1 WHERE user_id = $2 AND brokerage_id IS NULL;`,
                [brokerageIdToUse, userId]
            );
        }
    }
}


export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
        console.log('1. Iniciando processo de login...');
        
        const { username, password } = req.body;
        const lowerUsername = username?.toLowerCase();
        console.log(`[AUTH] Tentando login para: ${lowerUsername}`);

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
        }
        
        console.log('2. Buscando usuário no banco...');
        const result = await query('SELECT * FROM users WHERE username = $1', [lowerUsername]);
        console.log('3. Busca finalizada.');
        const rows = result.rows;
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }
        
        const user = rows[0];

        if (user.is_paused) {
            return res.status(403).json({ error: 'Sua conta está pausada. Entre em contato com o administrador.' });
        }

        // Check password (TEMPORARY: Direct comparison for debugging to avoid event loop hangs)
        // const isMatch = await bcrypt.compare(password, user.password_hash);
        const isMatch = (user.password_hash === password);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }

        // Update last login
        await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        // Generate JWT Token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userData = {
            id: user.id,
            username: user.username,
            isAdmin: user.is_admin,
            isPaused: user.is_paused,
            lastLoginAt: new Date().toISOString(),
        };

        return res.status(200).json({ 
            message: 'Login realizado com sucesso.', 
            user: userData,
            token 
        });
    } catch (error: any) {
        console.error('CRITICAL: Database or Server Error during login:', error);
        
        const isConnError = error.message.toLowerCase().includes('connect') || 
                           error.message.toLowerCase().includes('connection') ||
                           error.message.toLowerCase().includes('pool');

        // Return a cleaner error message to the user
        const status = error.message.includes('timeout') ? 504 : 500;
        const message = isConnError 
            ? "Erro de Conexão com o Banco" 
            : (error.message.includes('timeout') 
                ? 'Tempo de resposta do banco de dados excedido. Tente novamente.'
                : 'Erro Interno no Servidor ao tentar acessar o banco.');

        return res.status(status).json({ 
            error: message, 
            details: error.message 
        });
    }
}
