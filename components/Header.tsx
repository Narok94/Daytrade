import React from 'react';
import { motion } from 'motion/react';
import { 
    LogoutIcon, LayoutGridIcon, 
    ListBulletIcon, TargetIcon, 
    CalculatorIcon, 
    ChartBarIcon, DocumentTextIcon,
    CpuChipIcon, UsersIcon, ShieldCheckIcon, SparklesIcon
} from './icons';
import { User, Brokerage } from '../types';

interface HeaderProps {
    user: User;
    serverStatus: 'online' | 'offline' | 'checking';
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    brokerages: Brokerage[];
    activeBrokerageId: string | null;
    setActiveBrokerageId: (id: string) => void;
    brokerageBalances: Array<{ name: string; balance: number; currency: 'BRL' | 'USD' }>;
    formatMoney: (val: number) => string;
    theme: any;
    savingStatus: 'idle' | 'saving' | 'saved' | 'error';
    isDarkMode: boolean;
}

const SavingStatusIndicator: React.FC<{ status: 'idle' | 'saving' | 'saved' | 'error' }> = ({ status }) => {
    if (status === 'idle') return null;
    const colors = {
        saving: 'text-amber-400',
        saved: 'text-green-400',
        error: 'text-red-400',
        idle: ''
    };
    const labels = {
        saving: 'Salvando...',
        saved: 'Sincronizado',
        error: 'Erro ao salvar',
        idle: ''
    };
    return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 animate-in fade-in duration-300">
            <div className={`w-1 h-1 rounded-full ${status === 'saving' ? 'bg-amber-400 animate-pulse' : status === 'saved' ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className={`text-[6px] font-black uppercase tracking-widest ${colors[status]}`}>{labels[status]}</span>
        </div>
    );
};

export const Header: React.FC<HeaderProps> = ({
    user, serverStatus, activeTab, setActiveTab, onLogout,
    brokerages, activeBrokerageId, setActiveBrokerageId,
    brokerageBalances, formatMoney, theme, savingStatus, isDarkMode
}) => {
    return (
        <header className={`flex-none flex flex-col border-b ${theme.border} ${theme.header}`}>
            {/* Top Row */}
            <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/5">
                <div className="flex items-center gap-2 md:gap-6">
                    {/* ODIN Branding */}
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute inset-0 bg-[#CDAD7D] rounded-full blur-xl"
                            />
                            <div className="relative w-7 h-7 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-[#CDAD7D] to-[#8B7355] p-0.5 flex items-center justify-center shadow-lg shadow-[#CDAD7D]/20">
                                <div className="w-full h-full rounded-[10px] bg-[#050a1f] flex items-center justify-center">
                                    <ShieldCheckIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#CDAD7D]" />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col leading-none">
                            <div className="relative overflow-hidden">
                                <span className="text-base md:text-xl font-black tracking-tighter text-[#CDAD7D]">ODIN<span className="text-[#00D1FF] ml-0.5">.</span></span>
                                <motion.div 
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '200%' }}
                                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                                />
                            </div>
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] text-[#00D1FF]">Performance Daytrade</span>
                        </div>
                    </div>

                    {/* Admin Specific Content - Market Status */}
                    {user.username.toLowerCase() === 'henrique' ? (
                        <button 
                            onClick={() => {
                                // In a real app, this would toggle system settings
                                // For this theme demo, we provide the interactive UI requested
                            }}
                            className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#CDAD7D]/10 border border-[#CDAD7D]/20 text-[7px] font-black uppercase tracking-widest text-[#CDAD7D] hover:bg-[#CDAD7D]/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <div className="w-1 h-1 rounded-full bg-[#CDAD7D] animate-pulse" />
                            Market: Active
                        </button>
                    ) : (
                        /* Server Status for all others */
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[7px] font-black uppercase tracking-widest">
                            <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-[#00D1FF] animate-pulse' : serverStatus === 'offline' ? 'bg-red-500' : 'bg-slate-500'}`} />
                            <span className={serverStatus === 'online' ? 'text-[#00D1FF]' : 'text-slate-500'}>
                                Server: {serverStatus === 'online' ? 'On' : serverStatus === 'offline' ? 'Off' : '...'}
                            </span>
                        </div>
                    )}

                    <SavingStatusIndicator status={savingStatus} />
                    
                    <div className="flex items-center gap-1 md:gap-2 ml-1 md:ml-4">
                        <select 
                            value={activeBrokerageId || ''} 
                            onChange={(e) => setActiveBrokerageId(e.target.value)}
                            className={`text-[8px] md:text-xs font-black uppercase tracking-widest bg-transparent border-none focus:ring-0 cursor-pointer truncate ${theme.text}`}
                        >
                            {brokerages.map(b => (
                                <option key={b.id} value={b.id} className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-6">
                    <div className="hidden sm:flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar py-1">
                        {brokerageBalances.map((b, i) => (
                            <div key={i} className={`flex flex-col items-end px-2 md:px-3 py-0.5 md:py-1 rounded-lg md:rounded-xl border shrink-0 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-zinc-200/50 border-zinc-300/50'}`}>
                                <span className="text-[5px] md:text-[7px] font-black uppercase opacity-40 leading-none">{b.name}</span>
                                <span className={`text-[7px] md:text-xs font-bold leading-tight ${b.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {b.currency === 'USD' ? '$' : 'R$'} {formatMoney(b.balance)}
                                </span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`relative group transition-all hover:scale-105 active:scale-95 ${activeTab === 'settings' ? 'ring-2 ring-[#00D1FF] ring-offset-2 ring-offset-[#0f172a]' : ''}`}
                            title="Configurações"
                        >
                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-[#00D1FF] flex items-center justify-center text-[#050a1f] font-black text-[8px] md:text-xs shadow-lg shadow-[#00D1FF]/20">
                                {user.username.slice(0, 2).toUpperCase()}
                            </div>
                            {user.isAdmin && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-[#CDAD7D] rounded-full border-2 border-[#0f172a] flex items-center justify-center" title="Administrador">
                                    <SparklesIcon className="w-1.5 h-1.5 md:w-2 md:h-2 text-white" />
                                </div>
                            )}
                        </button>
                        <button 
                            onClick={onLogout}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
                            title="Sair"
                        >
                            <LogoutIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Row */}
            <div className="h-12 md:h-14 flex items-center justify-center px-4 md:px-8 overflow-x-auto no-scrollbar gap-1 md:gap-2">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutGridIcon },
                    { id: 'ai-analysis', label: 'Análise IA', icon: CpuChipIcon },
                    { id: 'compound', label: 'Juros Compostos', icon: ChartBarIcon },
                    { id: 'history', label: 'Histórico', icon: ListBulletIcon },
                    { id: 'soros', label: 'Calc Soros', icon: CalculatorIcon },
                    { id: 'goals', label: 'Metas', icon: TargetIcon },
                    { id: 'management-sheet', label: 'Planilha Gestão', icon: DocumentTextIcon },
                    ...(user.isAdmin ? [{ id: 'admin', label: 'Admin', icon: UsersIcon }] : [])
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-[9px] md:text-[11px] uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 ${
                            activeTab === item.id 
                                ? 'bg-[#00D1FF] text-[#050a1f] shadow-lg shadow-[#00D1FF]/20' 
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                    >
                        <item.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        {item.label}
                    </button>
                ))}
            </div>
        </header>
    );
};
