import React, { useState } from 'react';
import { UserIcon, LockClosedIcon, SparklesIcon } from './icons';
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
}> = ({ label, type, value, onChange, icon: Icon, required }) => {
    const [isFocused, setIsFocused] = useState(false);
    const isFloating = isFocused || value.length > 0;

    return (
        <div className={`relative group transition-all duration-300 rounded-2xl border ${isFocused ? 'border-purple-500/50 bg-purple-500/5 shadow-[0_0_15px_rgba(111,66,193,0.4)]' : 'border-white/5 bg-white/5'} overflow-hidden`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <motion.div
                    animate={isFocused ? { rotate: [0, -10, 10, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <Icon className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-purple-400' : 'text-slate-500'}`} />
                </motion.div>
            </div>
            
            <label 
                className={`absolute left-12 transition-all duration-300 pointer-events-none z-10 ${
                    isFloating 
                        ? 'top-2 text-[10px] font-black uppercase tracking-widest text-purple-400' 
                        : 'top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500'
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
                className={`w-full h-14 pl-12 pr-4 bg-transparent text-white outline-none transition-all ${isFloating ? 'pt-4' : ''}`}
                required={required}
            />
            
            {/* Focus Glow Line */}
            <AnimatePresence>
                {isFocused && (
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, error, setError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [keyword, setKeyword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isHoveringButton, setIsHoveringButton] = useState(false);
    
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
                if (!keyword) {
                    setError('A palavra-chave de convite é obrigatória.');
                    setIsLoading(false);
                    return;
                }
                await onRegister(username, password, keyword);
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
        setKeyword('');
        setError('');
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-black relative overflow-hidden font-sans">
            {/* Radial Gradient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e0a3c_0%,_#000000_100%)] opacity-80"></div>

            {/* Background Decorative Elements */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <motion.div 
                        key={i}
                        animate={{ 
                            y: [0, Math.random() * 40 - 20, 0],
                            x: [0, Math.random() * 40 - 20, 0],
                            opacity: [0.1, 0.4, 0.1]
                        }}
                        transition={{ 
                            duration: 5 + Math.random() * 5, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: Math.random() * 5
                        }}
                        className="absolute w-1 h-1 bg-purple-400 rounded-full shadow-[0_0_10px_#a855f7]"
                        style={{ 
                            top: `${Math.random() * 100}%`, 
                            left: `${Math.random() * 100}%` 
                        }}
                    />
                ))}
            </div>
            
            <div className="w-full max-w-[440px] relative z-10 flex flex-col items-center">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        {/* Neon Aura */}
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-purple-600 rounded-full blur-2xl"
                        />
                        
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 p-0.5 shadow-[0_0_30px_rgba(168,85,247,0.4)] mb-4 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full rounded-full bg-[#050a1f] flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-purple-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L14.59 9.41L22 12L14.59 14.59L12 22L9.41 14.59L2 12L9.41 9.41L12 2Z" fill="currentColor"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden">
                        <h1 className="text-4xl font-black text-white tracking-tighter flex items-center">
                            HRK<span className="text-purple-500">.</span>
                        </h1>
                        {/* Scan Animation */}
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '200%' }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent skew-x-12"
                        />
                    </div>
                    
                    <p className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase mt-2">Binary Operations Management</p>
                    <p className="text-slate-500 text-[9px] font-medium mt-1">Otimize sua gestão de banca com a HRK</p>
                </div>

                {/* Login Card - Glassmorphism */}
                <div className="w-full bg-black/40 border border-white/5 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <FloatingInput 
                            label="Usuário"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            icon={UserIcon}
                            required
                        />
                        
                        <FloatingInput 
                            label="Senha"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={LockClosedIcon}
                            required
                        />
                        
                        {isRegistering && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-5"
                            >
                                <FloatingInput 
                                    label="Confirmar Senha"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    icon={LockClosedIcon}
                                    required
                                />
                                <FloatingInput 
                                    label="Palavra-Chave de Convite"
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    icon={SparklesIcon}
                                    required
                                />
                            </motion.div>
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
                                    <div className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${rememberMe ? 'bg-purple-600 border-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-white/5 border-white/10 group-hover:border-purple-500/50'}`}>
                                        {rememberMe && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 ml-3 group-hover:text-slate-300 transition-colors">Lembrar acesso</span>
                                </label>
                            </div>
                        )}

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                            >
                                 <p className="text-[10px] text-red-500 text-center font-black uppercase tracking-widest">{error}</p>
                            </motion.div>
                        )}
                        
                        <div className="relative">
                            {/* Particle Effect on Hover */}
                            <AnimatePresence>
                                {isHoveringButton && !isLoading && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        {[...Array(8)].map((_, i) => (
                                            <motion.div 
                                                key={i}
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ 
                                                    opacity: [0, 1, 0],
                                                    scale: [0, 1.5, 0],
                                                    x: (Math.random() - 0.5) * 100,
                                                    y: (Math.random() - 0.5) * 60
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                                                className="absolute top-1/2 left-1/2 w-1 h-1 bg-purple-400 rounded-full"
                                            />
                                        ))}
                                    </div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={isLoading}
                                onMouseEnter={() => setIsHoveringButton(true)}
                                onMouseLeave={() => setIsHoveringButton(false)}
                                className="w-full h-14 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] relative overflow-hidden group"
                            >
                                <span className="relative z-10">{isLoading ? 'PROCESSANDO...' : isRegistering ? 'CRIAR CONTA' : 'ENTRAR NO DASHBOARD'}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={toggleView}
                            disabled={isLoading}
                            className="text-[11px] font-black uppercase tracking-widest text-slate-500 transition-all group"
                        >
                            {isRegistering ? (
                                <>Já tem uma conta? <span className="text-purple-400 group-hover:text-purple-300 relative inline-block">
                                    Login
                                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-purple-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
                                </span></>
                            ) : (
                                <>Novo por aqui? <span className="text-purple-400 group-hover:text-purple-300 relative inline-block">
                                    Crie uma conta
                                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-purple-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
                                </span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
