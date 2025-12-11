import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, TransactionRecord, AppRecord, Trade, User } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    SettingsIcon, PlusIcon, DepositIcon, WithdrawalIcon, XMarkIcon, 
    TrashIcon, LogoutIcon, BellIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, TrendingDownIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ChevronUpIcon, 
    ChevronDownIcon, ArrowPathIcon, CpuChipIcon
} from './components/icons';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';

interface GoalSettings {
    type: 'weekly' | 'monthly';
    amount: number | '';
}

// Helper to manage theme classes
const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
        cardHover: isDarkMode ? 'hover:shadow-md' : 'hover:shadow-md',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950' : 'bg-white border-b border-slate-200',
        tableHeader: isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50',
        tableRow: isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50',
        navActive: isDarkMode ? 'bg-slate-900/50 text-green-400' : 'bg-green-50 text-green-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
        modalOverlay: 'bg-black/80',
        modalContent: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
    }), [isDarkMode]);
};

// Helper function to flatten records into individual operations
const getFlattenedOperations = (records: AppRecord[]) => {
    let operations: any[] = [];
    
    records.forEach(record => {
        if (record.recordType === 'day') {
            // Add individual trades from the day
            record.trades.forEach(trade => {
                const profit = trade.result === 'win' 
                    ? (trade.entryValue * (trade.payoutPercentage / 100)) 
                    : -trade.entryValue;
                
                let ts = trade.timestamp;
                if (!ts) {
                        const parsedId = parseInt(trade.id);
                        if (!isNaN(parsedId) && parsedId > 1600000000000) {
                            ts = parsedId;
                        } else {
                            ts = new Date(record.date).getTime();
                        }
                }

                operations.push({
                    id: trade.id,
                    originalRecordId: record.id, // ID of the DailyRecord containing this trade
                    type: 'trade',
                    subType: trade.result,
                    timestamp: ts,
                    displayDate: new Date(ts).toLocaleDateString('pt-BR'),
                    displayTime: new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    value: trade.entryValue,
                    payout: trade.payoutPercentage,
                    profit: profit,
                    details: `${trade.payoutPercentage}% Payout`
                });
            });
        } else {
            // Add transaction
            let ts = record.timestamp;
            if (!ts) {
                    const parsedId = parseInt(record.id);
                    if (!isNaN(parsedId) && parsedId > 1600000000000) {
                        ts = parsedId;
                    } else {
                        ts = new Date(record.date).getTime();
                    }
            }

            operations.push({
                id: record.id,
                originalRecordId: record.id,
                type: 'transaction',
                subType: record.recordType,
                timestamp: ts,
                displayDate: new Date(ts).toLocaleDateString('pt-BR'),
                displayTime: new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                value: record.amountUSD,
                payout: null,
                profit: null,
                details: record.notes || (record.recordType === 'deposit' ? 'Depósito' : 'Saque')
            });
        }
    });

    // Sort by timestamp descending (newest first)
    return operations.sort((a, b) => b.timestamp - a.timestamp);
};

// --- Child Components ---

