import React, { useState, useCallback, useEffect } from 'react';
import App from '../../App';
import { UserIcon, LockClosedIcon, SparklesIcon } from '../../components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';

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
        <div className={`relative group transition-all duration-300 rounded-2xl border ${isFocused ? 'border-[#00FFFF] bg-[#00FFFF]/5 shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'border-white/5 bg-white/5'} overflow-hidden`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <motion.div
                    animate={isFocused ? { rotate: [0, -10, 10, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <Icon className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-[#00FFFF]' : 'text-slate-500'}`} />
                </motion.div>
            </div>
            
            <label 
                className={`absolute left-12 transition-all duration-300 pointer-events-none z-10 ${
                    isFloating 
                        ? 'top-2 text-[10px] font-black uppercase tracking-widest text-[#00FFFF]' 
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
                        className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00FFFF] to-transparent opacity-50"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const LoginPage: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            let savedUserJSON = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
            if (!savedUserJSON) return null;
            return JSON.parse(savedUserJSON);
        } catch (error) {
            return null;
        }
    });

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isHoveringButton, setIsHoveringButton] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const resData = await response.json();

            if (response.ok) {
                const user: User = resData.user;
                const token: string = resData.token;
                
                setCurrentUser(user);
                
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                sessionStorage.setItem('authToken', token);
                
                if (rememberMe) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    localStorage.setItem('authToken', token);
                } else {
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('authToken');
                }
            } else {
                setError(resData.error || 'Credenciais inválidas. Use admin/admin.');
            }
        } catch (err) {
            setError('Erro de conexão ao servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        sessionStorage.clear();
        localStorage.clear();
    }, []);

    if (currentUser) {
        return <App user={currentUser} onLogout={handleLogout} />;
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#050505] relative overflow-hidden font-sans">
            {/* Neon Aura Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FFFF]/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FFD700]/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-[440px] relative z-10 flex flex-col items-center">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <motion.div 
                            animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-[#00FFFF] rounded-full blur-2xl"
                        />
                        
                        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#00FFFF] to-[#FFD700] p-[2px] shadow-[0_0_40px_rgba(0,255,255,0.3)] mb-6 flex items-center justify-center overflow-hidden">
                            <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                                <SparklesIcon className="w-12 h-12 text-[#FFD700]" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase">
                            ODIN<span className="text-[#00FFFF]">.</span>
                        </h1>
                        <p className="text-[#FFD700] text-[10px] font-bold tracking-[0.4em] uppercase mt-2">Performance Daytrade</p>
                        <p className="text-slate-500 text-[11px] font-medium mt-3 max-w-[280px]">Otimize sua gestão de banca com a ODIN PERFORMANCE DAYTRADE</p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="w-full bg-white/[0.02] border border-white/5 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    <form onSubmit={handleLogin} className="space-y-6">
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
                        
                        <div className="flex items-center px-1 justify-between">
                            <label className="flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${rememberMe ? 'bg-[#00FFFF] border-[#00FFFF] shadow-[0_0_10px_rgba(0,255,255,0.4)]' : 'bg-white/5 border-white/10 group-hover:border-[#00FFFF]/50'}`}>
                                    {rememberMe && (
                                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-3 group-hover:text-slate-300 transition-colors">Lembrar</span>
                            </label>
                            
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFD700]/60 hover:text-[#FFD700] cursor-pointer transition-colors">Recuperar senha</span>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                            >
                                <p className="text-[10px] text-red-400 text-center font-bold uppercase tracking-widest">{error}</p>
                            </motion.div>
                        )}
                        
                        <div className="relative pt-2">
                            <button
                                type="submit"
                                onMouseEnter={() => setIsHoveringButton(true)}
                                onMouseLeave={() => setIsHoveringButton(false)}
                                disabled={isLoading}
                                className="w-full h-15 bg-[#00FFFF] hover:scale-[1.02] active:scale-[0.98] text-black font-black rounded-2xl uppercase text-[12px] tracking-[0.2em] shadow-[0_10px_30px_rgba(0,255,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                            >
                                <span className="relative z-10">{isLoading ? 'PROCESSANDO...' : 'ENTRAR NO DASHBOARD'}</span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">
                             Premium Access System <span className="text-[#FFD700]">v2.0</span>
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Branding Footer */}
            <div className="absolute bottom-8 left-0 w-full text-center opacity-30">
                <p className="text-[9px] font-black tracking-[0.8em] text-white uppercase">ODIN PERFORMANCE</p>
            </div>
        </div>
    );
};

export default LoginPage;
