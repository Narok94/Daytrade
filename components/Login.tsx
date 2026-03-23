import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, 
    Lock, 
    Key, 
    ChevronRight, 
    CandlestickChart, 
    TrendingUp, 
    BarChart3,
    ShieldCheck,
    Zap,
    ArrowRight
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

    // Decorative Candlestick Component
    const Candle = ({ height, color, delay }: { height: number, color: string, delay: number }) => (
        <motion.div 
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.8, delay }}
            className="flex flex-col items-center justify-center w-2 mx-1"
        >
            <div className={`w-[1px] h-4 ${color === 'green' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
            <div className={`w-2 rounded-sm ${color === 'green' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} style={{ height: `${height}px` }}></div>
            <div className={`w-[1px] h-4 ${color === 'green' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
        </motion.div>
    );

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#020617] relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Immersive Background Elements */}
            <div className="absolute inset-0 z-0">
                {/* Grid Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
                
                {/* Neon Glows */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]"
                ></motion.div>
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]"
                ></motion.div>
                
                {/* Floating Particles */}
                {[...Array(15)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ 
                            x: Math.random() * 100 + "%", 
                            y: Math.random() * 100 + "%",
                            opacity: Math.random() * 0.5
                        }}
                        animate={{ 
                            y: [null, Math.random() * -100 - 50 + "px"],
                            opacity: [null, 0]
                        }}
                        transition={{ 
                            duration: Math.random() * 10 + 10, 
                            repeat: Infinity, 
                            ease: "linear",
                            delay: Math.random() * 10
                        }}
                        className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]"
                    ></motion.div>
                ))}
            </div>

            <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
                {/* Left Side: Branding & Visuals */}
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="hidden lg:flex flex-col space-y-8"
                >
                    <div className="space-y-4">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest uppercase">
                            <Zap className="w-3 h-3" />
                            <span>Next-Gen Trading Engine</span>
                        </div>
                        <h1 className="text-6xl font-black text-white leading-tight tracking-tighter">
                            DOMINE O <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">MERCADO</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                            Gestão profissional para operações binárias com tecnologia de ponta e análise em tempo real.
                        </p>
                    </div>

                    {/* Candlestick Visualizer */}
                    <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <img 
                                src="https://images.unsplash.com/photo-1611974717483-9b25020dadf8?q=80&w=1000&auto=format&fit=crop" 
                                alt="Trading Background" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                            <TrendingUp className="w-12 h-12 text-cyan-400" />
                        </div>
                        <div className="flex items-end h-32 space-x-1">
                            <Candle height={40} color="green" delay={0.1} />
                            <Candle height={60} color="green" delay={0.2} />
                            <Candle height={30} color="red" delay={0.3} />
                            <Candle height={50} color="green" delay={0.4} />
                            <Candle height={80} color="green" delay={0.5} />
                            <Candle height={40} color="red" delay={0.6} />
                            <Candle height={20} color="red" delay={0.7} />
                            <Candle height={60} color="green" delay={0.8} />
                            <Candle height={90} color="green" delay={0.9} />
                            <Candle height={50} color="red" delay={1.0} />
                            <Candle height={30} color="red" delay={1.1} />
                            <Candle height={70} color="green" delay={1.2} />
                        </div>
                        <div className="mt-4 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                            <span>Real-time Analysis</span>
                            <span className="text-emerald-400">+12.4% Volatility</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3 text-slate-300">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                            </div>
                            <span className="text-sm font-medium">Segurança Total</span>
                        </div>
                        <div className="flex items-center space-x-3 text-slate-300">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-sm font-medium">Analytics Avançado</span>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side: Login Form */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="w-full flex justify-center"
                >
                    <div className="w-full max-w-[440px] bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                        {/* Neon Border Effect */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                        
                        <div className="flex flex-col items-center mb-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 p-[1px] shadow-[0_0_20px_rgba(6,182,212,0.3)] mb-6">
                                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
                                    <CandlestickChart className="w-8 h-8 text-cyan-400" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">
                                {isRegistering ? 'Criar Conta' : 'Bem-vindo'}
                            </h2>
                            <p className="text-slate-500 text-sm mt-2">
                                {isRegistering ? 'Comece sua jornada hoje' : 'Acesse sua central de operações'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                        placeholder="Seu nome de usuário"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
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
                                        className="space-y-5 overflow-hidden"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Palavra-Chave</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Key className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={keyword}
                                                    onChange={(e) => setKeyword(e.target.value)}
                                                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                                    placeholder="Convite obrigatório"
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
                                        <div className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${rememberMe ? 'bg-cyan-500 border-cyan-500' : 'bg-slate-950/50 border-white/10 group-hover:border-cyan-500/50'}`}>
                                            {rememberMe && <ShieldCheck className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 ml-3 group-hover:text-slate-300 transition-colors">Lembrar acesso</span>
                                    </label>
                                    <button type="button" className="text-xs font-medium text-cyan-500 hover:text-cyan-400 transition-colors">Esqueceu a senha?</button>
                                </div>
                            )}

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                                >
                                     <p className="text-[11px] text-rose-400 text-center font-bold uppercase tracking-wider">{error}</p>
                                </motion.div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center space-x-2 group"
                            >
                                <span>{isLoading ? 'PROCESSANDO...' : isRegistering ? 'CRIAR CONTA' : 'INICIAR SESSÃO'}</span>
                                {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <button
                                type="button"
                                onClick={toggleView}
                                disabled={isLoading}
                                className="text-xs font-bold text-slate-500 tracking-widest uppercase transition-all hover:text-white"
                            >
                                {isRegistering ? (
                                    <>Já possui conta? <span className="text-cyan-500">Login</span></>
                                ) : (
                                    <>Novo usuário? <span className="text-cyan-500">Registrar</span></>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
            
            {/* Mobile Candlestick Decoration (Bottom) */}
            <div className="lg:hidden absolute bottom-0 left-0 w-full flex justify-center opacity-20 pointer-events-none">
                <div className="flex items-end h-16 space-x-1">
                    <Candle height={20} color="green" delay={0.1} />
                    <Candle height={30} color="green" delay={0.2} />
                    <Candle height={15} color="red" delay={0.3} />
                    <Candle height={25} color="green" delay={0.4} />
                    <Candle height={40} color="green" delay={0.5} />
                </div>
            </div>
        </div>
    );
};

export default Login;
