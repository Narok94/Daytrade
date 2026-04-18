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
    const isFloating = isFocused || value.length > 0;

    return (
        <div className={`relative group transition-all duration-300 border ${isFocused ? 'border-electric bg-black shadow-[0_0_20px_rgba(0,209,255,0.15)]' : 'border-white/10 bg-black'} rounded-none overflow-hidden`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <Icon className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-electric' : 'text-slate-500'}`} />
            </div>
            
            <label 
                className={`absolute left-11 transition-all duration-300 pointer-events-none z-10 ${
                    isFloating 
                        ? 'top-2 text-[9px] font-black uppercase tracking-widest text-slate-500' 
                        : 'top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-slate-500'
                }`}
            >
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`w-full h-16 pl-12 pr-12 bg-transparent text-white outline-none transition-all font-sans font-bold uppercase text-xs tracking-widest ${isFloating ? 'pt-4' : ''}`}
                required={required}
            />
            
            {isPassword && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-10">
                    <ShieldCheckIcon className="w-5 h-5 text-electric/80" />
                </div>
            )}

            {/* Animated focus line */}
            <AnimatePresence>
                {isFocused && (
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        className="absolute bottom-0 left-0 w-full h-[1px] bg-electric origin-left"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, error, setError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await onLogin(username, password, rememberMe);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-charcoal relative overflow-hidden font-sans">
            {/* Deep Solid Background */}
            <div className="absolute inset-0 bg-[#0b0c10]"></div>

            <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <motion.img 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        src="/logo-odin.png" 
                        className="w-48 h-auto mb-6 drop-shadow-[0_0_20px_rgba(255,184,0,0.15)]" 
                        alt="Logo ODIN"
                        referrerPolicy="no-referrer"
                    />

                    <h1 className="text-[10px] font-black text-gold tracking-[0.2em] uppercase text-center mb-1 font-display max-w-[320px] leading-relaxed">
                        Otimize sua gestão de banca com a ODIN PERFORMANCE DAYTRADE
                    </h1>
                    <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-30 mt-4"></div>
                </div>

                {/* Login Card - Solid Technical Style */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full bg-black border border-white/10 p-8 md:p-12 rounded-none shadow-[0_40px_100px_rgba(0,0,0,0.9)] relative overflow-hidden"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                        
                        <div className="flex items-center px-1">
                            <label className="flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-4 h-4 rounded-none border transition-all flex items-center justify-center ${rememberMe ? 'bg-electric border-electric' : 'bg-transparent border-white/20 group-hover:border-electric'}`}>
                                    {rememberMe && (
                                        <svg className="w-3 h-3 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-3 group-hover:text-slate-300 transition-colors">Lembrar acesso</span>
                            </label>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 bg-red-500/10 border border-red-500/20"
                            >
                                 <p className="text-[10px] text-red-500 text-center font-black uppercase tracking-widest">{error}</p>
                            </motion.div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-electric text-charcoal font-black rounded-none uppercase text-xs tracking-[0.25em] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(0,243,255,0.2)]"
                        >
                            {isLoading ? 'PROCESSANDO...' : 'ENTRAR NO DASHBOARD'}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 opacity-60">
                            Authorized Access Only • Restricted
                        </p>
                    </div>
                </motion.div>
                
                {/* Footer Copy */}
                <p className="mt-10 text-[10px] text-slate-600 font-medium uppercase tracking-widest">
                    &copy; 2026 ODIN SYSTEMS
                </p>
            </div>
        </div>
    );
};

export default Login;
