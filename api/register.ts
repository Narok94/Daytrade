import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { Brokerage } from '../../types';
import { randomUUID } from 'crypto';

async function ensureTablesAndMigrate(client: any, userId?: number) {
    // CREATE TABLE statements...
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

    // --- MIGRATION CHECKS ---
    const { rows: columns } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'operacoes_daytrade';
    `);
    const existingColumns = columns.map((c: { column_name: string }) => c.column_name);

    // Migration for: record_id
    if (!existingColumns.includes('record_id')) {
        console.log("Applying migration: Adding 'record_id' column.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN record_id VARCHAR(10);`);
        await client.query(`UPDATE operacoes_daytrade SET record_id = TO_CHAR(data_operacao, 'YYYY-MM-DD');`);
        await client.query(`ALTER TABLE operacoes_daytrade ALTER COLUMN record_id SET NOT NULL;`);
        console.log("Migration for 'record_id' successful.");
    }

    // Migration for: brokerage_id
    if (!existingColumns.includes('brokerage_id')) {
        console.log("Applying migration: Adding 'brokerage_id' column.");
        await client.query(`ALTER TABLE operacoes_daytrade ADD COLUMN brokerage_id UUID;`);
        console.log("Migration for 'brokerage_id' column addition successful.");
    }
    
    // Data Population Step (only runs if userId is provided)
    if (userId) {
        const { rows: rowsToMigrate } = await client.query(
            `SELECT 1 FROM operacoes_daytrade WHERE user_id = $1 AND brokerage_id IS NULL LIMIT 1`,
            [userId]
        );
        
        if (rowsToMigrate.length > 0) {
            console.log(`Populating 'brokerage_id' for user ${userId}.`);
            const { rows: settingsResult } = await client.query(
                `SELECT settings_json FROM user_settings WHERE user_id = $1;`,
                [userId]
            );
            const settings = settingsResult[0]?.settings_json || {};
            let brokerages: Brokerage[] = settings.brokerages || [];
            let brokerageIdToUse: string;

            if (brokerages.length > 0 && brokerages[0].id) {
                brokerageIdToUse = brokerages[0].id;
            } else {
                const defaultBrokerage: Brokerage = { id: randomUUID(), name: 'Gestão Principal', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' };
                brokerageIdToUse = defaultBrokerage.id;
                
                const goals = settings.goals || [];
                const newSettings = { brokerages: [defaultBrokerage], goals };
                
                await client.query(
                    `INSERT INTO user_settings (user_id, settings_json) VALUES ($1, $2)
                     ON CONFLICT (user_id) DO UPDATE SET settings_json = $2;`,
                    [userId, JSON.stringify(newSettings)]
                );
                console.log(`Created and saved default brokerage for user ${userId}.`);
            }

            await client.query(
                `UPDATE operacoes_daytrade SET brokerage_id = $1 WHERE user_id = $2 AND brokerage_id IS NULL;`,
                [brokerageIdToUse, userId]
            );
            console.log(`Successfully populated 'brokerage_id' for user ${userId}.`);
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