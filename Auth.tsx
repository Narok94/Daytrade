import React, { useState, useCallback, useEffect } from 'react';
import App from './App';
import Login from './components/Login';
import { User } from './types';

const Auth: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const savedUserJSON = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
            if (!savedUserJSON) return null;

            const savedUser = JSON.parse(savedUserJSON);

            // FIX: Validate the user object from sessionStorage.
            // If the ID is not an integer, the data is corrupt/stale from a previous version.
            // Clear the session and force re-login to get fresh, valid data.
            if (savedUser && (typeof savedUser.id !== 'number' || !Number.isInteger(savedUser.id))) {
                console.warn('Corrupt user session found. Clearing session to force re-authentication.');
                sessionStorage.removeItem('currentUser');
                localStorage.removeItem('currentUser');
                return null; 
            }
            
            return savedUser;
        } catch (error) {
            console.error("Failed to parse user from storage. Clearing...", error);
            // Also clear corrupt data if JSON parsing fails
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('currentUser');
            return null;
        }
    });
    const [authError, setAuthError] = useState('');

    const handleLogin = useCallback(async (username: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
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
                if (rememberMe) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } else {
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                }
                return true;
            } else {
                // Se houver detalhes do erro (como erro do banco), exibe eles
                const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'Falha ao fazer login.');
                setAuthError(errorMessage);
                return false;
            }
        } catch (error) {
            console.error(error);
            setAuthError('Erro de conexão. Verifique sua internet e tente novamente.');
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
                const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'Falha ao registrar.');
                setAuthError(errorMessage);
            }
        } catch (error) {
            console.error(error);
            setAuthError('Erro de conexão ao tentar registrar.');
        }
    }, [handleLogin]);

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('currentUser');
    }, []);

    if (!currentUser) {
        return <Login onLogin={handleLogin} onRegister={handleRegister} error={authError} setError={setAuthError} />;
    }

    return <App user={currentUser} onLogout={handleLogout} />;
}

export default Auth;