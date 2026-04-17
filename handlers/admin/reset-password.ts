import { query } from '../../services/db.js';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const auth = (req as any).auth;
        if (!auth || !auth.userId) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        }

        const adminId = auth.userId;
        const { targetUserId, newPassword } = req.body;

        if (!targetUserId || !newPassword) {
            return res.status(400).json({ error: 'Target User ID e Nova Senha são obrigatórios.' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres.' });
        }

        // Verify if requester is admin
        const { rows: adminCheck } = await query('SELECT is_admin FROM users WHERE id = $1', [adminId]);
        if (adminCheck.length === 0 || !adminCheck[0].is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, targetUserId]);

        return res.status(200).json({ message: 'Senha resetada com sucesso.' });
    } catch (error: any) {
        console.error('Admin Reset Password Error:', error);
        return res.status(500).json({ error: 'Erro ao resetar senha', details: error.message });
    }
}
