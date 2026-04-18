import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'secret-fallback-for-dev-only';

export default async function loginHandler(req: any, res: any) {
    const { username, password } = req.body;
    console.log(`[LOGIN HANDLER] Tentativa: ${username}`);
    
    // Login Mock Admin Hardcoded
    if (username === 'admin' && password === 'admin') {
        const user = { id: 'admin-id', username: 'admin', is_admin: true };
        const token = jwt.sign(
            { id: user.id, username: user.username, is_admin: true }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        return res.status(200).json({ 
            message: 'Login realizado com sucesso!', 
            token, 
            user: { id: user.id, username: user.username, isAdmin: true } 
        });
    }

    return res.status(401).json({ error: 'Credenciais inválidas. Use admin/admin.' });
}
