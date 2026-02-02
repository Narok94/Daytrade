
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
            sub: dailyGoalTarget > 0 ? `Alvo: ${currencySymbol}${formatMoney(dailyGoalTarget)}` : 'Sem alvo' 
        },
        { label: 'Win Rate', val: `${winRate}%`, icon: TrophyIcon, color: 'text-fuchsia-400' },
    ];

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto p-2 md:p-3 justify-around animate-in fade-in duration-500 overflow-hidden">
            {/* Header Interno - Espaçamento mínimo */}
            <div className="flex justify-between items-center mb-0.5 md:mb-1">
                <h2 className="text-xs md:text-lg font-black uppercase tracking-tighter italic leading-none">Painel de <span className="text-emerald-400">Comando</span></h2>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`text-[7px] md:text-[9px] font-black px-1.5 py-0.5 rounded border outline-none ${theme.input}`} />
            </div>

            {/* Grid de KPIs - Reduzido em ~15% (padding p-1.5 md:p-2.5 e fontes menores) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-2">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-1.5 md:p-2.5 rounded-lg border ${theme.card} flex flex-col justify-between hover:border-emerald-500/30 transition-all group`}>
                        <div className="flex justify-between items-start mb-0.5">
                            <p className="text-[5.5px] md:text-[7.5px] uppercase font-black text-slate-500 tracking-widest leading-none">{kpi.label}</p>
                            <kpi.icon className={`w-2 h-2 md:w-3 md:h-3 ${kpi.color} opacity-60`} />
                        </div>
                        <div>
                            <p className={`text-[11px] md:text-base font-black ${kpi.color} tracking-tighter truncate leading-none`}>{kpi.val}</p>
                            {kpi.sub && <p className="text-[4.5px] md:text-[6.5px] font-black uppercase text-slate-600 italic opacity-70 truncate mt-0.5">{kpi.sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Protocolo de Disparo - Compactado para economizar vertical */}
            <div className={`p-3 md:p-5 rounded-[1.2rem] md:rounded-[1.8rem] border ${theme.card} shadow-2xl max-w-lg mx-auto w-full relative overflow-hidden flex flex-col justify-center`}>
                <div className="absolute -top-6 -right-6 p-10 opacity-[0.02] pointer-events-none">
                    <TargetIcon className="w-20 h-20 md:w-32 md:h-32 text-emerald-500" />
                </div>
                
                <div className="relative z-10">
                    <h3 className="text-[7px] md:text-[9px] font-black uppercase text-emerald-400/80 mb-2 md:mb-5 tracking-[0.4em] italic flex items-center gap-1.5 leading-none">
                        <div className="w-1 h-1 md:w-1.2 md:h-1.2 rounded-full bg-emerald-500 animate-pulse" />
                        Protocolo de Disparo
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-1.5 md:gap-3 mb-3 md:mb-6">
                        <div className="space-y-0.5 md:space-y-1">
                            <label className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase ml-1 tracking-widest opacity-80 leading-none">Valor</label>
                            <input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-7 md:h-11 px-2 md:px-3 rounded-md md:rounded-lg border text-[9px] md:text-[12px] font-black outline-none transition-all ${theme.input}`} />
                        </div>
                        <div className="space-y-0.5 md:space-y-1">
                            <label className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase ml-1 tracking-widest opacity-80 leading-none">Payout %</label>
                            <input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-7 md:h-11 px-2 md:px-3 rounded-md md:rounded-lg border text-[9px] md:text-[12px] font-black outline-none transition-all ${theme.input}`} />
                        </div>
                        <div className="space-y-0.5 md:space-y-1">
                            <label className="text-[6px] md:text-[8px] font-black text-slate-500 uppercase ml-1 tracking-widest opacity-80 leading-none">Qtd</label>
                            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-7 md:h-11 px-2 md:px-3 rounded-md md:rounded-lg border text-[9px] md:text-[12px] font-black outline-none transition-all ${theme.input}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <button 
                            onClick={() => addRecord(parseInt(quantity), 0, parseFloat(customEntryValue), parseFloat(customPayout))} 
                            className="py-2 md:py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-md md:rounded-lg text-[7px] md:text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                        >
                            HIT (VITÓRIA)
                        </button>
                        <button 
                            onClick={() => addRecord(0, parseInt(quantity), parseFloat(customEntryValue), parseFloat(customPayout))} 
                            className="py-2 md:py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-md md:rounded-lg text-[7px] md:text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                        >
                            MISS (DERROTA)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Outros Painéis ---
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
        <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24 h-full overflow-y-auto">
            <h2 className="text-lg font-black uppercase italic">Simulação de Escalada</h2>
            <div className={`p-4 rounded-xl border ${theme.card} grid grid-cols-1 md:grid-cols-2 gap-4 shadow-lg`}>
                 <div className="space-y-3">
                    <div><label className="text-[8px] font-black text-slate-500 uppercase">Dias</label><input type="number" value={days} onChange={e => setDays(Number(e.target.value))} className={`w-full h-10 px-3 rounded-lg border text-[12px] font-black ${theme.input}`} /></div>
                    <div><label className="text-[8px] font-black text-slate-500 uppercase">Meta %</label><input type="number" value={dailyRate} onChange={e => setDailyRate(Number(e.target.value))} className={`w-full h-10 px-3 rounded-lg border text-[12px] font-black ${theme.input}`} /></div>
                 </div>
                 <div className="flex flex-col justify-center items-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Saldo Final</p><p className="text-2xl font-black text-emerald-400 tracking-tighter">{currencySymbol}{formatMoney(results[results.length-1]?.balance || 0)}</p></div>
            </div>
            <div className={`overflow-hidden rounded-xl border ${theme.border} ${theme.card} shadow-lg`}>
                <table className="w-full text-left text-[9px] md:text-[10px]">
                    <thead className="bg-black/40"><tr><th className="px-4 py-3 font-black uppercase tracking-widest text-slate-400">Dia</th><th className="px-4 py-3 font-black uppercase tracking-widest text-slate-400">Saldo</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                        {results.slice(0, 10).map(r => (<tr key={r.day} className="hover:bg-white/5"><td className="px-4 py-3 font-black opacity-60">Dia {r.day}</td><td className="px-4 py-3 font-black text-emerald-400">{currencySymbol}{formatMoney(r.balance)}</td></tr>))}
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
        <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24 h-full overflow-y-auto">
            <h2 className="text-lg font-black uppercase italic">Calculadora de Ciclos</h2>
            <div className={`p-4 rounded-xl border ${theme.card} grid grid-cols-3 gap-3 shadow-lg`}>
                <div><label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Entrada</label><input type="number" value={entry} onChange={e => setEntry(Number(e.target.value))} className={`w-full h-10 px-3 rounded-lg border text-[12px] font-black ${theme.input}`} /></div>
                <div><label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Payout %</label><input type="number" value={payout} onChange={e => setPayout(Number(e.target.value))} className={`w-full h-10 px-3 rounded-lg border text-[12px] font-black ${theme.input}`} /></div>
                <div><label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Níveis</label><input type="number" value={levels} onChange={e => setLevels(Number(e.target.value))} className={`w-full h-10 px-3 rounded-lg border text-[12px] font-black ${theme.input}`} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {steps.map(step => (
                    <div key={step.level} className={`p-4 rounded-xl border ${theme.card} relative shadow-lg overflow-hidden`}><div className="absolute top-0 right-0 p-1.5 bg-emerald-500/10 text-emerald-400 text-[6px] font-black uppercase border-l border-b border-emerald-500/20">Lv {step.level}</div><p className="text-[8px] font-black text-slate-500 mb-1 uppercase tracking-widest">Aporte</p><p className="text-base font-black text-white">{currencySymbol}{formatMoney(step.entry)}</p><p className="text-[8px] font-black text-emerald-400 mt-2">Lucro: +{currencySymbol}{formatMoney(step.profit)}</p></div>
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
    const removeGoal = (id: string) => { setGoals((prev: Goal[]) => prev.filter(g => g.id !== id)); debouncedSave(); };

    return (
        <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24 h-full overflow-y-auto">
            <h2 className="text-lg font-black uppercase italic">Missões Estratégicas</h2>
            <div className={`p-4 ${theme.card} border ${theme.border} rounded-xl space-y-3 shadow-xl`}>
                <div className="grid grid-cols-2 gap-2"><input type="text" placeholder="ALVO" value={name} onChange={e=>setName(e.target.value)} className={`h-10 px-3 rounded-lg border text-[10px] font-black uppercase placeholder-slate-600 ${theme.input}`} /><input type="number" placeholder="VALOR" value={target} onChange={e=>setTarget(e.target.value)} className={`h-10 px-3 rounded-lg border text-[10px] font-black uppercase placeholder-slate-600 ${theme.input}`} /></div>
                <div className="flex gap-2"><button onClick={() => setGoalType('monthly')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${goalType === 'monthly' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>Mensal</button><button onClick={() => setGoalType('daily')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${goalType === 'daily' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>Direta</button><button onClick={addGoal} className="flex-[1.5] bg-emerald-500 text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-widest">Ativar Alvo</button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goals.map((g: Goal) => (
                    <div key={g.id} className={`p-4 ${theme.card} border ${theme.border} rounded-xl relative shadow-lg group hover:border-emerald-500/20 transition-all`}><button onClick={() => removeGoal(g.id)} className="absolute top-3 right-3 text-rose-500/20 group-hover:text-rose-500 transition-colors"><TrashIcon className="w-4 h-4" /></button><p className="text-[9px] font-black uppercase text-slate-500 mb-1 tracking-widest">{g.name}</p><p className="text-2xl font-black text-emerald-400 tracking-tighter">{currencySymbol}{formatMoney(g.targetAmount)}</p><p className="text-[7px] font-black text-slate-600 uppercase mt-2 italic">{g.type === 'monthly' ? `Esforço diário: ${currencySymbol}${formatMoney(g.targetAmount/22)}` : 'Meta Direta'}</p></div>
                ))}
            </div>
        </div>
    );
};

const RelatorioPanel: React.FC<any> = ({ isDarkMode, records, currencySymbol, deleteTrade }) => {
    const theme = useThemeClasses(isDarkMode);
    const sortedDays = useMemo(() => [...records].filter(r => r.recordType === 'day').sort((a,b) => b.id.localeCompare(a.id)), [records]);
    return (
        <div className="p-4 space-y-4 max-w-6xl mx-auto pb-24 h-full overflow-y-auto">
            <h2 className="text-lg font-black uppercase italic">Histórico de Operações</h2>
            {sortedDays.map(day => (
                <div key={day.id} className={`p-4 rounded-xl border ${theme.card} space-y-3 shadow-lg`}>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2"><div><p className="text-[10px] font-black text-white">{new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p><p className="text-[7px] font-black text-slate-500 uppercase">{day.winCount} WIN | {day.lossCount} LOSS</p></div><p className={`text-base font-black ${day.netProfitUSD >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{day.netProfitUSD >= 0 ? '+' : ''}{currencySymbol}{formatMoney(day.netProfitUSD)}</p></div>
                    <div className="space-y-1.5">{day.trades.map((t: Trade) => (
                        <div key={t.id} className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5 group hover:bg-black/30 transition-all"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${t.result === 'win' ? 'bg-emerald-500' : 'bg-rose-500'}`} /><p className="text-[8px] font-black uppercase text-white tracking-widest">{t.result === 'win' ? 'HIT' : 'MISS'}</p></div><div className="flex items-center gap-4"><p className="text-[10px] font-black text-white">{currencySymbol}{formatMoney(t.entryValue)}</p><button onClick={() => deleteTrade(t.id, day.id)} className="text-rose-500/20 group-hover:text-rose-500 transition-colors"><TrashIcon className="w-4 h-4" /></button></div></div>
                    ))}</div>
                </div>
            ))}
        </div>
    );
};

const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onLogout, onReset }) => (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24 h-full overflow-y-auto">
        <h2 className="text-lg font-black uppercase italic">Configurações da HQ</h2>
        <div className={`p-6 rounded-2xl border ${theme.card} space-y-8 shadow-2xl`}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Capital Inicial</label><input type="number" value={brokerage?.initialBalance} onChange={e => setBrokerages((prev: any) => [{...prev[0], initialBalance: Number(e.target.value)}])} className={`w-full h-12 px-4 rounded-xl border text-[11px] font-black ${theme.input}`} /></div>
                <div className="space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Moeda Padrão</label><select value={brokerage?.currency} onChange={e => setBrokerages((prev: any) => [{...prev[0], currency: e.target.value}])} className={`w-full h-12 px-4 rounded-xl border text-[11px] font-black ${theme.input}`}><option value="USD">DÓLAR ($)</option><option value="BRL">REAL (R$)</option></select></div>
            </div>
            <div className="flex flex-col md:flex-row gap-3"><button onClick={onReset} className="w-full py-4 bg-rose-500/10 text-rose-500 font-black rounded-xl text-[9px] uppercase tracking-widest border border-rose-500/20 active:scale-95 transition-all">Resetar Todo o Arsenal</button><button onClick={onLogout} className="w-full py-4 bg-slate-800 text-white font-black rounded-xl text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><LogoutIcon className="w-4 h-4" />Sair do Sistema</button></div>
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
        if(!confirm("Deletar operação permanentemente?")) return;
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
            {/* Header Ultra Compacto h-12 */}
            <header className={`h-12 flex-shrink-0 flex items-center justify-between px-4 md:px-10 border-b border-white/5 backdrop-blur-3xl z-40 bg-black/20`}>
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-black italic tracking-tighter uppercase leading-none"><span className="text-emerald-500">HRK</span> Sniper</h1>
                    <div className="hidden sm:block w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="hidden sm:block text-[6px] font-black uppercase tracking-widest text-slate-500 opacity-60">Status: Operacional</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-all">{isDarkMode ? <SunIcon className="w-3 h-3 text-amber-400" /> : <MoonIcon className="w-3 h-3 text-emerald-400" />}</button>
                    <div className="flex items-center gap-2">
                        <div className="text-right hidden sm:block leading-none">
                            <p className="text-[7px] font-black uppercase text-white truncate max-w-[80px]">{user.username}</p>
                        </div>
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-[8px] md:text-[10px] shadow-lg shadow-emerald-500/10">{user.username.slice(0, 2).toUpperCase()}</div>
                    </div>
                </div>
            </header>

            {/* Conteúdo Principal - h-full no Dashboard forçado para evitar overflow */}
            <main className="flex-grow overflow-hidden relative">
                <div className={`h-full flex flex-col`}>
                    {activeTab === 'dashboard' ? (
                        <div className="flex-1 overflow-hidden">
                            <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={dailyGoalTarget} />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                            {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} />}
                            {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                            {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} currencySymbol={currencySymbol} debouncedSave={debouncedSave} />}
                            {activeTab === 'relatorio' && <RelatorioPanel isDarkMode={isDarkMode} records={records} currencySymbol={currencySymbol} deleteTrade={deleteTrade} />}
                            {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onLogout={onLogout} onReset={() => { if(confirm("Resetar todo o arsenal e missões?")) { setRecords([]); setGoals([]); debouncedSave(); } }} />}
                        </div>
                    )}
                </div>
            </main>

            {/* Rodapé Compacto h-14 */}
            <nav className={`flex-shrink-0 h-14 md:h-16 bg-[#010409] border-t border-white/10 flex items-center justify-around px-1 md:px-6 z-50`}>
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`flex flex-col items-center justify-center gap-0.5 px-0.5 py-1 rounded-xl transition-all duration-300 min-w-[38px] ${activeTab === tab.id ? theme.navActive : theme.navInactive}`}
                    >
                        <tab.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === tab.id ? 'scale-110' : 'scale-95'} transition-transform`} />
                        <span className="text-[5px] md:text-[7px] font-black uppercase tracking-tight block text-center truncate w-full">{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default App;
