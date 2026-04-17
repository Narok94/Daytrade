import { query } from '../../services/db';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    const auth = (req as any).auth;
    if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    const adminId = auth.userId;

    try {
        // Verify if requester is admin
        const { rows: adminCheck } = await query('SELECT is_admin FROM users WHERE id = $1', [adminId]);
        if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta configuração.' });
        }

        const { rows: settings } = await query('SELECT key, value FROM system_settings');
        const settingsMap = settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        return res.status(200).json(settingsMap);
    } catch (error: any) {
        console.error('Get System Settings Error:', error);
        return res.status(500).json({ error: 'Erro ao buscar configurações do sistema' });
    }
}
