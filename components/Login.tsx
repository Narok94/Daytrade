import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, 
    Lock, 
    ShieldCheck, 
    TrendingUp, 
    TrendingDown, 
    CandlestickChart, 
    ArrowRight,
    ChevronRight,
    Key,
    Activity,
    Zap,
    Globe,
    Cpu,
    Fingerprint
} from 'lucide-react';

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
        <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 bg-[#020617] relative overflow-hidden font-sans">
            {/* Cyberpunk Grid Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
                    }}
                ></div>
                
                {/* Moving Grid Lines */}
                <motion.div 
                    animate={{ y: [0, 40] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(to bottom, #6366f1 2px, transparent 2px)`,
                        backgroundSize: '100% 40px',
                    }}
                />
            </div>

            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2070&auto=format&fit=crop" 
                    alt="Trading Background" 
                    className="w-full h-full object-cover opacity-10"
                    referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]"></div>
            </div>

            {/* Decorative Candlesticks with Glow */}
            <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                <div className="absolute top-1/4 left-10 flex gap-3 items-end">
                    <motion.div animate={{ height: [40, 80, 40] }} transition={{ duration: 3, repeat: Infinity }} className="w-2 bg-green-500 rounded-sm shadow-[0_0_10px_#22c55e]"></motion.div>
                    <motion.div animate={{ height: [60, 120, 60] }} transition={{ duration: 4, repeat: Infinity }} className="w-2 bg-green-500 rounded-sm shadow-[0_0_10px_#22c55e]"></motion.div>
                    <motion.div animate={{ height: [30, 60, 30] }} transition={{ duration: 2.5, repeat: Infinity }} className="w-2 bg-red-500 rounded-sm shadow-[0_0_10px_#ef4444]"></motion.div>
                    <motion.div animate={{ height: [50, 100, 50] }} transition={{ duration: 5, repeat: Infinity }} className="w-2 bg-green-500 rounded-sm shadow-[0_0_10px_#22c55e]"></motion.div>
                </div>
                <div className="absolute bottom-1/4 right-10 flex gap-3 items-end">
                    <motion.div animate={{ height: [70, 30, 70] }} transition={{ duration: 3.5, repeat: Infinity }} className="w-2 bg-red-500 rounded-sm shadow-[0_0_10px_#ef4444]"></motion.div>
                    <motion.div animate={{ height: [40, 90, 40] }} transition={{ duration: 4.5, repeat: Infinity }} className="w-2 bg-red-500 rounded-sm shadow-[0_0_10px_#ef4444]"></motion.div>
                    <motion.div animate={{ height: [80, 40, 80] }} transition={{ duration: 2.8, repeat: Infinity }} className="w-2 bg-green-500 rounded-sm shadow-[0_0_10px_#22c55e]"></motion.div>
                    <motion.div animate={{ height: [50, 20, 50] }} transition={{ duration: 6, repeat: Infinity }} className="w-2 bg-red-500 rounded-sm shadow-[0_0_10px_#ef4444]"></motion.div>
                </div>
            </div>

            {/* Animated Glow Orbs */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div 
                    animate={{ 
                        opacity: [0.1, 0.3, 0.1], 
                        scale: [1, 1.5, 1],
                        x: [0, 50, 0],
                        y: [0, -50, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px]"
                />
                <motion.div 
                    animate={{ 
                        opacity: [0.1, 0.2, 0.1], 
                        scale: [1.5, 1, 1.5],
                        x: [0, -50, 0],
                        y: [0, 50, 0]
                    }}
                    transition={{ duration: 18, repeat: Infinity }}
                    className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]"
                />
            </div>

            <div className="w-full max-w-[500px] relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center mb-12"
                >
                    <div className="relative mb-8">
                        {/* Outer Glow Ring */}
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-4 rounded-full border border-dashed border-indigo-500/30"
                        />
                        
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-[0_0_50px_rgba(99,102,241,0.5)] flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            <div className="w-full h-full rounded-[1.4rem] bg-[#020617] flex items-center justify-center">
                                <CandlestickChart className="w-12 h-12 text-indigo-400" />
                            </div>
                        </div>
                        
                        <motion.div 
                            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 rounded-full border-4 border-[#020617] flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.8)]"
                        >
                            <Fingerprint className="w-4 h-4 text-white" />
                        </motion.div>
                    </div>
                    
                    <div className="text-center">
                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic shimmer-text">
                            HRK<span className="text-white">.</span>PRO
                        </h1>
                        <div className="flex items-center justify-center gap-3 mt-3">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-indigo-500/50"></div>
                            <p className="text-indigo-400 text-[11px] font-black tracking-[0.4em] uppercase">Quantum Trading Hub</p>
                            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-indigo-500/50"></div>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="glass-card p-8 md:p-12 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden group"
                >
                    {/* Scanline Effect */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem]">
                        <div className="w-full h-1 bg-indigo-500/20 absolute top-0 animate-scan" />
                    </div>

                    {/* Decorative Corner Accents */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-indigo-500/30 rounded-tl-[3rem]"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-indigo-500/30 rounded-br-[3rem]"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                    {isRegistering ? 'Registro' : 'Autenticação'}
                                </h2>
                                <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest mt-1">
                                    {isRegistering ? 'Criação de novo terminal' : 'Acesso ao sistema central'}
                                </span>
                            </div>
                            <div className="flex gap-1.5">
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></motion.div>
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.3 }} className="w-2 h-2 rounded-full bg-indigo-500/60"></motion.div>
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.6 }} className="w-2 h-2 rounded-full bg-indigo-500/30"></motion.div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <User className="w-3 h-3" /> Usuário
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Digite seu ID"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full h-16 pl-6 pr-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all font-bold text-lg shadow-inner"
                                        required
                                    />
                                    <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Lock className="w-3 h-3" /> Chave Mestra
                                </label>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-16 pl-6 pr-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all font-bold text-lg shadow-inner"
                                        required
                                    />
                                    <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
                                </div>
                            </div>
                            
                            <AnimatePresence mode="wait">
                                {isRegistering && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <ShieldCheck className="w-3 h-3" /> Verificar Chave
                                            </label>
                                            <div className="relative group">
                                                <input
                                                    type="password"
                                                    placeholder="Repetir senha"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full h-16 pl-6 pr-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all font-bold text-lg shadow-inner"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <Key className="w-3 h-3" /> Token de Convite
                                            </label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    placeholder="Código secreto"
                                                    value={keyword}
                                                    onChange={(e) => setKeyword(e.target.value)}
                                                    className="w-full h-16 pl-6 pr-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all font-bold text-lg shadow-inner"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!isRegistering && (
                                <div className="flex items-center justify-between px-2">
                                    <label className="flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-600 border-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.6)]' : 'bg-white/5 border-white/10 group-hover:border-indigo-500/50'}`}>
                                            {rememberMe && <Zap className="w-4 h-4 text-white fill-white" />}
                                        </div>
                                        <span className="text-[11px] font-black text-slate-500 ml-4 group-hover:text-slate-300 transition-colors uppercase tracking-widest">Persistir Sessão</span>
                                    </label>
                                    <button type="button" className="text-[10px] font-black text-indigo-400/60 hover:text-indigo-400 uppercase tracking-widest transition-colors">Esqueci a chave</button>
                                </div>
                            )}

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-5 bg-rose-500/10 border-l-4 border-rose-500 rounded-xl flex items-center gap-4"
                                >
                                     <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                                        <Activity className="w-5 h-5 text-rose-500" />
                                     </div>
                                     <p className="text-xs text-rose-200 font-bold uppercase tracking-wider leading-tight">{error}</p>
                                </motion.div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-20 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl uppercase text-sm tracking-[0.3em] shadow-[0_20px_40px_rgba(79,70,229,0.4)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-4 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                {isLoading ? (
                                    <Cpu className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <span className="relative z-10">{isRegistering ? 'Criar Terminal' : 'Inicializar Sistema'}</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform relative z-10" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-10 pt-10 border-t border-white/10 text-center">
                            <button
                                type="button"
                                onClick={toggleView}
                                disabled={isLoading}
                                className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-indigo-400 transition-all flex items-center justify-center gap-3 mx-auto group"
                            >
                                {isRegistering ? (
                                    <>Já possui acesso? <span className="text-indigo-500 group-hover:underline">Login</span></>
                                ) : (
                                    <>Novo operador? <span className="text-indigo-500 group-hover:underline">Cadastrar</span></>
                                ) }
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-12 flex items-center justify-center gap-12 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">Global Network</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                        <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">SSL Encrypted</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
