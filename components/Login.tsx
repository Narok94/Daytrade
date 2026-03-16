import React, { useState, useEffect } from 'react';
import { UserIcon, LockClosedIcon } from './icons';

interface LoginProps {
    onLogin: (username: string, password: string, rememberMe: boolean) => Promise<boolean>;
    onRegister: (username: string, password: string) => Promise<void>;
    error: string;
    setError: (error: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, error, setError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isRegistering) {
                if (password !== confirmPassword) {
                    setError('As senhas não coincidem.');
                    setIsLoading(false);
                    return;
                }
                await onRegister(username, password);
            } else {
                await onLogin(username, password, rememberMe);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleView = () => {
        setIsRegistering(!isRegistering);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setError('');
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#050a1f] relative overflow-hidden font-sans">
            {/* Background Decorative Elements - Network/Constellation Effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                <div className="absolute top-1/3 left-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                <div className="absolute top-2/3 left-1/3 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                <div className="absolute top-3/4 left-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <line x1="25%" y1="25%" x2="50%" y2="33%" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" />
                    <line x1="50%" y1="33%" x2="75%" y2="50%" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" />
                    <line x1="75%" y1="50%" x2="50%" y2="75%" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" />
                    <line x1="50%" y1="75%" x2="33%" y2="66%" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" />
                    <line x1="33%" y1="66%" x2="25%" y2="25%" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" />
                    <line x1="25%" y1="25%" x2="25%" y2="50%" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" />
                    <line x1="25%" y1="50%" x2="33%" y2="66%" stroke="white" strokeWidth="0.5" strokeOpacity="0.2" />
                </svg>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#050a1f]/80 to-[#050a1f]"></div>
            
            <div className="w-full max-w-[440px] relative z-10 flex flex-col items-center">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-4 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full rounded-full bg-[#050a1f] flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <svg className="w-10 h-10 text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L14.59 9.41L22 12L14.59 14.59L12 22L9.41 14.59L2 12L9.41 9.41L12 2Z" fill="currentColor"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight flex items-center">
                        HRK<span className="text-indigo-500">.</span>
                    </h1>
                    <p className="text-slate-400 text-xs font-medium tracking-[0.2em] uppercase mt-1">Binary Operations Management</p>
                </div>

                {/* Login Card */}
                <div className="w-full bg-[#0f172a]/40 border border-white/5 p-8 md:p-10 rounded-[2rem] backdrop-blur-2xl shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <UserIcon className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Usuário"
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#1e293b]/30 border border-white/5 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:bg-[#1e293b]/50 transition-all"
                                required
                            />
                        </div>
                        
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <LockClosedIcon className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            </div>
                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#1e293b]/30 border border-white/5 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:bg-[#1e293b]/50 transition-all"
                                required
                            />
                        </div>
                        
                        {isRegistering && (
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <LockClosedIcon className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Confirmar Senha"
                                    value={confirmPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#1e293b]/30 border border-white/5 text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:bg-[#1e293b]/50 transition-all"
                                    required
                                />
                            </div>
                        )}

                        {!isRegistering && (
                            <div className="flex items-center px-1">
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'bg-[#1e293b]/30 border-white/10 group-hover:border-indigo-500/50'}`}>
                                        {rememberMe && (
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-slate-400 ml-3 group-hover:text-slate-300 transition-colors">Lembrar acesso</span>
                                </label>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                 <p className="text-xs text-red-500 text-center font-medium">{error}</p>
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl uppercase text-sm tracking-widest shadow-[0_10px_20px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {isLoading ? 'PROCESSANDO...' : isRegistering ? 'CRIAR CONTA' : 'ENTRAR NO DASHBOARD'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={toggleView}
                            disabled={isLoading}
                            className="text-sm font-medium text-slate-400 tracking-wide transition-all"
                        >
                            {isRegistering ? (
                                <>Já tem uma conta? <span className="text-indigo-400 hover:text-indigo-300">Login</span></>
                            ) : (
                                <>Novo por aqui? <span className="text-indigo-400 hover:text-indigo-300">Crie uma conta</span></>
                            )}
                        </button>
                    </div>
                </div>
                
                <div className="mt-12 text-center">
                    <p className="text-slate-600 text-[10px] font-bold tracking-[0.3em] uppercase">SINCRONIZADO COM VERCEL POSTGRES</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
