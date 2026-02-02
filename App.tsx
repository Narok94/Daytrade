
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, 
    TrophyIcon, 
    ChartBarIcon, DocumentTextIcon,
    TrashIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-[#020617]' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-100' : 'text-slate-900',
        card: isDarkMode ? 'bg-[#0f172a]/80 border-slate-800/60 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-[#020617] border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500/50' : 'bg-white border-slate-200 text-slate-900',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        navActive: isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50',
        navInactive: isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600',
    }), [isDarkMode]);
};

// --- Dashboard Panel ---
const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(0) : '0';
    
    const kpis = [
        { label: 'Arsenal', val: `${currencySymbol}${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-400' },
        { label: 'Lucro Hoje', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol}${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-500' },
        { label: 'Meta Diária', val: `${((currentProfit / (dailyGoalTarget || 1)) * 100).toFixed(0)}%`, icon: TargetIcon, color: 'text-blue-400' },
        { label: 'Win Rate', val: `${winRate}%`, icon: TrophyIcon, color: 'text-fuchsia-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black uppercase tracking-tighter italic">Painel de <span className="text-emerald-400">Comando</span></h2>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`text-[10px] font-black px-4 py-2 rounded-xl border outline-none transition-all ${theme.input}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-5 rounded-2xl border ${theme.card} flex flex-col justify-between hover:border-emerald-500/30 transition-all`}>
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{kpi.label}</p>
                            <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
                        </div>
                        <p className={`text-xl font-black ${kpi.color} tracking-tighter`}>{kpi.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl border ${theme.card} shadow-xl`}>
                    <h3 className="text-[10px] font-black uppercase text-emerald-400/80 mb-6 tracking-[0.2em] italic">Registro de Operação</h3>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Valor</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[12px] font-black outline-none ${theme.input}`} /></div>
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[12px] font-black outline-none ${theme.input}`} /></div>
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Ciclos</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[12px] font-black outline-none ${theme.input}`} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => addRecord(parseInt(quantity), 0, parseFloat(customEntryValue), parseFloat(customPayout))} className="py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">HIT (VITÓRIA)</button>
                        <button onClick={() => addRecord(0, parseInt(quantity), parseFloat(customEntryValue), parseFloat(customPayout))} className="py-4 bg-rose-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-rose-600/20 active:scale-95 transition-all">MISS (DERROTA)</button>
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border ${theme.card} flex flex-col h-[320px] shadow-xl`}>
                    <h3 className="text-[10px] font-black uppercase text-blue-400/80 mb-6 tracking-[0.2em] italic">Log de Operações</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             [...dailyRecordForSelectedDay.trades].reverse().map((trade) => (
                                <div key={trade.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 group hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-1 h-8 rounded-full ${trade.result === 'win' ? 'bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`} />
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            <p className="text-[11px] font-black uppercase italic text-white">{trade.result === 'win' ? 'Sniper Hit' : 'Sniper Miss'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[13px] font-black ${trade.result === 'win' ? 'text-emerald-400' : 'text-rose-500'}`}>{trade.result === 'win' ? '+' : '-'}{currencySymbol}{formatMoney(trade.entryValue * (trade.result === 'win' ? (trade.payoutPercentage/100) : 1))}</span>
                                        <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="p-2 text-rose-500/20 hover:text-rose-500 transition-all"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                             ))
                        ) : <div className="text-center py-20 opacity-10 text-[10px] font-black uppercase tracking-[0.5em] italic">Vazio Tático</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Escalada Panel (Compound Interest) ---
const CompoundInterestPanel = ({ isDarkMode, activeBrokerage }: any) => {
    const theme = useThemeClasses(isDarkMode);
    const tableData = useMemo(() => {
        let running = activeBrokerage.initialBalance;
        const res = [];
        for(let i=1; i<=30; i++) {
            const entry = running * 0.10; 
            const profit = (entry * (activeBrokerage.payoutPercentage/100)); 
            res.push({ day: i, initial: running, entry, profit, final: running + profit });
            running += profit;
        }
        return res;
    }, [activeBrokerage]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase tracking-tighter italic">Projeção <span className="text-emerald-400">Exponencial</span></h2>
            <div className={`p-4 border ${theme.border} ${theme.card} rounded-3xl overflow-hidden shadow-2xl`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center text-[10px] font-black uppercase tracking-tight">
                        <thead className="bg-black/20 text-slate-500 text-[8px]"><tr className="border-b border-white/5"><th className="p-5">Meta #</th><th>Arsenal</th><th>Disparo</th><th>Lucro Alvo</th><th>Total HQ</th></tr></thead>
                        <tbody>
                            {tableData.map(d => (
                                <tr key={d.day} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                    <td className="p-4 opacity-40 italic">DIA {d.day}</td>
                                    <td className="text-white">R$ {formatMoney(d.initial)}</td>
                                    <td className="text-emerald-500/60">R$ {formatMoney(d.entry)}</td>
                                    <td className="text-emerald-400 font-bold">+R$ {formatMoney(d.profit)}</td>
                                    <td className="text-emerald-400 font-black">R$ {formatMoney(d.final)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Soros Calculator Panel ---
const SorosCalculatorPanel = ({ theme, activeBrokerage }: any) => {
    const [entry, setEntry] = useState(10);
    const levels = useMemo(() => {
        let current = entry;
        const res = [];
        for(let i=1; i<=6; i++) {
            const profit = current * (activeBrokerage.payoutPercentage/100);
            res.push({ lvl: i, entry: current, profit, total: current + profit });
            current += profit;
        }
        return res;
    }, [entry, activeBrokerage]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto animate-in zoom-in-95">
            <h2 className="text-xl font-black uppercase italic">Protocolo <span className="text-emerald-400">Soros</span></h2>
            <div className={`p-8 border ${theme.border} ${theme.card} rounded-3xl space-y-6 shadow-2xl`}>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Base do Ciclo</label><input type="number" value={entry} onChange={e=>setEntry(Number(e.target.value))} className={`w-full h-14 px-6 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                <div className="space-y-3">
                    {levels.map(l => (
                        <div key={l.lvl} className="flex justify-between items-center p-5 bg-black/30 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all">
                            <span className="text-[11px] font-black text-emerald-500 italic tracking-widest">NÍVEL {l.lvl}</span>
                            <span className="text-[14px] font-bold text-white">R$ {formatMoney(l.entry)} <span className="text-slate-600 mx-3">➔</span> <span className="text-emerald-400 font-black">R$ {formatMoney(l.total)}</span></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel = ({ theme, goals, setGoals }: any) => {
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');

    const addGoal = () => {
        if(!name || !target) return;
        setGoals((prev:any) => [...prev, { id: crypto.randomUUID(), name, targetAmount: parseFloat(target), createdAt: Date.now() }]);
        setName(''); setTarget('');
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase italic">Gestão de <span className="text-emerald-400">Objetivos</span></h2>
            <div className={`p-6 ${theme.card} border ${theme.border} rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xl`}>
                <input type="text" placeholder="OBJETIVO" value={name} onChange={e=>setName(e.target.value)} className={`h-14 px-6 rounded-2xl border text-[10px] font-black uppercase ${theme.input}`} />
                <input type="number" placeholder="VALOR ALVO" value={target} onChange={e=>setTarget(e.target.value)} className={`h-14 px-6 rounded-2xl border text-[10px] font-black uppercase ${theme.input}`} />
                <button onClick={addGoal} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg transition-all">Lançar Missão</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.length > 0 ? goals.map((g:any) => (
                    <div key={g.id} className={`p-8 ${theme.card} border ${theme.border} rounded-3xl relative group hover:border-emerald-500/30 transition-all shadow-xl`}>
                         <button onClick={() => setGoals((prev:any)=>prev.filter((i:any)=>i.id !== g.id))} className="absolute top-6 right-6 text-rose-500/20 hover:text-rose-500 transition-all"><TrashIcon className="w-5 h-5" /></button>
                         <h4 className="text-[10px] font-black uppercase italic text-slate-500 mb-3 tracking-widest">{g.name}</h4>
                         <p className="text-3xl font-black text-emerald-400 tracking-tighter">R$ {formatMoney(g.targetAmount)}</p>
                    </div>
                )) : <div className="col-span-2 py-32 text-center opacity-10 text-[11px] font-black uppercase tracking-[0.5em] italic">Nenhuma Missão Estratégica</div>}
            </div>
        </div>
    );
};

// --- Report Panel ---
const ReportPanel = ({ isDarkMode, records }: any) => {
    const theme = useThemeClasses(isDarkMode);
    const stats = useMemo(() => {
        const allTrades = records.flatMap((r: any) => r.trades || []);
        const total = allTrades.length;
        const wins = allTrades.filter((t: any) => t.result === 'win').length;
        const losses = total - wins;
        const profit = records.reduce((acc: number, r: any) => acc + (r.netProfitUSD || 0), 0);
        return { total, wins, losses, profit, wr: total > 0 ? ((wins / total) * 100).toFixed(1) : '0' };
    }, [records]);

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase italic">Arquivo de <span className="text-emerald-400">Inteligência</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className={`p-8 ${theme.card} border ${theme.border} rounded-3xl text-center shadow-xl hover:border-emerald-500/20 transition-all`}><p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Operações</p><p className="text-3xl font-black text-white">{stats.total}</p></div>
                <div className={`p-8 ${theme.card} border ${theme.border} rounded-3xl text-center shadow-xl hover:border-emerald-500/20 transition-all`}><p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Vitórias</p><p className="text-3xl font-black text-emerald-400">{stats.wins}</p></div>
                <div className={`p-8 ${theme.card} border ${theme.border} rounded-3xl text-center shadow-xl hover:border-emerald-500/20 transition-all`}><p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Precisão</p><p className="text-3xl font-black text-blue-400">{stats.wr}%</p></div>
                <div className={`p-8 ${theme.card} border ${theme.border} rounded-3xl text-center shadow-xl hover:border-emerald-500/20 transition-all`}><p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Profit Global</p><p className="text-3xl font-black text-emerald-400">R$ {formatMoney(stats.profit)}</p></div>
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel = ({ theme, brokerage, setBrokerages, onReset, onLogout }: any) => {
    const update = (field: keyof Brokerage, val: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: val } : b));
    };
    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
            <h2 className="text-xl font-black uppercase italic">Configuração <span className="text-emerald-400">HQ</span></h2>
            <div className={`p-10 border ${theme.border} ${theme.card} rounded-[2rem] space-y-8 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identidade</label><input type="text" value={brokerage.name} onChange={e => update('name', e.target.value)} className={`w-full h-14 px-6 rounded-2xl border font-bold text-sm ${theme.input}`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Moeda HQ</label><select value={brokerage.currency} onChange={e => update('currency', e.target.value as any)} className={`w-full h-14 px-6 rounded-2xl border font-bold text-sm ${theme.input}`}><option value="USD">Dólar ($)</option><option value="BRL">Real (R$)</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Arsenal Inicial</label><input type="number" value={brokerage.initialBalance} onChange={e => update('initialBalance', parseFloat(e.target.value))} className={`w-full h-14 px-6 rounded-2xl border font-bold text-sm ${theme.input}`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Payout Padrão %</label><input type="number" value={brokerage.payoutPercentage} onChange={e => update('payoutPercentage', parseInt(e.target.value))} className={`w-full h-14 px-6 rounded-2xl border font-bold text-sm ${theme.input}`} /></div>
                </div>
                <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={onReset} className="py-5 bg-rose-500/5 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all">Protocolo Reset Geral</button>
                    <button onClick={onLogout} className="py-5 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3"><LogoutIcon className="w-5 h-5" />Encerrar Sessão</button>
                </div>
            </div>
        </div>
    );
};

// --- App Root Logic ---
const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

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
        return [...allRecords].sort((a, b) => a.id.localeCompare(b.id)).map(r => {
            if (r.recordType !== 'day') return r;
            const daily = r as DailyRecord;
            const netProfitUSD = daily.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
            const endBalanceUSD = runningBalance + netProfitUSD;
            const updated = { ...daily, startBalanceUSD: runningBalance, winCount: daily.trades.filter(t => t.result === 'win').length, lossCount: daily.trades.filter(t => t.result === 'loss').length, netProfitUSD, endBalanceUSD };
            runningBalance = endBalanceUSD; return updated;
        });
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Alpha Sniper HQ', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
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

    const debouncedSave = useDebouncedCallback(saveData, 2000);

    const addRecord = (win: number, loss: number, customEntry?: number, customPayout?: number) => {
        setRecords(prev => {
            const dateKey = selectedDate.toISOString().split('T')[0];
            const sortedPrevious = prev.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
            const startBal = sortedPrevious.length > 0 ? sortedPrevious[0].endBalanceUSD : (brokerages[0]?.initialBalance || 0);
            const dailyRecordForSelectedDay = prev.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day');
            const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;
            
            const entryValue = customEntry !== undefined ? customEntry : (brokerages[0].entryValue);
            const payout = customPayout !== undefined ? customPayout : brokerages[0].payoutPercentage;
            
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            const existingIdx = prev.findIndex(r => r.id === dateKey && r.recordType === 'day');
            let updatedRecords = [...prev];
            if (existingIdx >= 0) { const rec = updatedRecords[existingIdx] as DailyRecord; updatedRecords[existingIdx] = { ...rec, trades: [...rec.trades, ...newTrades] }; }
            else { updatedRecords.push({ recordType: 'day', brokerageId: brokerages[0].id, id: dateKey, date: dateKey, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 }); }
            const recalibrated = recalibrateHistory(updatedRecords, brokerages[0].initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        if(!confirm("Deseja deletar este registro tático?")) return;
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, brokerages[0].initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.3)]" /></div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    const tabs = [
        { id: 'dashboard', label: 'Painel', icon: LayoutGridIcon },
        { id: 'compound', label: 'Escalada', icon: ChartBarIcon },
        { id: 'soros', label: 'Ciclos', icon: CalculatorIcon },
        { id: 'goals', label: 'Missões', icon: TargetIcon },
        { id: 'report', label: 'Arquivo', icon: DocumentTextIcon },
        { id: 'settings', label: 'HQ', icon: SettingsIcon }
    ];

    return (
        <div className={`flex flex-col h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {/* Header Fixo */}
            <header className={`h-20 flex items-center justify-between px-6 md:px-12 border-b border-white/5 backdrop-blur-3xl z-40`}>
                <div className="flex items-center gap-5">
                    <h1 className="text-xl font-black italic tracking-tighter uppercase"><span className="text-emerald-500">HRK</span> Sniper</h1>
                    <div className="hidden sm:flex items-center gap-3 pl-5 border-l border-white/5">
                        <div className={`w-2 h-2 rounded-full ${savingStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Status: Arsenal Seguro</span>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">{isDarkMode ? <SunIcon className="w-5 h-5 text-amber-400" /> : <MoonIcon className="w-5 h-5 text-emerald-400" />}</button>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black uppercase text-white">{user.username}</p>
                            <p className="text-[8px] font-black uppercase text-emerald-500">Sniper Elite</p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20">{user.username.slice(0, 2).toUpperCase()}</div>
                    </div>
                </div>
            </header>

            {/* Conteúdo Principal com Scroll */}
            <main className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-28">
                {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={100} />}
                {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} />}
                {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} />}
                {activeTab === 'report' && <ReportPanel isDarkMode={isDarkMode} records={records} />}
                {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onLogout={onLogout} onReset={() => { if(confirm("Deseja resetar todos os dados?")) { setRecords([]); debouncedSave(); } }} />}
            </main>

            {/* Bottom Navigation Horizontal */}
            <nav className={`fixed bottom-0 left-0 right-0 h-20 md:h-24 bg-[#020617]/90 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2 md:px-8 z-50`}>
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`flex flex-col items-center justify-center gap-1.5 px-3 py-2 rounded-2xl transition-all duration-300 min-w-[60px] ${activeTab === tab.id ? theme.navActive : theme.navInactive}`}
                    >
                        <tab.icon className={`w-5 h-5 md:w-6 md:h-6 transition-transform ${activeTab === tab.id ? 'scale-110' : 'scale-100'}`} />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest hidden sm:block">{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default App;
