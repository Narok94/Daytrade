import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  Key, 
  CandlestickChart, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

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
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#020617] relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 grid-background opacity-20 pointer-events-none"></div>
            
            {/* Radial Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-glow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1s' }}></div>

            {/* Floating Candlesticks */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ 
                            opacity: [0.1, 0.3, 0.1],
                            y: [-20, 20, -20],
                            x: [-10, 10, -10]
                        }}
                        transition={{ 
                            duration: 5 + i, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: i * 0.5
                        }}
                        className="absolute"
                        style={{ 
                            top: `${15 + i * 15}%`, 
                            left: `${10 + i * 15}%`,
                            color: i % 2 === 0 ? '#22c55e' : '#ef4444'
                        }}
                    >
                        <div className="flex flex-col items-center">
                            <div className="w-[2px] h-8 bg-current opacity-50"></div>
                            <div className="w-4 h-12 bg-current rounded-sm shadow-[0_0_15px_rgba(var(--neon-color),0.5)]"></div>
                            <div className="w-[2px] h-6 bg-current opacity-50"></div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="w-full max-w-[480px] relative z-10">
                {/* Header Section */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center mb-10"
                >
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 animate-pulse"></div>
                        <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <CandlestickChart className="w-10 h-10 text-cyan-400 neon-glow-cyan" />
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-2 border border-dashed border-cyan-500/20 rounded-full"
                            ></motion.div>
                        </div>
                    </div>
                    
                    <h1 className="text-5xl font-black text-white tracking-tighter flex items-center gap-1">
                        HRK<span className="text-cyan-500 neon-text-cyan">.</span>OPS
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-slate-700"></div>
                        <p className="text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase">Binary Trading Intelligence</p>
                        <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-slate-700"></div>
                    </div>
                </motion.div>

                {/* Main Card */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group"
                >
                    {/* Card Border Glow */}
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-cyan-500/50 rounded-[2.5rem] blur-[2px] opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                    
                    <div className="relative bg-slate-900/80 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl overflow-hidden">
                        {/* Decorative Corner */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-[40px] rounded-full"></div>
                        
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {isRegistering ? 'Criar Nova Conta' : 'Bem-vindo de Volta'}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {isRegistering ? 'Inicie sua jornada no mercado financeiro.' : 'Acesse seu painel de operações binárias.'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                {/* Username Field */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Usuário</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="w-5 h-5 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Digite seu usuário"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                {/* Password Field */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
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
                                            className="space-y-4 overflow-hidden"
                                        >
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmar Senha</label>
                                                <div className="relative group/input">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <ShieldCheck className="w-5 h-5 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors" />
                                                    </div>
                                                    <input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Chave de Convite</label>
                                                <div className="relative group/input">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <Key className="w-5 h-5 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Insira sua chave"
                                                        value={keyword}
                                                        onChange={(e) => setKeyword(e.target.value)}
                                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {!isRegistering && (
                                <div className="flex items-center justify-between px-1">
                                    <label className="flex items-center cursor-pointer group/check">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={cn(
                                            "w-5 h-5 rounded-lg border transition-all flex items-center justify-center",
                                            rememberMe ? "bg-cyan-500 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" : "bg-slate-950 border-white/10 group-hover/check:border-cyan-500/50"
                                        )}>
                                            {rememberMe && <ArrowRight className="w-3 h-3 text-slate-950 stroke-[4]" />}
                                        </div>
                                        <span className="text-xs font-medium text-slate-400 ml-3 group-hover/check:text-slate-200 transition-colors">Manter conectado</span>
                                    </label>
                                    <button type="button" className="text-xs font-medium text-cyan-500/70 hover:text-cyan-400 transition-colors">Esqueceu a senha?</button>
                                </div>
                            )}

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <p className="text-xs text-red-500 font-medium">{error}</p>
                                </motion.div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <div className="flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            {isRegistering ? 'Ativar Conta' : 'Iniciar Operações'}
                                            <Zap className="w-4 h-4 fill-current" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>

                        <div className="mt-10 pt-8 border-t border-white/5 text-center">
                            <button
                                type="button"
                                onClick={toggleView}
                                disabled={isLoading}
                                className="text-xs font-bold text-slate-500 tracking-widest uppercase transition-all hover:text-slate-300"
                            >
                                {isRegistering ? (
                                    <>Possui Acesso? <span className="text-cyan-500 neon-text-cyan ml-1">Login</span></>
                                ) : (
                                    <>Novo Operador? <span className="text-cyan-500 neon-text-cyan ml-1">Registrar</span></>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
                
                {/* Footer Info */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-10 flex items-center justify-center gap-8"
                >
                    <div className="flex items-center gap-2 text-slate-500">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Market Open</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck className="w-4 h-4 text-cyan-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Secure SSL</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
