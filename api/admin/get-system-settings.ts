import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../utils/auth';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    const client = await db.connect();
    try {
        const admin = verifyAdmin(req);
        if (!admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta configuração.' });
        }

        const { rows: settings } = await client.query('SELECT key, value FROM system_settings');
        const settingsMap = settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        return res.status(200).json(settingsMap);
    } catch (error: any) {
        console.error('Get System Settings Error:', error);
        return res.status(500).json({ error: 'Erro ao buscar configurações do sistema' });
    } finally {
        client.release();
    }
}
