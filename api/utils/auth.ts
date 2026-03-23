import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export interface AuthUser {
    id: number;
    username: string;
    isAdmin: boolean;
    isPaused: boolean;
}

export const verifyToken = (req: VercelRequest): AuthUser | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-dev-only') as AuthUser;
        return decoded;
    } catch (error) {
        return null;
    }
};

export const verifyAdmin = (req: VercelRequest): AuthUser | null => {
    const user = verifyToken(req);
    if (user && user.isAdmin) {
        return user;
    }
    return null;
};
