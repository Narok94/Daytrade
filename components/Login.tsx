
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
        <div className="login-container min-h-screen w-full flex items-center justify-center p-4 font-sans" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=2064&auto=format&fit=crop')" }}>
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 login-overlay"></div>

            <div className="glass-card w-full max-w-sm p-8 rounded-3xl relative z-10 animate-float">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-green-500 to-emerald-700 text-white rounded-2xl mb-4 shadow-lg shadow-green-500/30">
                        <TrendingUpIcon className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{isRegistering ? 'Nova Conta' : 'HRK Analytics'}</h1>
                    <p className="text-slate-300 mt-2 text-sm font-medium">{isRegistering ? 'Junte-se a nós para operar.' : 'Sua performance em outro nível.'}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <UserIcon className="w-5 h-5 text-slate-400 group-focus-within:text-green-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-11 pr-3 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            placeholder="Usuário"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <LockClosedIcon className="w-5 h-5 text-slate-400 group-focus-within:text-green-400 transition-colors" />
                        </div>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-3 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            placeholder="Senha"
                            required
                        />
                    </div>
                    
                    {isRegistering && (
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <LockClosedIcon className="w-5 h-5 text-slate-400 group-focus-within:text-green-400 transition-colors" />
                            </div>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-11 pr-3 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                                className="h-4 w-4 bg-slate-950/50 border-slate-600 text-green-500 focus:ring-green-500 rounded cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                                Lembrar usuário
                            </label>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                             <p className="text-sm text-red-400 text-center font-medium">{error}</p>
                        </div>
                    )}
                    
                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-green-900/20 text-base font-bold text-slate-950 bg-green-500 hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all transform active:scale-[0.98]"
                        >
                            {isRegistering ? 'Criar Conta' : 'Acessar Plataforma'}
                        </button>
                    </div>
                </form>
                 <div className="mt-6 text-center text-sm">
                    <span className="text-slate-400">
                        {isRegistering ? 'Já tem uma conta? ' : 'Não tem uma conta? '}
                    </span>
                    <button
                        type="button"
                        onClick={toggleView}
                        className="font-bold text-green-400 hover:text-green-300 hover:underline focus:outline-none transition-colors"
                    >
                        {isRegistering ? 'Fazer Login' : 'Registrar-se'}
                    </button>
                </div>
            </div>
            
            <div className="absolute bottom-4 text-center w-full z-10">
                <p className="text-slate-500 text-xs">© 2025 HRK Analytics. Todos os direitos reservados.</p>
            </div>
        </div>
    );
};

export default Login;
