import React, { useState, useCallback, useEffect } from 'react';
import App from './App';
import Login from './components/Login';
import { User } from './types';

const Auth: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const savedUser = sessionStorage.getItem('currentUser');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (error) {
            console.error("Failed to parse user from sessionStorage", error);
            return null;
        }
    });
    const [authError, setAuthError] = useState('');

    const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
        setAuthError('');
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                const user: User = data.user;
                setCurrentUser(user);
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                return true;
            } else {
                setAuthError(data.error || 'Falha ao fazer login.');
                return false;
            }
        } catch (error) {
            console.error(error);
            setAuthError('Ocorreu um erro de rede. Tente novamente.');
            return false;
        }
    }, []);

    const handleRegister = useCallback(async (username: string, password: string) => {
        setAuthError('');
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Automatically log in the new user
                await handleLogin(username, password);
            } else {
                setAuthError(data.error || 'Falha ao registrar.');
            }
        } catch (error) {
            console.error(error);
            setAuthError('Ocorreu um erro de rede. Tente novamente.');
        }
    }, [handleLogin]);

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    }, []);

    if (!currentUser) {
        return <Login onLogin={handleLogin} onRegister={handleRegister} error={authError} setError={setAuthError} />;
    }

    return <App user={currentUser} onLogout={handleLogout} />;
}

export default Auth;