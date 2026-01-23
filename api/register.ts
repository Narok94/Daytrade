import { sql } from '@vercel/postgres';
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
        const { username, password } = req.body;
        const lowerUsername = username.toLowerCase();

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
        }

        // Check if user already exists
        const { rows: existingUsers } = await sql`SELECT * FROM users WHERE username = ${lowerUsername};`;
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Este nome de usuário já existe.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        await sql`
            INSERT INTO users (username, password_hash)
            VALUES (${lowerUsername}, ${passwordHash});
        `;

        return res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
