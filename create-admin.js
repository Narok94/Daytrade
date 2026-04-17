import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcryptjs';

async function createAdmin() {
    console.log("--- ODIN: Gerando Acesso Administrativo (DIRETO) ---");
    
    const connectionString = (process.env.DATABASE_URL_UNPOOLED || '').trim();
    if (!connectionString) {
        console.error("Erro: DATABASE_URL_UNPOOLED não definida no ambiente.");
        return;
    }

    if (!connectionString.includes('sslmode=')) {
        const separator = connectionString.includes('?') ? '&' : '?';
        connectionString += `${separator}sslmode=require`;
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000,
        keepAlive: true
    });

    let client;
    try {
        client = await pool.connect();
    } catch (err) {
        console.error("Erro ao conectar ao banco de dados. Verifique sua POSTGRES_URL.");
        console.error(err.message);
        return;
    }
    
    const username = 'henrique';
    const password = '[@Manu9860]';
    
    try {
        // Garantir que a tabela existe
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

        // Usamos bcryptjs
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
        
        const res = await client.query(sql, [username.toLowerCase(), hash, true]);
        
        console.log("\n✅ Sucesso!");
        console.log(`👤 Usuário: ${res.rows[0].username}`);
        console.log(`🆔 ID: ${res.rows[0].id}`);
        console.log("💎 Status: ADMINISTRADOR ATIVO");
        console.log("\nVocê já pode fazer login na plataforma.");
        
    } catch (err) {
        console.error("❌ Erro ao criar administrador:", err.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

createAdmin();
