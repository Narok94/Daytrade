
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
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        navActive: isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- Compound Interest Panel (3 Wins Projection) ---
const CompoundInterestPanel: React.FC<{ isDarkMode: boolean, activeBrokerage: Brokerage, records: AppRecord[] }> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const initial = activeBrokerage.initialBalance || 0;
    const rate = activeBrokerage.dailyInterestRate || 3;
    
    const tableData = useMemo(() => {
        let curr = initial;
        const dailyRecords = records.filter(r => r.recordType === 'day') as DailyRecord[];
        
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
                // Projeção baseada na taxa configurada (simula a meta de "3 wins")
                profit = curr * (rate / 100);
                curr += profit;
            }

            return { day: i + 1, key, start, profit, end: curr, isActual };
        });
    }, [initial, records, rate]);

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-emerald-500">Planilha de Juros (Meta {rate}%)</h2>
            <div className={`rounded-[2rem] border ${theme.card} overflow-hidden shadow-2xl`}>
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 font-black text-slate-500 uppercase tracking-widest"><tr className="border-b border-slate-800"><th className="p-5">DIA</th><th className="p-5">BANCA INICIAL</th><th className="p-5">LUCRO ({rate}%)</th><th className="p-5">BANCA FINAL</th><th className="p-5">STATUS</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                        {tableData.map(d => (
                            <tr key={d.day} className={`transition-all duration-300 ${!d.isActual ? 'opacity-30 grayscale' : 'bg-emerald-500/5'}`}>
                                <td className="p-5 font-black">{d.day}</td>
                                <td className="p-5">R$ {formatMoney(d.start)}</td>
                                <td className={`p-5 font-bold ${d.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{d.profit >= 0 ? '+' : ''}R$ {formatMoney(d.profit)}</td>
                                <td className="p-5 font-black text-white">R$ {formatMoney(d.end)}</td>
                                <td className="p-5"><span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${d.isActual ? 'bg-green-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>{d.isActual ? 'REAL' : '3 WINS PROJETADO'}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div><h2 className={`text-3xl font-black ${theme.text} tracking-tighter uppercase italic`}>Sniper Dashboard</h2><p className={theme.textMuted}>Gestão Profissional de Daytrade</p></div>
                <input type="date" value={selectedDateString} onChange={e => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`p-3 rounded-xl border ${theme.input} font-black focus:ring-2 ring-emerald-500 transition-all`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-6 rounded-[2rem] border ${theme.card}`}><p className="text-[9px] uppercase font-black text-slate-500 mb-2">Banca Atual</p><p className="text-2xl font-black text-emerald-500">R$ {formatMoney(dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay)}</p></div>
                <div className={`p-6 rounded-[2rem] border ${theme.card}`}><p className="text-[9px] uppercase font-black text-slate-500 mb-2">Lucro do Dia</p><p className="text-2xl font-black text-white">R$ {formatMoney(dailyRecordForSelectedDay?.netProfitUSD ?? 0)}</p></div>
                <div className={`p-6 rounded-[2rem] border ${theme.card}`}><p className="text-[9px] uppercase font-black text-slate-500 mb-2">Placar Sniper</p><p className="text-2xl font-black text-blue-400">{winCount}W - {lossCount}L</p></div>
                <div className={`p-6 rounded-[2rem] border ${theme.card}`}><p className="text-[9px] uppercase font-black text-slate-500 mb-2">Risco</p><p className={`text-xs font-black uppercase ${stopReached ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>{stopReached ? 'STOP ATIVADO' : 'OPERANDO'} ({winCount}/{stopWin}W | {lossCount}/{stopLoss}L)</p></div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className={`p-8 rounded-[3rem] border ${theme.card} space-y-6 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUpIcon className="w-32 h-32" /></div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Painel Operacional</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black uppercase ml-1">Valor da Ordem</label><input type="number" step="0.01" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black uppercase ml-1">Payout Médio %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <button disabled={stopReached} onClick={() => addRecord(1, 0, parseFloat(customEntryValue), parseFloat(customPayout))} className="h-16 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all">WIN</button>
                        <button disabled={stopReached} onClick={() => addRecord(0, 1, parseFloat(customEntryValue), parseFloat(customPayout))} className="h-16 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 shadow-lg shadow-red-500/20 transition-all">LOSS</button>
                    </div>
                </div>
                <div className={`p-8 rounded-[3rem] border ${theme.card} flex flex-col max-h-[400px]`}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Histórico Diário</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? [...dailyRecordForSelectedDay.trades].reverse().map(t => (
                            <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-slate-900 group">
                                <div className="flex items-center gap-3"><div className={`w-1.5 h-10 rounded-full ${t.result === 'win' ? 'bg-green-500 shadow-[0_0_10px_green]' : 'bg-red-500'}`} /><div><p className="text-[10px] font-black text-slate-500">{new Date(t.timestamp || 0).toLocaleTimeString()}</p><p className="font-bold">{t.result === 'win' ? 'WIN' : 'LOSS'}</p></div></div>
                                <div className="text-right"><p className={`text-lg font-black ${t.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>{t.result === 'win' ? '+' : '-'}R$ {formatMoney(t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : t.entryValue)}</p><button onClick={() => deleteTrade(t.id, selectedDateString)} className="text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase transition-colors opacity-0 group-hover:opacity-100">Excluir</button></div>
                            </div>
                        )) : <div className="flex-1 flex flex-col items-center justify-center opacity-10 py-10"><InformationCircleIcon className="w-12 h-12" /><p className="text-[10px] font-black uppercase mt-2">Sem registros</p></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<any> = ({ brokerage, setBrokerages, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [name, setName] = useState(brokerage.name || '');
    const [bal, setBal] = useState(String(brokerage.initialBalance || ''));
    const [entryMode, setEntryMode] = useState(brokerage.entryMode || 'fixed');
    const [entryValue, setEntryValue] = useState(String(brokerage.entryValue || ''));
    const [sg, setSg] = useState(String(brokerage.stopGainTrades || ''));
    const [sl, setSl] = useState(String(brokerage.stopLossTrades || ''));
    const [dir, setDir] = useState(String(brokerage.dailyInterestRate || '3'));

    const handleSave = () => {
        setBrokerages((prev: any) => prev.map((b: any) => b.id === brokerage.id ? { 
            ...b, 
            name, 
            initialBalance: parseFloat(bal) || 0,
            entryMode,
            entryValue: parseFloat(entryValue) || 0,
            stopGainTrades: parseInt(sg) || 0,
            stopLossTrades: parseInt(sl) || 0,
            dailyInterestRate: parseFloat(dir) || 3
        } : b));
        alert("Gerenciamento Sniper Atualizado!");
    };

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-black uppercase italic text-emerald-500">Gestão e Parâmetros</h2>
            <div className={`p-10 rounded-[3rem] border ${theme.card} space-y-8 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Identificação</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black focus:ring-2 ring-emerald-500 transition-all`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Banca Inicial (R$)</label><input type="number" step="0.01" value={bal} onChange={e => setBal(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black focus:ring-2 ring-emerald-500 transition-all`} /></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Modo Entrada</label><select value={entryMode} onChange={e => setEntryMode(e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black focus:ring-2 ring-emerald-500 transition-all`}><option value="fixed">Fixo (R$)</option><option value="percentage">Gestão (%)</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Valor ou %</label><input type="number" step="0.01" value={entryValue} onChange={e => setEntryValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black focus:ring-2 ring-emerald-500 transition-all`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Meta "3 Wins" (%)</label><input type="number" step="0.1" value={dir} onChange={e => setDir(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black focus:ring-2 ring-emerald-500 transition-all`} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Stop Win (Quantidade)</label><input type="number" value={sg} onChange={e => setSg(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black focus:ring-2 ring-emerald-500 transition-all`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Stop Loss (Quantidade)</label><input type="number" value={sl} onChange={e => setSl(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black focus:ring-2 ring-emerald-500 transition-all`} /></div>
                </div>

                <button onClick={handleSave} className="w-full h-16 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:scale-[1.01] active:scale-95 transition-all">Aplicar Novos Parâmetros</button>
            </div>
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

    const activeBrokerage = useMemo(() => brokerages[0] || { id: '1', name: 'Gestão Sniper', initialBalance: 10, currency: 'USD', payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, entryMode: 'percentage', entryValue: 10, dailyInterestRate: 3 }, [brokerages]);

    const dailyRecordForSelectedDay = records.find(r => r.id === selectedDate.toISOString().split('T')[0]) as DailyRecord | undefined;
    
    // Cálculo reativo da banca e entrada baseada no dia selecionado
    const startBalanceForSelectedDay = useMemo(() => {
        const sorted = [...records].filter(r => r.recordType === 'day').sort((a,b) => a.id.localeCompare(b.id));
        const dayIdx = sorted.findIndex(r => r.id === selectedDate.toISOString().split('T')[0]);
        if (dayIdx <= 0) return activeBrokerage.initialBalance;
        return (sorted[dayIdx-1] as DailyRecord).endBalanceUSD;
    }, [records, selectedDate, activeBrokerage.initialBalance]);

    const suggestedEntry = activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : startBalanceForSelectedDay * (activeBrokerage.entryValue / 100);
    
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
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                if (data.brokerages) setBrokerages(data.brokerages);
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
                return acc + p;
            }, 0);
            const res = { ...daily, startBalanceUSD: curr, winCount: daily.trades.filter(t=>t.result==='win').length, lossCount: daily.trades.filter(t=>t.result==='loss').length, netProfitUSD: profit, endBalanceUSD: curr + profit };
            curr += profit;
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
                    <div className="flex items-center gap-3"><button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-sm">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button><div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20">{user.username.slice(0, 2).toUpperCase()}</div></div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={selectedDate.toISOString().split('T')[0]} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecordForSelectedDay} startBalanceForSelectedDay={startBalanceForSelectedDay} isDarkMode={isDarkMode} />}
                    {activeTab === 'ai' && <AIAnalysisPanel isDarkMode={isDarkMode} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'report' && (
                        <div className="p-8 max-w-5xl mx-auto space-y-4">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Histórico de Performance</h2>
                            {[...records].flatMap(r => (r as DailyRecord).trades ? (r as DailyRecord).trades.map(t=>({...t, date: r.id})) : []).sort((a,b)=>b.timestamp!-a.timestamp!).map(t=>(
                                <div key={t.id} className={`p-5 rounded-2xl border ${theme.card} flex justify-between items-center group hover:border-emerald-500 transition-all`}>
                                    <div className="flex items-center gap-4"><div className={`w-1.5 h-12 rounded-full ${t.result === 'win' ? 'bg-green-500 shadow-[0_0_10px_green]' : 'bg-red-500'}`} /><div><p className="text-[10px] font-black text-slate-500 uppercase">{t.date} - {new Date(t.timestamp!).toLocaleTimeString()}</p><p className="font-bold text-lg">{t.result === 'win' ? 'VITÓRIA' : 'LOSS'}</p></div></div>
                                    <p className={`text-xl font-black ${t.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>R$ {formatMoney(t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : t.entryValue)}</p>
                                </div>
                            ))}
                            {records.length === 0 && <div className="text-center py-20 opacity-20"><DocumentTextIcon className="w-16 h-16 mx-auto" /><p className="font-black uppercase mt-4">Sem dados</p></div>}
                        </div>
                    )}
                    {activeTab === 'settings' && <SettingsPanel isDarkMode={isDarkMode} brokerage={activeBrokerage} setBrokerages={setBrokerages} />}
                </div>
            </main>
        </div>
    );
};

const SavingStatusIndicator: React.FC<{status: string}> = ({status}) => {
    if (status === 'saving') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 animate-pulse"><ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> Salvando...</div>;
    if (status === 'saved') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500"><CheckIcon className="w-3.5 h-3.5" /> Nuvem OK</div>;
    if (status === 'error') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500"><InformationCircleIcon className="w-3.5 h-3.5" /> Erro Cloud</div>;
    return null;
};

// --- AI Analysis Panel ---
const AIAnalysisPanel: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const analyzeChart = async () => {
        if (!selectedImage) return;
        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: selectedImage.split(',')[1] } },
                        { text: "Analise este gráfico. Identifique Suporte e Resistência. Retorne JSON: {recommendation: 'COMPRA'|'VENDA'|'AGUARDAR', confidence: number, reasoning: string, bull_force: number, bear_force: number}" }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            recommendation: { type: Type.STRING },
                            confidence: { type: Type.NUMBER },
                            reasoning: { type: Type.STRING },
                            bull_force: { type: Type.NUMBER },
                            bear_force: { type: Type.NUMBER }
                        },
                        required: ["recommendation", "confidence", "reasoning", "bull_force", "bear_force"]
                    }
                }
            });
            setResult(JSON.parse(response.text || '{}'));
        } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <h2 className="text-3xl font-black uppercase italic text-emerald-500">Sniper IA V3</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 rounded-[2.5rem] border ${theme.card} flex flex-col min-h-[400px]`}>
                    {!selectedImage ? (
                        <label className="flex-1 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-500/5 transition-all">
                            <PlusIcon className="w-12 h-12 text-slate-700 mb-2" />
                            <span className="text-[10px] font-black uppercase opacity-40">Enviar Print</span>
                            <input type="file" className="hidden" accept="image/*" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setSelectedImage(reader.result as string);
                                    reader.readAsDataURL(file);
                                }
                            }} />
                        </label>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            <img src={selectedImage} className="flex-1 object-contain bg-black rounded-3xl" />
                            <button onClick={analyzeChart} disabled={isAnalyzing} className="h-14 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20">
                                {isAnalyzing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CpuChipIcon className="w-5 h-5" />}
                                {isAnalyzing ? 'Processando...' : 'Analisar Gatilho'}
                            </button>
                        </div>
                    )}
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
                    <h3 className="text-[10px] font-black uppercase text-blue-400 mb-6">Métrica</h3>
                    {result ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-slate-800 pb-6">
                                <div><p className="text-[10px] uppercase font-black text-slate-500 mb-1">Direção</p><p className={`text-5xl font-black ${result.recommendation === 'COMPRA' ? 'text-green-500' : result.recommendation === 'VENDA' ? 'text-red-500' : 'text-yellow-500'}`}>{result.recommendation === 'COMPRA' ? 'CALL' : result.recommendation === 'VENDA' ? 'PUT' : 'WAIT'}</p></div>
                                <div className="text-right"><p className="text-[10px] uppercase font-black text-slate-500 mb-1">Assertividade</p><p className="text-3xl font-black text-white">{result.confidence}%</p></div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-green-500">Touros {result.bull_force}%</span><span className="text-red-500">Ursos {result.bear_force}%</span></div>
                                <div className="h-2 bg-slate-800 rounded-full flex overflow-hidden"><div className="bg-green-500" style={{width: `${result.bull_force}%`}} /><div className="bg-red-500" style={{width: `${result.bear_force}%`}} /></div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-sm italic text-slate-300">"{result.reasoning}"</div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-20"><CpuChipIcon className="w-16 h-16 mb-2" /><p className="text-[10px] font-black uppercase">Sniper Pronto</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
