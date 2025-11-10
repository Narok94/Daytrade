import React, { useState, useEffect } from 'react';
import { UserIcon, LockClosedIcon, TrendingUpIcon } from './icons';

interface LoginProps {
    onLogin: (username: string, password: string) => boolean;
    error: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, error }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    
    useEffect(() => {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            setUsername(rememberedUser);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const success = onLogin(username, password);
        if (success) {
             if (rememberMe) {
                localStorage.setItem('rememberedUser', username);
            } else {
                localStorage.removeItem('rememberedUser');
            }
        }
    };

    return (
        <div className="login-background min-h-screen w-full flex items-center justify-center text-slate-200 p-4 font-sans">
            <div className="login-form-container w-full max-w-md bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 text-blue-400 rounded-full mb-4 border border-blue-500/30">
                        <TrendingUpIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100">Performance Trader</h1>
                    <p className="text-slate-400 mt-2">Acesse sua plataforma de controle.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="Usuário"
                            required
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LockClosedIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="Senha"
                            required
                        />
                    </div>
                    
                    {error && (
                        <p className="text-sm text-red-400 text-center bg-red-500/10 py-2 rounded-lg">{error}</p>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                                Lembrar usuário
                            </label>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-transform transform hover:scale-105"
                        >
                            Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;