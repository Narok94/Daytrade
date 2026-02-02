
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
    TrashIcon, ChevronDownIcon, ChevronUpIcon
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
    
    const goalPercentage = dailyGoalTarget > 0 ? Math.max(0, (currentProfit / dailyGoalTarget) * 100) : 0;

    const kpis = [
        { label: 'Arsenal', val: `${currencySymbol}${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-400' },
        { label: 'Lucro Hoje', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol}${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-500' },
        { 
            label: 'Meta Diária', 
            val: dailyGoalTarget > 0 ? `${goalPercentage.toFixed(0)}%` : '--', 
            icon: TargetIcon, 
            color: 'text-blue-400', 
            sub: dailyGoalTarget > 0 ? `Alvo: ${currencySymbol}${formatMoney(dailyGoalTarget)}` : 'Sem alvo tático' 
        },
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
                    <div key={i} className={`p-4 md:p-5 rounded-2xl border ${theme.card} flex flex-col justify-between hover:border-emerald-500/30 transition-all group h-full`}>
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{kpi.label}</p>
                            <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60 group-hover:scale-110 transition-transform`} />
                        </div>
                        <div>
                            <p className={`text-lg md:text-xl font-black ${kpi.color} tracking-tighter truncate`}>{kpi.val}</p>
                            {kpi.sub && <p className="text-[8px] font-black uppercase text-slate-600 mt-1 italic opacity-70 line-clamp-1">{kpi.sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            <div className={`p-6 md:p-8 rounded-[2rem] border ${theme.card} shadow-2xl max-w-2xl mx-auto w-full relative overflow-hidden mb-8`}>
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <TargetIcon className="w-32 h-32 text-emerald-500" />
                </div>
                
                <h3 className="text-[10px] font-black uppercase text-emerald-400/80 mb-6 tracking-[0.3em] italic flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Protocolo de Disparo
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1 tracking-widest">Valor</label>
                        <input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[13px] font-black outline-none transition-all ${theme.input}`} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1 tracking-widest">Payout %</label>
                        <input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[13px] font-black outline-none transition-all ${theme.input}`} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1 tracking-widest">Qtd</label>
                        <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[13px] font-black outline-none transition-all ${theme.input}`} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => addRecord(parseInt(quantity), 0, parseFloat(customEntryValue), parseFloat(customPayout))} 
                        className="group relative py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                        HIT (VITÓRIA)
                    </button>
                    <button 
                        onClick={() => addRecord(0, parseInt(quantity), parseFloat(customEntryValue), parseFloat(customPayout))} 
                        className="group relative py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                    >
                        MISS (DERROTA)
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Other Panels (Re-declared for consistency) ---
const CompoundInterestPanel: React.FC<any> = ({ isDarkMode, activeBrokerage }) => {
    const theme = useThemeClasses(isDarkMode);
    const [days, setDays] = useState(30);
    const [dailyRate, setDailyRate] = useState(3);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';

    const results = useMemo(() => {
        let current = activeBrokerage.initialBalance;
        const list = [];
        for (let i = 1; i <= days; i++) {
            const profit = current * (dailyRate / 100);
            current += profit;
            list.push({ day: i, balance: current });
        }
        return list;
    }, [activeBrokerage.initialBalance, days, dailyRate]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase italic">Simulação de <span className="text-emerald-400">Escalada</span></h2>
            <div className={`p-6 rounded-2xl border ${theme.card} grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl`}>
                 <div className="space-y-4">
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dias</label>
                        <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} className={`w-full h-12 px-4 rounded-xl border text-[12px] font-black ${theme.input}`} />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Meta %</label>
                        <input type="number" value={dailyRate} onChange={e => setDailyRate(Number(e.target.value))} className={`w-full h-12 px-4 rounded-xl border text-[12px] font-black ${theme.input}`} />
                    </div>
                 </div>
                 <div className="flex flex-col justify-center items-center p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Projeção</p>
                    <p className="text-3xl font-black text-emerald-400 tracking-tighter">{currencySymbol}{formatMoney(results[results.length-1]?.balance || 0)}</p>
                 </div>
            </div>
            <div className={`overflow-hidden rounded-2xl border ${theme.border} ${theme.card} shadow-xl`}>
                <table className="w-full text-left text-[10px]">
                    <thead className="bg-black/40">
                        <tr><th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400">Meta #</th><th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400">Arsenal Projetado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {results.slice(0, 15).map(r => (
                            <tr key={r.day} className="hover:bg-white/5 transition-colors"><td className="px-6 py-4 font-black italic opacity-60">Dia {r.day}</td><td className="px-6 py-4 font-black text-emerald-400">{currencySymbol}{formatMoney(r.balance)}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SorosCalculatorPanel: React.FC<any> = ({ theme, activeBrokerage }) => {
    const [entry, setEntry] = useState(10);
    const [payout, setPayout] = useState(80);
    const [levels, setLevels] = useState(4);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';

    const steps = useMemo(() => {
        let currentEntry = entry;
        const list = [];
        for (let i = 1; i <= levels; i++) {
            const profit = currentEntry * (payout / 100);
            list.push({ level: i, entry: currentEntry, profit });
            currentEntry += profit;
        }
        return list;
    }, [entry, payout, levels]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase italic">Calculadora <span className="text-emerald-400">Ciclos</span></h2>
            <div className={`p-6 rounded-2xl border ${theme.card} grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xl`}>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Entrada</label><input type="number" value={entry} onChange={e => setEntry(Number(e.target.value))} className={`w-full h-12 px-4 rounded-xl border text-[12px] font-black ${theme.input}`} /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Payout %</label><input type="number" value={payout} onChange={e => setPayout(Number(e.target.value))} className={`w-full h-12 px-4 rounded-xl border text-[12px] font-black ${theme.input}`} /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Níveis</label><input type="number" value={levels} onChange={e => setLevels(Number(e.target.value))} className={`w-full h-12 px-4 rounded-xl border text-[12px] font-black ${theme.input}`} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {steps.map(step => (
                    <div key={step.level} className={`p-6 rounded-2xl border ${theme.card} relative overflow-hidden group shadow-lg`}><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Entrada Lvl {step.level}</p><p className="text-lg font-black text-white">{currencySymbol}{formatMoney(step.entry)}</p><p className="text-[9px] font-black text-emerald-400 uppercase mt-2">Lucro: +{currencySymbol}{formatMoney(step.profit)}</p></div>
                ))}
            </div>
        </div>
    );
};

const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, currencySymbol, debouncedSave }) => {
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [goalType, setGoalType] = useState<'daily' | 'monthly'>('monthly');

    const addGoal = () => {
        if(!name || !target) return;
        const newGoal: Goal = { id: crypto.randomUUID(), name, type: goalType, targetAmount: parseFloat(target), createdAt: Date.now() };
        setGoals((prev: Goal[]) => [...prev, newGoal]);
        setName(''); setTarget(''); debouncedSave();
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase italic">Missões <span className="text-emerald-400">Estratégicas</span></h2>
            <div className={`p-6 ${theme.card} border ${theme.border} rounded-2xl space-y-4 shadow-xl`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input type="text" placeholder="ALVO" value={name} onChange={e=>setName(e.target.value)} className={`h-12 px-4 rounded-xl border text-[10px] font-black ${theme.input}`} /><input type="number" placeholder="VALOR (R$)" value={target} onChange={e=>setTarget(e.target.value)} className={`h-12 px-4 rounded-xl border text-[10px] font-black ${theme.input}`} /></div>
                <div className="flex gap-4"><button onClick={() => setGoalType('monthly')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase ${goalType === 'monthly' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>Mensal</button><button onClick={() => setGoalType('daily')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase ${goalType === 'daily' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>Diário</button><button onClick={addGoal} className="flex-[2] bg-emerald-500 text-slate-950 font-black rounded-xl text-[10px] uppercase">Salvar Alvo</button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((g: Goal) => (
                    <div key={g.id} className={`p-6 ${theme.card} border ${theme.border} rounded-2xl relative shadow-xl`}><h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">{g.name}</h4><p className="text-2xl font-black text-emerald-400">{currencySymbol}{formatMoney(g.targetAmount)}</p><p className="text-[8px] font-black text-slate-700 uppercase mt-2">{g.type === 'monthly' ? `Diário: ${currencySymbol}${formatMoney(g.targetAmount/22)}` : 'Direto'}</p></div>
                ))}
            </div>
        </div>
    );
};

const RelatorioPanel: React.FC<any> = ({ isDarkMode, records, currencySymbol, deleteTrade }) => {
    const theme = useThemeClasses(isDarkMode);
    const sortedDays = useMemo(() => [...records].filter(r => r.recordType === 'day').sort((a,b) => b.id.localeCompare(a.id)), [records]);
    return (
        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase italic">Histórico <span className="text-emerald-400">Sniper</span></h2>
            {sortedDays.map(day => (
                <div key={day.id} className={`p-6 rounded-[2rem] border ${theme.card} space-y-4 shadow-xl`}>
                    <div className="flex justify-between items-center border-b border-white/5 pb-4"><div><p className="text-[12px] font-black text-white">{day.date}</p><p className="text-[8px] font-black text-slate-500 uppercase">WIN {day.winCount} | LOSS {day.lossCount}</p></div><p className={`text-lg font-black ${day.netProfitUSD >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{currencySymbol}{formatMoney(day.netProfitUSD)}</p></div>
                    <div className="space-y-2">{day.trades.map((t: Trade) => (
                        <div key={t.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5"><div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${t.result === 'win' ? 'bg-emerald-500' : 'bg-rose-500'}`} /><p className="text-[9px] font-black uppercase text-white">{t.result === 'win' ? 'HIT' : 'MISS'}</p></div><div className="flex items-center gap-4"><p className="text-[10px] font-black">{currencySymbol}{formatMoney(t.entryValue)}</p><button onClick={() => deleteTrade(t.id, day.id)} className="text-rose-500/30 hover:text-rose-500"><TrashIcon className="w-4 h-4" /></button></div></div>
                    ))}</div>
                </div>
            ))}
        </div>
    );
};

