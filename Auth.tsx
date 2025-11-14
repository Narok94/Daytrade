import React, { useState, useCallback } from 'react';
import App from './App';
import Login from './components/Login';
import { User } from './types';

// Hardcoded users for the purpose of this example
const USERS: Record<string, string> = {
  henrique: '1345',
  admin: 'admin',
  larissa: 'lari@2025',
};

const Auth: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        // Check session storage for a logged in user to persist session across reloads
        try {
            const savedUser = sessionStorage.getItem('currentUser');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (error) {
            console.error("Failed to parse user from sessionStorage", error);
            return null;
        }
    });
    const [loginError, setLoginError] = useState('');

    const handleLogin = useCallback((username: string, password: string): boolean => {
        if (USERS[username.toLowerCase()] && USERS[username.toLowerCase()] === password) {
            const user: User = { username: username.toLowerCase() };
            setCurrentUser(user);
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            setLoginError('');
            return true;
        }
        setLoginError('Usuário ou senha inválidos.');
        return false;
    }, []);

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    }, []);

    if (!currentUser) {
        return <Login onLogin={handleLogin} error={loginError} />;
    }

    return <App user={currentUser} onLogout={handleLogout} />;
}

export default Auth;