const Sidebar: React.FC<{
    activeTab: 'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze';
    setActiveTab: (tab: 'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze') => void;
    onLogout: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    isOpen: boolean;
    onClose: () => void;
}> = ({ activeTab, setActiveTab, onLogout, isDarkMode, toggleTheme, isOpen, onClose }) => {
    const theme = useThemeClasses(isDarkMode);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                ></div>
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${theme.sidebar}`}>
                <div className={`h-20 flex items-center justify-between px-6 ${isDarkMode ? 'border-b border-slate-900/50' : 'border-b border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className={`text-xl font-bold tracking-wider ${theme.text}`}>HRK <span className="text-green-500">Analytics</span></span>
                    </div>
                     <button onClick={onClose} className="md:hidden text-slate-500">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    <button 
                        onClick={() => { setActiveTab('dashboard'); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}
                    >
                        <LayoutGridIcon className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                        <span className="font-medium">Dashboard</span>
                    </button>
                    
                    <button 
                        onClick={() => { setActiveTab('operations'); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'operations' ? theme.navActive : theme.navInactive}`}
                    >
                        <ListBulletIcon className={`w-5 h-5 ${activeTab === 'operations' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                        <span className="font-medium">Histórico</span>
                    </button>

                    <button 
                        onClick={() => { setActiveTab('analyze'); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'analyze' ? theme.navActive : theme.navInactive}`}
                    >
                        <CpuChipIcon className={`w-5 h-5 ${activeTab === 'analyze' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                        <span className="font-medium">Analisar (IA)</span>
                    </button>
                    
                    <button 
                        onClick={() => { setActiveTab('goals'); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}
                    >
                        <TargetIcon className={`w-5 h-5 ${activeTab === 'goals' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                        <span className="font-medium">Metas</span>
                    </button>

                     <button 
                        onClick={() => { setActiveTab('settings'); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}
                    >
                        <SettingsIcon className={`w-5 h-5 ${activeTab === 'settings' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                        <span className="font-medium">Configurações</span>
                    </button>
                </nav>

                <div className={`p-6 border-t space-y-4 ${isDarkMode ? 'border-slate-900/50' : 'border-slate-100'}`}>
                     <button 
                        onClick={toggleTheme}
                        className={`w-full flex items-center gap-3 px-2 py-2 text-sm cursor-pointer transition-colors ${theme.navInactive}`}
                     >
                        {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        <span className="font-medium">{isDarkMode ? 'Tema Claro' : 'Tema Escuro'}</span>
                     </button>

                     <button onClick={onLogout} className={`w-full flex items-center gap-3 px-2 py-2 transition-colors ${isDarkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}`}>
                        <LogoutIcon className="w-5 h-5" />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

const Header: React.FC<{
    user: User;
    activeBrokerage: Brokerage | undefined;
    brokerages: Brokerage[];
    setActiveBrokerageId: (id: string) => void;
    isDarkMode: boolean;
    onOpenBriefing: () => void;
    onOpenMenu: () => void;
}> = ({ user, activeBrokerage, brokerages, setActiveBrokerageId, isDarkMode, onOpenBriefing, onOpenMenu }) => {
    const theme = useThemeClasses(isDarkMode);

    return (
        <header className={`h-20 flex items-center justify-between md:justify-end px-4 md:px-8 flex-shrink-0 ${theme.header}`}>
            <button 
                onClick={onOpenMenu}
                className="md:hidden text-slate-500 hover:text-slate-300 p-2"
            >
                <MenuIcon className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4 md:gap-6">
                <div className={`flex items-center gap-3 text-sm pr-4 md:pr-6 border-r ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                     {brokerages.length > 0 && (
                        <div className="relative">
                            <select
                                value={activeBrokerage?.id || ''}
                                onChange={(e) => setActiveBrokerageId(e.target.value)}
                                className={`bg-transparent border-none cursor-pointer text-sm font-semibold focus:ring-0 max-w-[150px] md:max-w-none truncate pr-8 ${isDarkMode ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-slate-900'}`}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                            >
                                {brokerages.map(b => (
                                    <option 
                                        key={b.id} 
                                        value={b.id}
                                        className={isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-900'}
                                    >
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <button 
                    onClick={onOpenBriefing}
                    className={`relative transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
                    title="Ver planejamento diário"
                >
                    <BellIcon className="w-5 h-5" />
                    {/* Notification dot */}
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                </button>
                
                <div className={`flex items-center gap-3 pl-2 border-l ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="text-right hidden sm:block">
                        <p className={`text-xs ${theme.textMuted}`}>Bem-vindo,</p>
                        <p className={`text-sm font-semibold ${theme.text}`}>{user.username}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-slate-950 font-bold text-sm shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                        {user.username.slice(0, 2).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
};

interface DashboardPanelProps {
    activeBrokerage: Brokerage;
    customEntryValue: string;
    setCustomEntryValue: React.Dispatch<React.SetStateAction<string>>;
    customPayout: string;
    setCustomPayout: React.Dispatch<React.SetStateAction<string>>;
    addRecord: (winCount: number, lossCount: number, customEntryValueUSD?: number, customPayoutPercentage?: number) => void;
    selectedDateString: string;
    setSelectedDate: (date: Date) => void;
    isTradingHalted: boolean;
    stopLossLimitReached: boolean;
    setStopLimitOverride: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    startBalanceForSelectedDay: number;
    dailyRecordForSelectedDay: DailyRecord | undefined;
    dailyGoalTarget: number;
    weeklyStats: { profit: number; wins: number; losses: number; totalTrades: number; winRate: number; startBalance: number; currentBalance: number; };
    sortedFilteredRecords: AppRecord[];
    handleDeleteRecord: (recordId: string) => void;
    deleteTrade: (dayId: string, tradeId: string) => void;
    setTransactionType: React.Dispatch<React.SetStateAction<'deposit' | 'withdrawal' | null>>;
    setIsTransactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    goal: Omit<GoalSettings, 'amount'> & { amount: number };
    isDarkMode: boolean;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
    activeBrokerage, customEntryValue, setCustomEntryValue,
    customPayout, setCustomPayout, addRecord, selectedDateString,
    setSelectedDate, isTradingHalted, stopLossLimitReached, setStopLimitOverride, startBalanceForSelectedDay,
    dailyRecordForSelectedDay, dailyGoalTarget, weeklyStats, sortedFilteredRecords,
    handleDeleteRecord, deleteTrade, setTransactionType, setIsTransactionModalOpen, goal, isDarkMode
}) => {
    const theme = useThemeClasses(isDarkMode);
    const [areKpisVisible, setAreKpisVisible] = useState(true);
    const [quantity, setQuantity] = useState('1');

    const handleQuickAdd = (type: 'win' | 'loss') => {
         const entryValue = customEntryValue ? parseFloat(customEntryValue) : undefined;
         const payout = customPayout ? parseFloat(customPayout) : undefined;
         const qty = parseInt(quantity) || 1;
         
         if (type === 'win') addRecord(qty, 0, entryValue, payout);
         else addRecord(0, qty, entryValue, payout);
         
         setQuantity('1'); // Reset
    };

    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) 
        : '0.0';
    
    // Chart Data Preparation
    const chartData = useMemo(() => {
        const last30Days = [...sortedFilteredRecords]
            .filter(r => r.recordType === 'day')
            .slice(-30)
            .map(r => ({
                date: r.recordType === 'day' ? r.date.substring(0, 5) : '', // DD/MM
                balance: r.endBalanceUSD,
                profit: (r as DailyRecord).netProfitUSD
            }));
        return last30Days;
    }, [sortedFilteredRecords]);

    // Flatten for Latest Operations table
    const individualOperations = useMemo(() => getFlattenedOperations(sortedFilteredRecords), [sortedFilteredRecords]);

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Header / Date Picker */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <h2 className={`text-2xl md:text-3xl font-bold mb-1 ${theme.text}`}>Dashboard</h2>
                    <p className={`text-sm md:text-base ${theme.textMuted}`}>Acompanhe sua performance em tempo real</p>
                </div>
                <div className="flex items-center gap-4">
                     <input
                        type="date"
                        value={selectedDateString}
                        onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00Z'))}
                        className={`w-full md:w-auto border rounded-lg px-4 py-2 focus:outline-none focus:border-slate-500 text-sm ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`}
                    />
                </div>
            </div>

            {/* Trading Halted Alert */}
             {isTradingHalted && (
                <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4" role="alert">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <div>
                            <p className="font-bold">Stop Atingido</p>
                            <p className="text-sm opacity-80">Você atingiu seu limite de {stopLossLimitReached ? 'perdas' : 'ganhos'} diário.</p>
                        </div>
                    </div>
                    <button onClick={() => setStopLimitOverride(prev => ({ ...prev, [selectedDateString]: true }))} className="w-full md:w-auto text-xs bg-red-900/40 hover:bg-red-900/60 px-4 py-2 rounded-lg border border-red-800/50 transition-colors uppercase font-bold tracking-wider whitespace-nowrap">
                        Liberar Operações
                    </button>
                </div>
            )}

            {/* Mobile Toggle for KPIs */}
            <div className="flex justify-end md:hidden mb-2">
                <button
                    onClick={() => setAreKpisVisible(!areKpisVisible)}
                    className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${theme.navInactive}`}
                >
                    {areKpisVisible ? 'Ocultar Resumo' : 'Mostrar Resumo'}
                    {areKpisVisible ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </button>
            </div>

            {/* KPI Cards */}
            <div className={`${areKpisVisible ? 'grid' : 'hidden'} grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all`}>
                {/* Banca Atual */}
                <div className={`p-4 md:p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className={`${theme.textMuted} text-[9px] md:text-[10px] font-bold uppercase tracking-widest`}>Banca Atual</p>
                            <p className={`text-xl md:text-2xl font-bold mt-1 ${theme.text}`}>R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className={`p-1.5 md:p-2 rounded-lg text-green-500 border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-green-50 border-green-100'}`}>
                             <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>
                        </div>
                    </div>
                </div>

                {/* Lucro Diário */}
                <div className={`p-4 md:p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className={`${theme.textMuted} text-[9px] md:text-[10px] font-bold uppercase tracking-widest`}>Lucro Diário</p>
                            <p className={`text-xl md:text-2xl font-bold mt-1 ${currentProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentProfit >= 0 ? '+' : ''}R$ {currentProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                         <div className={`p-1.5 md:p-2 rounded-lg border ${currentProfit >= 0 ? (isDarkMode ? 'bg-green-500/10 text-green-500 border-slate-700/50' : 'bg-green-50 text-green-600 border-green-100') : (isDarkMode ? 'bg-red-500/10 text-red-500 border-slate-700/50' : 'bg-red-50 text-red-600 border-red-100')}`}>
                             {currentProfit >= 0 ? 
                                <TrendingUpIcon className="w-4 h-4 md:w-5 md:h-5" /> : 
                                <TrendingDownIcon className="w-4 h-4 md:w-5 md:h-5" />
                             }
                        </div>
                    </div>
                </div>

                 {/* Meta Diária */}
                 <div className={`p-4 md:p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                             <p className={`${theme.textMuted} text-[9px] md:text-[10px] font-bold uppercase tracking-widest`}>Meta Diária</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className={`text-xl md:text-2xl font-bold ${currentProfit >= dailyGoalTarget ? 'text-green-500' : theme.text}`}>
                                     {dailyGoalTarget > 0 ? ((currentProfit / dailyGoalTarget) * 100).toFixed(0) : 0}%
                                </p>
                                <span className={`text-[10px] md:text-xs ${theme.textMuted}`}>/ R$ {dailyGoalTarget.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className={`p-1.5 md:p-2 rounded-lg text-blue-400 border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            <TargetIcon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                     <div className={`w-full rounded-full h-1.5 mt-2 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-200'}`}>
                         <div className={`h-1.5 rounded-full ${currentProfit >= dailyGoalTarget ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(((Math.max(0, currentProfit)) / (dailyGoalTarget || 1)) * 100, 100)}%` }}></div>
                     </div>
                </div>

                {/* Taxa de Acerto */}
                <div className={`p-4 md:p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                             <p className={`${theme.textMuted} text-[9px] md:text-[10px] font-bold uppercase tracking-widest`}>Taxa de Acerto</p>
                            <p className={`text-xl md:text-2xl font-bold mt-1 ${theme.text}`}>{winRate}%</p>
                        </div>
                        <div className={`p-1.5 md:p-2 rounded-lg text-purple-400 border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                             <PieChartIcon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] md:text-xs font-medium">
                        <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {dailyRecordForSelectedDay?.winCount || 0} Wins</span>
                        <span className="text-red-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {dailyRecordForSelectedDay?.lossCount || 0} Loss</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions - REDESIGNED */}
            <div className={`p-4 md:p-6 rounded-2xl border ${theme.card}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xl font-bold ${theme.text}`}>Ações Rápidas</h3>
                     <div className="flex gap-4">
                         <button
                            onClick={() => { setTransactionType('deposit'); setIsTransactionModalOpen(true); }}
                            className="text-xs text-slate-500 hover:text-green-400 flex items-center gap-1 transition-colors"
                         >
                             <DepositIcon className="w-4 h-4" /> Depósito
                         </button>
                          <button
                            onClick={() => { setTransactionType('withdrawal'); setIsTransactionModalOpen(true); }}
                            className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                         >
                             <WithdrawalIcon className="w-4 h-4" /> Saque
                         </button>
                     </div>
                </div>

                <div className="flex flex-col gap-4">
                     {/* Row 1: Large Inputs */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="group">
                            <span className={`block mb-2 text-xs font-bold uppercase tracking-wider group-focus-within:text-green-500 transition-colors ml-1 ${theme.textMuted}`}>VALOR DE ENTRADA (R$)</span>
                            <div className="relative">
                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${theme.textMuted}`}>R$</span>
                                <input
                                    type="number"
                                    value={customEntryValue}
                                    onChange={(e) => setCustomEntryValue(e.target.value)}
                                    className={`w-full h-14 border-2 rounded-xl pl-12 pr-4 text-xl font-bold focus:border-green-500 focus:ring-0 focus:outline-none transition-all ${theme.input}`}
                                    placeholder={`${activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue.toFixed(2) : (startBalanceForSelectedDay * (activeBrokerage.entryValue / 100)).toFixed(2)}`}
                                />
                            </div>
                        </div>
                        <div className="group">
                             <span className={`block mb-2 text-xs font-bold uppercase tracking-wider group-focus-within:text-green-500 transition-colors ml-1 ${theme.textMuted}`}>PAYOUT %</span>
                             <div className="relative">
                                <input
                                    type="number"
                                    value={customPayout}
                                    onChange={(e) => setCustomPayout(e.target.value)}
                                    className={`w-full h-14 border-2 rounded-xl px-4 text-xl font-bold focus:border-green-500 focus:ring-0 focus:outline-none transition-all text-center ${theme.input}`}
                                    placeholder={`${activeBrokerage.payoutPercentage}`}
                                />
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold ${theme.textMuted}`}>%</span>
                             </div>
                        </div>
                        <div className="group">
                             <span className={`block mb-2 text-xs font-bold uppercase tracking-wider group-focus-within:text-green-500 transition-colors ml-1 ${theme.textMuted}`}>QUANTIDADE</span>
                             <div className="relative">
                                <input
                                    type="number"
                                    value={quantity}
                                    min="1"
                                    max="10"
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className={`w-full h-14 border-2 rounded-xl px-4 text-xl font-bold focus:border-green-500 focus:ring-0 focus:outline-none transition-all text-center ${theme.input}`}
                                />
                             </div>
                        </div>
                     </div>

                    {/* Row 2: Optimized Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 h-16">
                         <button
                            onClick={() => handleQuickAdd('win')}
                            disabled={isTradingHalted}
                            className="bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-lg md:text-xl rounded-xl shadow-lg shadow-green-900/20 hover:shadow-green-500/20 transition-all flex items-center justify-center gap-2 md:gap-3 uppercase tracking-widest relative overflow-hidden group"
                        >
                            <div className="p-1.5 rounded-full bg-slate-950/20">
                                 <TrendingUpIcon className="w-5 h-5 text-slate-900" />
                            </div>
                            <span>WIN</span>
                        </button>
                        <button
                            onClick={() => handleQuickAdd('loss')}
                            disabled={isTradingHalted}
                            className="bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg md:text-xl rounded-xl shadow-lg shadow-red-900/20 hover:shadow-red-500/20 transition-all flex items-center justify-center gap-2 md:gap-3 uppercase tracking-widest relative overflow-hidden group"
                        >
                             <div className="p-1.5 rounded-full bg-black/20">
                                <TrendingDownIcon className="w-5 h-5 text-white" />
                            </div>
                            <span>LOSS</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border h-96 ${theme.card}`}>
                    <h3 className={`text-lg font-bold mb-6 ${theme.text}`}>Evolução da Banca</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1e293b" : "#e2e8f0"} vertical={false} />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} dx={-10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#0f172a', borderRadius: '8px' }}
                                itemStyle={{ color: '#22c55e' }}
                            />
                            <Line type="area" dataKey="balance" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: isDarkMode ? '#0f172a' : '#fff', stroke: '#22c55e', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#22c55e' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className={`p-6 rounded-2xl border h-96 ${theme.card}`}>
                    <h3 className={`text-lg font-bold mb-6 ${theme.text}`}>Lucro Diário</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={chartData}>
                             <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1e293b" : "#e2e8f0"} vertical={false} />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} dx={-10} />
                            <Tooltip 
                                cursor={{fill: isDarkMode ? '#1e293b' : '#f1f5f9', opacity: 0.4}}
                                contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#0f172a', borderRadius: '8px' }}
                            />
                            <ReferenceLine y={0} stroke="#475569" />
                            <Bar dataKey="profit" fill="#ef4444" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#f43f5e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* History Table - Latest Operations (One by one) */}
             <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
                <div className={`p-6 border-b ${theme.border}`}>
                    <h3 className={`text-lg font-bold ${theme.text}`}>Últimas Operações</h3>
                </div>
                <div className="overflow-x-auto">
                     <table className={`w-full text-sm text-left ${theme.textMuted}`}>
                        <thead className={`text-xs uppercase ${theme.tableHeader}`}>
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Data / Hora</th>
                                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Tipo</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold whitespace-nowrap">Detalhes</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold whitespace-nowrap">Valor</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold whitespace-nowrap">Resultado</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {individualOperations.length > 0 ? individualOperations.slice(0, 10).map((op) => (
                                <tr key={op.id} className={`border-b ${theme.border} ${theme.tableRow} transition-colors`}>
                                     <td className={`px-6 py-4 whitespace-nowrap`}>
                                        <div className="flex flex-col">
                                            <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{op.displayDate}</span>
                                            <span className="text-xs text-slate-500">{op.displayTime}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                         {op.subType === 'win' && <span className="text-green-400 bg-green-900/20 px-2.5 py-1 rounded text-xs font-bold border border-green-900/30 tracking-wider">WIN</span>}
                                         {op.subType === 'loss' && <span className="text-red-400 bg-red-900/20 px-2.5 py-1 rounded text-xs font-bold border border-red-900/30 tracking-wider">LOSS</span>}
                                         {op.subType === 'deposit' && <span className="text-blue-400 bg-blue-900/20 px-2.5 py-1 rounded text-xs font-bold border border-blue-900/30 tracking-wider">DEPÓSITO</span>}
                                         {op.subType === 'withdrawal' && <span className="text-orange-400 bg-orange-900/20 px-2.5 py-1 rounded text-xs font-bold border border-orange-900/30 tracking-wider">SAQUE</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className="text-slate-500 text-xs">{op.details}</span>
                                    </td>
                                    <td className={`px-6 py-4 text-right whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                         R$ {op.value.toFixed(2)}
                                    </td>
                                     <td className={`px-6 py-4 text-right font-bold whitespace-nowrap`}>
                                         {op.type === 'trade' ? (
                                            <span className={op.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                {op.profit >= 0 ? '+' : ''}R$ {op.profit.toFixed(2)}
                                            </span>
                                         ) : (
                                            <span className="text-slate-500">-</span>
                                         )}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <button 
                                            onClick={() => {
                                                if (op.type === 'trade') {
                                                    deleteTrade(op.originalRecordId, op.id);
                                                } else {
                                                    handleDeleteRecord(op.id);
                                                }
                                            }}
                                            className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-900/10 rounded-full transition-all"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                             )) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-600">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const OperationsPanel: React.FC<{
    sortedFilteredRecords: AppRecord[];
    handleDeleteRecord: (recordId: string) => void;
    isDarkMode: boolean;
}> = ({ sortedFilteredRecords, handleDeleteRecord, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    
    // Flatten records using the helper
    const individualOperations = useMemo(() => getFlattenedOperations(sortedFilteredRecords), [sortedFilteredRecords]);

    return (
        <div className="p-4 md:p-8">
            <h2 className={`text-2xl md:text-3xl font-bold mb-6 md:mb-8 ${theme.text}`}>Histórico Detalhado</h2>
            
            <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
                <div className={`p-6 border-b ${theme.border}`}>
                    <h3 className={`text-lg font-bold ${theme.text}`}>Todas as Operações</h3>
                </div>
                <div className="overflow-x-auto">
                     <table className={`w-full text-sm text-left ${theme.textMuted}`}>
                        <thead className={`text-xs uppercase ${theme.tableHeader}`}>
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Data / Hora</th>
                                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Tipo</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold whitespace-nowrap">Detalhes</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold whitespace-nowrap">Valor Entrada</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold whitespace-nowrap">Lucro / Prejuízo</th>
                            </tr>
                        </thead>
                        <tbody>
                             {individualOperations.length > 0 ? individualOperations.map((op) => (
                                <tr key={op.id} className={`border-b ${theme.border} ${theme.tableRow} transition-colors`}>
                                     <td className={`px-6 py-4 whitespace-nowrap`}>
                                        <div className="flex flex-col">
                                            <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{op.displayDate}</span>
                                            <span className="text-xs text-slate-500">{op.displayTime}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                         {op.subType === 'win' && <span className="text-green-400 bg-green-900/20 px-2.5 py-1 rounded text-xs font-bold border border-green-900/30 tracking-wider">WIN</span>}
                                         {op.subType === 'loss' && <span className="text-red-400 bg-red-900/20 px-2.5 py-1 rounded text-xs font-bold border border-red-900/30 tracking-wider">LOSS</span>}
                                         {op.subType === 'deposit' && <span className="text-blue-400 bg-blue-900/20 px-2.5 py-1 rounded text-xs font-bold border border-blue-900/30 tracking-wider">DEPÓSITO</span>}
                                         {op.subType === 'withdrawal' && <span className="text-orange-400 bg-orange-900/20 px-2.5 py-1 rounded text-xs font-bold border border-orange-900/30 tracking-wider">SAQUE</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className="text-slate-500 text-xs">{op.details}</span>
                                    </td>
                                    <td className={`px-6 py-4 text-right whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                         R$ {op.value.toFixed(2)}
                                    </td>
                                     <td className={`px-6 py-4 text-right font-bold whitespace-nowrap`}>
                                         {op.type === 'trade' ? (
                                            <span className={op.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                {op.profit >= 0 ? '+' : ''}R$ {op.profit.toFixed(2)}
                                            </span>
                                         ) : (
                                            <span className="text-slate-500">-</span>
                                         )}
                                    </td>
                                </tr>
                             )) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-600">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AnalysisPanel: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [isLoading, setIsLoading] = useState(false);
    const [scanResult, setScanResult] = useState<{
        symbol: string;
        direction: 'BUY' | 'SELL' | 'WAIT';
        confidence: number;
        reasoning: string;
        entryTime: string;
    } | null>(null);

    // List of assets to scan
    const assets = useMemo(() => [
        { symbol: 'BTCUSDT', name: 'Bitcoin' },
        { symbol: 'ETHUSDT', name: 'Ethereum' },
        { symbol: 'SOLUSDT', name: 'Solana' },
        { symbol: 'XRPUSDT', name: 'Ripple' },
        { symbol: 'ADAUSDT', name: 'Cardano' }
    ], []);

    // --- Technical Analysis Helpers ---
    const calculateRSI = (closes: number[], period: number = 14) => {
        if (closes.length < period + 1) return 50;
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = closes[closes.length - 1 - (period - i)] - closes[closes.length - 1 - (period - i + 1)];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    };

    const calculateEMA = (closes: number[], period: number) => {
        if (closes.length < period) return 0;
        const k = 2 / (period + 1);
        let ema = closes[0];
        for (let i = 1; i < closes.length; i++) {
            ema = closes[i] * k + ema * (1 - k);
        }
        return ema;
    };

    // --- TradingView Scanner API Fetcher (Robust) ---
    const fetchTradingViewData = async (symbol: string) => {
         try {
            // TradingView Widget API - often more accessible
            const response = await fetch('https://scanner.tradingview.com/crypto/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbols: { tickers: [`BINANCE:${symbol}`], query: { types: [] } },
                    columns: [
                        "RSI", "MACD.macd", "MACD.signal", "EMA5", "EMA10", "EMA20", "close"
                    ]
                })
            });

            if (!response.ok) throw new Error('TV API blocked');
            const data = await response.json();
            if (!data.data || data.data.length === 0) throw new Error('No data');
            
            const d = data.data[0].d;
            return {
                rsi: d[0],
                macd: d[1],
                macdSignal: d[2],
                ema5: d[3],
                ema10: d[4],
                ema20: d[5],
                close: d[6],
                source: 'TradingView'
            };
        } catch (e) {
            // Fallback to Binance + Local Calc
            console.log(`TV failed for ${symbol}, using Binance fallback`);
            return await fetchBinanceData(symbol);
        }
    };

    const fetchBinanceData = async (symbol: string) => {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=30`);
        if (!response.ok) throw new Error('Binance fetch failed');
        const data = await response.json();
        const closes = data.map((k: any) => parseFloat(k[4]));
        
        return {
            rsi: calculateRSI(closes),
            macd: 0, // Simplified fallback
            macdSignal: 0,
            ema5: calculateEMA(closes, 5),
            ema10: calculateEMA(closes, 10),
            ema20: calculateEMA(closes, 20),
            close: closes[closes.length - 1],
            source: 'Binance (Calc)'
        };
    };

    const handleScanMarket = async () => {
        setIsLoading(true);
        setScanResult(null);

        try {
            // 1. Fetch Real Data for ALL assets in parallel
            const allMarketData = await Promise.all(assets.map(async (asset) => {
                const data = await fetchTradingViewData(asset.symbol);
                return {
                    symbol: asset.symbol,
                    name: asset.name,
                    ...data
                };
            }));

            // 2. Prepare Context for AI
            const currentTime = new Date();
            // Ensure the entry time is for the NEXT candle (or 2 mins from now) so user has time to prepare
            const targetDate = new Date(currentTime.getTime() + 2 * 60000); 
            const entryTime = targetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Construct a prompt with data from all assets
            let assetsDataString = "";
            allMarketData.forEach(m => {
                assetsDataString += `
                ASSET: ${m.name} (${m.symbol})
                Price: ${m.close} | RSI: ${m.rsi?.toFixed(2)} | EMA5: ${m.ema5?.toFixed(2)} | EMA20: ${m.ema20?.toFixed(2)} | MACD: ${m.macd?.toFixed(4)}
                --------------------------------`;
            });

            const prompt = `
                ACT AS AN ELITE HIGH-FREQUENCY CRYPTO SNIPER.
                I have scanned 5 major assets. Here is their REAL-TIME technical data (M1 Timeframe):
                ${assetsDataString}
                
                TIME CONTEXT: Current time is ${currentTime.toLocaleTimeString()}.
                TARGET ENTRY TIME: ${entryTime} (In approx 2 minutes).

                YOUR TASK:
                1. Compare all 5 assets.
                2. Predict the likely movement for the specific candle starting at ${entryTime}. Do NOT predict the current candle.
                3. Identify the SINGLE BEST trade opportunity (Buy or Sell) among them for that future time.
                4. If all markets are choppy/bad, choose the "least bad" one but lower confidence, or signal WAIT.
                
                STRATEGY (Regiões, Marcações e Médias):
                1. **Médias Móveis (Averages)**: 
                   - Use EMA20 (and EMA200 if inferred) to define the macro trend. 
                   - Look for price rejecting off the EMA20 or EMA5 as dynamic support/resistance (Pullback).
                2. **Regiões e Marcações (Regions/Levels)**:
                   - Identify implicit Support/Resistance levels based on recent price action.
                   - Look for Order Blocks or Liquidity Sweeps near the current price.
                3. **Confluência**: 
                   - The best entry is when Price touches a Key Region (Marking) + Dynamic Average (EMA) + RSI confirmation.
                
                OUTPUT FORMAT (JSON ONLY):
                {
                    "symbol": "BTCUSDT" (or whichever is best),
                    "direction": "BUY" or "SELL" or "WAIT",
                    "confidence": number (50-95),
                    "reasoning": "Explain in Portuguese (PT-BR) WHY this asset was chosen, citing Regions (Regiões), Markings (Marcações) and Averages (Médias).",
                    "entryTime": "Use EXACTLY this time: ${entryTime}"
                }
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { responseMimeType: "application/json" }
            });

            let text = response.text;
            if (text) {
                text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                const json = JSON.parse(text);
                setScanResult({
                    ...json
                });
            }

        } catch (error) {
            console.error(error);
            alert("Erro na análise. Verifique sua conexão ou tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full items-center justify-start p-4 md:p-8">
             <div className="w-full max-w-xl">
                <div className="text-center mb-8">
                    <h2 className={`text-2xl md:text-3xl font-bold ${theme.text}`}>Scanner Automático (IA)</h2>
                    <p className={`text-sm mt-2 ${theme.textMuted}`}>A IA analisa BTC, ETH, SOL, XRP e ADA simultaneamente</p>
                </div>
                
                <div className={`p-6 md:p-8 rounded-3xl border ${theme.border} ${theme.bg} shadow-2xl relative overflow-hidden`}>
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>

                    <div className="space-y-6 relative z-10">
                        <button 
                            onClick={handleScanMarket}
                            disabled={isLoading}
                            className={`w-full py-5 font-black text-lg rounded-2xl shadow-xl transition-all active:scale-[0.98] flex justify-center items-center gap-3 relative overflow-hidden group
                                ${isLoading ? 'bg-slate-800 cursor-not-allowed text-slate-500' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-green-900/30'}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="absolute inset-0 bg-white/10 skew-x-12 animate-shimmer"></div>
                                    <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                    <span>Escaneando Todos os Ativos...</span>
                                </>
                            ) : (
                                <>
                                    <CpuChipIcon className="w-6 h-6" />
                                    <span>ENCONTRAR MELHOR OPORTUNIDADE</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Result Section */}
                    {scanResult && (
                        <div className="mt-8 animate-fade-in-up">
                            <div className={`p-6 rounded-2xl border-2 ${
                                scanResult.direction === 'BUY' ? 'border-green-500/50 bg-green-500/10' : 
                                scanResult.direction === 'SELL' ? 'border-red-500/50 bg-red-500/10' : 
                                'border-slate-500/50 bg-slate-500/10'
                            }`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className={`text-xs font-bold uppercase ${theme.textMuted}`}>Melhor Ativo Encontrado</span>
                                        <h3 className={`text-2xl font-black tracking-tight ${theme.text}`}>
                                            {scanResult.symbol.replace('USDT', '')}
                                        </h3>
                                        <h2 className={`text-4xl font-black tracking-tighter mt-2 ${
                                            scanResult.direction === 'BUY' ? 'text-green-500' : 
                                            scanResult.direction === 'SELL' ? 'text-red-500' : 
                                            'text-slate-400'
                                        }`}>
                                            {scanResult.direction === 'BUY' ? 'COMPRA' : 
                                             scanResult.direction === 'SELL' ? 'VENDA' : 'AGUARDAR'}
                                        </h2>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-bold uppercase ${theme.textMuted}`}>Confiança</span>
                                        <div className={`text-2xl font-bold ${
                                            scanResult.confidence > 80 ? 'text-green-400' : 'text-yellow-400'
                                        }`}>
                                            {scanResult.confidence}%
                                        </div>
                                    </div>
                                </div>

                                {scanResult.direction !== 'WAIT' && (
                                    <div className="flex items-center gap-3 mb-6 bg-slate-950/30 p-3 rounded-lg">
                                        <div className="p-2 bg-slate-800 rounded-lg text-white">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold">Horário da Entrada</p>
                                            <p className="text-lg font-mono font-bold text-white">{scanResult.entryTime}</p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className={`text-xs font-bold uppercase mb-1 ${theme.textMuted}`}>Motivo da Escolha</p>
                                    <p className={`text-sm italic leading-relaxed ${theme.text}`}>"{scanResult.reasoning}"</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SettingsPanelProps {
    activeBrokerage: Brokerage;
    onUpdateBrokerage: (brokerage: Brokerage) => void;
    onDeleteBrokerage: (id: string) => void;
    onOpenAddBrokerage: () => void;
    isDarkMode: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ activeBrokerage, onUpdateBrokerage, onDeleteBrokerage, onOpenAddBrokerage, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [formData, setFormData] = useState<Brokerage>({ ...activeBrokerage });

    useEffect(() => {
        setFormData({ ...activeBrokerage });
    }, [activeBrokerage]);

    const handleChange = (field: keyof Brokerage, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onUpdateBrokerage(formData);
        alert('Configurações salvas com sucesso!');
    };

    return (
        <div className="p-4 md:p-8">
             <div className="flex justify-between items-center mb-6 md:mb-8">
                <h2 className={`text-2xl md:text-3xl font-bold ${theme.text}`}>Configurações</h2>
                <button 
                    onClick={onOpenAddBrokerage}
                    className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-400 transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                    <PlusIcon className="w-4 h-4" /> Nova Corretora
                </button>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                 <div className={`p-6 md:p-8 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-xl font-bold mb-6 border-b pb-4 ${theme.text} ${theme.border}`}>Configurações da Corretora</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Nome da Corretora</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                            />
                        </div>
                        
                        <div>
                             <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Saldo Inicial (R$)</label>
                             <div className="relative">
                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>R$</span>
                                <input
                                    type="number"
                                    value={formData.initialBalance}
                                    onChange={(e) => handleChange('initialBalance', parseFloat(e.target.value))}
                                    className={`block w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                                />
                             </div>
                        </div>
                    </div>
                 </div>

                 <div className={`p-6 md:p-8 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-xl font-bold mb-6 border-b pb-4 ${theme.text} ${theme.border}`}>Configurações da Operação</h3>
                    
                    <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Modo de Entrada</label>
                                <select 
                                    value={formData.entryMode}
                                    onChange={(e) => handleChange('entryMode', e.target.value)}
                                    className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 transition-colors ${theme.input}`}
                                >
                                    <option value="fixed">Valor Fixo</option>
                                    <option value="percentage">Porcentagem (%)</option>
                                </select>
                             </div>
                             <div>
                                <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>
                                    {formData.entryMode === 'fixed' ? 'Valor da Entrada (R$)' : 'Porcentagem da Banca (%)'}
                                </label>
                                <input
                                    type="number"
                                    value={formData.entryValue}
                                    onChange={(e) => handleChange('entryValue', parseFloat(e.target.value))}
                                    className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                                />
                             </div>
                         </div>

                         <div>
                             <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Payout Padrão (%)</label>
                             <input
                                type="number"
                                value={formData.payoutPercentage}
                                onChange={(e) => handleChange('payoutPercentage', parseFloat(e.target.value))}
                                className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                            />
                        </div>

                         <div className={`grid grid-cols-2 gap-6 pt-4 border-t ${theme.border}`}>
                             <div>
                                <label className="block text-sm font-medium text-green-400 mb-2">Stop Win (Trades)</label>
                                <input
                                    type="number"
                                    value={formData.stopGainTrades}
                                    onChange={(e) => handleChange('stopGainTrades', parseFloat(e.target.value))}
                                    className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                                    placeholder="0 = Desativado"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-red-400 mb-2">Stop Loss (Trades)</label>
                                <input
                                    type="number"
                                    value={formData.stopLossTrades}
                                    onChange={(e) => handleChange('stopLossTrades', parseFloat(e.target.value))}
                                    className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors ${theme.input}`}
                                    placeholder="0 = Desativado"
                                />
                             </div>
                         </div>
                    </div>

                    <div className="mt-8 flex flex-col-reverse md:flex-row justify-between items-center gap-4">
                        <button 
                            onClick={() => onDeleteBrokerage(activeBrokerage.id)}
                            className="w-full md:w-auto px-6 py-3 border border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-950/30 transition-colors flex justify-center items-center gap-2"
                        >
                            <TrashIcon className="w-5 h-5" /> Excluir Corretora
                        </button>
                        
                        <button 
                            onClick={handleSave}
                            className="w-full md:w-auto px-8 py-3 bg-green-500 text-slate-950 font-bold rounded-xl hover:bg-green-400 shadow-lg shadow-green-900/20 transition-all active:scale-95 flex justify-center items-center gap-2"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                 </div>
             </div>
        </div>
    );
};

const GoalsPanel: React.FC<{
    goal: Omit<GoalSettings, 'amount'> & { amount: number };
    setGoal: (goal: GoalSettings) => void;
    activeBrokerage: Brokerage;
    isDarkMode: boolean;
}> = ({ goal, setGoal, activeBrokerage, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [localAmount, setLocalAmount] = useState<string>(goal.amount.toString());
    const [localType, setLocalType] = useState<'weekly' | 'monthly'>(goal.type);

    const handleSave = () => {
        const amount = parseFloat(localAmount);
        if (!isNaN(amount)) {
            setGoal({ type: localType, amount });
            alert('Meta salva com sucesso!');
        }
    };

    // Calculate projections based on the input
    const amountVal = parseFloat(localAmount) || 0;
    const dailyProjection = localType === 'monthly' ? amountVal / 22 : amountVal / 5;
    const weeklyProjection = localType === 'monthly' ? amountVal / 4.5 : amountVal;
    const monthlyProjection = localType === 'monthly' ? amountVal : amountVal * 4.5;

    return (
        <div className="p-4 md:p-8">
            <h2 className={`text-2xl md:text-3xl font-bold mb-6 md:mb-8 ${theme.text}`}>Definição de Metas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`p-6 md:p-8 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-xl font-bold mb-6 ${theme.text}`}>Configurar Meta</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Tipo de Meta</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setLocalType('weekly')}
                                    className={`py-3 rounded-lg font-bold border transition-all ${localType === 'weekly' ? 'bg-green-500 text-slate-900 border-green-500' : `${theme.input} hover:border-slate-500`}`}
                                >
                                    Semanal
                                </button>
                                <button 
                                    onClick={() => setLocalType('monthly')}
                                    className={`py-3 rounded-lg font-bold border transition-all ${localType === 'monthly' ? 'bg-green-500 text-slate-900 border-green-500' : `${theme.input} hover:border-slate-500`}`}
                                >
                                    Mensal
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Valor da Meta (R$)</label>
                            <input
                                type="number"
                                value={localAmount}
                                onChange={(e) => setLocalAmount(e.target.value)}
                                className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                            />
                        </div>

                        <button 
                            onClick={handleSave}
                            className="w-full py-3 mt-4 bg-green-500 text-slate-950 font-bold rounded-xl hover:bg-green-400 shadow-lg shadow-green-900/20 transition-all active:scale-95"
                        >
                            Salvar Meta
                        </button>
                    </div>
                </div>

                <div className={`p-6 md:p-8 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-xl font-bold mb-6 ${theme.text}`}>Projeção da Meta</h3>
                    <p className={`text-sm mb-6 ${theme.textMuted}`}>Com base na meta {localType === 'weekly' ? 'semanal' : 'mensal'} de <strong className="text-green-500">R$ {amountVal.toFixed(2)}</strong>, aqui está o quanto você precisa fazer:</p>

                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <span className={`text-sm font-bold ${theme.textMuted}`}>Diário (média)</span>
                            <span className={`text-lg font-bold ${theme.text}`}>R$ {dailyProjection.toFixed(2)}</span>
                        </div>
                        <div className={`p-4 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <span className={`text-sm font-bold ${theme.textMuted}`}>Semanal</span>
                            <span className={`text-lg font-bold ${theme.text}`}>R$ {weeklyProjection.toFixed(2)}</span>
                        </div>
                        <div className={`p-4 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <span className={`text-sm font-bold ${theme.textMuted}`}>Mensal</span>
                            <span className={`text-lg font-bold ${theme.text}`}>R$ {monthlyProjection.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Modals ---

const AddBrokerageModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string, initialBalance: number) => void;
    isDarkMode: boolean;
}> = ({ isOpen, onClose, onConfirm, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onConfirm(name, parseFloat(balance) || 0);
        setName('');
        setBalance('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`absolute inset-0 ${theme.modalOverlay}`} onClick={onClose}></div>
            <div className={`relative w-full max-w-sm rounded-2xl p-6 shadow-2xl ${theme.modalContent}`}>
                <h3 className={`text-xl font-bold mb-4 ${theme.text}`}>Nova Corretora</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Nome da Corretora</label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 ${theme.input}`}
                            placeholder="Ex: Binance, IQ Option..."
                        />
                    </div>
                     <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Saldo Inicial (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 ${theme.input}`}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className={`flex-1 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Cancelar</button>
                        <button type="submit" className="flex-1 py-2 rounded-lg font-bold text-slate-900 bg-green-500 hover:bg-green-400 transition-colors">Criar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DailyBriefingModal: React.FC<{
    onClose: () => void;
    currentBalance: number;
    dailyGoal: number;
    activeBrokerage: Brokerage;
    isDarkMode: boolean;
}> = ({ onClose, currentBalance, dailyGoal, activeBrokerage, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    
    // Calculate strategy
    const entryValue = activeBrokerage.entryMode === 'fixed' 
        ? activeBrokerage.entryValue 
        : currentBalance * (activeBrokerage.entryValue / 100);
    
    const profitPerWin = entryValue * (activeBrokerage.payoutPercentage / 100);
    const winsNeeded = dailyGoal > 0 && profitPerWin > 0 ? Math.ceil(dailyGoal / profitPerWin) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`absolute inset-0 ${theme.modalOverlay}`} onClick={onClose}></div>
            <div className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl animate-float ${theme.modalContent}`}>
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-green-500 to-emerald-700 rounded-2xl mb-4 shadow-lg shadow-green-500/30">
                        <CalculatorIcon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>Seu planejamento para hoje</h2>
                    <p className={`text-sm mt-1 ${theme.textMuted}`}>Foco na disciplina e na meta.</p>
                </div>

                <div className="space-y-4 mb-8">
                     <div className={`p-4 rounded-xl flex justify-between items-center ${isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-100 border border-slate-200'}`}>
                        <span className={`text-sm font-semibold ${theme.textMuted}`}>Banca Atual</span>
                        <span className={`text-xl font-bold ${theme.text}`}>R$ {currentBalance.toFixed(2)}</span>
                     </div>
                     <div className={`p-4 rounded-xl flex justify-between items-center ${isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-100 border border-slate-200'}`}>
                        <span className={`text-sm font-semibold ${theme.textMuted}`}>Meta do Dia</span>
                        <span className="text-xl font-bold text-green-500">R$ {dailyGoal.toFixed(2)}</span>
                     </div>
                     
                     <div className={`p-4 rounded-xl border border-green-500/30 bg-green-500/10`}>
                        <p className="text-xs font-bold text-green-500 uppercase mb-2">Estratégia Sugerida</p>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm ${theme.textMuted}`}>Para bater a meta, você precisa de aprox:</span>
                            <span className={`text-lg font-bold ${theme.text}`}>{winsNeeded} Wins</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">*Considerando entradas de R$ {entryValue.toFixed(2)} e Payout {activeBrokerage.payoutPercentage}%</p>
                     </div>
                </div>

                <button 
                    onClick={onClose}
                    className="w-full py-4 bg-green-500 hover:bg-green-400 text-slate-950 font-bold text-lg rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-95 flex justify-center items-center gap-2"
                >
                   Vamos Operar 🚀
                </button>
            </div>
        </div>
    );
};

const TransactionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    type: 'deposit' | 'withdrawal';
    onConfirm: (amount: number, notes: string) => void;
    isDarkMode: boolean;
}> = ({ isOpen, onClose, type, onConfirm, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(parseFloat(amount), notes);
        setAmount('');
        setNotes('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`absolute inset-0 ${theme.modalOverlay}`} onClick={onClose}></div>
            <div className={`relative w-full max-w-sm rounded-2xl p-6 shadow-2xl ${theme.modalContent}`}>
                <h3 className={`text-xl font-bold mb-4 ${theme.text}`}>
                    {type === 'deposit' ? 'Novo Depósito' : 'Novo Saque'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Valor (R$)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 ${theme.input}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Observação (Opcional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 ${theme.input}`}
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className={`flex-1 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Cancelar</button>
                        <button type="submit" className={`flex-1 py-2 rounded-lg font-bold text-slate-900 transition-colors ${type === 'deposit' ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'}`}>Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main App Component ---

const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze'>('dashboard');
    // Removed usdToBrlRate state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('app_theme');
        return saved ? saved === 'dark' : true; // Default dark
    });
    
    // Theme effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }
        localStorage.setItem('app_theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const defaultBrokerage: Brokerage = {
        id: '1',
        name: 'Corretora Principal',
        initialBalance: 100,
        entryMode: 'percentage',
        entryValue: 1, // 1%
        payoutPercentage: 87,
        stopGainTrades: 3,
        stopLossTrades: 2
    };

    // Load Brokerages
    const [brokerages, setBrokerages] = useState<Brokerage[]>(() => {
        const saved = localStorage.getItem(`app_brokerages_${user.username}`);
        return saved ? JSON.parse(saved) : [defaultBrokerage];
    });

    const [activeBrokerageId, setActiveBrokerageId] = useState<string>(() => {
        if (brokerages.length > 0) return brokerages[0].id;
        return '';
    });

    const activeBrokerage = useMemo(() => 
        brokerages.find(b => b.id === activeBrokerageId) || brokerages[0], 
    [brokerages, activeBrokerageId]);

    // Load Records (Unified State)
    const [records, setRecords] = useState<AppRecord[]>([]);
    
    // Load Goals
    const [goal, setGoal] = useState<GoalSettings>(() => {
        const saved = localStorage.getItem(`app_goals_${user.username}_${activeBrokerageId}`);
        return saved ? JSON.parse(saved) : { type: 'monthly', amount: 1000 };
    });

    // Load Settings / Stop Overrides
    const [stopLimitOverride, setStopLimitOverride] = useState<Record<string, boolean>>({});

    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | null>(null);
    
    const [isAddBrokerageModalOpen, setIsAddBrokerageModalOpen] = useState(false);
    
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // --- Effects ---

    // Removed fetchUSDBRLRate effect

    // Load user specific data and handle migration
    useEffect(() => {
        setIsLoading(true);
        try {
            // Load Records
            const savedRecords = localStorage.getItem(`app_records_${user.username}_${activeBrokerageId}`);
            let loadedRecords: AppRecord[] = savedRecords ? JSON.parse(savedRecords) : [];

            // DATA MIGRATION LOGIC (Old format -> New format)
            if (loadedRecords.length === 0) {
                 const oldBrokerageData = localStorage.getItem('brokerages_v2'); // Global old data
                 if (oldBrokerageData && user.username === 'henrique') { // Only migrate for main user or logic
                     try {
                        const parsedOld = JSON.parse(oldBrokerageData);
                        // Assuming old structure, we'll just skip complex migration for this snippet safety
                        // unless specifically requested to parse deep structures. 
                        // Instead, we ensure the app starts clean if no new records exist.
                     } catch (e) { console.error("Migration error", e); }
                 }
            }
            setRecords(loadedRecords);

            // Load Goal
            const savedGoal = localStorage.getItem(`app_goals_${user.username}_${activeBrokerageId}`);
            if (savedGoal) setGoal(JSON.parse(savedGoal));

            // Show Briefing Logic (Once per day)
            const todayStr = new Date().toISOString().split('T')[0];
            const lastBriefing = localStorage.getItem(`last_briefing_${user.username}`);
            if (lastBriefing !== todayStr) {
                setIsBriefingModalOpen(true);
                localStorage.setItem(`last_briefing_${user.username}`, todayStr);
            }

        } catch (error) {
            console.error("Initialization error", error);
        } finally {
            setIsLoading(false);
        }
    }, [user.username, activeBrokerageId]);

    // Save Data Effects
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem(`app_brokerages_${user.username}`, JSON.stringify(brokerages));
        }
    }, [brokerages, user.username, isLoading]);

    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem(`app_records_${user.username}_${activeBrokerageId}`, JSON.stringify(records));
        }
    }, [records, user.username, activeBrokerageId, isLoading]);

    useEffect(() => {
        if (!isLoading) {
             localStorage.setItem(`app_goals_${user.username}_${activeBrokerageId}`, JSON.stringify(goal));
        }
    }, [goal, user.username, activeBrokerageId, isLoading]);

    // --- Logic & Helpers ---

    const selectedDateString = selectedDate.toISOString().split('T')[0];
    const displayDateString = selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

    // Calculate balances historically
    const sortedRecords = useMemo(() => {
        return [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [records]);

    const getStartBalanceForDate = (dateStr: string) => {
        // Calculate balance sum of all records BEFORE this date + initial
        let balance = activeBrokerage.initialBalance;
        for (const record of sortedRecords) {
            if (record.date < dateStr) {
                if (record.recordType === 'day') balance = record.endBalanceUSD;
                else if (record.recordType === 'deposit') balance += record.amountUSD;
                else if (record.recordType === 'withdrawal') balance -= record.amountUSD;
            }
        }
        return balance;
    };

    const startBalanceForSelectedDay = getStartBalanceForDate(selectedDateString);
    const dailyRecordForSelectedDay = records.find(r => r.recordType === 'day' && r.id === selectedDateString) as DailyRecord | undefined;

    // Daily Goal Calculation
    const goalAmount = typeof goal.amount === 'number' ? goal.amount : 0;
    // Simple average calculation as requested
    const dailyGoalTarget = goal.type === 'monthly' ? (goalAmount / 22) : (goalAmount / 5);

    // Stop Rules
    const isTradingHalted = useMemo(() => {
        if (stopLimitOverride[selectedDateString]) return false;
        if (!dailyRecordForSelectedDay) return false;
        
        const wins = dailyRecordForSelectedDay.winCount;
        const losses = dailyRecordForSelectedDay.lossCount;

        if (activeBrokerage.stopGainTrades > 0 && wins >= activeBrokerage.stopGainTrades) return true;
        if (activeBrokerage.stopLossTrades > 0 && losses >= activeBrokerage.stopLossTrades) return true;
        return false;
    }, [dailyRecordForSelectedDay, activeBrokerage, stopLimitOverride, selectedDateString]);

    const stopLossLimitReached = useMemo(() => {
         if (!dailyRecordForSelectedDay) return false;
         return activeBrokerage.stopLossTrades > 0 && dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades;
    }, [dailyRecordForSelectedDay, activeBrokerage]);


    // Handlers
    const addRecord = (winCount: number, lossCount: number, customEntryValueUSD?: number, customPayoutPercentage?: number) => {
        const entry = customEntryValueUSD !== undefined 
            ? customEntryValueUSD 
            : (activeBrokerage.entryMode === 'fixed' 
                ? activeBrokerage.entryValue 
                : startBalanceForSelectedDay * (activeBrokerage.entryValue / 100));
        
        const payout = customPayoutPercentage !== undefined ? customPayoutPercentage : activeBrokerage.payoutPercentage;
        
        const profit = winCount > 0 ? (entry * (payout / 100)) : (lossCount > 0 ? -entry : 0);

        setRecords(prev => {
            const existingRecordIndex = prev.findIndex(r => r.recordType === 'day' && r.id === selectedDateString);
            
            const newTrade: Trade = {
                id: Date.now().toString(),
                timestamp: Date.now(), // Store precise timestamp
                result: winCount > 0 ? 'win' : 'loss',
                entryValue: entry,
                payoutPercentage: payout
            };

            if (existingRecordIndex >= 0) {
                const updated = [...prev];
                const rec = updated[existingRecordIndex] as DailyRecord;
                
                // Recalculate record completely from trades to ensure accuracy
                const updatedTrades = [...rec.trades, newTrade];
                const wins = updatedTrades.filter(t => t.result === 'win').length;
                const losses = updatedTrades.filter(t => t.result === 'loss').length;
                const netProfit = updatedTrades.reduce((acc, t) => {
                     return acc + (t.result === 'win' ? (t.entryValue * (t.payoutPercentage/100)) : -t.entryValue);
                }, 0);

                updated[existingRecordIndex] = {
                    ...rec,
                    trades: updatedTrades,
                    winCount: wins,
                    lossCount: losses,
                    netProfitUSD: netProfit,
                    endBalanceUSD: rec.startBalanceUSD + netProfit
                };
                return updated;
            } else {
                return [...prev, {
                    recordType: 'day',
                    brokerageId: activeBrokerageId,
                    id: selectedDateString,
                    date: selectedDateString,
                    startBalanceUSD: startBalanceForSelectedDay,
                    trades: [newTrade],
                    winCount: winCount,
                    lossCount: lossCount,
                    netProfitUSD: profit,
                    endBalanceUSD: startBalanceForSelectedDay + profit
                }];
            }
        });
    };

    const handleDeleteRecord = (recordId: string) => {
         if (confirm('Tem certeza que deseja excluir este registro?')) {
             setRecords(prev => prev.filter(r => r.id !== recordId));
         }
    };

    const deleteTrade = (dayId: string, tradeId: string) => {
         if (!confirm('Tem certeza que deseja excluir esta operação?')) return;
         
         setRecords(prev => {
            const dayIndex = prev.findIndex(r => r.id === dayId && r.recordType === 'day');
            if (dayIndex === -1) return prev;
            
            const dayRecord = prev[dayIndex] as DailyRecord;
            const updatedTrades = dayRecord.trades.filter(t => t.id !== tradeId);
            
            // Recalculate stats
            const wins = updatedTrades.filter(t => t.result === 'win').length;
            const losses = updatedTrades.filter(t => t.result === 'loss').length;
            const netProfit = updatedTrades.reduce((acc, t) => {
                 return acc + (t.result === 'win' ? (t.entryValue * (t.payoutPercentage/100)) : -t.entryValue);
            }, 0);
            
            const updatedDay = {
                ...dayRecord,
                trades: updatedTrades,
                winCount: wins,
                lossCount: losses,
                netProfitUSD: netProfit,
                endBalanceUSD: dayRecord.startBalanceUSD + netProfit
            };
            
            const newRecords = [...prev];
            newRecords[dayIndex] = updatedDay;
            return newRecords;
        });
    };

    const handleTransaction = (amount: number, notes: string) => {
        if (!transactionType) return;
        const newRecord: TransactionRecord = {
            recordType: transactionType,
            brokerageId: activeBrokerageId,
            id: Date.now().toString(),
            timestamp: Date.now(),
            date: selectedDateString,
            displayDate: displayDateString,
            amountUSD: amount,
            notes: notes
        };
        setRecords(prev => [...prev, newRecord]);
    };

    // Settings Handlers
    const updateBrokerage = (updated: Brokerage) => {
        setBrokerages(prev => prev.map(b => b.id === updated.id ? updated : b));
    };

    const deleteBrokerage = (id: string) => {
        if (brokerages.length <= 1) {
            alert("Você precisa ter pelo menos uma corretora.");
            return;
        }
        if (confirm("Tem certeza? Todos os dados dessa corretora serão apagados.")) {
            setBrokerages(prev => prev.filter(b => b.id !== id));
            // Also clean up local storage for that brokerage
            localStorage.removeItem(`app_records_${user.username}_${id}`);
            localStorage.removeItem(`app_goals_${user.username}_${id}`);
            setActiveBrokerageId(brokerages.find(b => b.id !== id)?.id || '');
        }
    };

    const handleAddBrokerage = (name: string, initialBalance: number) => {
        const newBrokerage: Brokerage = {
            ...defaultBrokerage,
            id: Date.now().toString(),
            name,
            initialBalance
        };
        setBrokerages(prev => [...prev, newBrokerage]);
        setActiveBrokerageId(newBrokerage.id);
        setActiveTab('settings');
    };

    // Calculate Weekly Stats for Dashboard (Optional enhancement)
    const weeklyStats = {
        profit: 0, wins: 0, losses: 0, totalTrades: 0, winRate: 0, startBalance: 0, currentBalance: 0
    };

    // Render Logic
    const theme = useThemeClasses(isDarkMode);
    
    if (isLoading) {
        return <div className={`min-h-screen flex items-center justify-center ${theme.bg} ${theme.text}`}>Carregando dados...</div>;
    }

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onLogout={onLogout} 
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
            
            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                <Header 
                    user={user} 
                    activeBrokerage={activeBrokerage} 
                    brokerages={brokerages} 
                    setActiveBrokerageId={setActiveBrokerageId}
                    isDarkMode={isDarkMode}
                    onOpenBriefing={() => setIsBriefingModalOpen(true)}
                    onOpenMenu={() => setIsMobileMenuOpen(true)}
                />

                <div className="flex-1 overflow-y-auto w-full">
                    {activeTab === 'dashboard' && (
                        <DashboardPanel
                            activeBrokerage={activeBrokerage}
                            customEntryValue={customEntryValue}
                            setCustomEntryValue={setCustomEntryValue}
                            customPayout={customPayout}
                            setCustomPayout={setCustomPayout}
                            addRecord={addRecord}
                            selectedDateString={selectedDateString}
                            setSelectedDate={setSelectedDate}
                            isTradingHalted={isTradingHalted}
                            stopLossLimitReached={stopLossLimitReached}
                            setStopLimitOverride={setStopLimitOverride}
                            startBalanceForSelectedDay={startBalanceForSelectedDay}
                            dailyRecordForSelectedDay={dailyRecordForSelectedDay}
                            dailyGoalTarget={dailyGoalTarget}
                            weeklyStats={weeklyStats}
                            sortedFilteredRecords={sortedRecords}
                            handleDeleteRecord={handleDeleteRecord}
                            deleteTrade={deleteTrade}
                            setTransactionType={setTransactionType}
                            setIsTransactionModalOpen={setIsTransactionModalOpen}
                            goal={{...goal, amount: typeof goal.amount === 'number' ? goal.amount : 0}}
                            isDarkMode={isDarkMode}
                        />
                    )}

                    {activeTab === 'operations' && (
                        <OperationsPanel 
                            sortedFilteredRecords={sortedRecords} 
                            handleDeleteRecord={handleDeleteRecord}
                            isDarkMode={isDarkMode}
                        />
                    )}

                    {activeTab === 'analyze' && (
                        <AnalysisPanel isDarkMode={isDarkMode} />
                    )}

                    {activeTab === 'goals' && (
                        <GoalsPanel 
                            goal={{...goal, amount: typeof goal.amount === 'number' ? goal.amount : 0}} 
                            setGoal={setGoal} 
                            activeBrokerage={activeBrokerage}
                            isDarkMode={isDarkMode}
                        />
                    )}

                    {activeTab === 'settings' && (
                        <SettingsPanel 
                            activeBrokerage={activeBrokerage} 
                            onUpdateBrokerage={updateBrokerage}
                            onDeleteBrokerage={deleteBrokerage}
                            onOpenAddBrokerage={() => setIsAddBrokerageModalOpen(true)}
                            isDarkMode={isDarkMode}
                        />
                    )}
                </div>
            </main>

            {/* Modals */}
            <TransactionModal 
                isOpen={isTransactionModalOpen} 
                onClose={() => setIsTransactionModalOpen(false)} 
                type={transactionType || 'deposit'} 
                onConfirm={handleTransaction}
                isDarkMode={isDarkMode}
            />
            
            <AddBrokerageModal 
                isOpen={isAddBrokerageModalOpen}
                onClose={() => setIsAddBrokerageModalOpen(false)}
                onConfirm={handleAddBrokerage}
                isDarkMode={isDarkMode}
            />

            {isBriefingModalOpen && (
                <DailyBriefingModal 
                    onClose={() => setIsBriefingModalOpen(false)}
                    currentBalance={dailyRecordForSelectedDay?.endBalanceUSD || startBalanceForSelectedDay}
                    dailyGoal={dailyGoalTarget}
                    activeBrokerage={activeBrokerage}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
};

export default App;