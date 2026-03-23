import React, { useState } from 'react';
import { 
    UserIcon, 
    LockClosedIcon, 
    SparklesIcon, 
    TrendingUpIcon, 
    TargetIcon, 
    CandlestickIcon,
    GlobeIcon,
    ShieldCheckIcon,
    RocketLaunchIcon,
    CommandLineIcon
} from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
    onLogin: (username: string, password: string, rememberMe: boolean) => Promise<boolean>;
    onRegister: (username: string, password: string, keyword: string) => Promise<void>;
    error: string;
    setError: (error: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, error, setError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [keyword, setKeyword] = useState('');
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
        <div className="min-h-screen w-full flex bg-[#020617] overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Atmospheric Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full animate-pulse-glow" style={{ animationDelay: '4s' }} />
            </div>

            {/* Scanning Line Effect */}
            <motion.div 
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent z-10 pointer-events-none"
            />

            {/* Data Stream Overlay */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] z-10">
                <div className="absolute top-0 left-4 bottom-0 w-px bg-indigo-500" />
                <div className="absolute top-0 left-12 bottom-0 w-px bg-indigo-500" />
                <div className="absolute top-0 right-4 bottom-0 w-px bg-indigo-500" />
                
                <div className="flex flex-col gap-4 p-4 font-mono text-[8px] text-indigo-400 uppercase tracking-widest">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div 
                            key={i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                        >
                            {`SYS_LOG_0x${Math.random().toString(16).slice(2, 8)} >> AUTH_READY`}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Left Side - Visual/Marketing (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-white/5">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="https://images.unsplash.com/photo-1611974717483-9b25022ecf17?q=80&w=2070&auto=format&fit=crop" 
                        alt="Trading Background" 
                        className="w-full h-full object-cover opacity-30 scale-105 animate-slow-zoom"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-transparent to-[#020617] opacity-95"></div>
                    <div className="absolute inset-0 bg-[#020617]/60 backdrop-blur-[4px]"></div>
                </div>

                {/* Animated Candlesticks Background - More dynamic */}
                <div className="absolute inset-0 z-10 opacity-30 pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ 
                                opacity: [0, 0.8, 0],
                                y: [-50, -300],
                                x: Math.sin(i * 0.5) * 80
                            }}
                            transition={{ 
                                duration: 10 + Math.random() * 8, 
                                repeat: Infinity, 
                                delay: i * 0.6,
                                ease: "linear"
                            }}
                            className="absolute bottom-0"
                            style={{ left: `${(i + 1) * 6}%` }}
                        >
                            <div className={`w-[2px] h-20 ${i % 3 === 0 ? 'bg-emerald-400 shadow-[0_0_20px_#34d399]' : i % 3 === 1 ? 'bg-rose-400 shadow-[0_0_20px_#fb7185]' : 'bg-indigo-400 shadow-[0_0_20px_#818cf8]'} rounded-full opacity-40`} />
                            <div className={`w-4 h-12 ${i % 3 === 0 ? 'bg-emerald-400/30' : i % 3 === 1 ? 'bg-rose-400/30' : 'bg-indigo-400/30'} -ml-[7px] rounded-sm border border-white/10 backdrop-blur-[1px]`} />
                        </motion.div>
                    ))}
                </div>

                {/* Content Overlay */}
                <div className="relative z-20 w-full h-full flex flex-col justify-center p-20 space-y-16">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
                            <SparklesIcon className="w-3.5 h-3.5 animate-pulse" />
                            Next-Gen Trading Intelligence
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-7xl font-black text-white leading-[0.9] tracking-tighter font-display transform -skew-x-6">
                                DOMINE O <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_20px_rgba(129,140,248,0.3)]">MERCADO</span>
                            </h2>
                        </div>
                        <p className="text-slate-400 text-xl max-w-md font-medium leading-relaxed opacity-80">
                            Gestão profissional de operações binárias com análise de IA em tempo real e controle de juros compostos.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-2 gap-8 max-w-xl">
                        {[
                            { icon: GlobeIcon, title: "Global", desc: "Mercados mundiais 24/7", color: "text-indigo-400" },
                            { icon: ShieldCheckIcon, title: "Seguro", desc: "Proteção de dados militar", color: "text-emerald-400" },
                            { icon: RocketLaunchIcon, title: "Rápido", desc: "Execução ultra-veloz", color: "text-pink-400" },
                            { icon: CommandLineIcon, title: "API", desc: "Integração via terminal", color: "text-amber-400" }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.5 + (i * 0.1) }}
                                className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-xl hover:bg-white/[0.08] hover:border-white/10 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <item.icon className={`w-10 h-10 ${item.color} mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`} />
                                <h4 className="text-white font-black text-sm uppercase tracking-[0.15em] font-display">{item.title}</h4>
                                <p className="text-slate-500 text-xs mt-2 font-medium leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
                {/* Mobile Background Image (Only on small screens) */}
                <div className="lg:hidden absolute inset-0 z-0">
                    <img 
                        src="https://images.unsplash.com/photo-1611974717483-9b25022ecf17?q=80&w=2070&auto=format&fit=crop" 
                        alt="Trading Background" 
                        className="w-full h-full object-cover opacity-10"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]"></div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[440px] relative"
                >
                    {/* Brand Header */}
                    <div className="flex flex-col items-center mb-16 lg:hidden">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-[0_0_40px_rgba(79,70,229,0.2)] mb-6 flex items-center justify-center overflow-hidden rotate-6">
                            <div className="w-full h-full rounded-3xl bg-[#020617] flex items-center justify-center -rotate-6">
                                <CandlestickIcon className="w-12 h-12 text-indigo-400" />
                            </div>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter font-display">
                            HRK<span className="text-indigo-500">.</span>
                        </h1>
                    </div>

                    {/* Form Container */}
                    <div className="bg-white/[0.03] lg:bg-white/[0.01] border border-white/10 lg:border-white/[0.05] p-10 md:p-12 rounded-[3rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                        {/* Subtle Glow Effect */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full group-hover:bg-indigo-500/20 transition-colors duration-700" />
                        
                        <div className="mb-12 relative z-10">
                            <h3 className="text-4xl font-black text-white tracking-tight font-display">
                                {isRegistering ? 'Crie sua conta' : 'Bem-vindo'}
                            </h3>
                            <div className="flex items-center gap-3 mt-3">
                                <div className="h-[1px] w-8 bg-indigo-500/50" />
                                <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">
                                    {isRegistering ? 'Trading Profissional' : 'Terminal de Acesso'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Usuário</label>
                                    <span className="text-[9px] font-mono text-indigo-500/50 uppercase tracking-widest">Required</span>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <UserIcon className="w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full h-16 pl-14 pr-5 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-700 outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all font-medium text-sm"
                                        placeholder="Seu nome de usuário"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Senha</label>
                                    <span className="text-[9px] font-mono text-indigo-500/50 uppercase tracking-widest">Encrypted</span>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <LockClosedIcon className="w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-16 pl-14 pr-5 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-700 outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all font-medium text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <AnimatePresence mode="wait">
                                {isRegistering && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-6 overflow-hidden"
                                    >
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 px-1">Confirmar Senha</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                    <LockClosedIcon className="w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full h-16 pl-14 pr-5 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-700 outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all font-medium text-sm"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 px-1">Chave de Convite</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                    <SparklesIcon className="w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={keyword}
                                                    onChange={(e) => setKeyword(e.target.value)}
                                                    className="w-full h-16 pl-14 pr-5 rounded-2xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-700 outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all font-medium text-sm"
                                                    placeholder="Sua chave de acesso"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!isRegistering && (
                                <div className="flex items-center justify-between px-1">
                                    <label className="flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-white/[0.03] border-white/10 group-hover:border-indigo-500/50'}`}>
                                            {rememberMe && (
                                                <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </motion.svg>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 ml-3 group-hover:text-slate-300 transition-colors uppercase tracking-[0.15em]">Lembrar</span>
                                    </label>
                                    <button type="button" className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-[0.15em]">Recuperar Senha</button>
                                </div>
                            )}

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl"
                                >
                                     <p className="text-[10px] text-rose-500 text-center font-black uppercase tracking-wider leading-relaxed">{error}</p>
                                </motion.div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-18 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.3em] shadow-[0_15px_40px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] mt-4 relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Processando</span>
                                    </div>
                                ) : (
                                    <span className="relative z-10">{isRegistering ? 'Criar Conta Agora' : 'Acessar Terminal'}</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 text-center">
                            <button
                                type="button"
                                onClick={toggleView}
                                disabled={isLoading}
                                className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] transition-all group"
                            >
                                {isRegistering ? (
                                    <>Já possui conta? <span className="text-indigo-400 group-hover:text-indigo-300 underline underline-offset-4">Faça Login</span></>
                                ) : (
                                    <>Não tem conta? <span className="text-indigo-400 group-hover:text-indigo-300 underline underline-offset-4">Registre-se grátis</span></>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-12 flex justify-center gap-8 opacity-30">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest font-mono">Server Online</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest font-mono">v2.4.0-Stable</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
