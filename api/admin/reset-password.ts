
import { db } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { verifyAdmin } from '../utils/auth';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const client = await db.connect();
    try {
        const admin = verifyAdmin(req);
        if (!admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
        }

        const { targetUserId, newPassword } = req.body;

        if (!targetUserId || !newPassword) {
            return res.status(400).json({ error: 'Target User ID e Nova Senha são obrigatórios.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, targetUserId]);

        return res.status(200).json({ message: 'Senha resetada com sucesso.' });
    } catch (error: any) {
        console.error('Admin Reset Password Error:', error);
        return res.status(500).json({ error: 'Erro ao resetar senha', details: error.message });
    } finally {
        client.release();
    }
}
