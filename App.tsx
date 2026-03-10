
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Brokerage, DailyRecord, TransactionRecord, AppRecord, Trade, User, Goal, AIAnalysisResult } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon, CpuChipIcon, TrendingDownIcon,
    ChevronLeftIcon, ChevronRightIcon
} from './components/icons';

import { DashboardPanel } from './features/Dashboard/DashboardPanel';
import { AIAnalysisPanel } from './features/AIAnalysis/AIAnalysisPanel';
import { CompoundInterestPanel } from './features/CompoundInterest/CompoundInterestPanel';
import { ReportPanel } from './features/Report/ReportPanel';
import { HistoryPanel } from './features/History/HistoryPanel';
import { SorosCalculatorPanel } from './features/Soros/SorosCalculatorPanel';
import { GoalsPanel } from './features/Goals/GoalsPanel';
import { SettingsPanel } from './features/Settings/SettingsPanel';
import { SavingStatusIndicator } from './components/ui/SavingStatusIndicator';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-[#0a0c10]' : 'bg-[#f8fafc]',
        text: isDarkMode ? 'text-slate-100' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-500' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900/40 backdrop-blur-md border-slate-800/50 shadow-2xl' : 'bg-white/80 backdrop-blur-md border-slate-200/60 shadow-sm',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-blue-500/50' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500/50',
        border: isDarkMode ? 'border-slate-800/50' : 'border-slate-200/60',
        sidebar: isDarkMode ? 'bg-[#0a0c10] border-r border-slate-800/50' : 'bg-white border-r border-slate-200/60',
        header: isDarkMode ? 'bg-[#0a0c10]/80 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md',
        navActive: isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
        navInactive: isDarkMode ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
        accent: isDarkMode ? 'text-blue-400' : 'text-blue-600',
        success: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
        danger: isDarkMode ? 'text-rose-400' : 'text-rose-600',
    }), [isDarkMode]);
};

