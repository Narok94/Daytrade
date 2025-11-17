import React, { useState, useEffect } from 'react';
import { UserIcon, LockClosedIcon, TrendingUpIcon } from './icons';

interface LoginProps {
    onLogin: (username: string, password: string) => boolean;
    onRegister: (username: string, password: string) => void;
    error: string;
    setError: (error: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, error, setError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    
    useEffect(() => {
        if (!isRegistering) {
            const rememberedUser = localStorage.getItem('rememberedUser');
            if (rememberedUser) {
                setUsername(rememberedUser);
                setRememberMe(true);
            }
        }
    }, [isRegistering]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegistering) {
            if (password !== confirmPassword) {
                setError('As senhas não coincidem.');
                return;
            }
            onRegister(username, password);
        } else {
            const success = onLogin(username, password);
            if (success) {
                 if (rememberMe) {
                    localStorage.setItem('rememberedUser', username);
                } else {
                    localStorage.removeItem('rememberedUser');
                }
            }
        }
    };
    
    const toggleView = () => {
        setIsRegistering(!isRegistering);
        // Clear state and errors when switching views
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setError('');
    };

    return (
        <div className="login-background min-h-screen w-full flex items-center justify-center p-4 font-sans">
            <div className="login-card w-full max-w-sm p-8 transition-all duration-300">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 text-white rounded-2xl mb-4 shadow-md">
                        <TrendingUpIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">{isRegistering ? 'Criar Conta' : 'Acesse sua Conta'}</h1>
                    <p className="text-slate-500 mt-1">{isRegistering ? 'Preencha os dados para se registrar.' : 'Bem-vindo(a) de volta!'}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <UserIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-11 pr-3 py-3 bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="Usuário"
                            required
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <LockClosedIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-3 py-3 bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="Senha"
                            required
                        />
                    </div>
                    
                    {isRegistering && (
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <LockClosedIcon className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-11 pr-3 py-3 bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="Confirmar Senha"
                                required
                            />
                        </div>
                    )}
                    
                    {!isRegistering && (
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 bg-slate-100 border-slate-300 text-blue-600 focus:ring-blue-500 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                                Lembrar usuário
                            </label>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}
                    
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                        >
                            {isRegistering ? 'Registrar' : 'Entrar'}
                        </button>
                    </div>
                </form>
                 <div className="mt-6 text-center text-sm">
                    <span className="text-slate-500">
                        {isRegistering ? 'Já tem uma conta? ' : 'Não tem uma conta? '}
                    </span>
                    <button
                        type="button"
                        onClick={toggleView}
                        className="font-medium text-blue-600 hover:underline focus:outline-none"
                    >
                        {isRegistering ? 'Fazer Login' : 'Registrar-se'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;