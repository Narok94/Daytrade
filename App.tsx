import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Brokerage, DailyRecord, TransactionRecord, AppRecord, Trade, User } from './types';
import { fetchUSDBRLRate } from './services/currencyService';
import { 
    SettingsIcon, PlusIcon, DepositIcon, WithdrawalIcon, XMarkIcon, 
    TrashIcon, HomeIcon, TrophyIcon, InformationCircleIcon, LogoutIcon, 
    SearchIcon, BellIcon, LayoutGridIcon, PieChartIcon, ChartBarIcon,
    TrendingUpIcon, TrendingDownIcon, ListBulletIcon, TargetIcon, CalculatorIcon, SunIcon, MoonIcon
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

// --- Child Components ---

const Sidebar: React.FC<{
    activeTab: 'dashboard' | 'operations' | 'goals' | 'settings';
    setActiveTab: (tab: 'dashboard' | 'operations' | 'goals' | 'settings') => void;
    onLogout: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
}> = ({ activeTab, setActiveTab, onLogout, isDarkMode, toggleTheme }) => {
    const theme = useThemeClasses(isDarkMode);

    return (
        <aside className={`w-64 flex flex-col flex-shrink-0 ${theme.sidebar}`}>
            <div className={`h-20 flex items-center px-6 ${isDarkMode ? 'border-b border-slate-900/50' : 'border-b border-slate-100'}`}>
                <div className="flex items-center gap-2">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className={`text-xl font-bold tracking-wider ${theme.text}`}>HRK <span className="text-green-500">Analytics</span></span>
                </div>
            </div>
            
            <nav className="flex-1 px-4 py-6 space-y-1">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}
                >
                    <LayoutGridIcon className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                    <span className="font-medium">Dashboard</span>
                </button>
                
                <button 
                    onClick={() => setActiveTab('operations')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'operations' ? theme.navActive : theme.navInactive}`}
                >
                    <ListBulletIcon className={`w-5 h-5 ${activeTab === 'operations' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                    <span className="font-medium">Operações</span>
                </button>
                
                <button 
                    onClick={() => setActiveTab('goals')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}
                >
                    <TargetIcon className={`w-5 h-5 ${activeTab === 'goals' ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                    <span className="font-medium">Metas</span>
                </button>

                 <button 
                    onClick={() => setActiveTab('settings')}
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
    );
}

const Header: React.FC<{
    user: User;
    activeBrokerage: Brokerage | undefined;
    brokerages: Brokerage[];
    setActiveBrokerageId: (id: string) => void;
    usdToBrlRate: number | null;
    isDarkMode: boolean;
    onOpenBriefing: () => void;
}> = ({ user, activeBrokerage, brokerages, setActiveBrokerageId, usdToBrlRate, isDarkMode, onOpenBriefing }) => {
    const theme = useThemeClasses(isDarkMode);

    return (
        <header className={`h-20 flex items-center justify-between px-8 flex-shrink-0 ${theme.header}`}>
            <div className="flex items-center w-96 relative">
                <SearchIcon className={`absolute left-4 w-5 h-5 ${theme.textMuted}`} />
                <input 
                    type="text" 
                    placeholder="Buscar estratégia, operação..." 
                    className={`w-full rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-1 text-sm transition-all ${isDarkMode ? 'bg-slate-900/50 border border-slate-800 text-slate-300 focus:border-slate-700 focus:ring-slate-700 placeholder-slate-600' : 'bg-slate-100 border border-slate-200 text-slate-700 focus:border-slate-300 focus:ring-slate-300 placeholder-slate-400'}`}
                />
            </div>

            <div className="flex items-center gap-6">
                <div className={`flex items-center gap-3 text-sm pr-6 border-r ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'}`}>
                     {brokerages.length > 0 && (
                        <select
                            value={activeBrokerage?.id || ''}
                            onChange={(e) => setActiveBrokerageId(e.target.value)}
                            className={`bg-transparent border-none cursor-pointer text-xs focus:ring-0 ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            {brokerages.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
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
    setTransactionType: React.Dispatch<React.SetStateAction<'deposit' | 'withdrawal' | null>>;
    setIsTransactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    goal: Omit<GoalSettings, 'amount'> & { amount: number };
    usdToBrlRate: number | null;
    isDarkMode: boolean;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
    activeBrokerage, customEntryValue, setCustomEntryValue,
    customPayout, setCustomPayout, addRecord, selectedDateString,
    setSelectedDate, isTradingHalted, stopLossLimitReached, setStopLimitOverride, startBalanceForSelectedDay,
    dailyRecordForSelectedDay, dailyGoalTarget, weeklyStats, sortedFilteredRecords,
    handleDeleteRecord, setTransactionType, setIsTransactionModalOpen, goal, usdToBrlRate, isDarkMode
}) => {
    const theme = useThemeClasses(isDarkMode);

    const handleQuickAdd = (type: 'win' | 'loss') => {
         const entryValue = customEntryValue ? parseFloat(customEntryValue) : undefined;
         const payout = customPayout ? parseFloat(customPayout) : undefined;
         
         if (type === 'win') addRecord(1, 0, entryValue, payout);
         else addRecord(0, 1, entryValue, payout);
    };

    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) 
        : '0.0';

    const profitInBRL = currentProfit * (usdToBrlRate || 1);
    const balanceInBRL = currentBalance * (usdToBrlRate || 1);
    
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


    return (
        <div className="p-8 space-y-8">
            {/* Header / Date Picker */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className={`text-3xl font-bold mb-1 ${theme.text}`}>Dashboard</h2>
                    <p className={theme.textMuted}>Acompanhe sua performance em tempo real</p>
                </div>
                <div className="flex items-center gap-4">
                     <input
                        type="date"
                        value={selectedDateString}
                        onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00Z'))}
                        className={`border rounded-lg px-4 py-2 focus:outline-none focus:border-slate-500 text-sm ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`}
                    />
                </div>
            </div>

            {/* Trading Halted Alert */}
             {isTradingHalted && (
                <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-xl flex justify-between items-center" role="alert">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <div>
                            <p className="font-bold">Stop Atingido</p>
                            <p className="text-sm opacity-80">Você atingiu seu limite de {stopLossLimitReached ? 'perdas' : 'ganhos'} diário.</p>
                        </div>
                    </div>
                    <button onClick={() => setStopLimitOverride(prev => ({ ...prev, [selectedDateString]: true }))} className="text-xs bg-red-900/40 hover:bg-red-900/60 px-4 py-2 rounded-lg border border-red-800/50 transition-colors uppercase font-bold tracking-wider">
                        Liberar Operações
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Banca Atual */}
                <div className={`p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className={`${theme.textMuted} text-[10px] font-bold uppercase tracking-widest`}>Banca Atual</p>
                            <p className={`text-2xl font-bold mt-1 ${theme.text}`}>${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className={`p-2 rounded-lg text-green-500 border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-green-50 border-green-100'}`}>
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${isDarkMode ? 'text-slate-500 bg-slate-950/30 border-slate-800/50' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                            R$ {balanceInBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Lucro Diário */}
                <div className={`p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className={`${theme.textMuted} text-[10px] font-bold uppercase tracking-widest`}>Lucro Diário</p>
                            <p className={`text-2xl font-bold mt-1 ${currentProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {currentProfit >= 0 ? '+' : ''}${currentProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                         <div className={`p-2 rounded-lg border ${currentProfit >= 0 ? (isDarkMode ? 'bg-green-500/10 text-green-500 border-slate-700/50' : 'bg-green-50 text-green-600 border-green-100') : (isDarkMode ? 'bg-red-500/10 text-red-500 border-slate-700/50' : 'bg-red-50 text-red-600 border-red-100')}`}>
                             {currentProfit >= 0 ? 
                                <TrendingUpIcon className="w-5 h-5" /> : 
                                <TrendingDownIcon className="w-5 h-5" />
                             }
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                         <span className={`text-xs font-medium px-2 py-0.5 rounded border ${isDarkMode ? 'text-slate-500 bg-slate-950/30 border-slate-800/50' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                             R$ {profitInBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                    </div>
                </div>

                 {/* Meta Diária */}
                 <div className={`p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                             <p className={`${theme.textMuted} text-[10px] font-bold uppercase tracking-widest`}>Meta Diária</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className={`text-2xl font-bold ${currentProfit >= dailyGoalTarget ? 'text-green-500' : theme.text}`}>
                                     {dailyGoalTarget > 0 ? ((currentProfit / dailyGoalTarget) * 100).toFixed(0) : 0}%
                                </p>
                                <span className={`text-xs ${theme.textMuted}`}>/ ${dailyGoalTarget.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className={`p-2 rounded-lg text-blue-400 border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            <TargetIcon className="w-5 h-5" />
                        </div>
                    </div>
                     <div className={`w-full rounded-full h-1.5 mt-2 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-200'}`}>
                         <div className={`h-1.5 rounded-full ${currentProfit >= dailyGoalTarget ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(((Math.max(0, currentProfit)) / (dailyGoalTarget || 1)) * 100, 100)}%` }}></div>
                     </div>
                </div>

                {/* Taxa de Acerto */}
                <div className={`p-5 rounded-2xl border transition-all ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div>
                             <p className={`${theme.textMuted} text-[10px] font-bold uppercase tracking-widest`}>Taxa de Acerto</p>
                            <p className={`text-2xl font-bold mt-1 ${theme.text}`}>{winRate}%</p>
                        </div>
                        <div className={`p-2 rounded-lg text-purple-400 border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                             <PieChartIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium">
                        <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {dailyRecordForSelectedDay?.winCount || 0} Wins</span>
                        <span className="text-red-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {dailyRecordForSelectedDay?.lossCount || 0} Loss</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions - REDESIGNED */}
            <div className={`p-6 rounded-2xl border ${theme.card}`}>
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
                     <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <span className={`block mb-2 text-xs font-bold uppercase tracking-wider group-focus-within:text-green-500 transition-colors ml-1 ${theme.textMuted}`}>VALOR DE ENTRADA</span>
                            <div className="relative">
                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${theme.textMuted}`}>$</span>
                                <input
                                    type="number"
                                    value={customEntryValue}
                                    onChange={(e) => setCustomEntryValue(e.target.value)}
                                    className={`w-full h-14 border-2 rounded-xl pl-8 pr-4 text-xl font-bold focus:border-green-500 focus:ring-0 focus:outline-none transition-all ${theme.input}`}
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
                     </div>

                    {/* Row 2: Optimized Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 h-16">
                         <button
                            onClick={() => handleQuickAdd('win')}
                            disabled={isTradingHalted}
                            className="bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xl rounded-xl shadow-lg shadow-green-900/20 hover:shadow-green-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest relative overflow-hidden group"
                        >
                            <div className="p-1.5 rounded-full bg-slate-950/20">
                                 <TrendingUpIcon className="w-5 h-5 text-slate-900" />
                            </div>
                            <span>WIN</span>
                        </button>
                        <button
                            onClick={() => handleQuickAdd('loss')}
                            disabled={isTradingHalted}
                            className="bg-red-500 hover:bg-red-400 active:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xl rounded-xl shadow-lg shadow-red-900/20 hover:shadow-red-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest relative overflow-hidden group"
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
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} dx={-10} />
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
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} dx={-10} />
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
            
            {/* History Table - Moved to bottom for cleaner look */}
             <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
                <div className={`p-6 border-b ${theme.border}`}>
                    <h3 className={`text-lg font-bold ${theme.text}`}>Últimas Operações</h3>
                </div>
                <div className="overflow-x-auto">
                     <table className={`w-full text-sm text-left ${theme.textMuted}`}>
                        <thead className={`text-xs uppercase ${theme.tableHeader}`}>
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">Data</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Tipo</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold">Resumo</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">Resultado</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {sortedFilteredRecords.length > 0 ? [...sortedFilteredRecords].reverse().slice(0, 10).map((record) => (
                                <tr key={record.id} className={`border-b ${theme.border} ${theme.tableRow} transition-colors`}>
                                     <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                        {record.recordType === 'day' ? record.date : record.displayDate}
                                    </td>
                                    <td className="px-6 py-4">
                                         {record.recordType === 'day' && <span className="text-blue-400 bg-blue-900/20 px-2.5 py-1 rounded text-xs font-medium border border-blue-900/30">Trading</span>}
                                        {record.recordType === 'deposit' && <span className="text-green-400 bg-green-900/20 px-2.5 py-1 rounded text-xs font-medium border border-green-900/30">Depósito</span>}
                                        {record.recordType === 'withdrawal' && <span className="text-orange-400 bg-orange-900/20 px-2.5 py-1 rounded text-xs font-medium border border-orange-900/30">Saque</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                         {record.recordType === 'day' ? (
                                            <div className="flex justify-center gap-3">
                                                <span className="font-bold text-green-500">{record.winCount}W</span>
                                                <span className="text-slate-700">|</span>
                                                <span className="font-bold text-red-500">{record.lossCount}L</span>
                                            </div>
                                         ) : (
                                            <span className="text-slate-500 italic text-xs">{record.notes || '-'}</span>
                                         )}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${
                                        record.recordType === 'day' 
                                            ? (record.netProfitUSD >= 0 ? 'text-green-400' : 'text-red-400')
                                            : (isDarkMode ? 'text-slate-200' : 'text-slate-800')
                                    }`}>
                                         {record.recordType === 'day' ? (
                                            `$${record.netProfitUSD.toFixed(2)}`
                                         ) : (
                                            `$${record.amountUSD.toFixed(2)}`
                                         )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleDeleteRecord(record.id)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-900/10 rounded-full transition-all">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
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

const OperationsPanel: React.FC<{
    sortedFilteredRecords: AppRecord[];
    handleDeleteRecord: (recordId: string) => void;
    isDarkMode: boolean;
}> = ({ sortedFilteredRecords, handleDeleteRecord, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    
    return (
        <div className="p-8">
            <h2 className={`text-3xl font-bold mb-8 ${theme.text}`}>Histórico de Operações</h2>
            
            <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
                <div className={`p-6 border-b ${theme.border}`}>
                    <h3 className={`text-lg font-bold ${theme.text}`}>Todas as Operações</h3>
                </div>
                <div className="overflow-x-auto">
                     <table className={`w-full text-sm text-left ${theme.textMuted}`}>
                        <thead className={`text-xs uppercase ${theme.tableHeader}`}>
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">Data</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Tipo</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold">Detalhes</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">Saldo Final / Valor</th>
                                <th scope="col" className="px-6 py-4 text-right font-semibold">Resultado Dia</th>
                                <th scope="col" className="px-6 py-4 text-center font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {sortedFilteredRecords.length > 0 ? [...sortedFilteredRecords].reverse().map((record) => (
                                <tr key={record.id} className={`border-b ${theme.border} ${theme.tableRow} transition-colors`}>
                                     <td className={`px-6 py-4 font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                        {record.recordType === 'day' ? record.date : record.displayDate}
                                    </td>
                                    <td className="px-6 py-4">
                                         {record.recordType === 'day' && <span className="text-blue-400 bg-blue-900/20 px-2.5 py-1 rounded text-xs font-medium border border-blue-900/30">Trading</span>}
                                        {record.recordType === 'deposit' && <span className="text-green-400 bg-green-900/20 px-2.5 py-1 rounded text-xs font-medium border border-green-900/30">Depósito</span>}
                                        {record.recordType === 'withdrawal' && <span className="text-orange-400 bg-orange-900/20 px-2.5 py-1 rounded text-xs font-medium border border-orange-900/30">Saque</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                         {record.recordType === 'day' ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-center gap-3">
                                                    <span className="font-bold text-green-500">{record.winCount} Wins</span>
                                                    <span className="text-slate-700">|</span>
                                                    <span className="font-bold text-red-500">{record.lossCount} Losses</span>
                                                </div>
                                            </div>
                                         ) : (
                                            <span className="text-slate-500 italic text-xs">{record.notes || '-'}</span>
                                         )}
                                    </td>
                                    <td className={`px-6 py-4 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                         {record.recordType === 'day' ? (
                                            `$${record.endBalanceUSD.toFixed(2)}`
                                         ) : (
                                            `$${record.amountUSD.toFixed(2)}`
                                         )}
                                    </td>
                                     <td className={`px-6 py-4 text-right font-bold ${
                                        record.recordType === 'day' 
                                            ? (record.netProfitUSD >= 0 ? 'text-green-400' : 'text-red-400')
                                            : 'text-slate-500'
                                    }`}>
                                         {record.recordType === 'day' ? (
                                            `$${record.netProfitUSD.toFixed(2)}`
                                         ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleDeleteRecord(record.id)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-900/10 rounded-full transition-all">
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

interface SettingsPanelProps {
    activeBrokerage: Brokerage;
    onUpdateBrokerage: (brokerage: Brokerage) => void;
    onDeleteBrokerage: (id: string) => void;
    isDarkMode: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ activeBrokerage, onUpdateBrokerage, onDeleteBrokerage, isDarkMode }) => {
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
        <div className="p-8">
             <h2 className={`text-3xl font-bold mb-8 ${theme.text}`}>Configurações</h2>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className={`p-8 rounded-2xl border ${theme.card}`}>
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
                             <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Saldo Inicial (USD)</label>
                             <div className="relative">
                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>$</span>
                                <input
                                    type="number"
                                    value={formData.initialBalance}
                                    onChange={(e) => handleChange('initialBalance', parseFloat(e.target.value))}
                                    className={`block w-full pl-8 pr-4 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                                />
                             </div>
                        </div>
                    </div>
                 </div>

                 <div className={`p-8 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-xl font-bold mb-6 border-b pb-4 ${theme.text} ${theme.border}`}>Configurações da Operação</h3>
                    
                    <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-6">
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
                                    {formData.entryMode === 'fixed' ? 'Valor da Entrada ($)' : 'Porcentagem da Banca (%)'}
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

                    <div className="mt-8 flex justify-between items-center">
                        <button onClick={() => onDeleteBrokerage(activeBrokerage.id)} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2">
                            <TrashIcon className="w-4 h-4" /> Excluir Corretora
                        </button>
                        <button onClick={handleSave} className="px-8 py-3 bg-green-500 text-slate-950 font-bold rounded-lg hover:bg-green-400 transition-colors shadow-lg shadow-green-900/20">
                            Salvar Alterações
                        </button>
                    </div>
                 </div>
             </div>
        </div>
    );
};

interface GoalPanelProps {
    goal: Omit<GoalSettings, 'amount'> & { amount: number };
    setGoal: React.Dispatch<React.SetStateAction<Omit<GoalSettings, 'amount'> & { amount: number }>>;
    sortedFilteredRecords: AppRecord[];
    now: Date;
    isDarkMode: boolean;
}

const GoalPanel: React.FC<GoalPanelProps> = ({ goal, setGoal, sortedFilteredRecords, now, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [localGoal, setLocalGoal] = useState<GoalSettings>({
        type: goal.type,
        amount: goal.amount || '',
    });

    useEffect(() => {
        setLocalGoal({
            type: goal.type,
            amount: goal.amount || '',
        })
    }, [goal]);

    const handleSave = () => {
        const amountToSave = typeof localGoal.amount === 'number' ? localGoal.amount : 0;
        setGoal({ type: localGoal.type, amount: amountToSave });
        alert('Meta salva com sucesso!');
    };

    const currentMonthProfit = useMemo(() => {
        const today = new Date(now);
        const year = today.getUTCFullYear();
        const month = (today.getUTCMonth() + 1).toString().padStart(2, '0');
        const monthPrefix = `${year}-${month}`;

        return sortedFilteredRecords
            .filter(r => r.recordType === 'day' && r.id.startsWith(monthPrefix))
            .reduce((acc, r) => acc + (r as DailyRecord).netProfitUSD, 0);
    }, [sortedFilteredRecords, now]);

    const currentWeekProfit = useMemo(() => {
        const today = new Date(now);
        const startOfWeek = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const day = today.getUTCDay();
        const diff = startOfWeek.getUTCDate() - day + (day === 0 ? -6 : 1); 
        startOfWeek.setUTCDate(diff);
        startOfWeek.setUTCHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
        endOfWeek.setUTCHours(23, 59, 59, 999);

        return sortedFilteredRecords
            .filter(r => {
                if (r.recordType !== 'day') return false;
                const recordDate = new Date(r.id + 'T00:00:00Z');
                return recordDate >= startOfWeek && recordDate <= endOfWeek;
            })
            .reduce((acc, r) => acc + (r as DailyRecord).netProfitUSD, 0);
    }, [sortedFilteredRecords, now]);

    const monthlyGoalAmount = goal.type === 'monthly' ? goal.amount : 0;
    const weeklyGoalAmount = goal.type === 'weekly' ? goal.amount : (monthlyGoalAmount / 4.33);
    
    // Projections Calculation
    const amount = typeof localGoal.amount === 'number' ? localGoal.amount : 0;
    let dailyTarget = 0;
    let weeklyTarget = 0;
    let monthlyTarget = 0;

    if (localGoal.type === 'monthly') {
        monthlyTarget = amount;
        weeklyTarget = amount / 4.33; // Avg weeks in month
        dailyTarget = amount / 22;    // Avg trading days in month
    } else {
        weeklyTarget = amount;
        monthlyTarget = amount * 4.33;
        dailyTarget = amount / 5;     // Trading days in week
    }
    
    // Helper for progress bar
    const GoalProgressBar = ({ title, currentValue, goalValue, description }: { title: string, currentValue: number, goalValue: number, description: string }) => {
        const percentage = goalValue > 0 ? Math.min((currentValue / goalValue) * 100, 100) : 0;
        const isPositive = currentValue >= 0;

        return (
             <div className={`p-6 rounded-xl border ${theme.card}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className={`text-lg font-bold ${theme.text}`}>{title}</h4>
                        <p className={`text-sm ${theme.textMuted}`}>{description}</p>
                    </div>
                    <div className="text-right">
                        <p className={`text-2xl font-bold ${currentValue >= goalValue ? 'text-green-400' : (isDarkMode ? 'text-slate-200' : 'text-slate-800')}`}>
                            {percentage.toFixed(1)}%
                        </p>
                    </div>
                </div>
                
                <div className={`w-full rounded-full h-3 mb-4 overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${currentValue >= goalValue ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.max(0, percentage)}%` }}
                    ></div>
                </div>
                
                <div className="flex justify-between text-sm">
                    <span className={theme.textMuted}>
                        Atual: <span className={isPositive ? 'text-green-400' : 'text-red-400'}>${currentValue.toFixed(2)}</span>
                    </span>
                    <span className={theme.textMuted}>
                        Meta: ${goalValue.toFixed(2)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8">
            <h2 className={`text-3xl font-bold mb-8 ${theme.text}`}>Definição de Metas</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-8 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-xl font-bold mb-6 border-b pb-4 ${theme.text} ${theme.border}`}>Configurar Meta Principal</h3>
                    <p className={`text-sm mb-6 ${theme.textMuted}`}>Esta meta será usada para calcular automaticamente sua meta diária no Dashboard.</p>
                    <div className="space-y-6">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Tipo de Meta</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setLocalGoal(g => ({ ...g, type: 'monthly' }))}
                                    className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${localGoal.type === 'monthly' ? 'bg-green-500/10 border-green-500/50 text-green-500' : (isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300')}`}
                                >
                                    Mensal
                                </button>
                                <button 
                                    onClick={() => setLocalGoal(g => ({ ...g, type: 'weekly' }))}
                                    className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${localGoal.type === 'weekly' ? 'bg-green-500/10 border-green-500/50 text-green-500' : (isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300')}`}
                                >
                                    Semanal
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme.textMuted}`}>Valor Alvo (USD)</label>
                            <div className="relative">
                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`}>$</span>
                                <input
                                    type="number"
                                    value={localGoal.amount}
                                    onChange={(e) => setLocalGoal(g => ({ ...g, amount: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                    className={`block w-full pl-8 pr-3 py-3 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors ${theme.input}`}
                                    placeholder="Ex: 500.00"
                                />
                            </div>
                        </div>

                         <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Projeção da Meta
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className={`text-center p-3 rounded-lg border ${isDarkMode ? 'bg-slate-950 border-slate-800/50' : 'bg-white border-slate-200'}`}>
                                    <p className={`text-xs mb-1 uppercase tracking-wider ${theme.textMuted}`}>Diária</p>
                                    <p className="text-lg font-bold text-green-400">${dailyTarget.toFixed(2)}</p>
                                </div>
                                <div className={`text-center p-3 rounded-lg border ${isDarkMode ? 'bg-slate-950 border-slate-800/50' : 'bg-white border-slate-200'}`}>
                                    <p className={`text-xs mb-1 uppercase tracking-wider ${theme.textMuted}`}>Semanal</p>
                                    <p className="text-lg font-bold text-blue-400">${weeklyTarget.toFixed(2)}</p>
                                </div>
                                <div className={`text-center p-3 rounded-lg border ${isDarkMode ? 'bg-slate-950 border-slate-800/50' : 'bg-white border-slate-200'}`}>
                                    <p className={`text-xs mb-1 uppercase tracking-wider ${theme.textMuted}`}>Mensal</p>
                                    <p className="text-lg font-bold text-purple-400">${monthlyTarget.toFixed(2)}</p>
                                </div>
                            </div>
                            <p className={`text-xs mt-3 text-center ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                *Cálculo baseado em ~22 dias úteis/mês e ~4.33 semanas/mês.
                            </p>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button onClick={handleSave} className="px-8 py-3 bg-green-500 text-slate-950 font-bold rounded-lg hover:bg-green-400 transition-colors shadow-lg shadow-green-900/20">
                            Salvar Alterações
                        </button>
                    </div>
                </div>

                <div className={`p-8 rounded-2xl border ${theme.card}`}>
                    <h3 className={`text-xl font-bold mb-6 border-b pb-4 ${theme.text} ${theme.border}`}>Progresso Atual</h3>
                    <div className="space-y-6">
                        <GoalProgressBar
                            title="Desempenho Semanal"
                            currentValue={currentWeekProfit}
                            goalValue={weeklyGoalAmount}
                            description="Lucro líquido acumulado nesta semana"
                        />
                        <GoalProgressBar
                            title="Desempenho Mensal"
                            currentValue={currentMonthProfit}
                            goalValue={monthlyGoalAmount}
                            description={`Lucro líquido acumulado em ${now.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' })}`}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
};

interface DailyBriefingModalProps {
    onClose: () => void;
    activeBrokerage: Brokerage;
    dailyGoalTarget: number;
    currentBalance: number;
    isDarkMode: boolean;
}

const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({ onClose, activeBrokerage, dailyGoalTarget, currentBalance, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    
    // Calculate strategy
    const entrySize = activeBrokerage.entryMode === 'fixed' 
        ? activeBrokerage.entryValue 
        : currentBalance * (activeBrokerage.entryValue / 100);
    
    const profitPerWin = entrySize * (activeBrokerage.payoutPercentage / 100);
    const winsNeeded = profitPerWin > 0 ? Math.ceil(dailyGoalTarget / profitPerWin) : 0;
    
    const goalPercentage = currentBalance > 0 ? (dailyGoalTarget / currentBalance) * 100 : 0;
    let difficultyColor = 'text-green-400';
    let difficultyText = 'Conservadora';
    
    if (goalPercentage > 5) {
        difficultyColor = 'text-orange-400';
        difficultyText = 'Moderada';
    }
    if (goalPercentage > 10) {
        difficultyColor = 'text-red-400';
        difficultyText = 'Agressiva';
    }

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${isDarkMode ? 'bg-black/80' : 'bg-slate-900/50'}`}>
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden animate-fade-in-up ${theme.modalContent}`}>
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2.5 rounded-lg text-blue-400">
                             <CalculatorIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${theme.text}`}>Seu planejamento para hoje</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className={`transition-colors ${isDarkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8">
                    {/* Status Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme.textMuted}`}>Banca Atual</p>
                            <p className={`text-2xl font-bold ${theme.text}`}>${currentBalance.toFixed(2)}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme.textMuted}`}>Meta do Dia</p>
                            <p className="text-2xl font-bold text-green-400">${dailyGoalTarget.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Strategy Card */}
                    <div className={`p-6 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-500/5'}`}></div>
                        
                        <h3 className={`text-lg font-bold mb-4 relative z-10 ${theme.text}`}>Estratégia Sugerida</h3>
                        
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center">
                                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Entrada Padrão</span>
                                <span className={`font-mono ${theme.text}`}>${entrySize.toFixed(2)} <span className={`text-xs ${theme.textMuted}`}>({activeBrokerage.entryMode === 'percentage' ? `${activeBrokerage.entryValue}%` : 'Fixo'})</span></span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Lucro por Win (Payout {activeBrokerage.payoutPercentage}%)</span>
                                <span className="font-mono text-green-400">+${profitPerWin.toFixed(2)}</span>
                            </div>
                            <div className={`w-full h-px my-2 ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`}></div>
                             <div className="flex justify-between items-center">
                                <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} font-medium`}>Wins Necessários</span>
                                <span className="font-bold text-xl text-blue-400">{winsNeeded} <span className={`text-sm font-normal ${theme.textMuted}`}>wins</span></span>
                            </div>
                             <div className="flex justify-between items-center mt-2">
                                <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} font-medium`}>Dificuldade Estimada</span>
                                <span className={`font-bold text-sm ${difficultyColor}`}>{difficultyText}</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-green-500 hover:bg-green-400 text-slate-950 font-black text-lg rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-[0.98]"
                    >
                        VAMOS OPERAR 🚀
                    </button>
                </div>
            </div>
        </div>
    );
}

const App: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const getStorageKey = useCallback((key: string) => `${user.username}_${key}`, [user.username]);

    // Theme state
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('app_theme');
        return savedTheme ? savedTheme === 'dark' : true;
    });

    useEffect(() => {
        localStorage.setItem('app_theme', isDarkMode ? 'dark' : 'light');
        if (isDarkMode) {
            document.body.classList.add('dark');
            document.body.classList.remove('light');
        } else {
            document.body.classList.add('light');
            document.body.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [activeBrokerageId, setActiveBrokerageId] = useState<string | null>(null);
    const [records, setRecords] = useState<AppRecord[]>([]);
    
    const [goal, setGoal] = useState<Omit<GoalSettings, 'amount'> & { amount: number }>(() => {
        const stored = localStorage.getItem(getStorageKey('tradeGoal'));
        if (stored) return JSON.parse(stored);
        return { type: 'monthly' as const, amount: 500 };
    });
    
    const [usdToBrlRate, setUsdToBrlRate] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBrokerageModalOpen, setIsBrokerageModalOpen] = useState(false);
    const [brokerageToEdit, setBrokerageToEdit] = useState<Brokerage | null>(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | null>(null);
    
    const [activeTab, setActiveTab] = useState<'dashboard' | 'operations' | 'goals' | 'settings'>('dashboard');
    
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        today.setUTCHours(0,0,0,0);
        return today;
    });
    const [stopLimitOverride, setStopLimitOverride] = useState<Record<string, boolean>>({});
    const [now, setNow] = useState(new Date());
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');
    
    // Briefing State
    const [isDailyBriefingOpen, setIsDailyBriefingOpen] = useState(false);

    // --- Effects ---
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            const rate = await fetchUSDBRLRate();
            setUsdToBrlRate(rate);
            
             if (user.username === 'henrique') {
                const oldBrokeragesKey = 'brokerages_v2';
                const oldRecordsKey = 'tradeRecords_v2';
                const oldGoalKey = 'tradeGoal';
                const newBrokeragesKey = getStorageKey('brokerages_v2');
                if (localStorage.getItem(oldBrokeragesKey) && !localStorage.getItem(newBrokeragesKey)) {
                    localStorage.setItem(newBrokeragesKey, localStorage.getItem(oldBrokeragesKey)!);
                    if (localStorage.getItem(oldRecordsKey)) localStorage.setItem(getStorageKey('tradeRecords_v2'), localStorage.getItem(oldRecordsKey)!);
                    if (localStorage.getItem(oldGoalKey)) localStorage.setItem(getStorageKey('tradeGoal'), localStorage.getItem(oldGoalKey)!);
                }
            }

            let loadedBrokerages: Brokerage[] = [];
            const storedBrokerages = localStorage.getItem(getStorageKey('brokerages_v2'));
            const storedRecords = localStorage.getItem(getStorageKey('tradeRecords_v2'));

            if (storedBrokerages) {
                const parsedBrokerages = JSON.parse(storedBrokerages);
                loadedBrokerages = parsedBrokerages;
                setBrokerages(parsedBrokerages);
                if (parsedBrokerages.length > 0) {
                    setActiveBrokerageId(parsedBrokerages[0].id);
                }
            } else if (user.username === 'henrique') {
                 const defaultBrokerage: Brokerage = {
                    id: `brokerage_henrique_default`, name: 'Corretora Principal', initialBalance: 11.25, entryMode: 'fixed', entryValue: 1.00, payoutPercentage: 85, stopGainTrades: 5, stopLossTrades: 3,
                };
                loadedBrokerages = [defaultBrokerage];
                setBrokerages(loadedBrokerages);
                setActiveBrokerageId(defaultBrokerage.id);
            } else {
                setIsBrokerageModalOpen(true);
                setBrokerageToEdit(null);
            }

             if (storedRecords) {
                const parsedRecords = JSON.parse(storedRecords);
                const migrated = parsedRecords.map((r: any) => {
                    if (r.recordType === 'day' && !r.trades) {
                         const entryValue = r.entrySizeUSD || 0;
                         const payout = 85;
                         const newTrades = [];
                         for (let i=0; i<r.winCount; i++) newTrades.push({id: `mig_w_${i}`, result: 'win', entryValue, payoutPercentage: payout});
                         for (let i=0; i<r.lossCount; i++) newTrades.push({id: `mig_l_${i}`, result: 'loss', entryValue, payoutPercentage: payout});
                         return {...r, trades: newTrades};
                    }
                    return r;
                });
                setRecords(migrated);
            }
            setIsLoading(false);
        };

        initialize();
        const intervalId = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(intervalId);
    }, [user, getStorageKey]);

    useEffect(() => {
        if (brokerages.length > 0) localStorage.setItem(getStorageKey('brokerages_v2'), JSON.stringify(brokerages));
    }, [brokerages, getStorageKey]);

    useEffect(() => {
        if (!isLoading) localStorage.setItem(getStorageKey('tradeRecords_v2'), JSON.stringify(records));
    }, [records, isLoading, getStorageKey]);

    useEffect(() => {
        localStorage.setItem(getStorageKey('tradeGoal'), JSON.stringify(goal));
    }, [goal, getStorageKey]);

    // Check for daily briefing on load/brokerage ready
    useEffect(() => {
        if (!isLoading && activeBrokerageId) {
            const today = new Date().toISOString().split('T')[0];
            const lastBriefing = localStorage.getItem(getStorageKey('lastBriefingDate'));
            
            if (lastBriefing !== today) {
                const timer = setTimeout(() => setIsDailyBriefingOpen(true), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [isLoading, activeBrokerageId, getStorageKey]);

    // --- Derived State & Helpers ---
    const activeBrokerage = useMemo(() => brokerages.find(b => b.id === activeBrokerageId), [brokerages, activeBrokerageId]);
    
    const filteredRecords = useMemo(() => {
        if (!activeBrokerageId) return [];
        return records.filter(r => r.brokerageId === activeBrokerageId);
    }, [records, activeBrokerageId]);

    const formatDateISO = useCallback((date: Date): string => {
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);
    
    const formatDateBR = useCallback((date: Date): string => date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }), []);

    const selectedDateString = useMemo(() => formatDateISO(selectedDate), [selectedDate, formatDateISO]);

    const sortedFilteredRecords = useMemo(() => {
        return [...filteredRecords].sort((a, b) => {
            const dateA = a.recordType === 'day' ? a.id : a.date;
            const dateB = b.recordType === 'day' ? b.id : b.date;
            return dateA.localeCompare(dateB);
        });
    }, [filteredRecords]);

    const getBalanceUpToDate = useCallback((dateISO: string, recordsForBrokerage: AppRecord[], initialBalance: number): number => {
        let balance = initialBalance;
        for (const record of recordsForBrokerage) {
            const recordDate = record.recordType === 'day' ? record.id : record.date;
            if (recordDate >= dateISO) break;
            if (record.recordType === 'day') balance = record.endBalanceUSD;
            else if (record.recordType === 'deposit') balance += record.amountUSD;
            else balance -= record.amountUSD;
        }
        return balance;
    }, []);

    const startBalanceForSelectedDay = useMemo(() => {
        if (!activeBrokerage) return 0;
        const recordForDay = sortedFilteredRecords.find(r => r.recordType === 'day' && r.id === selectedDateString);
        if (recordForDay) return (recordForDay as DailyRecord).startBalanceUSD;
        return getBalanceUpToDate(selectedDateString, sortedFilteredRecords, activeBrokerage.initialBalance);
    }, [sortedFilteredRecords, selectedDateString, getBalanceUpToDate, activeBrokerage]);

    const recalculateBalances = useCallback((recordsToProcess: AppRecord[], brokerage: Brokerage): AppRecord[] => {
        const sorted = [...recordsToProcess].sort((a, b) => {
            const dateA = a.recordType === 'day' ? a.id : a.date;
            const dateB = b.recordType === 'day' ? b.id : b.date;
            return dateA.localeCompare(dateB);
        });

        let currentBalance = brokerage.initialBalance;
        const recalculated: AppRecord[] = [];

        for (const record of sorted) {
            if (record.recordType === 'day') {
                const winCount = record.trades.filter(t => t.result === 'win').length;
                const lossCount = record.trades.filter(t => t.result === 'loss').length;
                
                let netProfitUSD = 0;
                if (record.trades && record.trades.length > 0) {
                    netProfitUSD = record.trades.reduce((totalProfit, trade) => {
                        if (trade.result === 'win') {
                            const payout = trade.payoutPercentage ?? brokerage.payoutPercentage;
                            return totalProfit + (trade.entryValue * (payout / 100));
                        } else return totalProfit - trade.entryValue;
                    }, 0);
                }
                const endBalanceUSD = currentBalance + netProfitUSD;
                recalculated.push({ ...record, startBalanceUSD: currentBalance, winCount, lossCount, netProfitUSD, endBalanceUSD });
                currentBalance = endBalanceUSD;
            } else {
                recalculated.push(record);
                if (record.recordType === 'deposit') currentBalance += record.amountUSD;
                else currentBalance -= record.amountUSD;
            }
        }
        return recalculated;
    }, []);

    const updateRecordsForBrokerage = useCallback((updatedRecordsForBrokerage: AppRecord[]) => {
        if (!activeBrokerageId || !activeBrokerage) return;
        const otherRecords = records.filter(r => r.brokerageId !== activeBrokerageId);
        const recalculated = recalculateBalances(updatedRecordsForBrokerage, activeBrokerage);
        setRecords([...otherRecords, ...recalculated]);
    }, [records, activeBrokerageId, activeBrokerage, recalculateBalances]);


    const addRecord = useCallback((winCount: number, lossCount: number, customEntryValueUSD?: number, customPayoutPercentage?: number) => {
        if (!activeBrokerage) return;
        
        const startBalanceUSD = startBalanceForSelectedDay;
        const defaultEntrySizeUSD = activeBrokerage.entryMode === 'percentage'
            ? startBalanceUSD * (activeBrokerage.entryValue / 100)
            : activeBrokerage.entryValue;
        
        // Handle cases where startBalance is 0 and we are in percentage mode, or fallback is needed
        let entrySizeUSD = customEntryValueUSD !== undefined ? customEntryValueUSD : defaultEntrySizeUSD;
        if (entrySizeUSD <= 0 && activeBrokerage.entryMode === 'percentage') {
             // If calculated entry is 0, maybe fallback to a minimum or check if balance is 0
             // For now, allow 0 but logic above ensures positive math usually.
        }
        
        const payoutPercentage = customPayoutPercentage ?? activeBrokerage.payoutPercentage;
        
        const newTrades: Trade[] = [];
        const entryValue = Math.max(0.01, entrySizeUSD); // Ensure positive

        for (let i = 0; i < winCount; i++) newTrades.push({ id: `trade_${Date.now()}_${i}_w`, result: 'win', entryValue, payoutPercentage });
        for (let i = 0; i < lossCount; i++) newTrades.push({ id: `trade_${Date.now()}_${i}_l`, result: 'loss', entryValue, payoutPercentage });

        const existingRecord = filteredRecords.find(r => r.recordType === 'day' && r.id === selectedDateString) as DailyRecord | undefined;
        let updatedRecordsForBrokerage: AppRecord[];

        if (existingRecord) {
            const updatedRecord: DailyRecord = { ...existingRecord, trades: [...(existingRecord.trades || []), ...newTrades] };
            updatedRecordsForBrokerage = filteredRecords.map(r => (r.id === selectedDateString ? updatedRecord : r));
        } else {
            const newRecord: DailyRecord = {
                recordType: 'day', brokerageId: activeBrokerage.id, id: selectedDateString, date: formatDateBR(selectedDate),
                startBalanceUSD: 0, trades: newTrades, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0,
            };
            updatedRecordsForBrokerage = [...filteredRecords, newRecord];
        }
        updateRecordsForBrokerage(updatedRecordsForBrokerage);

    }, [filteredRecords, activeBrokerage, selectedDateString, startBalanceForSelectedDay, selectedDate, formatDateBR, updateRecordsForBrokerage]);
    
    const handleSaveTransaction = useCallback((data: { type: 'deposit' | 'withdrawal'; date: Date; amount: number; notes: string }) => {
        if (!activeBrokerageId) return;
        const newTransaction: TransactionRecord = {
            recordType: data.type, brokerageId: activeBrokerageId, id: `trans_${Date.now()}`,
            date: formatDateISO(data.date), displayDate: formatDateBR(data.date), amountUSD: data.amount, notes: data.notes,
        };
        updateRecordsForBrokerage([...filteredRecords, newTransaction]);
    }, [filteredRecords, activeBrokerageId, updateRecordsForBrokerage, formatDateISO, formatDateBR]);
    
    const handleDeleteRecord = useCallback((recordId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro?')) {
            const updated = filteredRecords.filter(r => r.id !== recordId);
            updateRecordsForBrokerage(updated);
        }
    }, [filteredRecords, updateRecordsForBrokerage]);

    const handleUpdateBrokerage = useCallback((brokerage: Brokerage) => {
        const index = brokerages.findIndex(b => b.id === brokerage.id);
        if (index > -1) {
            const updatedBrokerages = [...brokerages];
            updatedBrokerages[index] = brokerage;
            setBrokerages(updatedBrokerages);
            if (activeBrokerage && brokerage.initialBalance !== activeBrokerage.initialBalance) {
                 const updatedRecords = recalculateBalances(filteredRecords, brokerage);
                 const otherRecords = records.filter(r => r.brokerageId !== brokerage.id);
                 setRecords([...otherRecords, ...updatedRecords]);
            }
        } 
    }, [brokerages, activeBrokerage, filteredRecords, records, recalculateBalances]);
    
    const handleDeleteBrokerage = useCallback((brokerageId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta corretora?')) {
            const newBrokerages = brokerages.filter(b => b.id !== brokerageId);
            const newRecords = records.filter(r => r.brokerageId !== brokerageId);
            setBrokerages(newBrokerages);
            setRecords(newRecords);
            setActiveBrokerageId(newBrokerages.length > 0 ? newBrokerages[0].id : null);
            setIsBrokerageModalOpen(false);
        }
    }, [brokerages, records]);


    const dailyRecordForSelectedDay = useMemo(() => {
        return sortedFilteredRecords.find(r => r.recordType === 'day' && r.id === selectedDateString) as DailyRecord | undefined;
    }, [sortedFilteredRecords, selectedDateString]);

    const stopLossLimitReached = useMemo(() => {
        if (!activeBrokerage?.stopLossTrades || activeBrokerage.stopLossTrades <= 0) return false;
        return dailyRecordForSelectedDay ? dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades : false;
    }, [dailyRecordForSelectedDay, activeBrokerage]);

    const stopGainLimitReached = useMemo(() => {
        if (!activeBrokerage?.stopGainTrades || activeBrokerage.stopGainTrades <= 0) return false;
        return dailyRecordForSelectedDay ? dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades : false;
    }, [dailyRecordForSelectedDay, activeBrokerage]);

    const isTradingHalted = useMemo(() => {
        if (stopLimitOverride[selectedDateString]) return false;
        return stopLossLimitReached || stopGainLimitReached;
    }, [stopLossLimitReached, stopGainLimitReached, stopLimitOverride, selectedDateString]);

    const dailyGoalTarget = useMemo(() => {
        if (!goal || !goal.amount) return 0;
        if (goal.type === 'weekly') return goal.amount / 5;
        return goal.amount / 22;
    }, [goal]);

    const getPerformanceStats = (startDate: Date, endDate: Date) => {
        const relevantRecords = sortedFilteredRecords.filter(r => {
            if (r.recordType !== 'day') return false;
            const recordDate = new Date(r.id + 'T00:00:00Z');
            return recordDate >= startDate && recordDate <= endDate;
        }) as DailyRecord[];

        const stats = relevantRecords.reduce((acc, r) => {
            acc.profit += r.netProfitUSD; acc.wins += r.winCount; acc.losses += r.lossCount; return acc;
        }, { profit: 0, wins: 0, losses: 0 });

        const totalTrades = stats.wins + stats.losses;
        const winRate = totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 0;
        return { ...stats, totalTrades, winRate };
    };

    const weeklyStats = useMemo(() => {
        const today = new Date(now);
        const dayOfWeek = today.getUTCDay();
        const diff = today.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        const startOfWeek = new Date(today.setDate(diff));
        startOfWeek.setUTCHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
        endOfWeek.setUTCHours(23,59,59,999);
        
        const stats = getPerformanceStats(startOfWeek, endOfWeek);
        return { ...stats, startBalance: 0, currentBalance: 0 }; 
    }, [now, sortedFilteredRecords]);
    
    // Close Briefing Handler
    const handleCloseBriefing = () => {
        setIsDailyBriefingOpen(false);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(getStorageKey('lastBriefingDate'), today);
    };

    if (isLoading) {
        return (
            <div className={`flex h-screen w-full items-center justify-center ${isDarkMode ? 'bg-slate-950 text-green-500' : 'bg-slate-50 text-green-600'}`}>
                <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    // Latest Balance for Briefing (based on latest record or start balance)
    const latestBalance = sortedFilteredRecords.length > 0 && sortedFilteredRecords[sortedFilteredRecords.length-1].recordType === 'day' 
        ? (sortedFilteredRecords[sortedFilteredRecords.length-1] as DailyRecord).endBalanceUSD 
        : activeBrokerage ? activeBrokerage.initialBalance : 0;

    const theme = isDarkMode ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900';

    if (!activeBrokerage) {
        return (
           <div className={`flex items-center justify-center min-h-screen ${theme}`}>
               <div className={`text-center p-8 rounded-lg shadow-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                   <p className={`mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configure sua primeira corretora para começar.</p>
                   <button 
                       onClick={() => { setIsBrokerageModalOpen(true); setBrokerageToEdit(null); }}
                       className="bg-green-500 text-slate-950 px-6 py-2 rounded font-bold hover:bg-green-400"
                   >
                       Adicionar Corretora
                   </button>
               </div>
                {isBrokerageModalOpen && (
                   <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
                       <div className={`p-6 rounded-lg max-w-md w-full border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                           <h2 className="text-xl font-bold mb-4">Adicionar Corretora</h2>
                            <p className="text-sm text-slate-400 mb-4">Por favor, recarregue a página após configurar se este modal não estiver completo.</p>
                            <button onClick={() => window.location.reload()} className="text-blue-400 underline">Recarregar</button>
                       </div>
                   </div>
               )}
           </div>
        );
   }

    return (
        <div className={`flex h-screen font-sans overflow-hidden transition-colors ${theme} selection:bg-green-500/30`}>
            {isDailyBriefingOpen && activeBrokerage && (
                <DailyBriefingModal 
                    onClose={handleCloseBriefing}
                    activeBrokerage={activeBrokerage}
                    dailyGoalTarget={dailyGoalTarget}
                    currentBalance={latestBalance}
                    isDarkMode={isDarkMode}
                />
            )}

            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onLogout={onLogout}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />
            
            <div className="flex-1 flex flex-col h-screen min-w-0">
                <Header 
                    user={user}
                    activeBrokerage={activeBrokerage}
                    brokerages={brokerages}
                    setActiveBrokerageId={setActiveBrokerageId}
                    usdToBrlRate={usdToBrlRate}
                    isDarkMode={isDarkMode}
                    onOpenBriefing={() => setIsDailyBriefingOpen(true)}
                />
                
                <main className={`flex-1 overflow-y-auto scrollbar-thin ${isDarkMode ? 'scrollbar-thumb-slate-700 scrollbar-track-slate-900' : 'scrollbar-thumb-slate-300 scrollbar-track-slate-100'}`}>
                    {activeTab === 'dashboard' && activeBrokerage && (
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
                            sortedFilteredRecords={sortedFilteredRecords}
                            handleDeleteRecord={handleDeleteRecord}
                            setTransactionType={setTransactionType}
                            setIsTransactionModalOpen={setIsTransactionModalOpen}
                            goal={goal}
                            usdToBrlRate={usdToBrlRate}
                            isDarkMode={isDarkMode}
                        />
                    )}
                    {activeTab === 'operations' && (
                        <OperationsPanel 
                            sortedFilteredRecords={sortedFilteredRecords}
                            handleDeleteRecord={handleDeleteRecord}
                            isDarkMode={isDarkMode}
                        />
                    )}
                    {activeTab === 'goals' && (
                         <GoalPanel 
                            goal={goal}
                            setGoal={setGoal}
                            sortedFilteredRecords={sortedFilteredRecords}
                            now={now}
                            isDarkMode={isDarkMode}
                        />
                    )}
                    {activeTab === 'settings' && activeBrokerage && (
                        <SettingsPanel 
                            activeBrokerage={activeBrokerage}
                            onUpdateBrokerage={handleUpdateBrokerage}
                            onDeleteBrokerage={handleDeleteBrokerage}
                            isDarkMode={isDarkMode}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;