import React, { useState, useEffect } from 'react';

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
    const [currentTime, setCurrentTime] = useState('');
    
    useEffect(() => {
        const timerId = setInterval(() => {
             const date = new Date();
             setCurrentTime(date.toLocaleTimeString('pt-BR'));
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

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
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="w-full max-w-[400px] relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 mb-6 shadow-2xl">
                        <svg className="w-8 h-8 text-teal-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L14.59 9.41L22 12L14.59 14.59L12 22L9.41 14.59L2 12L9.41 9.41L12 2Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">HRK Control</h1>
                    <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase mt-2">Binary Operations Management</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-8 md:p-10 rounded-3xl backdrop-blur-xl shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-white">{isRegistering ? 'Criar Conta' : 'Bem-vindo de volta'}</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{isRegistering ? 'Comece sua jornada profissional hoje.' : 'Acesse sua central de operações.'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuário</label>
                            <input
                                type="text"
                                placeholder="Seu nome de usuário"
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none focus:border-teal-500/50 transition-all"
                                required
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none focus:border-teal-500/50 transition-all"
                                required
                            />
                        </div>
                        
                        {isRegistering && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar Senha</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none focus:border-teal-500/50 transition-all"
                                    required
                                />
                            </div>
                        )}

                        {!isRegistering && (
                            <div className="flex items-center justify-between px-1">
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded border transition-all ${rememberMe ? 'bg-teal-500 border-teal-500' : 'bg-slate-950 border-slate-800 group-hover:border-teal-500/50'}`}>
                                        {rememberMe && (
                                            <svg className="w-3 h-3 text-slate-950 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2 group-hover:text-teal-400 transition-colors">Lembrar-me</span>
                                </label>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                 <p className="text-[10px] text-red-500 text-center font-bold uppercase tracking-wider">{error}</p>
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl uppercase text-[10px] tracking-widest shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'PROCESSANDO...' : isRegistering ? 'REGISTRAR AGORA' : 'ENTRAR NO PAINEL'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                        <button
                            type="button"
                            onClick={toggleView}
                            disabled={isLoading}
                            className="text-[10px] font-bold text-slate-500 hover:text-teal-400 tracking-widest transition-all uppercase"
                        >
                            {isRegistering ? 'Já tem uma conta? Login' : 'Não tem conta? Registre-se'}
                        </button>
                    </div>
                </div>
                
                <div className="mt-10 text-center">
                    <p className="text-slate-700 text-[10px] font-black tracking-[0.2em] uppercase">{currentTime}</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
