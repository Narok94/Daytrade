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

const LightningStrike: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
    return (
        <motion.svg
            className="absolute pointer-events-none overflow-visible z-20"
            viewBox="0 0 100 100"
            initial={{ opacity: 0 }}
            animate={{ 
                opacity: [0, 1, 0, 0.8, 0],
                filter: ["drop-shadow(0 0 0px #00f3ff)", "drop-shadow(0 0 15px #00f3ff)", "drop-shadow(0 0 0px #00f3ff)"]
            }}
            transition={{
                duration: 0.2,
                repeat: Infinity,
                repeatDelay: Math.random() * 5 + 3,
                delay
            }}
            style={{
                width: '150%',
                height: '150%',
                top: '-25%',
                left: '-25%',
            }}
        >
            <motion.path
                d={`M ${Math.random() * 50 + 25} 0 L ${Math.random() * 40 + 30} 30 L ${Math.random() * 60 + 20} 50 L ${Math.random() * 30 + 35} 70 L 50 100`}
                stroke="#00f3ff"
                strokeWidth="0.5"
                fill="transparent"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.1 }}
            />
        </motion.svg>
    );
};

const AmbientFlash: React.FC = () => {
    return (
        <motion.div
            className="absolute inset-0 bg-electric/5 pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 0.5, 0] }}
            transition={{
                duration: 0.3,
                repeat: Infinity,
                repeatDelay: Math.random() * 10 + 5
            }}
        />
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
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#050505] relative overflow-hidden font-sans">
            <AmbientFlash />
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            
            <div className="w-full max-w-[400px] relative z-10 flex flex-col items-center">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="relative"
                    >
                        {/* Glow effect behind logo */}
                        <div className="absolute inset-0 bg-electric/20 blur-3xl rounded-full scale-150" />
                        
                        {/* Lightning Effects */}
                        <LightningStrike delay={0} />
                        <LightningStrike delay={1.5} />
                        <LightningStrike delay={3} />
                        <LightningStrike delay={4.5} />
                        
                        <img 
                            src="/logo-odin.png" 
                            className="w-48 sm:w-64 h-auto mb-6 relative z-10 drop-shadow-[0_0_30px_rgba(0,243,255,0.3)]" 
                            alt="Logo ODIN"
                            referrerPolicy="no-referrer"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-1"
                    >
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase">
                            Premium Performance Daytrade
                        </p>
                        <div className="h-[1px] w-12 bg-gold/50 mx-auto mt-2" />
                    </motion.div>
                </div>

                {/* Login Card */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full bg-charcoal/40 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] relative overflow-hidden group"
                >
                    {/* Interior highlights */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-electric/10 to-transparent" />

                    <AnimatePresence mode="wait">
                        <motion.form 
                            key={isRegistering ? 'register' : 'login'}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            onSubmit={handleSubmit} 
                            className="space-y-6"
                        >
                            <div className="space-y-4">
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
                            </div>
                            
                            {!isRegistering && (
                                <div className="flex items-center px-1">
                                    <label className="flex items-center cursor-pointer group/label">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-electric border-electric' : 'bg-transparent border-white/20 group-hover/label:border-electric'}`}>
                                            {rememberMe && (
                                                <svg className="w-3 h-3 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 ml-3 group-hover/label:text-slate-300 transition-colors">Lembrar acesso</span>
                                    </label>
                                </div>
                            )}

                            {error && (
                                <motion.p 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[9px] text-[#ff4444] text-center font-black uppercase tracking-widest bg-red-500/5 py-4 rounded-xl border border-red-500/20"
                                >
                                    {error}
                                </motion.p>
                            )}
                            
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 bg-electric text-charcoal font-black rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all relative overflow-hidden group/btn hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_40px_rgba(0,243,255,0.3)]"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                                <span className="relative z-10">
                                    {isLoading ? 'CARREGANDO...' : isRegistering ? 'CRIAR MINHA CONTA' : 'LOGAR NO SISTEMA'}
                                </span>
                            </button>
                        </motion.form>
                    </AnimatePresence>

                    <div className="mt-10 pt-6 border-t border-white/5 text-center">
                        <button 
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                            }}
                            className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-gold transition-all"
                        >
                            {isRegistering ? (
                                <span className="flex items-center gap-2">POSSUI CONTA? <span className="text-white">ENTRE AGORA</span></span>
                            ) : (
                                <>Ainda não tem conta? <span className="text-gold border-b border-gold/30 pb-0.5">Cadastre-se aqui</span></>
                            )}
                        </button>
                    </div>
                </motion.div>
                
                {/* Security Badge */}
                <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                    <ShieldCheckIcon className="w-3 h-3 text-electric" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Protocolo de Segurança Ativo</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
