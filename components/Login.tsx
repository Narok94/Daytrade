import React, { useState, useEffect } from 'react';
import { UserIcon, LockClosedIcon } from './icons';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

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
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="w-full max-w-[400px] relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white soft-shadow mb-6 animate-float">
                        <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L14.59 9.41L22 12L14.59 14.59L12 22L9.41 14.59L2 12L9.41 9.41L12 2Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">HRK Control</h1>
                    <p className="text-slate-400 text-xs font-medium tracking-widest uppercase mt-2">Binary Operations Management</p>
                </div>

                <Card className="p-8 md:p-10">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-900">{isRegistering ? 'Criar Conta' : 'Bem-vindo de volta'}</h2>
                        <p className="text-slate-400 text-xs mt-1">{isRegistering ? 'Comece sua jornada profissional hoje.' : 'Acesse sua central de operações.'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Usuário"
                            placeholder="Seu nome de usuário"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <Input
                            label="Senha"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        
                        {isRegistering && (
                            <Input
                                label="Confirmar Senha"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        )}

                        {!isRegistering && (
                            <div className="flex items-center justify-between px-1">
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded border transition-all ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200 group-hover:border-blue-400'}`}>
                                        {rememberMe && (
                                            <svg className="w-3 h-3 text-white mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2 group-hover:text-blue-600 transition-colors">Lembrar-me</span>
                                </label>
                                <button type="button" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Esqueci a senha</button>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                 <p className="text-[10px] text-rose-500 text-center font-bold uppercase tracking-wider">{error}</p>
                            </div>
                        )}
                        
                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="w-full"
                            size="lg"
                        >
                            {isRegistering ? 'REGISTRAR AGORA' : 'ENTRAR NO PAINEL'}
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <button
                            type="button"
                            onClick={toggleView}
                            disabled={isLoading}
                            className="text-[10px] font-bold text-slate-400 hover:text-blue-600 tracking-widest transition-all uppercase"
                        >
                            {isRegistering ? 'Já tem uma conta? Login' : 'Não tem conta? Registre-se'}
                        </button>
                    </div>
                </Card>
                
                <div className="mt-10 text-center">
                    <p className="text-slate-300 text-[10px] font-bold tracking-[0.2em] uppercase">{currentTime}</p>
                </div>
            </div>
        </div>
    );
};

export default Login;