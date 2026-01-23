import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    try {
        // Executa uma consulta simples para obter a hora atual do banco de dados.
        // Se isso funcionar, a conexão está ativa.
        const { rows } = await sql`SELECT NOW();`;
        const time = rows[0].now;

        return res.status(200).json({ 
            message: 'Conexão com o banco de dados bem-sucedida!',
            databaseTime: time 
        });
    } catch (error) {
        console.error('Database connection error:', error);
        return res.status(500).json({ 
            error: 'Não foi possível conectar ao banco de dados.',
            details: (error as Error).message 
        });
    }
}