const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onLogout, onReset }) => (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto animate-in fade-in">
        <h2 className="text-xl font-black uppercase italic">Configuração <span className="text-emerald-400">HQ</span></h2>
        <div className={`p-8 rounded-[2.5rem] border ${theme.card} space-y-8 shadow-2xl`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Arsenal Inicial</label><input type="number" value={brokerage?.initialBalance} onChange={e => setBrokerages((prev: any) => [{...prev[0], initialBalance: Number(e.target.value)}])} className={`w-full h-14 px-6 rounded-2xl border text-[11px] font-black ${theme.input}`} /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Moeda</label><select value={brokerage?.currency} onChange={e => setBrokerages((prev: any) => [{...prev[0], currency: e.target.value}])} className={`w-full h-14 px-6 rounded-2xl border text-[11px] font-black ${theme.input}`}><option value="USD">DÓLAR ($)</option><option value="BRL">REAL (R$)</option></select></div>
            </div>
            <div className="flex gap-4 pt-4"><button onClick={onReset} className="flex-1 py-4 bg-rose-500/10 text-rose-500 font-black rounded-xl text-[9px] uppercase border border-rose-500/20">Reset Geral</button><button onClick={onLogout} className="flex-1 py-4 bg-slate-800 text-white font-black rounded-xl text-[9px] uppercase flex items-center justify-center gap-2"><LogoutIcon className="w-4 h-4" />Sair</button></div>
        </div>
    </div>
);

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
        { id: 'relatorio', label: 'Relatório', icon: DocumentTextIcon },
        { id: 'settings', label: 'HQ', icon: SettingsIcon }
    ];

    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const monthlyGoal = goals.find(g => g.type === 'monthly');
    const directDailyGoal = goals.find(g => g.type === 'daily');
    const dailyGoalTarget = monthlyGoal ? (monthlyGoal.targetAmount / 22) : (directDailyGoal?.targetAmount || 0);

    return (
        <div className={`flex flex-col h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {/* Header Fixo */}
            <header className={`h-20 flex-shrink-0 flex items-center justify-between px-6 md:px-12 border-b border-white/5 backdrop-blur-3xl z-40`}>
                <div className="flex items-center gap-5">
                    <h1 className="text-xl font-black italic tracking-tighter uppercase"><span className="text-emerald-500">HRK</span> Sniper</h1>
                    <div className="hidden sm:flex items-center gap-3 pl-5 border-l border-white/5">
                        <div className={`w-2 h-2 rounded-full ${savingStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Arsenal Seguro</span>
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

            {/* Conteúdo Principal com scroll-padding e ajuste de flexbox */}
            <main className="flex-grow overflow-y-auto custom-scrollbar relative">
                <div className="pb-32 md:pb-40">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={dailyGoalTarget} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} currencySymbol={currencySymbol} debouncedSave={debouncedSave} />}
                    {activeTab === 'relatorio' && <RelatorioPanel isDarkMode={isDarkMode} records={records} currencySymbol={currencySymbol} deleteTrade={deleteTrade} />}
                    {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onLogout={onLogout} onReset={() => { if(confirm("Deseja resetar todos os dados?")) { setRecords([]); setGoals([]); debouncedSave(); } }} />}
                </div>
            </main>

            {/* Bottom Navigation com fundo sólido garantido */}
            <nav className={`flex-shrink-0 h-20 md:h-24 bg-[#020617] border-t border-white/5 flex items-center justify-around px-2 md:px-8 z-50`}>
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-2xl transition-all duration-300 min-w-[50px] ${activeTab === tab.id ? theme.navActive : theme.navInactive}`}
                    >
                        <tab.icon className={`w-5 h-5 md:w-6 md:h-6 transition-transform ${activeTab === tab.id ? 'scale-110' : 'scale-100'}`} />
                        <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest block text-center truncate w-full">{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default App;