// --- App Root Logic ---
const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [activeBrokerageId, setActiveBrokerageId] = useState<string | null>(null);
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const latestDataRef = useRef({ userId: user.id, brokerages, records, goals });
    useEffect(() => { latestDataRef.current = { userId: user.id, brokerages, records, goals }; }, [user.id, brokerages, records, goals]);
    
    const activeBrokerage = useMemo(() => {
        return brokerages.find(b => b.id === activeBrokerageId) || brokerages[0];
    }, [brokerages, activeBrokerageId]);

    useEffect(() => {
        if (activeBrokerage && !activeBrokerageId) {
            setActiveBrokerageId(activeBrokerage.id);
        }
    }, [activeBrokerage, activeBrokerageId]);

    useEffect(() => {
        if (!activeBrokerage) return;
        const dateKey = selectedDate.toISOString().split('T')[0];
        const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
        const startBal = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);
        const dailyRecordForSelectedDay = records.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day');
        const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;
        const suggestedValue = activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : currentBalance * (activeBrokerage.entryValue / 100);
        setCustomEntryValue(String(suggestedValue.toFixed(2)));
        setCustomPayout(String(activeBrokerage.payoutPercentage));
    }, [activeBrokerage, records, selectedDate]);

    const recalibrateHistory = useCallback((allRecords: AppRecord[], initialBal: number, brokerageId: string) => {
        const otherRecords = allRecords.filter(r => r.brokerageId !== brokerageId);
        const brokerageRecords = allRecords.filter(r => r.brokerageId === brokerageId)
            .sort((a, b) => {
                const dateA = a.recordType === 'day' ? a.id : a.date;
                const dateB = b.recordType === 'day' ? b.id : b.date;
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                const timeA = (a as any).timestamp || 0;
                const timeB = (b as any).timestamp || 0;
                return timeA - timeB;
            });
        
        let runningBalance = initialBal;
        const updatedBrokerageRecords = brokerageRecords.map(r => {
            if (r.recordType === 'day') {
                const winCount = r.trades.filter(t => t.result === 'win').length;
                const lossCount = r.trades.filter(t => t.result === 'loss').length;
                const netProfitUSD = r.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
                const endBalanceUSD = runningBalance + netProfitUSD;
                const updated = { ...r, startBalanceUSD: runningBalance, winCount, lossCount, netProfitUSD, endBalanceUSD };
                runningBalance = endBalanceUSD;
                return updated;
            } else {
                const amount = r.recordType === 'deposit' ? r.amountUSD : -r.amountUSD;
                runningBalance += amount;
                return { ...r, runningBalanceUSD: runningBalance };
            }
        });

        return [...otherRecords, ...updatedBrokerageRecords];
    }, []);

    const recalibrateAll = useCallback((allRecords: AppRecord[], allBrokerages: Brokerage[]) => {
        let currentRecords = [...allRecords];
        for (const b of allBrokerages) {
            currentRecords = recalibrateHistory(currentRecords, b.initialBalance, b.id);
        }
        return currentRecords;
    }, [recalibrateHistory]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Gestão Profissional', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
                const recalibratedRecords = recalibrateAll(data.records || [], loadedBrokerages);
                setBrokerages(loadedBrokerages); 
                setRecords(recalibratedRecords); 
                setGoals(data.goals || []);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [user.id, recalibrateAll]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveData = useCallback(async () => {
        setSavingStatus('saving');
        try {
            const payload = { userId: latestDataRef.current.userId, brokerages: latestDataRef.current.brokerages, records: latestDataRef.current.records, goals: latestDataRef.current.goals };
            const response = await fetch('/api/save-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) { setSavingStatus('saved'); setTimeout(() => setSavingStatus('idle'), 2000); }
        } catch (error: any) { setSavingStatus('error'); }
    }, []);

    const debouncedSave = useDebouncedCallback(saveData, 1000);

    useEffect(() => {
        if (!isLoading) debouncedSave();
    }, [brokerages, records, goals, isLoading, debouncedSave]);

    const addRecord = (win: number, loss: number, customEntry?: number, customPayout?: number) => {
        if (!activeBrokerage) return;
        setRecords(prev => {
            const dateKey = selectedDate.toISOString().split('T')[0];
            const sortedPrevious = prev.filter((r): r is DailyRecord => r.recordType === 'day' && r.brokerageId === activeBrokerage.id && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
            const startBal = sortedPrevious.length > 0 ? sortedPrevious[0].endBalanceUSD : (activeBrokerage.initialBalance || 0);
            const dailyRecordForSelectedDay = prev.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day' && r.brokerageId === activeBrokerage.id);
            const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;
            const suggestedEntryValue = activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : currentBalance * (activeBrokerage.entryValue / 100);
            const entryValue = (customEntry && customEntry > 0) ? customEntry : suggestedEntryValue;
            const payout = (customPayout && customPayout > 0) ? customPayout : activeBrokerage.payoutPercentage;
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            const existingIdx = prev.findIndex(r => r.id === dateKey && r.recordType === 'day' && r.brokerageId === activeBrokerage.id);
            let updatedRecords = [...prev];
            if (existingIdx >= 0) {
                const rec = updatedRecords[existingIdx] as DailyRecord;
                updatedRecords[existingIdx] = { ...rec, trades: [...rec.trades, ...newTrades] };
            } else {
                updatedRecords.push({ recordType: 'day', brokerageId: activeBrokerage.id, id: dateKey, date: dateKey, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            return recalibrateHistory(updatedRecords, activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        if (!activeBrokerage) return;
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day' && r.brokerageId === activeBrokerage.id) ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            return recalibrateHistory(updated, activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const addTransaction = (type: 'deposit' | 'withdrawal', amount: number, notes: string = '') => {
        if (!activeBrokerage || amount <= 0) return;
        setRecords(prev => {
            const dateKey = selectedDate.toISOString().split('T')[0];
            const newTransaction: TransactionRecord = {
                recordType: type,
                brokerageId: activeBrokerage.id,
                id: crypto.randomUUID(),
                date: dateKey,
                displayDate: selectedDate.toLocaleDateString('pt-BR'),
                amountUSD: amount,
                notes,
                timestamp: Date.now()
            };
            return recalibrateHistory([...prev, newTransaction], activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const deleteTransaction = (id: string) => {
        if (!activeBrokerage) return;
        setRecords(prev => {
            const updated = prev.filter(r => r.id !== id);
            return recalibrateHistory(updated, activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const handleReset = () => { if(confirm("Apagar todo histórico?")) { setRecords([]); } };

    const brokerageBalances = useMemo(() => {
        return brokerages.map(b => {
            const bRecords = records.filter(r => r.brokerageId === b.id)
                .sort((a, b) => {
                    const dateA = a.recordType === 'day' ? a.id : a.date;
                    const dateB = b.recordType === 'day' ? b.id : b.date;
                    if (dateA !== dateB) return dateA.localeCompare(dateB);
                    return ((a as any).timestamp || 0) - ((b as any).timestamp || 0);
                });
            
            if (bRecords.length === 0) return { name: b.name, balance: b.initialBalance, currency: b.currency };
            
            const last = bRecords[bRecords.length - 1];
            const balance = last.recordType === 'day' ? last.endBalanceUSD : (last as TransactionRecord).runningBalanceUSD || 0;
            return { name: b.name, balance, currency: b.currency };
        });
    }, [brokerages, records]);

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const brokerageRecords = records.filter(r => r.brokerageId === activeBrokerage?.id);
    
    // Helper to get balance from a record
    const getRecordBalance = (r: AppRecord) => r.recordType === 'day' ? r.endBalanceUSD : (r as TransactionRecord).runningBalanceUSD || 0;
    const getRecordDate = (r: AppRecord) => r.recordType === 'day' ? r.id : r.date;

    const recordsOnDay = brokerageRecords.filter(r => getRecordDate(r) === dateStr)
        .sort((a, b) => ((a as any).timestamp || 0) - ((b as any).timestamp || 0));
    
    const recordsBeforeDay = brokerageRecords.filter(r => getRecordDate(r) < dateStr)
        .sort((a, b) => {
             const d1 = getRecordDate(a);
             const d2 = getRecordDate(b);
             if (d1 !== d2) return d1.localeCompare(d2);
             return ((a as any).timestamp || 0) - ((b as any).timestamp || 0);
        });

    const lastRecordBeforeDay = recordsBeforeDay[recordsBeforeDay.length - 1];
    const startBalDashboard = lastRecordBeforeDay ? getRecordBalance(lastRecordBeforeDay) : (activeBrokerage?.initialBalance || 0);

    const lastRecordOfDay = recordsOnDay[recordsOnDay.length - 1];
    const currentBalanceForDashboard = lastRecordOfDay ? getRecordBalance(lastRecordOfDay) : startBalDashboard;

    const dailyRecord = recordsOnDay.find((r): r is DailyRecord => r.recordType === 'day');
    const dayTransactions = recordsOnDay.filter((r): r is TransactionRecord => r.recordType === 'deposit' || r.recordType === 'withdrawal');

    // LÓGICA DE META DIÁRIA
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const dailyBrokerageRecords = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id);
    
    const customGoal = goals.find(g => g.type === 'custom' && g.deadline && g.brokerageId === activeBrokerage?.id);
    const monthlyGoal = goals.find(g => g.type === 'monthly' && g.brokerageId === activeBrokerage?.id);
    
    let activeDailyGoal = 0;

    if (customGoal && customGoal.deadline) {
        const startStr = new Date(customGoal.createdAt).toISOString().split('T')[0];
        const currentProfit = dailyBrokerageRecords
            .filter((r: DailyRecord) => r.id >= startStr && r.id <= customGoal.deadline!)
            .reduce((acc: number, r: DailyRecord) => acc + r.netProfitUSD, 0);
        
        const remainingToTarget = customGoal.targetAmount - currentProfit;
        
        // Calculate remaining days
        const today = new Date();
        today.setHours(0,0,0,0);
        const deadlineDate = new Date(customGoal.deadline + 'T12:00:00');
        deadlineDate.setHours(0,0,0,0);
        
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include today
        
        const remainingDays = Math.max(1, diffDays);
        activeDailyGoal = Math.max(0, remainingToTarget) / remainingDays;
    } else if (monthlyGoal) {
        const monthRecords = dailyBrokerageRecords.filter((r: DailyRecord) => r.id.startsWith(currentMonthStr));
        const currentMonthProfit = monthRecords.reduce((acc, r) => acc + r.netProfitUSD, 0);
        const remainingToTarget = monthlyGoal.targetAmount - currentMonthProfit;
        const remainingDaysEstimate = Math.max(1, 22 - monthRecords.length); 
        activeDailyGoal = Math.max(0, remainingToTarget) / remainingDaysEstimate;
    } else {
        activeDailyGoal = (activeBrokerage?.initialBalance * 0.03 || 1);
    }

    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    return (
        <div className={`flex h-screen overflow-hidden overflow-x-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className={`h-24 flex-none flex items-center px-8 border-b ${theme.border} ${theme.header} relative overflow-hidden`}>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="font-black italic text-white text-xl tracking-tighter">H</span>
                        </div>
                        <div className="flex flex-col">
                            <span className={`font-black text-lg tracking-tight leading-none ${theme.text}`}>HRK</span>
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-blue-500/60 mt-1">Binary Control</span>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-6 space-y-1.5">
                    <div className="px-2 py-2 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Live Market
                        </div>
                    </div>
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('ai-analysis'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'ai-analysis' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Análise IA</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Juros Compostos</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Extrato</button>
                    <button onClick={() => {setActiveTab('history'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'history' ? theme.navActive : theme.navInactive}`}><ListBulletIcon className="w-5 h-5" />Histórico</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Calc Soros</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Metas</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Configurações</button>
                </nav>
                <div className="p-6 border-t border-slate-200/60">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 font-semibold hover:bg-rose-50 rounded-xl transition-colors"><LogoutIcon className="w-5 h-5" />Sair</button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-24 flex-none flex items-center justify-between px-8 border-b ${theme.border} ${theme.header}`}>
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-500"><MenuIcon className="w-6 h-6" /></button>
                        <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/10 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            System Operational
                        </div>
                        <SavingStatusIndicator status={savingStatus} />
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-3">
                            <select 
                                value={activeBrokerageId || ''} 
                                onChange={(e) => setActiveBrokerageId(e.target.value)}
                                className={`text-xs font-bold uppercase tracking-widest bg-slate-100/50 border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${theme.text}`}
                            >
                                {brokerages.map(b => (
                                    <option key={b.id} value={b.id} className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                {brokerageBalances.slice(0, 2).map((b, i) => (
                                    <div key={i} className={`flex flex-col items-end px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-white border-slate-200/60 shadow-sm'}`}>
                                        <span className="text-[9px] font-bold uppercase text-slate-400 leading-none mb-1">{b.name}</span>
                                        <span className={`text-sm font-bold leading-tight ${b.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {b.currency === 'USD' ? '$' : 'R$'} {formatMoney(b.balance)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="h-10 w-[1px] bg-slate-200/60 hidden md:block" />
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500">
                                    {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                                </button>
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-xl shadow-slate-900/10">
                                    {user.username.slice(0, 2).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {activeTab === 'dashboard' && (
                        <DashboardPanel 
                            activeBrokerage={activeBrokerage} 
                            customEntryValue={customEntryValue} 
                            setCustomEntryValue={setCustomEntryValue} 
                            customPayout={customPayout} 
                            setCustomPayout={setCustomPayout} 
                            addRecord={addRecord} 
                            deleteTrade={deleteTrade} 
                            addTransaction={addTransaction}
                            deleteTransaction={deleteTransaction}
                            selectedDateString={dateStr} 
                            setSelectedDate={setSelectedDate} 
                            dailyRecordForSelectedDay={dailyRecord} 
                            transactionsForSelectedDay={dayTransactions}
                            startBalanceForSelectedDay={startBalDashboard} 
                            currentBalanceForDashboard={currentBalanceForDashboard}
                            theme={theme}
                            isDarkMode={isDarkMode} 
                            dailyGoalTarget={activeDailyGoal} 
                        />
                    )}
                    {activeTab === 'ai-analysis' && <AIAnalysisPanel theme={theme} isDarkMode={isDarkMode} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'report' && <ReportPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} deleteTrade={deleteTrade} />}
                    {activeTab === 'history' && <HistoryPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} records={records} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onReset={handleReset} />}
                </div>
            </main>
        </div>
    );
};

export default App;
