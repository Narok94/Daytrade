export default async function loginHandler(req: any, res: any) {
    const { username, password } = req.body;
    console.log(`[LOGIN HANDLER] Tentativa: ${username}`);
    
    // Login Mock Admin Hardcoded (Sem JWT como solicitado)
    if (username === 'admin' && password === 'admin') {
        const user = { id: 'admin-id', username: 'admin', isAdmin: true };
        
        return res.status(200).json({ 
            message: 'Login realizado com sucesso!', 
            token: 'bypass-no-jwt', 
            user
        });
    }

    return res.status(401).json({ error: 'Credenciais inválidas. Use admin/admin.' });
}
