import React, { useState, useCallback, useEffect } from 'react';
import App from './App';
import Login from './components/Login';
import { User } from './types';

const Auth: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            // Check sessionStorage first (current tab session)
            let savedUserJSON = sessionStorage.getItem('currentUser');
            
            // If not in sessionStorage, check localStorage (persistent session)
            if (!savedUserJSON) {
                savedUserJSON = localStorage.getItem('currentUser');
            }

            if (!savedUserJSON) return null;

            const savedUser = JSON.parse(savedUserJSON);

            // FIX: Validate the user object.
            if (savedUser && (typeof savedUser.id !== 'number' || !Number.isInteger(savedUser.id))) {
                console.warn('Corrupt user session found. Clearing session to force re-authentication.');
                sessionStorage.removeItem('currentUser');
                localStorage.removeItem('currentUser');
                return null; 
            }
            
            return savedUser;
        } catch (error) {
            console.error("Failed to parse user from storage. Clearing...", error);
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
                
                // Always set sessionStorage for the current session
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                
                // If rememberMe is checked, also set localStorage
                if (rememberMe) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } else {
                    localStorage.removeItem('currentUser');
                }
                
                return true;
            } else {
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