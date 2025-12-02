import React, { useState, useCallback } from 'react';
import App from './App';
import Login from './components/Login';
import { User } from './types';

// Initial users, will be seeded into localStorage if not present
const INITIAL_USERS: Record<string, string> = {
  henrique: '1345',
  admin: 'admin',
  larissa: 'lari@2025',
  adailton: '1345',
};

const Auth: React.FC = () => {
    // User accounts are now managed in state, sourced from localStorage
    const [users, setUsers] = useState<Record<string, string>>(() => {
        try {
            const storedUsersStr = localStorage.getItem('app_users');
            const storedUsers = storedUsersStr ? JSON.parse(storedUsersStr) : {};
            
            // Merge INITIAL_USERS with storedUsers. 
            // INITIAL_USERS provides defaults/new hardcoded users.
            // storedUsers overrides existing ones (if passwords changed or registered).
            // This ensures 'adailton' appears even if localStorage exists.
            const mergedUsers = { ...INITIAL_USERS, ...storedUsers };

            // Explicitly remove charles if he exists in storage (cleanup)
            if (mergedUsers['charles']) {
                delete mergedUsers['charles'];
            }
            
            // Update localStorage with the merged result so it persists
            localStorage.setItem('app_users', JSON.stringify(mergedUsers));
            
            return mergedUsers;
        } catch (error) {
            console.error("Failed to load users from localStorage", error);
            return INITIAL_USERS; // Fallback
        }
    });

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

    const handleLogin = useCallback((username: string, password: string): boolean => {
        const lowerUsername = username.toLowerCase();
        if (users[lowerUsername] && users[lowerUsername] === password) {
            const user: User = { username: lowerUsername };
            setCurrentUser(user);
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            setAuthError('');
            return true;
        }
        setAuthError('Usuário ou senha inválidos.');
        return false;
    }, [users]);

    const handleRegister = useCallback((username: string, password: string) => {
        const lowerUsername = username.toLowerCase();
        if (users[lowerUsername]) {
            setAuthError('Este nome de usuário já existe.');
            return;
        }
        if (password.length < 4) {
            setAuthError('A senha deve ter pelo menos 4 caracteres.');
            return;
        }

        const newUsers = { ...users, [lowerUsername]: password };
        setUsers(newUsers);
        localStorage.setItem('app_users', JSON.stringify(newUsers));

        // Automatically log in the new user
        handleLogin(lowerUsername, password);
    }, [users, handleLogin]);


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