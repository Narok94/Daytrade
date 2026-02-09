
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal, AIAnalysisResult } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { fetchUSDBRLRate } from './services/currencyService';
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon, CpuChipIcon, TrendingDownIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900/40 border-slate-800/60 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950/80 border-r border-slate-800/50 backdrop-blur-2xl' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950/50 border-b border-slate-800/30 backdrop-blur-md' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-r-2 border-emerald-500' : 'bg-emerald-50 text-emerald-600 border-r-2 border-emerald-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- Componente de Cotação ---
const CurrencyWidget: React.FC<{ isDarkMode: boolean, onRateUpdate?: (rate: number) => void }> = ({ isDarkMode, onRateUpdate }) => {
    const [rate, setRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const updateRate = async () => {
        setLoading(true);
        const r = await fetchUSDBRLRate();
        setRate(r);
        if (onRateUpdate) onRateUpdate(r);
        setLoading(false);
    };

    useEffect(() => {
        updateRate();
        const interval = setInterval(updateRate, 600000); // 10 min
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Live USD/BRL</span>
                <span className="text-sm font-black text-emerald-400 tabular-nums">{loading ? '---' : `R$ ${rate?.toFixed(3)}`}</span>
            </div>
            <button onClick={updateRate} className="p-1.5 hover:rotate-180 transition-transform duration-700 bg-emerald-500/10 rounded-lg group">
                <ArrowPathIcon className="w-3.5 h-3.5 text-emerald-500" />
            </button>
        </div>
    );
};

// --- App Root Logic ---
const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [usdRate, setUsdRate] = useState<number>(5.35);

    const latestDataRef = useRef({ userId: user.id, brokerages, records, goals });
    useEffect(() => { latestDataRef.current = { userId: user.id, brokerages, records, goals }; }, [user.id, brokerages, records, goals]);
    
    const activeBrokerage = brokerages[0];

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

    const recalibrateHistory = useCallback((allRecords: AppRecord[], initialBal: number) => {
        let runningBalance = initialBal;
        return allRecords.sort((a, b) => a.id.localeCompare(b.id)).map(r => {
            if (r.recordType !== 'day') return r;
            const daily = r as DailyRecord;
            const winCount = daily.trades.filter(t => t.result === 'win').length;
            const lossCount = daily.trades.filter(t => t.result === 'loss').length;
            const netProfitUSD = daily.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
            const endBalanceUSD = runningBalance + netProfitUSD;
            const updated = { ...daily, startBalanceUSD: runningBalance, winCount, lossCount, netProfitUSD, endBalanceUSD };
            runningBalance = endBalanceUSD;
            return updated;
        });
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Elite Account', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
                setBrokerages(loadedBrokerages); setRecords(data.records || []); setGoals(data.goals || []);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [user.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveData = useCallback(async () => {
        setSavingStatus('saving');
        try {
            const payload = { userId: latestDataRef.current.userId, brokerages: latestDataRef.current.brokerages, records: latestDataRef.current.records, goals: latestDataRef.current.goals };
            const response = await fetch('/api/save-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) { setSavingStatus('saved'); setTimeout(() => setSavingStatus('idle'), 2000); }
        } catch (error: any) { setSavingStatus('error'); }
    }, []);

    const debouncedSave = useDebouncedCallback(saveData, 3000);

    useEffect(() => {
        if (!isLoading) debouncedSave();
    }, [brokerages, records, goals, isLoading, debouncedSave]);

    const addRecord = (win: number, loss: number, customEntry?: number, customPayout?: number) => {
        setRecords(prev => {
            const dateKey = selectedDate.toISOString().split('T')[0];
            const sortedPrevious = prev.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
            const startBal = sortedPrevious.length > 0 ? sortedPrevious[0].endBalanceUSD : (brokerages[0]?.initialBalance || 0);
            const dailyRecordForSelectedDay = prev.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day');
            const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;
            const suggestedEntryValue = brokerages[0].entryMode === 'fixed' ? brokerages[0].entryValue : currentBalance * (brokerages[0].entryValue / 100);
            const entryValue = (customEntry && customEntry > 0) ? customEntry : suggestedEntryValue;
            const payout = (customPayout && customPayout > 0) ? customPayout : brokerages[0].payoutPercentage;
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            const existingIdx = prev.findIndex(r => r.id === dateKey && r.recordType === 'day');
            let updatedRecords = [...prev];
            if (existingIdx >= 0) {
                const rec = updatedRecords[existingIdx] as DailyRecord;
                updatedRecords[existingIdx] = { ...rec, trades: [...rec.trades, ...newTrades] };
            } else {
                updatedRecords.push({ recordType: 'day', brokerageId: brokerages[0].id, id: dateKey, date: dateKey, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            return recalibrateHistory(updatedRecords, brokerages[0].initialBalance);
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            return recalibrateHistory(updated, brokerages[0].initialBalance);
        });
    };

    const handleReset = () => { if(confirm("ALERTA: Isso apagará permanentemente todo o histórico. Continuar?")) { setRecords([]); } };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex flex-col items-center justify-center ${theme.bg}`}><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedPreviousForDashboard = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.id < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedPreviousForDashboard.length > 0 ? sortedPreviousForDashboard[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthRecords = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.id.startsWith(currentMonthStr));
    const currentMonthProfit = monthRecords.reduce((acc, r) => acc + r.netProfitUSD, 0);
    const monthlyGoal = goals.find(g => g.type === 'monthly');
    let activeDailyGoal = monthlyGoal ? Math.max(0, monthlyGoal.targetAmount - currentMonthProfit) / Math.max(1, 22 - monthRecords.length) : (activeBrokerage?.initialBalance * 0.03 || 1);

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-xl md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-all duration-500 ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-24 flex items-center px-10 border-b border-slate-800/50 font-black italic text-emerald-500 text-2xl tracking-tighter">HRK SNIPER</div>
                <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
                    <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => setActiveTab('compound')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Juros Compostos</button>
                    <button onClick={() => setActiveTab('report')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Extrato</button>
                    <button onClick={() => setActiveTab('soros')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Soros</button>
                    <button onClick={() => setActiveTab('goals')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Metas</button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Configurações</button>
                </nav>
                <div className="p-6 border-t border-slate-800/50"><button onClick={onLogout} className="w-full flex items-center gap-4 px-5 py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 rounded-2xl transition-all"><LogoutIcon className="w-5 h-5" />Encerrar Sessão</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className={`h-24 flex items-center justify-between px-8 md:px-12 border-b ${theme.header} z-30`}>
                    <div className="flex items-center gap-8">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-3 bg-slate-900 rounded-xl border border-slate-800"><MenuIcon className="w-6 h-6" /></button>
                        <CurrencyWidget isDarkMode={isDarkMode} onRateUpdate={setUsdRate} />
                        <SavingStatusIndicator status={savingStatus} />
                    </div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl hover:bg-emerald-500/10 transition-all">
                        {isDarkMode ? <SunIcon className="w-6 h-6 text-emerald-500" /> : <MoonIcon className="w-6 h-6 text-slate-600" />}
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/10">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeDailyGoal} records={records} usdRate={usdRate} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'report' && <ReportPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} deleteTrade={deleteTrade} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} records={records} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onReset={handleReset} />}
                </div>
            </main>
        </div>
    );
};

const SavingStatusIndicator: React.FC<{status: string}> = ({status}) => {
    if (status === 'saving') return <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 animate-pulse"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Neural Sync...</div>;
    if (status === 'saved') return <div className="flex items-center gap-3 text-[10px] font-black uppercase text-emerald-500"><CheckIcon className="w-4 h-4" /> Cloud Secure</div>;
    return null;
};

const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget, records, usdRate }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const [isIgnoringStop, setIsIgnoringStop] = useState(false);
    const [viewCurrency, setViewCurrency] = useState<'USD'|'BRL'>(activeBrokerage.currency);

    const baseSymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    const displaySymbol = viewCurrency === 'USD' ? '$' : 'R$';
    
    const stopWinReached = activeBrokerage.stopGainTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades;
    const stopLossReached = activeBrokerage.stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades;

    useEffect(() => { setIsIgnoringStop(false); }, [selectedDateString]);

    const handleQuickAdd = (type: 'win' | 'loss') => {
         if ((stopWinReached || stopLossReached) && !isIgnoringStop) {
             const message = stopWinReached 
                ? "Stop GAIN atingido! Meta do dia concluída. Deseja realmente continuar operando?" 
                : "Stop LOSS atingido! Preservar capital é essencial. Deseja realmente continuar operando?";
             if (confirm(message)) {
                 setIsIgnoringStop(true);
             } else {
                 return;
             }
         }

         const entryValue = parseFloat(customEntryValue) || 0;
         const payout = parseFloat(customPayout) || 0;
         const qty = parseInt(quantity) || 1;
         if (type === 'win') addRecord(qty, 0, entryValue, payout);
         else addRecord(0, qty, entryValue, payout);
         setQuantity('1');
    };

    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) : '0.0';
    
    const convertValue = (val: number) => {
        if (activeBrokerage.currency === viewCurrency) return val;
        if (activeBrokerage.currency === 'USD' && viewCurrency === 'BRL') return val * usdRate;
        if (activeBrokerage.currency === 'BRL' && viewCurrency === 'USD') return val / usdRate;
        return val;
    };

    const chartData = useMemo(() => {
        const sorted = records.filter((r: any) => r.recordType === 'day' && r.trades.length > 0).sort((a:any, b:any) => a.id.localeCompare(b.id));
        return sorted.map((r: DailyRecord) => ({
            date: new Date(r.id + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            balance: parseFloat(convertValue(r.endBalanceUSD).toFixed(2))
        }));
    }, [records, viewCurrency, usdRate]);

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-center gap-8 border-b border-slate-800 pb-10">
                <div className="space-y-1">
                    <h2 className={`text-4xl font-black italic tracking-tighter ${theme.text}`}>DASHBOARD CENTRAL</h2>
                    <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-[0.2em]`}>Gestão Profissional</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                        <button onClick={() => setViewCurrency('USD')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${viewCurrency === 'USD' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}>USD</button>
                        <button onClick={() => setViewCurrency('BRL')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${viewCurrency === 'BRL' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}>BRL</button>
                    </div>
                    <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`border rounded-2xl px-6 py-3 text-sm font-black focus:outline-none transition-all ${isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-800 focus:border-emerald-500' : 'bg-white text-slate-700 border-slate-200 shadow-lg'}`} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Patrimônio" val={`${displaySymbol} ${formatMoney(convertValue(currentBalance))}`} icon={PieChartIcon} color="emerald" theme={theme} />
                <StatCard label="Lucro da Sessão" val={`${currentProfit >= 0 ? '+' : ''}${displaySymbol} ${formatMoney(convertValue(currentProfit))}`} icon={TrendingUpIcon} color={currentProfit >= 0 ? 'emerald' : 'red'} theme={theme} />
                <StatCard label="Meta Diária" val={`${displaySymbol}${formatMoney(convertValue(dailyGoalTarget))}`} subVal={`${Math.min(100, (currentProfit/dailyGoalTarget)*100).toFixed(1)}%`} icon={TargetIcon} color="blue" theme={theme} />
                <StatCard label="Win Rate" val={`${winRate}%`} subVal={`${dailyRecordForSelectedDay?.winCount || 0}W - ${dailyRecordForSelectedDay?.lossCount || 0}L`} icon={TrophyIcon} color="purple" theme={theme} />
            </div>

            <div className={`p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl h-[450px] relative overflow-hidden`}>
                <div className="absolute top-0 left-0 p-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><ChartBarIcon className="w-4 h-4 text-emerald-500" /> Curva de Equidade</h3>
                </div>
                <div className="h-full pt-16">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs><linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 900}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 900}} />
                            <Tooltip contentStyle={{backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '16px', border: '1px solid #1e293b', fontWeight: 'bold'}} />
                            <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorBal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className={`p-10 rounded-[2.5rem] border ${theme.card} shadow-2xl relative overflow-hidden`}>
                    <h3 className="font-black mb-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500"><PlusIcon className="w-5 h-5 text-emerald-500" /> Registro de Operação</h3>
                    <div className="space-y-10">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                            <InputGroup label={`Entrada (${baseSymbol})`} val={customEntryValue} setVal={setCustomEntryValue} theme={theme} />
                            <InputGroup label="Payout (%)" val={customPayout} setVal={setCustomPayout} theme={theme} />
                            <InputGroup label="Mãos" val={quantity} setVal={setQuantity} theme={theme} />
                        </div>
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            <button onClick={() => handleQuickAdd('win')} className="h-20 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-3xl uppercase text-xs tracking-[0.3em] transition-all shadow-2xl active:scale-95">WIN (COMPRA)</button>
                            <button onClick={() => handleQuickAdd('loss')} className="h-20 bg-red-600 hover:bg-red-500 text-white font-black rounded-3xl uppercase text-xs tracking-[0.3em] transition-all shadow-2xl active:scale-95">LOSS (VENDA)</button>
                        </div>
                        {(stopWinReached || stopLossReached) && (
                            <div className={`p-6 rounded-[2rem] border text-center animate-bounce ${stopWinReached ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em]">{stopWinReached ? 'STOP GAIN ATINGIDO! META CONCLUÍDA.' : 'STOP LOSS ATINGIDO! PRESERVE O CAPITAL.'}</p>
                                {isIgnoringStop && <p className="text-[9px] font-bold opacity-60 uppercase italic mt-2 tracking-widest">Override: Operando fora da gestão</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`p-10 rounded-[2.5rem] border flex flex-col ${theme.card} shadow-2xl`}>
                    <h3 className="font-black mb-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500"><ListBulletIcon className="w-5 h-5 text-blue-500" /> Fluxo de Ordens</h3>
                    <div className="flex-1 overflow-y-auto max-h-[420px] pr-4 custom-scrollbar space-y-4">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             [...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                return (
                                    <div key={trade.id} className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all ${isDarkMode ? 'bg-slate-950/60 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                        <div className="flex items-center gap-5"><div className={`w-3.5 h-12 rounded-full ${trade.result === 'win' ? 'bg-emerald-500' : 'bg-red-500'}`} /><div><p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-2">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p><p className="text-sm font-black italic">{trade.result === 'win' ? 'ORDER: PROFIT' : 'ORDER: LOSS'}</p></div></div>
                                        <div className="text-right"><p className={`text-lg font-black ${tradeProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{tradeProfit >= 0 ? '+' : ''}{displaySymbol} {formatMoney(convertValue(tradeProfit))}</p><button onClick={() => deleteTrade(trade.id, selectedDateString)} className="text-[9px] font-black text-red-500/30 hover:text-red-500 uppercase tracking-tighter">Excluir</button></div>
                                    </div>
                                );
                             })
                        ) : (<div className="h-full flex flex-col items-center justify-center opacity-20 py-24"><InformationCircleIcon className="w-16 h-16 mb-6" /><p className="text-xs font-black uppercase tracking-[0.4em]">Sem Operações</p></div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<any> = ({ label, val, subVal, icon: Icon, color, theme }) => {
    const colorClasses: any = {
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    };
    return (
        <div className={`p-8 rounded-[2.5rem] border ${theme.card} flex flex-col justify-between shadow-2xl`}>
            <div className="flex justify-between items-start mb-6"><p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{label}</p><div className={`p-2.5 rounded-xl ${colorClasses[color].split(' ')[1]}`}><Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[0]}`} /></div></div>
            <div className="space-y-1"><p className={`text-2xl font-black tracking-tighter truncate ${colorClasses[color].split(' ')[0]}`}>{val}</p>{subVal && <p className="text-[10px] font-bold text-slate-500 uppercase">{subVal}</p>}</div>
        </div>
    );
};

const InputGroup: React.FC<any> = ({ label, val, setVal, theme }) => (
    <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">{label}</label>
        <input type="number" value={val} onChange={e => setVal(e.target.value)} className={`w-full h-16 px-6 rounded-2xl border-2 focus:ring-4 outline-none font-black text-xl transition-all ${theme.input} focus:border-emerald-500`} />
    </div>
);

const CompoundInterestPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    const tableData = useMemo(() => {
        const rows = [];
        const sortedRealRecords = records.filter((r: any): r is DailyRecord => r.recordType === 'day' && r.trades.length > 0).sort((a: any, b: any) => a.id.localeCompare(b.id));
        let startDate = sortedRealRecords.length > 0 ? new Date(sortedRealRecords[0].id + 'T12:00:00') : new Date();
        startDate.setHours(12,0,0,0);
        let runningBalance = activeBrokerage.initialBalance;
        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateId = currentDate.toISOString().split('T')[0];
            const realRecord = records.find((r: any) => r.recordType === 'day' && r.id === dateId && r.trades.length > 0);
            let initial = runningBalance, win, loss, profit, final, isProjection, operationValue;
            if (realRecord) {
                win = realRecord.winCount; loss = realRecord.lossCount; profit = realRecord.netProfitUSD; final = realRecord.endBalanceUSD;
                operationValue = (realRecord.trades.length > 0) ? realRecord.trades[0].entryValue : (initial * 0.10);
                isProjection = false;
            } else {
                isProjection = true; operationValue = initial * 0.05; win = 2; loss = 0;
                profit = (operationValue * (activeBrokerage.payoutPercentage / 100)) * 2; final = initial + profit;
            }
            rows.push({ diaTrade: i + 1, dateId, dateDisplay: currentDate.toLocaleDateString('pt-BR'), initial, win, loss, profit, final, operationValue, isProjection });
            runningBalance = final;
        }
        return rows;
    }, [records, activeBrokerage.initialBalance, activeBrokerage.payoutPercentage]);

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
            <h2 className={`text-4xl font-black italic tracking-tighter ${theme.text}`}>ESTRATÉGIA 30 DIAS</h2>
            <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[900px]">
                        <thead><tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100/50'}`}><th className="py-6 px-4">Step</th><th className="py-6 px-4">Data</th><th className="py-6 px-4">Início</th><th className="py-6 px-4">Ordem</th><th className="py-6 px-4">W</th><th className="py-6 px-4">L</th><th className="py-6 px-4">Delta</th><th className="py-6 px-4">Final</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.diaTrade} className={`text-sm font-black ${row.isProjection ? 'opacity-30' : 'bg-emerald-500/5'}`}>
                                    <td className="py-5 px-4 opacity-40">#{row.diaTrade}</td>
                                    <td className="py-5 px-4 text-[11px] uppercase">{row.dateDisplay}</td>
                                    <td className="py-5 px-4">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-5 px-4 text-blue-400">{currencySymbol} {formatMoney(row.operationValue)}</td>
                                    <td className="py-5 px-4 text-emerald-500">{row.win}</td>
                                    <td className="py-5 px-4 text-red-500">{row.loss}</td>
                                    <td className={`py-5 px-4 ${row.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{currencySymbol} {formatMoney(row.profit)}</td>
                                    <td className="py-5 px-4 text-lg underline decoration-emerald-500/30">{currencySymbol} {formatMoney(row.final)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ReportPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records, deleteTrade }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const dayRecords = records.filter((r: any) => r.recordType === 'day' && r.trades.length > 0).sort((a: any, b: any) => b.id.localeCompare(a.id));
    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
            <h2 className={`text-4xl font-black italic tracking-tighter ${theme.text}`}>EXTRATO DE ORDENS</h2>
            <div className="space-y-8">
                {dayRecords.map((record: DailyRecord) => (
                    <div key={record.id} className={`p-10 rounded-[3rem] border ${theme.card} shadow-2xl`}>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-6 mb-6">
                            <div><h4 className="font-black text-xl">{new Date(record.id + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h4><p className="text-[10px] uppercase text-slate-500">{record.id}</p></div>
                            <div className="text-right"><p className="text-[10px] font-black uppercase text-slate-500">Saldo Líquido</p><p className={`text-3xl font-black ${record.netProfitUSD >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{record.netProfitUSD >= 0 ? '+' : ''}{currencySymbol} {formatMoney(record.netProfitUSD)}</p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {record.trades.map((trade) => {
                                const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                return (
                                    <div key={trade.id} className={`p-6 rounded-[1.8rem] border flex items-center justify-between ${isDarkMode ? 'bg-slate-950/40 border-slate-800/40' : 'bg-slate-50 border-slate-200/50'}`}>
                                        <div className="flex items-center gap-4"><div className={`w-2 h-10 rounded-full ${trade.result === 'win' ? 'bg-emerald-500' : 'bg-red-500'}`} /><div><p className="text-[9px] uppercase font-black text-slate-500 leading-none">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p><p className="text-xs font-black">{trade.result.toUpperCase()}</p></div></div>
                                        <div className="text-right"><p className={`text-base font-black ${tradeProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{currencySymbol}{formatMoney(tradeProfit)}</p><button onClick={() => deleteTrade(trade.id, record.id)} className="text-[9px] text-red-500/40 hover:text-red-500">Excluir</button></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SorosCalculatorPanel: React.FC<any> = ({ theme, activeBrokerage }) => {
    const [initialValue, setInitialValue] = useState('10');
    const [payout, setPayout] = useState(String(activeBrokerage?.payoutPercentage || 80));
    const [levels, setLevels] = useState('3');
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const calculateSoros = () => {
        const val = parseFloat(initialValue) || 0, p = (parseFloat(payout) || 0) / 100, l = Math.min(10, parseInt(levels) || 0), results = [];
        let currentEntry = val;
        for (let i = 1; i <= l; i++) {
            const profit = currentEntry * p, total = currentEntry + profit;
            results.push({ level: i, entry: currentEntry, profit, total });
            currentEntry = total;
        }
        return results;
    };
    const results = calculateSoros();
    return (
        <div className="p-6 md:p-12 space-y-10 max-w-4xl mx-auto">
            <h2 className="text-4xl font-black italic tracking-tighter">ALAVANCAGEM SOROS</h2>
            <div className={`p-10 rounded-[3rem] border ${theme.card} space-y-10 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <InputGroup label="Aporte Inicial" val={initialValue} setVal={setInitialValue} theme={theme} />
                    <InputGroup label="Payout (%)" val={payout} setVal={setPayout} theme={theme} />
                    <InputGroup label="Ciclos" val={levels} setVal={setLevels} theme={theme} />
                </div>
                <div className="space-y-4">
                    {results.map(r => (
                        <div key={r.level} className="flex items-center justify-between p-6 rounded-[1.5rem] bg-slate-950/40 border border-slate-800/50">
                            <div><p className="text-[10px] font-black uppercase text-slate-500">L{r.level}</p><p className="text-xl font-black">Entrada: {currencySymbol} {formatMoney(r.entry)}</p></div>
                            <div className="text-right"><p className="text-[10px] font-black text-emerald-500 uppercase">Retorno Líquido</p><p className="text-xl font-black text-emerald-500">+{currencySymbol} {formatMoney(r.profit)}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, records, activeBrokerage }) => {
    const [newGoalName, setNewGoalName] = useState(''), [newGoalAmount, setNewGoalAmount] = useState(''), currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const addGoal = () => { if (!newGoalName || !newGoalAmount) return; setGoals([...goals, { id: crypto.randomUUID(), name: newGoalName, type: 'monthly', targetAmount: parseFloat(newGoalAmount) || 0, createdAt: Date.now() }]); setNewGoalName(''); setNewGoalAmount(''); };
    const deleteGoal = (id: string) => setGoals(goals.filter((g: Goal) => g.id !== id));
    const currentMonthStr = new Date().toISOString().slice(0, 7), monthProfit = records.filter((r: any) => r.recordType === 'day' && r.id.startsWith(currentMonthStr)).reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
    return (
        <div className="p-6 md:p-12 space-y-10 max-w-5xl mx-auto">
            <h2 className="text-4xl font-black italic tracking-tighter">METAS DE LONGO PRAZO</h2>
            <div className={`p-10 rounded-[3rem] border ${theme.card} space-y-10 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" placeholder="Nome do Objetivo" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className={`h-16 px-8 rounded-2xl border-2 outline-none font-black text-sm uppercase ${theme.input} focus:border-emerald-500`} />
                    <div className="flex gap-4"><input type="number" placeholder="Valor Alvo" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className={`flex-1 h-16 px-8 rounded-2xl border-2 outline-none font-black text-sm ${theme.input} focus:border-emerald-500`} /><button onClick={addGoal} className="px-10 bg-emerald-500 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95">Add</button></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {goals.map((goal: Goal) => {
                        const progress = goal.targetAmount > 0 ? (monthProfit / goal.targetAmount) * 100 : 0;
                        return (
                            <div key={goal.id} className="p-10 rounded-[2.5rem] bg-slate-950/40 border border-slate-800/50 space-y-6 relative overflow-hidden group">
                                <div className="flex justify-between items-start"><div><p className="text-[10px] uppercase text-slate-500 font-black mb-1">{goal.name}</p><h4 className="text-3xl font-black">{currencySymbol} {formatMoney(goal.targetAmount)}</h4></div><button onClick={() => deleteGoal(goal.id)} className="p-3 text-red-500/40 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5" /></button></div>
                                <div className="space-y-3"><div className="flex justify-between text-[10px] font-black uppercase"><span>Mês Atual</span><span className={progress >= 100 ? 'text-emerald-500' : 'text-blue-400'}>{progress.toFixed(1)}%</span></div><div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-1 border border-slate-800"><div className={`h-full transition-all duration-1000 rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div></div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset }) => {
    const updateBrokerage = (field: keyof Brokerage, value: any) => { setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: value } : b)); };
    return (
        <div className="p-6 md:p-12 space-y-10 max-w-4xl mx-auto">
            <h2 className="text-4xl font-black italic tracking-tighter">PARÂMETROS DE CONTA</h2>
            <div className={`p-10 rounded-[3rem] border ${theme.card} space-y-12 shadow-2xl`}>
                <section className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase text-emerald-500 pb-2 border-b border-slate-800/50">Identidade & Moeda</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroupText label="Nome da Conta" val={brokerage.name} setVal={(v:string) => updateBrokerage('name', v)} theme={theme} />
                        <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Moeda Base</label><select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-16 px-6 rounded-2xl border-2 outline-none font-black text-sm uppercase ${theme.input} focus:border-emerald-500`}><option value="USD">Dólar ($)</option><option value="BRL">Real (R$)</option></select></div>
                    </div>
                </section>
                <section className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase text-blue-500 pb-2 border-b border-slate-800/50">Capitalização</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Banca Inicial" val={brokerage.initialBalance} setVal={(v:number) => updateBrokerage('initialBalance', v)} theme={theme} />
                        <InputGroup label="Payout Alvo (%)" val={brokerage.payoutPercentage} setVal={(v:number) => updateBrokerage('payoutPercentage', v)} theme={theme} />
                    </div>
                </section>
                <section className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase text-red-500 pb-2 border-b border-slate-800/50">Gerenciamento de Risco</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Stop Win (Wins)" val={brokerage.stopGainTrades} setVal={(v:number) => updateBrokerage('stopGainTrades', v)} theme={theme} />
                        <InputGroup label="Stop Loss (Derrotas)" val={brokerage.stopLossTrades} setVal={(v:number) => updateBrokerage('stopLossTrades', v)} theme={theme} />
                    </div>
                </section>
                <button onClick={onReset} className="w-full px-10 py-6 bg-red-600/5 hover:bg-red-600 text-red-500 hover:text-white font-black rounded-3xl uppercase text-[10px] tracking-widest transition-all border border-red-500/20 active:scale-95">Apagar Todo Histórico</button>
            </div>
        </div>
    );
};

const InputGroupText: React.FC<any> = ({ label, val, setVal, theme }) => (
    <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">{label}</label>
        <input type="text" value={val} onChange={e => setVal(e.target.value)} className={`w-full h-16 px-6 rounded-2xl border-2 outline-none font-black text-sm tracking-widest ${theme.input} focus:border-emerald-500 transition-all`} />
    </div>
);

export default App;
