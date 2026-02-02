
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon, CpuChipIcon, TrendingDownIcon
} from './components/icons';

// --- Helpers ---
const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(val || 0);
};

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-950 border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500' : 'bg-transparent text-slate-500',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- Compound Interest Panel ---
const CompoundInterestPanel: React.FC<{ isDarkMode: boolean, activeBrokerage: Brokerage, records: AppRecord[] }> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const initial = activeBrokerage.initialBalance || 0;
    
    const tableData = useMemo(() => {
        let curr = initial;
        const dailyRecords = records.filter(r => r.recordType === 'day') as DailyRecord[];
        const entryBase = activeBrokerage.entryValue || 1;
        const isPercent = activeBrokerage.entryMode === 'percentage';
        const payout = (activeBrokerage.payoutPercentage || 80) / 100;

        return Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const key = date.toISOString().split('T')[0];
            const actual = dailyRecords.find(r => r.id === key);
            
            const start = curr;
            let profit = 0;
            let isActual = false;

            if (actual && actual.trades && actual.trades.length > 0) {
                profit = actual.netProfitUSD;
                isActual = true;
                curr += profit;
            } else {
                const singleWinProfit = isPercent ? (curr * (entryBase / 100) * payout) : (entryBase * payout);
                profit = singleWinProfit * 3;
                curr += profit;
            }

            return { day: i + 1, key, start, profit, end: curr, isActual };
        });
    }, [initial, records, activeBrokerage]);

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-emerald-500">Projeção Sniper: Meta 3 Wins</h2>
            <div className={`rounded-[2rem] border ${theme.card} overflow-hidden shadow-2xl`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/50 font-black text-slate-500 uppercase tracking-widest">
                            <tr className="border-b border-slate-800">
                                <th className="p-5">Dia</th>
                                <th className="p-5">Saldo Inicial</th>
                                <th className="p-5">Lucro Esperado</th>
                                <th className="p-5">Saldo Final</th>
                                <th className="p-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {tableData.map(d => (
                                <tr key={d.day} className={`transition-all duration-300 ${!d.isActual ? 'opacity-30' : 'bg-emerald-500/5'}`}>
                                    <td className="p-5 font-black">{d.day}</td>
                                    <td className="p-5">{formatMoney(d.start)}</td>
                                    <td className={`p-5 font-bold ${d.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatMoney(d.profit)}</td>
                                    <td className="p-5 font-black text-white">{formatMoney(d.end)}</td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${d.isActual ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                                            {d.isActual ? 'Real' : 'Alvo'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Dashboard ---
const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const winCount = dailyRecordForSelectedDay?.winCount || 0;
    const lossCount = dailyRecordForSelectedDay?.lossCount || 0;
    const stopWin = activeBrokerage.stopGainTrades || 0;
    const stopLoss = activeBrokerage.stopLossTrades || 0;

    const stopReached = (stopWin > 0 && winCount >= stopWin) || (stopLoss > 0 && lossCount >= stopLoss);

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-4xl font-black ${theme.text} tracking-tighter uppercase italic leading-none`}>Sniper Dashboard</h2>
                    <p className={`${theme.textMuted} font-bold mt-1`}>Controle de Performance</p>
                </div>
                <input type="date" value={selectedDateString} onChange={e => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`p-4 rounded-2xl border ${theme.input} font-black focus:ring-4 ring-emerald-500/20 outline-none`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-2 tracking-widest">Banca Atual</p>
                    <p className="text-3xl font-black text-emerald-500">{formatMoney(dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay)}</p>
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-2 tracking-widest">Lucro do Dia</p>
                    <p className={`text-3xl font-black ${ (dailyRecordForSelectedDay?.netProfitUSD || 0) >= 0 ? 'text-white' : 'text-red-500' }`}>
                        {formatMoney(dailyRecordForSelectedDay?.netProfitUSD ?? 0)}
                    </p>
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-2 tracking-widest">Placar Sniper</p>
                    <p className="text-3xl font-black text-blue-400">{winCount}W - {lossCount}L</p>
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-2 tracking-widest">Status</p>
                    <p className={`text-sm font-black uppercase ${stopReached ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>{stopReached ? 'STOP ATIVADO' : 'OPERANDO'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className={`p-10 rounded-[3.5rem] border ${theme.card} space-y-8 shadow-2xl`}>
                    <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-emerald-500">Operacional</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Valor Entrada</label>
                            <input type="number" step="0.01" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border text-xl font-black ${theme.input} focus:border-emerald-500 transition-colors`} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Payout %</label>
                            <input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border text-xl font-black ${theme.input} focus:border-emerald-500 transition-colors`} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 pt-4">
                        <button disabled={stopReached} onClick={() => addRecord(1, 0, parseFloat(customEntryValue), parseFloat(customPayout))} className="h-20 bg-emerald-500 text-slate-950 font-black rounded-3xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 shadow-2xl transition-all text-xl">WIN</button>
                        <button disabled={stopReached} onClick={() => addRecord(0, 1, parseFloat(customEntryValue), parseFloat(customPayout))} className="h-20 bg-red-600 text-white font-black rounded-3xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 shadow-2xl transition-all text-xl">LOSS</button>
                    </div>
                </div>
                <div className={`p-10 rounded-[3.5rem] border ${theme.card} flex flex-col max-h-[450px]`}>
                    <h3 className="text-[12px] font-black uppercase text-slate-500 mb-8 tracking-widest">Fita Diária</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? [...dailyRecordForSelectedDay.trades].reverse().map(t => (
                            <div key={t.id} className="flex items-center justify-between p-5 rounded-3xl bg-slate-950/40 border border-slate-900 group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-12 rounded-full ${t.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-600 uppercase">{new Date(t.timestamp || 0).toLocaleTimeString()}</p>
                                        <p className="font-black text-lg tracking-tight">{t.result === 'win' ? 'WIN' : 'LOSS'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xl font-black ${t.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                                        {t.result === 'win' ? '+' : '-'}{formatMoney(t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : t.entryValue)}
                                    </p>
                                    <button onClick={() => deleteTrade(t.id, selectedDateString)} className="text-[9px] font-black text-red-500/30 hover:text-red-500 uppercase transition-all opacity-0 group-hover:opacity-100 mt-1">Apagar</button>
                                </div>
                            </div>
                        )) : <div className="flex-1 flex flex-col items-center justify-center opacity-10 py-16"><InformationCircleIcon className="w-16 h-16" /></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<any> = ({ brokerage, setBrokerages, setRecords, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [bal, setBal] = useState(String(brokerage.initialBalance || ''));
    const [entryMode, setEntryMode] = useState(brokerage.entryMode || 'fixed');
    const [entryValue, setEntryValue] = useState(String(brokerage.entryValue || ''));
    const [sg, setSg] = useState(String(brokerage.stopGainTrades || ''));
    const [sl, setSl] = useState(String(brokerage.stopLossTrades || ''));

    const handleSave = () => {
        setBrokerages((prev: any) => prev.map((b: any) => b.id === brokerage.id ? { 
            ...b, 
            initialBalance: parseFloat(bal) || 0,
            entryMode,
            entryValue: parseFloat(entryValue) || 0,
            stopGainTrades: parseInt(sg) || 0,
            stopLossTrades: parseInt(sl) || 0
        } : b));
        alert("Configurações Sniper Salvas!");
    };

    return (
        <div className="p-8 max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-black uppercase italic text-emerald-500 mb-6">Configurações de Gestão</h2>
            <div className={`p-10 rounded-[3.5rem] border ${theme.card} space-y-8 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-slate-500 ml-2">Banca de Início (R$)</label><input type="number" step="0.01" value={bal} onChange={e => setBal(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border ${theme.input} font-black focus:border-emerald-500 outline-none`} /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-slate-500 ml-2">Modelo de Entrada</label><select value={entryMode} onChange={e => setEntryMode(e.target.value as any)} className={`w-full h-14 px-6 rounded-2xl border ${theme.input} font-black outline-none`}><option value="fixed">Valor Fixo</option><option value="percentage">Percentual (%)</option></select></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-slate-500 ml-2">Valor/Taxa (%)</label><input type="number" step="0.01" value={entryValue} onChange={e => setEntryValue(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border ${theme.input} font-black outline-none`} /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-slate-500 ml-2">Stop Win (Wins)</label><input type="number" value={sg} onChange={e => setSg(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border ${theme.input} font-black outline-none`} /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-slate-500 ml-2">Stop Loss (Losses)</label><input type="number" value={sl} onChange={e => setSl(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border ${theme.input} font-black outline-none`} /></div>
                </div>
                <button onClick={handleSave} className="w-full h-16 bg-emerald-500 text-slate-950 font-black rounded-3xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Sincronizar Banca</button>
                <button onClick={() => { if(confirm("Apagar todos os registros permanentemente?")) setRecords([]); }} className="w-full text-[10px] font-black uppercase text-red-500/50 hover:text-red-500 transition-colors">Zerar Todo Histórico</button>
            </div>
        </div>
    );
};

// --- Saving Status Indicator ---
const SavingStatusIndicator: React.FC<{ status: 'idle' | 'saving' | 'saved' | 'error' }> = ({ status }) => {
    if (status === 'idle') return null;
    return (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 animate-fade-in">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'saving' ? 'bg-blue-400 animate-pulse' : status === 'saved' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${status === 'saving' ? 'text-blue-400' : status === 'saved' ? 'text-emerald-500' : 'text-red-500'}`}>{status === 'saving' ? 'Salvando' : status === 'saved' ? 'Nuvem OK' : 'Erro'}</span>
        </div>
    );
};

// --- App Root ---
const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const activeBrokerage = useMemo(() => brokerages[0] || { id: '1', name: 'Gestão Sniper', initialBalance: 14.32, currency: 'USD', payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, entryMode: 'percentage', entryValue: 10, dailyInterestRate: 3 }, [brokerages]);

    const dailyRecordForSelectedDay = records.find(r => r.id === selectedDate.toISOString().split('T')[0]) as DailyRecord | undefined;
    
    const startBalanceForSelectedDay = useMemo(() => {
        const sorted = [...records].filter(r => r.recordType === 'day').sort((a,b) => a.id.localeCompare(b.id));
        const dayIdx = sorted.findIndex(r => r.id === selectedDate.toISOString().split('T')[0]);
        if (dayIdx <= 0) {
            if (dayIdx === 0) return (sorted[0] as DailyRecord).startBalanceUSD;
            return activeBrokerage.initialBalance;
        }
        return (sorted[dayIdx-1] as DailyRecord).endBalanceUSD;
    }, [records, selectedDate, activeBrokerage.initialBalance]);

    const suggestedEntry = activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : (dailyRecordForSelectedDay?.startBalanceUSD ?? startBalanceForSelectedDay) * (activeBrokerage.entryValue / 100);
    
    const [customEntryValue, setCustomEntryValue] = useState(String(suggestedEntry.toFixed(2)));
    const [customPayout, setCustomPayout] = useState(String(activeBrokerage.payoutPercentage));

    useEffect(() => {
        setCustomEntryValue(String(suggestedEntry.toFixed(2)));
        setCustomPayout(String(activeBrokerage.payoutPercentage));
    }, [suggestedEntry, activeBrokerage.payoutPercentage]);

    const latestDataRef = useRef({ userId: user.id, brokerages, records });
    useEffect(() => { latestDataRef.current = { userId: user.id, brokerages, records }; }, [user.id, brokerages, records]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&cache=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                if (data.brokerages?.length) setBrokerages(data.brokerages);
                else setBrokerages([{ id: '1', name: 'Gestão Sniper', initialBalance: 14.32, currency: 'USD', payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, entryMode: 'percentage', entryValue: 10, dailyInterestRate: 3 }]);
                if (data.records) setRecords(data.records);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [user.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveData = useCallback(async () => {
        setSavingStatus('saving');
        try {
            const payload = { ...latestDataRef.current, goals: [] };
            const response = await fetch('/api/save-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) { setSavingStatus('saved'); setTimeout(() => setSavingStatus('idle'), 2000); }
        } catch (e) { setSavingStatus('error'); }
    }, []);

    const debouncedSave = useDebouncedCallback(saveData, 2000);

    const recalibrate = (all: AppRecord[], init: number) => {
        let curr = init;
        return all.sort((a,b) => a.id.localeCompare(b.id)).map(r => {
            if (r.recordType !== 'day') return r;
            const daily = r as DailyRecord;
            const profit = daily.trades.reduce((acc, t) => {
                const p = t.result === 'win' ? (t.entryValue * (t.payoutPercentage/100)) : -t.entryValue;
                return Math.round((acc + p) * 100) / 100;
            }, 0);
            const res = { ...daily, startBalanceUSD: curr, winCount: daily.trades.filter(t=>t.result==='win').length, lossCount: daily.trades.filter(t=>t.result==='loss').length, netProfitUSD: profit, endBalanceUSD: Math.round((curr + profit) * 100) / 100 };
            curr = res.endBalanceUSD;
            return res;
        });
    };

    const addRecord = (win: number, loss: number, entry: number, pay: number) => {
        setRecords(prev => {
            const key = selectedDate.toISOString().split('T')[0];
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue: entry, payoutPercentage: pay, timestamp: Date.now() });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue: entry, payoutPercentage: pay, timestamp: Date.now() });
            const idx = prev.findIndex(r => r.id === key && r.recordType === 'day');
            let updated = [...prev];
            if (idx >= 0) {
                const rec = updated[idx] as DailyRecord;
                updated[idx] = { ...rec, trades: [...rec.trades, ...newTrades] };
            } else {
                updated.push({ recordType: 'day', brokerageId: activeBrokerage.id, id: key, date: key, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            const res = recalibrate(updated, activeBrokerage.initialBalance);
            debouncedSave(); return res;
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t=>t.id!==id) } : r);
            const res = recalibrate(updated, activeBrokerage.initialBalance);
            debouncedSave(); return res;
        });
    };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

    const menu = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGridIcon },
        { id: 'ai', label: 'Sniper IA', icon: CpuChipIcon },
        { id: 'compound', label: 'Planilha Juros', icon: ChartBarIcon },
        { id: 'report', label: 'Relatórios', icon: DocumentTextIcon },
        { id: 'settings', label: 'Gestão Sniper', icon: SettingsIcon },
    ];

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r ${theme.sidebar} transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl`}>
                <div className="h-20 flex items-center px-8 font-black italic text-emerald-400 text-xl tracking-tighter">HRK SNIPER PRO</div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {menu.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === item.id ? theme.navActive : theme.navInactive}`}>
                            <item.icon className="w-5 h-5" />{item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-black hover:bg-red-500/10 rounded-2xl transition-colors"><LogoutIcon className="w-5 h-5" />Sair</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex items-center justify-between px-6 border-b ${theme.header} z-30`}>
                    <div className="flex items-center gap-4"><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden"><MenuIcon className="w-7 h-7 text-emerald-500" /></button><SavingStatusIndicator status={savingStatus} /></div>
                    <div className="flex items-center gap-3"><button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-sm">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button></div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={selectedDate.toISOString().split('T')[0]} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecordForSelectedDay} startBalanceForSelectedDay={startBalanceForSelectedDay} isDarkMode={isDarkMode} />}
                    {activeTab === 'ai' && <AIAnalysisPanel isDarkMode={isDarkMode} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'report' && (
                        <div className="p-8 max-w-5xl mx-auto space-y-4">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Histórico de Performance</h2>
                            {[...records].flatMap(r => (r as DailyRecord).trades ? (r as DailyRecord).trades.map(t=>({...t, date: r.id})) : []).sort((a,b)=>b.timestamp!-a.timestamp!).map(t=>(
                                <div key={t.id} className={`p-4 rounded-2xl border ${theme.card} flex justify-between items-center group`}>
                                    <div className="flex items-center gap-4"><div className={`w-1.5 h-10 rounded-full ${t.result === 'win' ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-red-500 shadow-[0_0_8px_red]'}`} /><div><p className="text-[9px] font-black text-slate-500 uppercase">{t.date}</p><p className="font-black text-sm">{t.result === 'win' ? 'VITORIA' : 'DERROTA'}</p></div></div>
                                    <p className={`text-lg font-black ${t.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>{formatMoney(t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : t.entryValue)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'settings' && <SettingsPanel isDarkMode={isDarkMode} brokerage={activeBrokerage} setBrokerages={setBrokerages} setRecords={setRecords} />}
                </div>
            </main>
        </div>
    );
};

// --- AI Analysis Panel ---
const AIAnalysisPanel: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const analyzeChart = async () => {
        if (!selectedImage) return;
        setIsAnalyzing(true);
        setAnalysisError(null);
        setResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            // Mudança para o modelo Gemini 3 Flash para maior velocidade e menos bloqueios
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: selectedImage.split(',')[1] } },
                        { text: "Você é um assistente educativo de análise técnica. Analise este gráfico para fins de estudo. Identifique as tendências e forças de mercado. Retorne OBRIGATORIAMENTE um JSON puro (sem markdown) seguindo este esquema: {\"recommendation\": \"COMPRA\"|\"VENDA\"|\"AGUARDAR\", \"confidence\": 0-100, \"reasoning\": \"string resumida\", \"bull_force\": 0-100, \"bear_force\": 0-100}" }
                    ]
                }
            });

            // Extração robusta do JSON usando regex
            const responseText = response.text || "";
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    setResult(parsed);
                } catch (parseError) {
                    console.error("Erro ao converter JSON:", responseText);
                    setAnalysisError("A IA enviou dados em formato inválido. Tente novamente.");
                }
            } else {
                setAnalysisError("Não foi possível processar a resposta da IA. Verifique o print.");
            }
        } catch (e: any) { 
            console.error("Erro na API Gemini:", e); 
            const errorMsg = e?.message || "";
            if (errorMsg.includes("SAFETY")) {
                setAnalysisError("Conteúdo bloqueado pelos filtros de segurança. Tente outro print.");
            } else {
                setAnalysisError("Falha de conexão com o servidor Sniper IA. Verifique sua chave API.");
            }
        } finally { 
            setIsAnalyzing(false); 
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <h2 className="text-3xl font-black uppercase italic text-emerald-500 tracking-tighter">Sniper IA V3</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 rounded-[2.5rem] border ${theme.card} flex flex-col min-h-[420px] shadow-2xl`}>
                    {!selectedImage ? (
                        <label className="flex-1 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-500/5 transition-all group">
                            <PlusIcon className="w-12 h-12 text-slate-800 mb-2 group-hover:text-emerald-500 transition-colors" />
                            <span className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Carregar Screenshot</span>
                            <input type="file" className="hidden" accept="image/*" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => { setSelectedImage(reader.result as string); setResult(null); setAnalysisError(null); };
                                    reader.readAsDataURL(file);
                                }
                            }} />
                        </label>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="flex-1 relative overflow-hidden rounded-3xl bg-black border border-slate-800">
                                <img src={selectedImage} className="absolute inset-0 w-full h-full object-contain" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={analyzeChart} disabled={isAnalyzing} className="flex-1 h-14 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 disabled:grayscale transition-all">
                                    {isAnalyzing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CpuChipIcon className="w-5 h-5" />}
                                    {isAnalyzing ? 'Processando...' : 'Analisar'}
                                </button>
                                <button onClick={() => {setSelectedImage(null); setResult(null); setAnalysisError(null);}} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all"><TrashIcon className="w-6 h-6" /></button>
                            </div>
                        </div>
                    )}
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl relative overflow-hidden`}>
                    <h3 className="text-[10px] font-black uppercase text-blue-400 mb-8 tracking-[0.2em]">Métrica de Assertividade</h3>
                    
                    {analysisError && (
                        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-3xl text-red-500 text-xs font-bold text-center mb-6 animate-pulse leading-relaxed">
                            {analysisError}
                        </div>
                    )}

                    {result ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex justify-between items-end border-b border-slate-900 pb-8">
                                <div><p className="text-[10px] uppercase font-black text-slate-600 mb-1 tracking-widest">Gatilho Sniper</p><p className={`text-5xl font-black italic tracking-tighter ${result.recommendation === 'COMPRA' ? 'text-green-500' : result.recommendation === 'VENDA' ? 'text-red-500' : 'text-yellow-500'}`}>{result.recommendation === 'COMPRA' ? 'CALL' : result.recommendation === 'VENDA' ? 'PUT' : 'WAIT'}</p></div>
                                <div className="text-right"><p className="text-[10px] uppercase font-black text-slate-600 mb-1 tracking-widest">Confiança</p><p className="text-4xl font-black text-white">{result.confidence}%</p></div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter"><span className="text-green-500">Pressão Touro {result.bull_force}%</span><span className="text-red-500">Pressão Urso {result.bear_force}%</span></div>
                                <div className="h-3 bg-slate-900/50 rounded-full flex overflow-hidden p-0.5 border border-slate-800"><div className="bg-green-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_green]" style={{width: `${result.bull_force}%`}} /><div className="bg-red-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_red] ml-auto" style={{width: `${result.bear_force}%`}} /></div>
                            </div>
                            <div className="p-5 rounded-3xl bg-slate-950/40 border border-slate-900 text-xs italic text-slate-400 leading-relaxed shadow-inner">
                                <InformationCircleIcon className="w-4 h-4 inline mr-2 text-blue-400 mb-0.5" />
                                "{result.reasoning}"
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-24 transition-opacity">
                            <CpuChipIcon className={`w-20 h-20 mb-4 ${isAnalyzing ? 'animate-spin text-emerald-500' : ''}`} />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{isAnalyzing ? 'Escaneando Gráfico...' : 'Sniper Pronto'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
