import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const auth = (req as any).auth;
    if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    const adminId = auth.userId;
    const { key, value } = req.body;

    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Chave e valor são obrigatórios.' });
    }

    const client = await db.connect();
    try {
        // Verify if requester is admin
        const { rows: adminCheck } = await client.query('SELECT is_admin FROM users WHERE id = $1', [adminId]);
        if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem alterar esta configuração.' });
        }

        await client.query(
            `INSERT INTO system_settings (key, value) VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET value = $2;`,
            [key, value]
        );

        return res.status(200).json({ message: 'Configuração atualizada com sucesso.' });
    } catch (error: any) {
        console.error('Update System Settings Error:', error);
        return res.status(500).json({ error: 'Erro ao atualizar configuração do sistema' });
    } finally {
        client.release();
    }
}
