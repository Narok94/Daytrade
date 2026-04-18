import React, { useState, useCallback } from 'react';
import App from '../../App';
import { UserIcon, LockClosedIcon } from '../../components/icons';
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
        <div className={`relative group transition-all duration-300 rounded-none border-b ${isFocused ? 'border-[#00FFFF] bg-[#00FFFF]/5 shadow-[0_4px_10px_-5px_rgba(0,255,255,0.4)]' : 'border-white/10 bg-white/2'} overflow-hidden`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Icon className={`w-4 h-4 transition-colors duration-300 ${isFocused ? 'text-[#00FFFF]' : 'text-slate-500'}`} />
            </div>
            
            <label 
                className={`absolute left-10 transition-all duration-300 pointer-events-none z-10 ${
                    isFloating 
                        ? 'top-1 text-[9px] font-black uppercase tracking-widest text-[#00FFFF]' 
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
                className={`w-full h-14 pl-10 pr-4 bg-transparent text-white outline-none transition-all ${isFloating ? 'pt-4' : ''}`}
                required={required}
            />
            
            {/* Focus Underline */}
            <div className={`absolute bottom-0 left-0 h-[2px] bg-[#00FFFF] transition-all duration-500 ${isFocused ? 'w-full' : 'w-0'}`} />
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const targetUrl = window.location.origin + '/api/login';
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const resData = await response.json();

            if (response.ok) {
                const user: User = resData.user;
                
                setCurrentUser(user);
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            } else {
                setError(resData.error || 'Credenciais inválidas. Use admin/admin.');
            }
        } catch (err: any) {
            console.error('Login Error:', err);
            setError(`Erro de conexão: ${err.message || 'Falha na comunicação'}`);
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
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#050505] font-sans selection:bg-[#00FFFF]/30">
            
            <div className="w-full max-w-[400px] flex flex-col items-center">
                {/* Fixed Logo Section */}
                <div className="mb-10 text-center">
                    <img 
                        src="/logo-odin.png" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://picsum.photos/seed/odin-logo/400/400";
                        }}
                        alt="ODIN Logo" 
                        className="w-32 h-auto mb-6 mx-auto filter brightness-110 rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                        referrerPolicy="no-referrer"
                    />
                    
                    <h1 className="text-3xl font-black text-white tracking-[0.1em] uppercase">
                        ODIN PERFORMANCE
                    </h1>
                    <p className="text-[#FFD700] text-[11px] font-black tracking-[0.3em] uppercase mt-2">
                        Otimize sua gestão de banca com a ODIN PERFORMANCE DAYTRADE
                    </p>
                </div>

                {/* Login Container - Rectangular Design */}
                <div className="w-full bg-[#111] border border-white/5 p-8 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <FloatingInput 
                            label="Nome de Usuário"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            icon={UserIcon}
                            required
                        />
                        
                        <FloatingInput 
                            label="Senha de Acesso"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={LockClosedIcon}
                            required
                        />
                        
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-3 bg-red-500/10 border-l-2 border-red-500"
                            >
                                <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{error}</p>
                            </motion.div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-[#00FFFF] text-black font-black uppercase text-[13px] tracking-[0.15em] hover:bg-[#00E5E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_5px_15px_rgba(0,255,255,0.2)]"
                        >
                            {isLoading ? 'AUTENTICANDO...' : 'ENTRAR NO DASHBOARD'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#00FFFF] cursor-pointer transition-colors">
                            Esqueceu seu acesso?
                        </span>
                    </div>
                </div>

                {/* Footer Credits */}
                <div className="mt-12 text-center">
                    <p className="text-[9px] font-bold tracking-[0.5em] text-white/20 uppercase">
                        &copy; 2026 ODIN SYSTEMS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
