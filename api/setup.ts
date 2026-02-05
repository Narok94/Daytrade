
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Brokerage } from '../../types';
import { randomUUID } from 'crypto';

async function ensureTablesAndMigrate(client: any, userId?: number) {
    // 1. CREATE TABLES (idempotent)
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

    // 2. CHECK & ADD ALL POTENTIALLY MISSING COLUMNS
    const { rows: columnsResult } = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users';
    `);
    const existingColumns = columnsResult.map((c: { column_name: string }) => c.column_name);

    if (!existingColumns.includes('is_admin')) {
        await client.query(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;`);
    }
    if (!existingColumns.includes('permissions')) {
        await client.query(`ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT '{"ai_access": true, "compound_access": true, "goals_access": true, "reports_access": true}';`);
    }

    // PROMOTE HENRIQUE
    await client.query(`
        UPDATE users SET is_admin = TRUE 
        WHERE LOWER(username) = 'henrique';
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
}

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    const client = await db.connect();
    try {
        await ensureTablesAndMigrate(client);
        return response.status(200).json({ message: 'Database updated. Henrique promoted to admin.' });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: (error as Error).message });
    } finally {
        client.release();
    }
}
