import React, { useState } from 'react';
import { UserIcon, LockClosedIcon, SparklesIcon, ShieldCheckIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
    onLogin: (username: string, password: string, rememberMe: boolean) => Promise<boolean>;
    onRegister: (username: string, password: string, keyword: string) => Promise<void>;
    error: string;
    setError: (error: string) => void;
}

const FloatingInput: React.FC<{
    label: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.ElementType;
    required?: boolean;
    isPassword?: boolean;
}> = ({ label, type, value, onChange, icon: Icon, required, isPassword }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className={`relative group transition-all duration-300 border h-14 ${isFocused ? 'border-electric bg-black shadow-[0_0_15px_rgba(0,243,255,0.3)]' : 'border-white/20 bg-black/40'} rounded-xl overflow-hidden flex items-center`}>
            <div className="pl-4 flex items-center pointer-events-none z-10">
                <Icon className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-electric' : 'text-slate-500'}`} />
            </div>
            
            <div className="flex-1 relative h-full flex items-center">
                {!value && !isFocused && (
                    <span className="absolute left-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 pointer-events-none">
                        {label}
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full h-full pl-3 pr-4 bg-transparent text-white outline-none transition-all font-sans font-bold uppercase text-[11px] tracking-[0.2em]"
                    required={required}
                />
            </div>
            
            {isPassword && (
                <div className="pr-4 flex items-center pointer-events-none z-10 transition-opacity">
                    <ShieldCheckIcon className={`w-5 h-5 ${isFocused ? 'text-electric' : 'text-slate-500'}`} />
                </div>
            )}
        </div>
    );
};

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, error, setError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [keyword, setKeyword] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isRegistering) {
                await onRegister(username, password, keyword);
                setIsRegistering(false);
            } else {
                await onLogin(username, password, rememberMe);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-charcoal relative overflow-hidden font-sans">
            {/* Solid Deep Background */}
            <div className="absolute inset-0 bg-[#0b0c10]"></div>

            <div className="w-full max-w-[440px] relative z-10 flex flex-col items-center">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-6 text-center">
                    <motion.img 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        src="/logo-odin.png" 
                        className="w-56 h-auto mb-6" 
                        alt="Logo ODIN"
                        referrerPolicy="no-referrer"
                    />

                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 tracking-wider">
                        Otimize sua gestão de banca com a <span className="text-gold font-black">ODIN PERFORMANCE DAYTRADE</span>
                    </p>
                </div>

                {/* Login Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full bg-[#1a1c23]/80 border border-white/5 p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <FloatingInput 
                            label="USUÁRIO"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            icon={UserIcon}
                            required
                        />
                        
                        <FloatingInput 
                            label="SENHA"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={LockClosedIcon}
                            required
                            isPassword
                        />

                        {isRegistering && (
                            <FloatingInput 
                                label="CHAVE DE ACESSO"
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                icon={SparklesIcon}
                                required
                            />
                        )}
                        
                        {!isRegistering && (
                            <div className="flex items-center px-1">
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-electric border-electric' : 'bg-transparent border-white/20 group-hover:border-electric'}`}>
                                        {rememberMe && (
                                            <svg className="w-3 h-3 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 ml-3 group-hover:text-slate-300 transition-colors">Lembrar acesso</span>
                                </label>
                            </div>
                        )}

                        {error && (
                            <p className="text-[10px] text-red-500 text-center font-black uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>
                        )}
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-electric text-charcoal font-black rounded-2xl uppercase text-[11px] tracking-[0.25em] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(0,243,255,0.4)]"
                        >
                            {isLoading ? 'PROCESSANDO...' : isRegistering ? 'CRIAR MINHA CONTA' : 'ENTRAR NO DASHBOARD'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button 
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                            }}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors"
                        >
                            {isRegistering ? 'VOLTAR PARA LOGIN' : (
                                <>NOVO POR AQUI? <span className="text-gold">CRIE UMA CONTA</span></>
                            )}
                        </button>
                    </div>
                </motion.div>
                
                {/* Footer Copy */}
                <p className="mt-10 text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">
                    &copy; 2026 ODIN PERFORMANCE DAYTRADE
                </p>
            </div>
        </div>
    );
};

export default Login;
