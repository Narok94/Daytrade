import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, TransactionRecord, AppRecord, Trade, User } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import { fetchUSDBRLRate } from './services/currencyService';
import { 
    SettingsIcon, PlusIcon, DepositIcon, WithdrawalIcon, XMarkIcon, 
    TrashIcon, LogoutIcon, BellIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, TrendingDownIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ChevronUpIcon, 
    ChevronDownIcon, ArrowPathIcon, CpuChipIcon, InformationCircleIcon,
    EditIcon
} from './components/icons';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';

interface GoalSettings {
    type: 'weekly' | 'monthly' | 'annual';
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
    activeTab: 'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze' | 'soros';
    setActiveTab: (tab: 'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze' | 'soros') => void;
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
                        onClick={() => { setActiveTab('soros'); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}
                    >
                        <CalculatorIcon className={`w-5 h-5 ${activeTab === 'soros' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                        <span className="font-medium">Calculadora Soros</span>
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
    handleOpenEditTradeModal: (dayId: string, tradeId: string) => void;
    setTransactionType: React.Dispatch<React.SetStateAction<'deposit' | 'withdrawal' | null>>;
    setIsTransactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    goal: Omit<GoalSettings, 'amount'> & { amount: number };
    isDarkMode: boolean;
    usdToBrlRate: number;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
    activeBrokerage, customEntryValue, setCustomEntryValue,
    customPayout, setCustomPayout, addRecord, selectedDateString,
    setSelectedDate, isTradingHalted, stopLossLimitReached, setStopLimitOverride, startBalanceForSelectedDay,
    dailyRecordForSelectedDay, dailyGoalTarget, weeklyStats, sortedFilteredRecords,
    handleDeleteRecord, deleteTrade, handleOpenEditTradeModal, setTransactionType, setIsTransactionModalOpen, goal, isDarkMode,
    usdToBrlRate
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
    
    // Currency Logic
    const currency = activeBrokerage.currency || 'BRL'; // Default to BRL if undefined
    const isUSD = currency === 'USD';
    const currencySymbol = isUSD ? '$' : 'R$';

    // Helper for displaying currency
    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

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
    const individualOperations = useMemo(() => getFlattenedOperations(sortedFilteredRecords).slice(0, 10), [sortedFilteredRecords]);

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
                            <p className={`text-xl md:text-2xl font-bold mt-1 ${theme.text}`}>{currencySymbol} {formatCurrency(currentBalance)}</p>
                            {isUSD && (
                                <p className="text-[10px] md:text-xs text-green-500 font-medium">≈ R$ {formatCurrency(currentBalance * usdToBrlRate)}</p>
                            )}
                        </div>
                        <div className={`p-1.5 md:p-2 rounded-lg text-green-500 border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-green-50 border-green-100'}`}>
                             <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25-2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>
                        </div>
                    </div>
                </div>

                {/* Lucro Diário */}
                <div className={`p-4 md:p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className={`${theme.textMuted} text-[9px] md:text-[10px] font-bold uppercase tracking-widest`}>Lucro Diário</p>
                            <p className={`text-xl md:text-2xl font-bold mt-1 ${currentProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentProfit >= 0 ? '+' : ''}{currencySymbol} {formatCurrency(currentProfit)}
                            </p>
                            {isUSD && (
                                <p className={`text-[10px] md:text-xs font-medium ${currentProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    ≈ {currentProfit >= 0 ? '+' : ''}R$ {formatCurrency(currentProfit * usdToBrlRate)}
                                </p>
                            )}
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
                            <div className="flex flex-col mt-1">
                                <p className={`text-xl md:text-2xl font-bold ${currentProfit >= dailyGoalTarget ? 'text-green-500' : theme.text}`}>
                                     {dailyGoalTarget > 0 ? ((currentProfit / dailyGoalTarget) * 100).toFixed(0) : 0}%
                                </p>
                                <span className={`text-[10px] md:text-xs ${theme.textMuted}`}>/ {currencySymbol} {formatCurrency(dailyGoalTarget)}</span>
                                {isUSD && (
                                    <span className={`text-[9px] text-slate-500`}>≈ R$ {formatCurrency(dailyGoalTarget * usdToBrlRate)}</span>
                                )}
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
                            <span className={`block mb-2 text-xs font-bold uppercase tracking-wider group-focus-within:text-green-500 transition-colors ml-1 ${theme.textMuted}`}>VALOR DE ENTRADA ({currencySymbol})</span>
                            <div className="relative">
                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${theme.textMuted}`}>{currencySymbol}</span>
                                <input
                                    type="number"
                                    value={customEntryValue}
                                    onChange={(e) => setCustomEntryValue(e.target.value)}
                                    className={`w-full h-14 border-2 rounded-xl pl-12 pr-4 text-xl font-bold focus:border-green-500 focus:ring-0 focus:outline-none transition-all ${theme.input}`}
                                    placeholder={`${activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue.toFixed(2) : (currentBalance * (activeBrokerage.entryValue / 100)).toFixed(2)}`}
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
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currencySymbol}${value}`} dx={-10} />
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
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currencySymbol}${value}`} dx={-10} />
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
                                <th scope="col" className="px-6 py-4 text-right font-semibold whitespace-nowrap">Valor Entrada</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold whitespace-nowrap">Lucro / Prejuízo</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold whitespace-nowrap">Ações</th>
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
                                         {currencySymbol} {op.value.toFixed(2)}
                                    </td>
                                     <td className={`px-6 py-4 text-right font-bold whitespace-nowrap`}>
                                         {op.type === 'trade' ? (
                                            <span className={op.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                {op.profit >= 0 ? '+' : ''}{currencySymbol} {op.profit.toFixed(2)}
                                            </span>
                                         ) : (
                                            <span className="text-slate-500">-</span>
                                         )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {op.type === 'trade' && (
                                                <button onClick={() => handleOpenEditTradeModal(op.originalRecordId, op.id)} className="p-1 text-slate-400 hover:text-blue-400 transition-colors"><EditIcon className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={() => op.type === 'trade' ? deleteTrade(op.originalRecordId, op.id) : handleDeleteRecord(op.originalRecordId)} className="p-1 text-slate-400 hover:text-red-400 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
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
    handleDeleteRecord: (id: string) => void;
    deleteTrade: (dayId: string, tradeId: string) => void;
    handleOpenEditTradeModal: (dayId: string, tradeId: string) => void;
    isDarkMode: boolean;
}> = ({ sortedFilteredRecords, handleDeleteRecord, deleteTrade, handleOpenEditTradeModal, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const operations = useMemo(() => getFlattenedOperations(sortedFilteredRecords), [sortedFilteredRecords]);

    return (
        <div className="p-4 md:p-8">
            <h2 className={`text-2xl md:text-3xl font-bold mb-6 ${theme.text}`}>Histórico de Operações</h2>
            <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
                <div className="overflow-x-auto">
                    <table className={`w-full text-sm text-left ${theme.textMuted}`}>
                        <thead className={`text-xs uppercase ${theme.tableHeader}`}>
                            <tr>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Data</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Tipo</th>
                                <th className="px-6 py-4 font-semibold whitespace-nowrap">Detalhes</th>
                                <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Valor</th>
                                <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Resultado</th>
                                <th className="px-6 py-4 text-center font-semibold whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {operations.map((op) => (
                                <tr key={op.id} className={`border-b ${theme.border} ${theme.tableRow}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className={`font-medium ${theme.text}`}>{op.displayDate}</span>
                                            <span className="text-xs">{op.displayTime}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {op.subType === 'win' && <span className="text-green-500 font-bold">WIN</span>}
                                        {op.subType === 'loss' && <span className="text-red-500 font-bold">LOSS</span>}
                                        {op.subType === 'deposit' && <span className="text-blue-500 font-bold">DEPÓSITO</span>}
                                        {op.subType === 'withdrawal' && <span className="text-orange-500 font-bold">SAQUE</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{op.details}</td>
                                    <td className={`px-6 py-4 text-right whitespace-nowrap ${theme.text}`}>$ {op.value.toFixed(2)}</td>
                                    <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${op.profit !== null && op.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {op.profit !== null ? (op.profit >= 0 ? `+$${op.profit.toFixed(2)}` : `-$${Math.abs(op.profit).toFixed(2)}`) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-2">
                                            {op.type === 'trade' && (
                                                <button onClick={() => handleOpenEditTradeModal(op.originalRecordId, op.id)} className="p-1 text-slate-400 hover:text-blue-400 transition-colors"><EditIcon className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={() => op.type === 'trade' ? deleteTrade(op.originalRecordId, op.id) : handleDeleteRecord(op.originalRecordId)} className="p-1 text-slate-400 hover:text-red-400 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {operations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center">Nenhum registro encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

interface Signal {
    asset: string;
    entryTime: string;
    action: 'COMPRA' | 'VENDA';
    confidence: number;
    justification: string[];
}

const CryptoIcon: React.FC<{
    baseColor: string;
    baseSymbol: React.ReactNode;
    overlayColor: string;
    overlaySymbol: React.ReactNode;
}> = ({ baseColor, baseSymbol, overlayColor, overlaySymbol }) => (
    <div className="relative w-8 h-8 flex-shrink-0">
        <div className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: baseColor }}>
            {baseSymbol}
        </div>
        <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900" style={{ backgroundColor: overlayColor }}>
            {overlaySymbol}
        </div>
    </div>
);

const assets = [
    { name: 'BTC/USDT', shortName: 'BTCUSDT', icon: { overlayColor: '#f7931a', overlaySymbol: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white"><path d="M16.23 7.28a3.5 3.5 0 00-3.1-2.2H10.5v14h2.52a3.5 3.5 0 003.21-4.92 3.48 3.48 0 00-2.39-2.22 2.52 2.52 0 002.39-2.66zM13 14.8a1.5 1.5 0 01-1.44 1.63H10.5v-3.2h1.1c.8.01 1.44.73 1.4 1.57zM13.43 8.9a1.5 1.5 0 01-1.55 1.5H10.5v-3h1.4c.83 0 1.51.68 1.53 1.5z" /></svg> } },
    { name: 'ETH/USDT', shortName: 'ETHUSDT', icon: { overlayColor: '#627eea', overlaySymbol: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white"><path d="M12 1.75l-6.25 10.45 6.25 3.8 6.25-3.8L12 1.75zM12 17.5l-6.25-3.8 6.25 8.55 6.25-8.55-6.25 3.8z" /></svg> } },
    { name: 'XRP/USDT', shortName: 'XRPUSDT', icon: { overlayColor: '#23292f', overlaySymbol: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-white"><path d="M6.51 7.74L12 10.5l5.49-2.76L12 5zm-.42 1.4L12 12.2l5.91-3.06L12 6.5zm.42 1.83L12 13.9l5.49-2.76L12 8.4zm-.42 1.4L12 15.4l5.91-3.06L12 9.7zm0 1.84L12 17.2l5.49-2.76L12 11.7zm11.49-.93L12 19.5 6.51 16.74 12 14z" /></svg> } },
    { name: 'SOL/USDT', shortName: 'SOLUSDT', icon: { overlayColor: '#9945FF', overlaySymbol: <svg viewBox="0 0 18 18" fill="none" className="w-3.5 h-3.5 text-white"><path d="M2.21 4.54l13.59-2.3c.5-.09.9.48.65.94l-3.3 6.32a.75.75 0 01-1.12.26L9.4 8.12a.75.75 0 00-1.02-.07l-3.2 2.5c-.4.32-.96-.2-.73-.66l-1.9-3.7a.75.75 0 01.66-.65zm.84 8.65L16.64 16c.5.08.9-.48.65-.94l-3.3-6.32a.75.75 0 00-1.12-.26l-2.63 1.64a.75.75 0 01-1.02.07l-3.2-2.5c-.4-.32-.96.2-.73.66l1.9 3.7c.23.46.8.55.66.65z" fill="currentColor" /></svg> } },
];


const AnalysisPanel: React.FC<{
    isDarkMode: boolean;
    activeBrokerage: Brokerage;
    setActiveTab: (tab: 'settings') => void;
}> = ({ isDarkMode, activeBrokerage, setActiveTab }) => {
    const theme = useThemeClasses(isDarkMode);
    const [signal, setSignal] = useState<Signal | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [countdown, setCountdown] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(assets[0]);
    
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const hasApiToken = useMemo(() => activeBrokerage.apiToken && activeBrokerage.apiToken.length > 5, [activeBrokerage.apiToken]);

    const loadingSteps = [
        "Acessando dados do TradingView...",
        "Analisando RSI e Médias Móveis...",
        "Verificando Bandas de Bollinger...",
        "Identificando Padrões de Velas...",
        "Calculando confluência com Fractais de Williams...",
        "Gerando sinal..."
    ];

    const handleGenerateSignal = async () => {
        setLoading(true);
        setSignal(null);
        setLoadingMessage(loadingSteps[0]);

        let step = 0;
        const stepInterval = setInterval(() => {
            step++;
            if (step < loadingSteps.length) {
                setLoadingMessage(loadingSteps[step]);
            }
        }, 1500);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const now = new Date();
            // Random time between 1 and 3 minutes from now
            const randomOffset = Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000;
            const entryTimestamp = now.getTime() + randomOffset;
            const entryDate = new Date(entryTimestamp);
            entryDate.setSeconds(0);
            entryDate.setMilliseconds(0);
            
            const entryTime = entryDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const prompt = `Você é um analista de trading quantitativo de elite, especializado em prever movimentos de mercado de curto prazo (1 minuto) para o par de criptomoedas ${selectedAsset.name}. Sua tarefa é simular uma análise profunda do gráfico de 1 minuto (M1) no TradingView, utilizando uma combinação dos seguintes indicadores: Regiões de Suporte/Resistência, Médias Móveis, Bandas de Bollinger, RSI (Índice de Força Relativa) e Fractais de Williams. Com base na confluência desses indicadores, gere um sinal de trading para uma operação com expiração de 1 minuto.

            A sua resposta DEVE ser um objeto JSON bem formatado, sem nenhum texto ou formatação markdown (como \`\`\`json) ao redor dele. O objeto JSON deve ter a seguinte estrutura:
            {
              "asset": "${selectedAsset.name}",
              "entryTime": "${entryTime}",
              "action": "COMPRA" ou "VENDA",
              "confidence": um número inteiro entre 70 e 95,
              "justification": [
                "Uma justificativa concisa baseada no RSI.",
                "Uma justificativa concisa baseada nas Bandas de Bollinger.",
                "Uma justificativa concisa baseada em um padrão de vela ou Fractal de Williams."
              ]
            }`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });
            
            const parsedSignal: Signal = JSON.parse(response.text);
            setSignal(parsedSignal);

        } catch (error) {
            console.error(error);
            setSignal({
                asset: 'Error',
                action: 'VENDA',
                confidence: 0,
                entryTime: '00:00:00',
                justification: ['Ocorreu um erro ao gerar o sinal. Por favor, tente novamente.']
            });
        } finally {
            clearInterval(stepInterval);
            setLoading(false);
            setLoadingMessage('');
        }
    };

    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (signal && signal.entryTime) {
            const [hour, minute, second] = signal.entryTime.split(':').map(Number);
            const targetTime = new Date();
            targetTime.setHours(hour, minute, second, 0);

            if (targetTime.getTime() < new Date().getTime()) {
                targetTime.setDate(targetTime.getDate() + 1);
            }

            timerRef.current = setInterval(() => {
                const now = new Date().getTime();
                const distance = targetTime.getTime() - now;

                if (distance < 0) {
                    setCountdown("00:00");
                    clearInterval(timerRef.current!);
                    return;
                }

                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                setCountdown(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [signal]);
    
    if (!hasApiToken) {
        return (
            <div className="p-4 md:p-8">
                <div className={`p-6 rounded-2xl border ${theme.card} max-w-2xl mx-auto text-center`}>
                    <CpuChipIcon className="w-12 h-12 mx-auto text-yellow-500" />
                    <h2 className="mt-4 text-2xl font-bold">Funcionalidade Avançada Bloqueada</h2>
                    <p className="mt-2 text-slate-400">Para utilizar a IA Preditiva de Sinais, é necessário configurar o token da API da sua corretora. Isso permite que nossa IA simule uma análise em tempo real com maior precisão.</p>
                    <button 
                        onClick={() => setActiveTab('settings')} 
                        className="mt-6 bg-yellow-500 text-slate-900 font-bold px-6 py-3 rounded-lg hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
                    >
                        Ir para Configurações
                    </button>
                </div>
            </div>
        );
    }

    const isBuy = signal?.action === 'COMPRA';
    const confidenceColor = signal && signal.confidence > 85 ? 'text-green-400' : signal && signal.confidence > 75 ? 'text-yellow-400' : 'text-orange-400';

    const tetherSymbol = <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white"><path d="M12 3.5v17m-8.5-17H21" /></svg>;

    return (
        <div className="p-4 md:p-8">
            <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto`}>
                 <div className="md:col-span-3 lg:col-span-2">
                    <div className={`p-3 rounded-2xl border ${theme.card}`}>
                        <h3 className={`text-sm font-bold mb-3 px-2 ${theme.text}`}>Ativos</h3>
                        <div className="space-y-1">
                            {assets.map(asset => (
                                <button
                                    key={asset.shortName}
                                    onClick={() => {setSelectedAsset(asset); setSignal(null);}}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${selectedAsset.shortName === asset.shortName ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'}`}
                                >
                                    <CryptoIcon
                                        baseColor="#26a17b"
                                        baseSymbol={tetherSymbol}
                                        overlayColor={asset.icon.overlayColor}
                                        overlaySymbol={asset.icon.overlaySymbol}
                                    />
                                    <div>
                                        <p className="font-bold text-sm text-slate-200">{asset.name}</p>
                                        <p className="text-xs text-slate-500">{asset.shortName}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`md:col-span-9 lg:col-span-10 p-6 rounded-2xl border ${theme.card}`}>
                     <div className="text-center mb-8">
                        <h2 className={`text-3xl font-black ${theme.text}`}>Central de Sinais IA</h2>
                        <p className={theme.textMuted}>Análise de M1 para <span className='font-bold text-green-400'>{selectedAsset.name}</span> com expiração de 1 minuto.</p>
                    </div>
                    
                    <div className="flex justify-center">
                        {!signal && !loading && (
                            <div className="text-center">
                                 <p className="max-w-xl mx-auto text-slate-400 mb-6">
                                    Clique no botão abaixo para que a IA realize uma análise técnica completa do mercado em tempo real e gere um sinal de alta probabilidade.
                                </p>
                                <button 
                                    onClick={handleGenerateSignal} 
                                    disabled={loading}
                                    className="bg-green-500 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-400 disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/30 transform hover:scale-105 active:scale-100"
                                >
                                    <CpuChipIcon className="w-6 h-6" />
                                    {loading ? 'Analisando...' : 'Analisar Mercado Agora'}
                                </button>
                            </div>
                        )}
                    </div>

                    {loading && (
                        <div className="text-center py-10 transition-all duration-500">
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-green-500 rounded-full animate-spin"></div>
                                <div className="w-full h-full flex items-center justify-center">
                                     <CpuChipIcon className={`w-10 h-10 text-green-500 mx-auto animate-pulse`} />
                                </div>
                            </div>
                            <p className="mt-6 text-xl font-semibold">{loadingMessage}</p>
                            <p className="text-sm text-slate-500">Aguarde, a IA está processando os indicadores...</p>
                        </div>
                    )}
                    
                    {signal && !loading && (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-float">
                            <div className={`lg:col-span-3 p-6 rounded-2xl border ${isBuy ? 'border-green-500/30 bg-green-950/20' : 'border-red-500/30 bg-red-950/20'}`}>
                                 <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{signal.asset}</p>
                                 <p className={`text-6xl font-black my-4 ${isBuy ? 'text-green-400' : 'text-red-400'}`}>{signal.action}</p>
                                 <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isBuy ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>Expiração M1</span>
                                    <span className="text-slate-400 text-sm">Entrada para a vela das <b className="text-white">{signal.entryTime}</b></span>
                                 </div>
                            </div>
                            <div className={`lg:col-span-2 p-6 rounded-2xl flex flex-col justify-center items-center gap-4 text-center border ${theme.border}`}>
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tempo Restante</p>
                                    <p className="text-5xl font-mono font-black tracking-tighter text-white">{countdown || '00:00'}</p>
                                </div>
                                 <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Confiança</p>
                                    <p className={`text-3xl font-bold ${confidenceColor}`}>{signal.confidence}%</p>
                                </div>
                            </div>
                             <div className={`lg:col-span-5 p-6 rounded-2xl border ${theme.border}`}>
                                 <h4 className="font-bold text-slate-300 mb-3">Justificativa Técnica da IA</h4>
                                 <ul className="space-y-2 list-none p-0 text-sm">
                                    {signal.justification.map((item, index) => (
                                        <li key={index} className="flex items-start gap-3 p-2 rounded-lg bg-slate-900/50">
                                            <span className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${isBuy ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            <span className="text-slate-400">{item.trim()}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-xs text-slate-500/70 text-center">
                        <p><b>Aviso:</b> Esta é uma análise gerada por IA com base em dados simulados e não constitui aconselhamento financeiro. Use por sua conta e risco. A performance passada não garante resultados futuros.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SorosCalculatorProps {
    isDarkMode: boolean;
    activeBrokerage: Brokerage;
    usdToBrlRate: number;
    currentBalance: number;
    sorosState: { initialInvestment: number | ''; payout: number | ''; levels: number | '' };
    setSorosState: React.Dispatch<React.SetStateAction<{ initialInvestment: number | ''; payout: number | ''; levels: number | '' }>>;
}

const SorosCalculatorPanel: React.FC<SorosCalculatorProps> = ({ isDarkMode, activeBrokerage, usdToBrlRate, currentBalance, sorosState, setSorosState }) => {
    const theme = useThemeClasses(isDarkMode);

    const { initialInvestment, payout, levels } = sorosState;

    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    const isUSD = activeBrokerage.currency === 'USD';

    const calculateSoros = () => {
        let currentEntry = initialInvestment === '' ? 0 : initialInvestment;
        const currentPayout = payout === '' ? 0 : payout;
        const currentLevels = levels === '' ? 0 : levels;

        const rows = [];
        let accumulatedProfit = 0;

        for(let i = 1; i <= currentLevels; i++) {
            const profit = currentEntry * (currentPayout / 100);
            const totalReturn = currentEntry + profit;
            
            rows.push({
                level: i,
                entry: currentEntry,
                profit: profit,
                totalReturn: totalReturn
            });
            
            accumulatedProfit += profit;
            currentEntry = totalReturn; 
        }

        const investmentValue = initialInvestment === '' ? 0 : initialInvestment;
        return { rows, totalReturn: currentEntry, totalProfit: currentEntry - investmentValue };
    };

    const data = useMemo(() => calculateSoros(), [initialInvestment, payout, levels]);
    const projectedBankroll = currentBalance + data.totalProfit;

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="p-4 md:p-8">
            <h2 className={`text-2xl md:text-3xl font-bold mb-6 md:mb-8 ${theme.text}`}>Calculadora de Soros</h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Inputs */}
                <div className={`lg:col-span-4 p-6 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-lg font-bold mb-6 border-b pb-4 ${theme.text} ${theme.border}`}>Configuração</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Investimento Inicial ({currencySymbol})</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={initialInvestment}
                                    onChange={(e) => setSorosState(prev => ({...prev, initialInvestment: e.target.value === '' ? '' : parseFloat(e.target.value)}))}
                                    placeholder="Ex: 100"
                                    className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Payout (%)</label>
                            <input
                                type="number"
                                value={payout}
                                onChange={(e) => setSorosState(prev => ({...prev, payout: e.target.value === '' ? '' : parseFloat(e.target.value)}))}
                                placeholder="Ex: 87"
                                className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Quantidade de Mãos</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={levels}
                                onChange={(e) => setSorosState(prev => ({...prev, levels: e.target.value === '' ? '' : parseInt(e.target.value)}))}
                                placeholder="Ex: 3"
                                className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                            />
                        </div>
                    </div>

                    <div className="mt-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                         <p className="text-xs font-bold text-green-500 uppercase mb-1">Lucro Projetado</p>
                         <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                             {currencySymbol} {formatMoney(data.totalProfit)}
                         </p>
                         {isUSD && (
                             <p className={`text-xs font-bold text-green-400 mt-1`}>
                                 ≈ R$ {formatMoney(data.totalProfit * usdToBrlRate)}
                             </p>
                         )}
                         <div className={`mt-4 pt-3 border-t ${isDarkMode ? 'border-green-500/30' : 'border-green-200'}`}>
                             <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs ${theme.textMuted}`}>Retorno da Operação:</span>
                                <span className={`text-sm font-bold ${theme.text}`}>{currencySymbol} {formatMoney(data.totalReturn)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className={`text-xs font-bold uppercase ${theme.textMuted}`}>Banca Prevista:</span>
                                <div className="text-right">
                                    <span className={`text-lg font-black ${theme.text}`}>{currencySymbol} {formatMoney(projectedBankroll)}</span>
                                    {isUSD && <div className="text-[10px] text-green-400 font-bold">≈ R$ {formatMoney(projectedBankroll * usdToBrlRate)}</div>}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className={`lg:col-span-8 rounded-2xl border overflow-hidden ${theme.card}`}>
                    <div className="overflow-x-auto">
                        <table className={`w-full text-sm text-left ${theme.textMuted}`}>
                            <thead className={`text-xs uppercase ${theme.tableHeader}`}>
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap text-center">Mão #</th>
                                    <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap text-right">Valor Entrada</th>
                                    <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap text-right">Lucro ({payout === '' ? 0 : payout}%)</th>
                                    <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap text-right">Retorno Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.length > 0 ? data.rows.map((row) => (
                                    <tr key={row.level} className={`border-b ${theme.border} ${theme.tableRow} transition-colors`}>
                                        <td className="px-6 py-4 text-center font-bold">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                                                {row.level}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {currencySymbol} {formatMoney(row.entry)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-green-500">
                                            + {currencySymbol} {formatMoney(row.profit)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${theme.text}`}>
                                            {currencySymbol} {formatMoney(row.totalReturn)}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-600">
                                            Preencha os dados ao lado para calcular.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


const GoalsPanel: React.FC<{
    goal: GoalSettings;
    setGoal: React.Dispatch<React.SetStateAction<GoalSettings>>;
    activeBrokerage: Brokerage;
    isDarkMode: boolean;
    currentMonthlyProfit: number;
    currentWeeklyProfit: number;
    currentDailyProfit: number;
}> = ({ goal, setGoal, activeBrokerage, isDarkMode, currentMonthlyProfit, currentWeeklyProfit, currentDailyProfit }) => {
    const theme = useThemeClasses(isDarkMode);
    const [localGoal, setLocalGoal] = useState<GoalSettings>({ ...goal });
    const [showSavedToast, setShowSavedToast] = useState(false);

    useEffect(() => {
        setLocalGoal({ ...goal });
    }, [goal]);

    const handleSave = () => {
        setGoal(localGoal);
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 3000);
    };

    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    const goalAmount = typeof localGoal.amount === 'number' ? localGoal.amount : 0;

    // Calculate Targets based on input
    let monthlyTarget = 0;
    let weeklyTarget = 0;
    let dailyTarget = 0;

    if (localGoal.type === 'monthly') {
        monthlyTarget = goalAmount;
        weeklyTarget = goalAmount / 4.33; // Approx weeks in month
        dailyTarget = goalAmount / 22; // Approx trading days
    } else if (localGoal.type === 'annual') {
        monthlyTarget = goalAmount / 12;
        weeklyTarget = goalAmount / 52;
        dailyTarget = goalAmount / 252; // standard trading days approx
    } else {
        weeklyTarget = goalAmount;
        monthlyTarget = goalAmount * 4.33;
        dailyTarget = goalAmount / 5;
    }

    const calculateProgress = (current: number, target: number) => {
        if (target <= 0) return { percent: 0, remaining: 0, remainingPercent: 100 };
        const percent = Math.min((current / target) * 100, 100);
        const remaining = Math.max(target - current, 0);
        const remainingPercent = Math.max(100 - percent, 0);
        return { percent, remaining, remainingPercent };
    };

    const monthlyStats = calculateProgress(Math.max(0, currentMonthlyProfit), monthlyTarget);
    const weeklyStats = calculateProgress(Math.max(0, currentWeeklyProfit), weeklyTarget);
    const dailyStats = calculateProgress(Math.max(0, currentDailyProfit), dailyTarget);

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const ProgressBar: React.FC<{ label: string; current: number; target: number; stats: any }> = ({ label, current, target, stats }) => (
        <div className={`p-5 rounded-2xl border ${theme.card}`}>
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>{label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-xl font-bold ${theme.text}`}>{currencySymbol} {formatMoney(current)}</span>
                        <span className={`text-xs ${theme.textMuted}`}>/ {formatMoney(target)}</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-2xl font-black ${stats.percent >= 100 ? 'text-green-500' : 'text-blue-500'}`}>
                        {stats.percent.toFixed(1)}%
                    </span>
                </div>
            </div>
            
            <div className={`w-full h-3 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${stats.percent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${stats.percent}%` }}
                ></div>
            </div>

            <div className="flex justify-between items-center mt-3 text-xs font-medium">
                <span className={theme.textMuted}>Concluído</span>
                <span className={`${stats.remaining > 0 ? 'text-red-400' : 'text-green-500'}`}>
                    {stats.remaining > 0 ? `Faltam ${stats.remainingPercent.toFixed(1)}% (${currencySymbol} ${formatMoney(stats.remaining)})` : 'Meta Batida!'}
                </span>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl md:text-3xl font-bold ${theme.text}`}>Metas e Objetivos</h2>
                {showSavedToast && (
                    <div className="bg-green-500 text-slate-900 px-4 py-2 rounded-lg font-bold shadow-lg animate-bounce flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Meta Salva!
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Settings Card */}
                <div className={`lg:col-span-4 h-fit p-6 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-lg font-bold mb-6 border-b pb-4 ${theme.text} ${theme.border}`}>Configurar Meta</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Definir por</label>
                            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                                <button
                                    onClick={() => setLocalGoal(prev => ({ ...prev, type: 'weekly' }))}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${localGoal.type === 'weekly' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    Semanal
                                </button>
                                <button
                                    onClick={() => setLocalGoal(prev => ({ ...prev, type: 'monthly' }))}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${localGoal.type === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    Mensal
                                </button>
                                <button
                                    onClick={() => setLocalGoal(prev => ({ ...prev, type: 'annual' }))}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${localGoal.type === 'annual' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    Anual
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Valor Alvo ({currencySymbol})</label>
                            <input 
                                type="number"
                                value={localGoal.amount}
                                onChange={(e) => setLocalGoal(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                                className={`w-full px-4 py-3 rounded-lg text-lg font-bold ${theme.input} focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="p-4 bg-blue-500/10 text-blue-500 rounded-xl text-sm border border-blue-500/20">
                            <p className="flex items-center gap-2 font-bold mb-1">
                                <InformationCircleIcon className="w-4 h-4" /> Dica:
                            </p>
                            Defina uma meta realista para manter a consistência no longo prazo.
                        </div>

                        <button 
                            onClick={handleSave}
                            className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 active:scale-95"
                        >
                            Salvar Meta
                        </button>
                    </div>
                </div>

                {/* Progress Dashboard */}
                <div className="lg:col-span-8 space-y-4">
                    <ProgressBar 
                        label="Progresso Diário" 
                        current={currentDailyProfit} 
                        target={dailyTarget} 
                        stats={dailyStats} 
                    />
                    <ProgressBar 
                        label="Progresso Semanal" 
                        current={currentWeeklyProfit} 
                        target={weeklyTarget} 
                        stats={weeklyStats} 
                    />
                    <ProgressBar 
                        label="Progresso Mensal" 
                        current={currentMonthlyProfit} 
                        target={monthlyTarget} 
                        stats={monthlyStats} 
                    />
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
                             <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Moeda</label>
                             <select 
                                value={formData.currency || 'BRL'}
                                onChange={(e) => handleChange('currency', e.target.value)}
                                className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 transition-colors ${theme.input}`}
                            >
                                <option value="BRL">Real (BRL)</option>
                                <option value="USD">Dólar (USD)</option>
                            </select>
                        </div>

                        <div>
                             <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Saldo Inicial</label>
                             <div className="relative">
                                <input
                                    type="number"
                                    value={formData.initialBalance}
                                    onChange={(e) => handleChange('initialBalance', parseFloat(e.target.value))}
                                    className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                                />
                             </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Token da API da Corretora (Opcional)</label>
                            <input
                                type="text"
                                value={formData.apiToken || ''}
                                onChange={(e) => handleChange('apiToken', e.target.value)}
                                className={`block w-full px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                                placeholder="Cole seu token da API aqui"
                            />
                        </div>

                        <div className="p-4 bg-blue-500/10 text-blue-500 rounded-xl text-sm border border-blue-500/20">
                            <p className="flex items-center gap-2 font-bold mb-1">
                                <InformationCircleIcon className="w-4 h-4" /> Para que serve?
                            </p>
                            O token da API permitirá, no futuro, que a IA analise os gráficos da sua corretora em tempo real.
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
                                    {formData.entryMode === 'fixed' ? 'Valor da Entrada' : 'Porcentagem da Banca (%)'}
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

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; isDarkMode: boolean }> = ({ isOpen, onClose, children, title, isDarkMode }) => {
    if (!isOpen) return null;
    const theme = useThemeClasses(isDarkMode);
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${theme.modalContent} animate-float`}>
                <div className={`px-6 py-4 border-b flex justify-between items-center ${theme.border}`}>
                    <h3 className={`font-bold text-lg ${theme.text}`}>{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;
        onConfirm(parseFloat(amount), notes);
        setAmount('');
        setNotes('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={type === 'deposit' ? 'Novo Depósito' : 'Novo Saque'} isDarkMode={isDarkMode}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Valor</label>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:outline-none ${theme.input}`}
                        placeholder="0.00"
                        autoFocus
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Observação (Opcional)</label>
                    <input 
                        type="text" 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:outline-none ${theme.input}`}
                        placeholder="Ex: Aporte mensal"
                    />
                </div>
                <button type="submit" className="w-full py-3 bg-green-500 text-slate-900 font-bold rounded-xl hover:bg-green-400 transition-colors mt-2">
                    Confirmar
                </button>
            </form>
        </Modal>
    );
};

const AddBrokerageModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string, initialBalance: number) => void;
    isDarkMode: boolean;
}> = ({ isOpen, onClose, onConfirm, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        onConfirm(name, parseFloat(balance) || 0);
        setName('');
        setBalance('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nova Corretora" isDarkMode={isDarkMode}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Nome da Corretora</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:outline-none ${theme.input}`}
                        placeholder="Ex: Quotex"
                        autoFocus
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Saldo Inicial</label>
                    <input 
                        type="number" 
                        value={balance} 
                        onChange={e => setBalance(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:outline-none ${theme.input}`}
                        placeholder="0.00"
                    />
                </div>
                <button type="submit" className="w-full py-3 bg-green-500 text-slate-900 font-bold rounded-xl hover:bg-green-400 transition-colors mt-2">
                    Criar Corretora
                </button>
            </form>
        </Modal>
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
     
     return (
        <Modal isOpen={true} onClose={onClose} title="Planejamento Diário" isDarkMode={isDarkMode}>
             <div className="space-y-4 text-center">
                <p className={theme.textMuted}>Vamos iniciar os trabalhos de hoje!</p>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-xl border ${theme.card}`}>
                        <p className="text-xs uppercase font-bold text-slate-500">Saldo Atual</p>
                        <p className={`text-lg font-bold ${theme.text}`}>{activeBrokerage.currency === 'USD' ? '$' : 'R$'} {currentBalance.toFixed(2)}</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${theme.card}`}>
                         <p className="text-xs uppercase font-bold text-slate-500">Meta do Dia</p>
                         <p className="text-lg font-bold text-green-500">+ {activeBrokerage.currency === 'USD' ? '$' : 'R$'} {dailyGoal.toFixed(2)}</p>
                    </div>
                </div>

                <div className="text-left text-sm space-y-2 mt-4">
                    <p className={theme.text}><span className="text-green-500 font-bold">✓</span> Respeite o Gerenciamento</p>
                    <p className={theme.text}><span className="text-green-500 font-bold">✓</span> Não opere com pressa</p>
                    <p className={theme.text}><span className="text-green-500 font-bold">✓</span> Pare se atingir o Stop Loss</p>
                </div>

                <button onClick={onClose} className="w-full py-3 bg-green-500 text-slate-900 font-bold rounded-xl hover:bg-green-400 transition-colors mt-4">
                    Vamos lá!
                </button>
             </div>
        </Modal>
     );
};

const EditTradeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (dayId: string, tradeId: string, updatedData: { entryValue: number; payoutPercentage: number; result: 'win' | 'loss' }) => void;
    tradeData: { dayId: string; trade: Trade } | null;
    isDarkMode: boolean;
}> = ({ isOpen, onClose, onSave, tradeData, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [formData, setFormData] = useState({ entryValue: '', payoutPercentage: '', result: 'win' });

    useEffect(() => {
        if (tradeData) {
            setFormData({
                entryValue: String(tradeData.trade.entryValue),
                payoutPercentage: String(tradeData.trade.payoutPercentage),
                result: tradeData.trade.result,
            });
        }
    }, [tradeData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tradeData) return;
        onSave(tradeData.dayId, tradeData.trade.id, {
            entryValue: parseFloat(formData.entryValue) || 0,
            payoutPercentage: parseFloat(formData.payoutPercentage) || 0,
            result: formData.result as 'win' | 'loss',
        });
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Operação" isDarkMode={isDarkMode}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Resultado</label>
                    <select
                        value={formData.result}
                        onChange={e => setFormData(prev => ({ ...prev, result: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:outline-none ${theme.input}`}
                    >
                        <option value="win">Win</option>
                        <option value="loss">Loss</option>
                    </select>
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Valor de Entrada</label>
                    <input
                        type="number"
                        value={formData.entryValue}
                        onChange={e => setFormData(prev => ({ ...prev, entryValue: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:outline-none ${theme.input}`}
                    />
                </div>
                <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>Payout (%)</label>
                    <input
                        type="number"
                        value={formData.payoutPercentage}
                        onChange={e => setFormData(prev => ({ ...prev, payoutPercentage: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:outline-none ${theme.input}`}
                    />
                </div>
                <button type="submit" className="w-full py-3 bg-green-500 text-slate-900 font-bold rounded-xl hover:bg-green-400 transition-colors mt-2">
                    Salvar Alterações
                </button>
            </form>
        </Modal>
    );
};

// --- Main App Component ---

const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze' | 'soros'>('dashboard');
    const [usdToBrlRate, setUsdToBrlRate] = useState<number>(5.0); // Default fallback
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('app_theme');
        return saved ? saved === 'dark' : true; // Default dark
    });

    const [sorosState, setSorosState] = useState({ initialInvestment: '', payout: '', levels: '' });
    const [isEditTradeModalOpen, setIsEditTradeModalOpen] = useState(false);
    const [editingTrade, setEditingTrade] = useState<{ dayId: string; trade: Trade } | null>(null);
    
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
        stopLossTrades: 2,
        currency: 'BRL',
        apiToken: 'aj4mwhx2bw'
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

    // Fetch USD Rate on mount
    useEffect(() => {
        const getRate = async () => {
            try {
                const rate = await fetchUSDBRLRate();
                setUsdToBrlRate(rate);
                console.log("USD Rate Fetched:", rate);
            } catch (e) {
                console.error("Failed to fetch USD rate", e);
            }
        };
        getRate();
    }, []);

    // Load user specific data and handle migration
    useEffect(() => {
        setIsLoading(true);
        try {
            // Load Records
            const savedRecords = localStorage.getItem(`app_records_${user.username}_${activeBrokerageId}`);
            let loadedRecords: AppRecord[] = savedRecords ? JSON.parse(savedRecords) : [];

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

    // CALCULATE AGGREGATED STATS (Monthly / Weekly)
    const { currentMonthlyProfit, currentWeeklyProfit } = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const getWeekNumber = (d: Date) => {
            d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };
        const currentWeek = getWeekNumber(now);

        let mProfit = 0;
        let wProfit = 0;

        sortedRecords.forEach(r => {
            if (r.recordType === 'day') {
                const rDate = new Date(r.date + 'T00:00:00Z'); // Force UTC
                
                if (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
                    mProfit += r.netProfitUSD;
                }

                if (getWeekNumber(rDate) === currentWeek && rDate.getFullYear() === currentYear) {
                    wProfit += r.netProfitUSD;
                }
            }
        });

        return { currentMonthlyProfit: mProfit, currentWeeklyProfit: wProfit };
    }, [sortedRecords]);


    const getStartBalanceForDate = (dateStr: string) => {
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
    const dailyGoalTarget = goal.type === 'monthly' ? (goalAmount / 22) : (goal.type === 'annual' ? (goalAmount / 252) : (goalAmount / 5));

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
        const currentDayBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;

        const entry = customEntryValueUSD !== undefined 
            ? customEntryValueUSD 
            : (activeBrokerage.entryMode === 'fixed' 
                ? activeBrokerage.entryValue 
                : currentDayBalance * (activeBrokerage.entryValue / 100));
        
        const payout = customPayoutPercentage !== undefined ? customPayoutPercentage : activeBrokerage.payoutPercentage;
        
        setRecords(prev => {
            const existingRecordIndex = prev.findIndex(r => r.recordType === 'day' && r.id === selectedDateString);
            
            const newTrades: Trade[] = [];
            const baseId = Date.now();

            for (let i = 0; i < winCount; i++) {
                newTrades.push({ id: `${baseId}-w-${i}`, timestamp: baseId + i, result: 'win', entryValue: entry, payoutPercentage: payout });
            }
            for (let i = 0; i < lossCount; i++) {
                newTrades.push({ id: `${baseId}-l-${i}`, timestamp: baseId + winCount + i, result: 'loss', entryValue: entry, payoutPercentage: payout });
            }

            if (existingRecordIndex >= 0) {
                const updated = [...prev];
                const rec = updated[existingRecordIndex] as DailyRecord;
                const updatedTrades = [...rec.trades, ...newTrades];
                const wins = updatedTrades.filter(t => t.result === 'win').length;
                const losses = updatedTrades.filter(t => t.result === 'loss').length;
                const netProfit = updatedTrades.reduce((acc, t) => acc + (t.result === 'win' ? (t.entryValue * (t.payoutPercentage/100)) : -t.entryValue), 0);

                updated[existingRecordIndex] = { ...rec, trades: updatedTrades, winCount: wins, lossCount: losses, netProfitUSD: netProfit, endBalanceUSD: rec.startBalanceUSD + netProfit };
                return updated;
            } else {
                const netProfit = newTrades.reduce((acc, t) => acc + (t.result === 'win' ? (t.entryValue * (t.payoutPercentage/100)) : -t.entryValue), 0);
                return [...prev, {
                    recordType: 'day', brokerageId: activeBrokerageId, id: selectedDateString, date: selectedDateString,
                    startBalanceUSD: startBalanceForSelectedDay, trades: newTrades, winCount: winCount, lossCount: lossCount,
                    netProfitUSD: netProfit, endBalanceUSD: startBalanceForSelectedDay + netProfit
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
            
            if (updatedTrades.length === 0) {
                // If no trades left, remove the whole day record
                return prev.filter(r => r.id !== dayId);
            }
            
            const wins = updatedTrades.filter(t => t.result === 'win').length;
            const losses = updatedTrades.filter(t => t.result === 'loss').length;
            const netProfit = updatedTrades.reduce((acc, t) => acc + (t.result === 'win' ? (t.entryValue * (t.payoutPercentage/100)) : -t.entryValue), 0);
            
            const updatedDay = { ...dayRecord, trades: updatedTrades, winCount: wins, lossCount: losses, netProfitUSD: netProfit, endBalanceUSD: dayRecord.startBalanceUSD + netProfit };
            
            const newRecords = [...prev];
            newRecords[dayIndex] = updatedDay;
            return newRecords;
        });
    };

    const handleOpenEditTradeModal = (dayId: string, tradeId: string) => {
        const dayRecord = records.find(r => r.id === dayId && r.recordType === 'day') as DailyRecord;
        const tradeToEdit = dayRecord?.trades.find(t => t.id === tradeId);
        if (dayRecord && tradeToEdit) {
            setEditingTrade({ dayId, trade: tradeToEdit });
            setIsEditTradeModalOpen(true);
        }
    };

    const handleUpdateTrade = (dayId: string, tradeId: string, updatedData: { entryValue: number; payoutPercentage: number; result: 'win' | 'loss' }) => {
        setRecords(prev => {
            const dayIndex = prev.findIndex(r => r.id === dayId && r.recordType === 'day');
            if (dayIndex === -1) return prev;
            
            const dayRecord = prev[dayIndex] as DailyRecord;
            const updatedTrades = dayRecord.trades.map(t => t.id === tradeId ? { ...t, ...updatedData } : t);
            
            const wins = updatedTrades.filter(t => t.result === 'win').length;
            const losses = updatedTrades.filter(t => t.result === 'loss').length;
            const netProfit = updatedTrades.reduce((acc, t) => acc + (t.result === 'win' ? (t.entryValue * (t.payoutPercentage/100)) : -t.entryValue), 0);
            
            const updatedDay = { ...dayRecord, trades: updatedTrades, winCount: wins, lossCount: losses, netProfitUSD: netProfit, endBalanceUSD: dayRecord.startBalanceUSD + netProfit };
            
            const newRecords = [...prev];
            newRecords[dayIndex] = updatedDay;
            return newRecords;
        });
        setIsEditTradeModalOpen(false);
    };

    const handleTransaction = (amount: number, notes: string) => {
        if (!transactionType) return;
        const newRecord: TransactionRecord = {
            recordType: transactionType, brokerageId: activeBrokerageId, id: Date.now().toString(),
            timestamp: Date.now(), date: selectedDateString, displayDate: displayDateString,
            amountUSD: amount, notes: notes
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
            localStorage.removeItem(`app_records_${user.username}_${id}`);
            localStorage.removeItem(`app_goals_${user.username}_${id}`);
            setActiveBrokerageId(brokerages.find(b => b.id !== id)?.id || '');
        }
    };

    const handleAddBrokerage = (name: string, initialBalance: number) => {
        const newBrokerage: Brokerage = { ...defaultBrokerage, id: Date.now().toString(), name, initialBalance, currency: 'BRL', apiToken: '' };
        setBrokerages(prev => [...prev, newBrokerage]);
        setActiveBrokerageId(newBrokerage.id);
        setActiveTab('settings');
    };

    const weeklyStats = { profit: 0, wins: 0, losses: 0, totalTrades: 0, winRate: 0, startBalance: 0, currentBalance: 0 };

    const theme = useThemeClasses(isDarkMode);
    
    if (isLoading) {
        return <div className={`min-h-screen flex items-center justify-center ${theme.bg} ${theme.text}`}>Carregando dados...</div>;
    }

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            <Sidebar 
                activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} 
                isDarkMode={isDarkMode} toggleTheme={toggleTheme} isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
            
            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                <Header 
                    user={user} activeBrokerage={activeBrokerage} brokerages={brokerages} 
                    setActiveBrokerageId={setActiveBrokerageId} isDarkMode={isDarkMode}
                    onOpenBriefing={() => setIsBriefingModalOpen(true)} onOpenMenu={() => setIsMobileMenuOpen(true)}
                />

                <div className="flex-1 overflow-y-auto w-full">
                    {activeTab === 'dashboard' && (
                        <DashboardPanel
                            activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue}
                            customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord}
                            selectedDateString={selectedDateString} setSelectedDate={setSelectedDate} isTradingHalted={isTradingHalted}
                            stopLossLimitReached={stopLossLimitReached} setStopLimitOverride={setStopLimitOverride} startBalanceForSelectedDay={startBalanceForSelectedDay}
                            dailyRecordForSelectedDay={dailyRecordForSelectedDay} dailyGoalTarget={dailyGoalTarget} weeklyStats={weeklyStats}
                            sortedFilteredRecords={sortedRecords} handleDeleteRecord={handleDeleteRecord} deleteTrade={deleteTrade}
                            handleOpenEditTradeModal={handleOpenEditTradeModal} setTransactionType={setTransactionType} setIsTransactionModalOpen={setIsTransactionModalOpen}
                            goal={{...goal, amount: typeof goal.amount === 'number' ? goal.amount : 0}} isDarkMode={isDarkMode}
                            usdToBrlRate={usdToBrlRate}
                        />
                    )}

                    {activeTab === 'operations' && (
                        <OperationsPanel 
                            sortedFilteredRecords={sortedRecords} handleDeleteRecord={handleDeleteRecord} deleteTrade={deleteTrade}
                            handleOpenEditTradeModal={handleOpenEditTradeModal} isDarkMode={isDarkMode}
                        />
                    )}

                    {activeTab === 'analyze' && (
                        <AnalysisPanel 
                            isDarkMode={isDarkMode} 
                            activeBrokerage={activeBrokerage} 
                            setActiveTab={setActiveTab as (tab: 'settings') => void}
                        />
                    )}

                    {activeTab === 'soros' && (
                        <SorosCalculatorPanel 
                            isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} usdToBrlRate={usdToBrlRate}
                            currentBalance={dailyRecordForSelectedDay?.endBalanceUSD || startBalanceForSelectedDay}
                            sorosState={sorosState} setSorosState={setSorosState}
                        />
                    )}

                    {activeTab === 'goals' && (
                        <GoalsPanel 
                            goal={{...goal, amount: typeof goal.amount === 'number' ? goal.amount : 0}} setGoal={setGoal} 
                            activeBrokerage={activeBrokerage} isDarkMode={isDarkMode}
                            currentMonthlyProfit={currentMonthlyProfit} currentWeeklyProfit={currentWeeklyProfit}
                            currentDailyProfit={dailyRecordForSelectedDay?.netProfitUSD || 0}
                        />
                    )}

                    {activeTab === 'settings' && (
                        <SettingsPanel 
                            activeBrokerage={activeBrokerage} onUpdateBrokerage={updateBrokerage}
                            onDeleteBrokerage={deleteBrokerage} onOpenAddBrokerage={() => setIsAddBrokerageModalOpen(true)}
                            isDarkMode={isDarkMode}
                        />
                    )}
                </div>
            </main>

            {/* Modals */}
            <TransactionModal 
                isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} 
                type={transactionType || 'deposit'} onConfirm={handleTransaction} isDarkMode={isDarkMode}
            />
            
            <AddBrokerageModal 
                isOpen={isAddBrokerageModalOpen} onClose={() => setIsAddBrokerageModalOpen(false)}
                onConfirm={handleAddBrokerage} isDarkMode={isDarkMode}
            />

            {isBriefingModalOpen && (
                <DailyBriefingModal 
                    onClose={() => setIsBriefingModalOpen(false)}
                    currentBalance={dailyRecordForSelectedDay?.endBalanceUSD || startBalanceForSelectedDay}
                    dailyGoal={dailyGoalTarget} activeBrokerage={activeBrokerage} isDarkMode={isDarkMode}
                />
            )}

            <EditTradeModal
                isOpen={isEditTradeModalOpen}
                onClose={() => setIsEditTradeModalOpen(false)}
                onSave={handleUpdateTrade}
                tradeData={editingTrade}
                isDarkMode={isDarkMode}
            />
        </div>
    );
};

export default App;