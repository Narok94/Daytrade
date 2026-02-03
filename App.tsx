
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
        bg: isDarkMode ? 'bg-[#010409]' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-100' : 'text-slate-900',
        card: isDarkMode ? 'bg-[#0d1117]/80 border-slate-800/60 backdrop-blur-2xl' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-[#010409] border-slate-700/80 text-white placeholder-slate-600 focus:border-emerald-500/50' : 'bg-white border-slate-200 text-slate-900',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        navActive: isDarkMode ? 'text-emerald-400 bg-emerald-500/15' : 'text-emerald-600 bg-emerald-50',
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
    const totalTrades = (dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0);
    const winRate = totalTrades > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / totalTrades) * 100).toFixed(0) : '0';
    
    const goalPercentage = dailyGoalTarget > 0 ? Math.min(100, Math.max(0, (currentProfit / dailyGoalTarget) * 100)) : 0;

    const kpis = [
        { label: 'Arsenal Total', val: `${currencySymbol}${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' },
        { label: 'Lucro do Dia', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol}${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-500', glow: currentProfit >= 0 ? 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'shadow-[0_0_20px_rgba(244,63,94,0.2)]' },
        { 
            label: 'Progresso Meta', 
            val: `${goalPercentage.toFixed(0)}%`, 
            icon: TargetIcon, 
            color: 'text-cyan-400', 
            glow: 'shadow-[0_0_20px_rgba(34,211,238,0.2)]',
            sub: dailyGoalTarget > 0 ? `Alvo: ${currencySymbol}${formatMoney(dailyGoalTarget)}` : 'Sem alvo' 
        },
        { label: 'Precisão', val: `${winRate}%`, icon: TrophyIcon, color: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]' },
    ];

    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto p-4 md:p-6 justify-around animate-in fade-in zoom-in-95 duration-700 overflow-hidden">
            {/* Header Interno - Estética Terminal */}
            <div className="flex justify-between items-end mb-2 px-2">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.4em] italic mb-1">Status: Online</span>
                    <h2 className="text-sm md:text-xl font-black uppercase tracking-tight italic leading-none text-white/90">
                        Central de <span className="text-emerald-400">Inteligência</span>
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <input 
                        type="date" 
                        value={selectedDateString} 
                        onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} 
                        className={`text-[10px] md:text-[13px] font-black px-4 py-2 rounded-xl border outline-none transition-all hover:ring-2 hover:ring-emerald-500/20 ${theme.input}`} 
                    />
                </div>
            </div>

            {/* Grid de KPIs - Números Aumentados e Efeito Glow */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-4 md:p-6 rounded-3xl border ${theme.card} flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-500 group relative overflow-hidden ${kpi.glow}`}>
                        <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                            <kpi.icon className="w-12 h-12 md:w-16 md:h-16 text-white" />
                        </div>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <p className="text-[8px] md:text-[10px] uppercase font-black text-slate-500 tracking-[0.3em] leading-none">{kpi.label}</p>
                            <kpi.icon className={`w-4 h-4 md:w-5 md:h-5 ${kpi.color} opacity-80`} />
                        </div>
                        <div className="relative z-10">
                            <p className={`text-2xl md:text-4xl font-black ${kpi.color} tracking-tighter truncate leading-none drop-shadow-lg`}>{kpi.val}</p>
                            {kpi.sub && <p className="text-[7px] md:text-[9px] font-black uppercase text-slate-500 italic mt-2 tracking-widest truncate">{kpi.sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Protocolo Sniper - Visual Industrial de Elite */}
            <div className={`p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border ${theme.card} shadow-2xl max-w-2xl mx-auto w-full relative overflow-hidden flex flex-col justify-center border-emerald-500/20`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                <div className="absolute -bottom-10 -left-10 p-12 opacity-[0.03] pointer-events-none -rotate-12">
                    <TargetIcon className="w-40 h-40 md:w-64 md:h-64 text-emerald-500" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6 md:mb-10">
                        <div className="flex flex-col">
                            <h3 className="text-[10px] md:text-[14px] font-black uppercase text-emerald-400 tracking-[0.5em] italic flex items-center gap-3 leading-none">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                Comando de Operação
                            </h3>
                        </div>
                        <div className="hidden sm:flex flex-col items-end">
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Sincronização</span>
                             <div className="flex gap-1">
                                {[1,2,3].map(i => <div key={i} className="w-3 h-1 bg-emerald-500/30 rounded-full" />)}
                             </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                        <div className="space-y-2">
                            <label className="text-[8px] md:text-[12px] font-black text-slate-400 uppercase ml-2 tracking-widest opacity-90">Valor Entrada</label>
                            <input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 md:h-16 px-5 md:px-8 rounded-2xl md:rounded-3xl border text-[16px] md:text-[22px] font-black outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 ${theme.input}`} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] md:text-[12px] font-black text-slate-400 uppercase ml-2 tracking-widest opacity-90">Retorno %</label>
                            <input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-12 md:h-16 px-5 md:px-8 rounded-2xl md:rounded-3xl border text-[16px] md:text-[22px] font-black outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 ${theme.input}`} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] md:text-[12px] font-black text-slate-400 uppercase ml-2 tracking-widest opacity-90">Nº Ordens</label>
                            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-12 md:h-16 px-5 md:px-8 rounded-2xl md:rounded-3xl border text-[16px] md:text-[22px] font-black outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 ${theme.input}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 md:gap-8">
                        <button 
                            onClick={() => addRecord(parseInt(quantity), 0, parseFloat(customEntryValue), parseFloat(customPayout))} 
                            className="group py-5 md:py-8 bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-slate-950 font-black rounded-2xl md:rounded-[2.5rem] text-[12px] md:text-[18px] uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex flex-col items-center justify-center"
                        >
                            CONFIRMAR HIT
                            <span className="text-[8px] md:text-[10px] opacity-60 font-black group-hover:tracking-[0.6em] transition-all mt-1">SINAL VERDE</span>
                        </button>
                        <button 
                            onClick={() => addRecord(0, parseInt(quantity), parseFloat(customEntryValue), parseFloat(customPayout))} 
                            className="group py-5 md:py-8 bg-gradient-to-br from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 text-white font-black rounded-2xl md:rounded-[2.5rem] text-[12px] md:text-[18px] uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(244,63,94,0.3)] active:scale-95 transition-all flex flex-col items-center justify-center"
                        >
                            REGISTRAR MISS
                            <span className="text-[8px] md:text-[10px] opacity-60 font-black group-hover:tracking-[0.6em] transition-all mt-1">RECUPERAR ALVO</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Outros Painéis (Escalada, Ciclos, Missões, Relatório, HQ) ---
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
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-32 h-full overflow-y-auto custom-scrollbar">
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-wider text-emerald-400">Projeção de Arsenal</h2>
            <div className={`p-6 md:p-8 rounded-3xl border ${theme.card} grid grid-cols-1 md:grid-cols-2 gap-8 shadow-xl`}>
                 <div className="space-y-6">
                    <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Período (Dias)</label><input type="number" value={days} onChange={e => setDays(Number(e.target.value))} className={`w-full h-12 px-5 rounded-2xl border text-lg font-black ${theme.input}`} /></div>
                    <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Meta Diária %</label><input type="number" value={dailyRate} onChange={e => setDailyRate(Number(e.target.value))} className={`w-full h-12 px-5 rounded-2xl border text-lg font-black ${theme.input}`} /></div>
                 </div>
                 <div className="flex flex-col justify-center items-center p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">Poder de Fogo Final</p>
                    <p className="text-4xl md:text-5xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">{currencySymbol}{formatMoney(results[results.length-1]?.balance || 0)}</p>
                </div>
            </div>
            <div className={`overflow-hidden rounded-3xl border ${theme.border} ${theme.card} shadow-lg`}>
                <table className="w-full text-left">
                    <thead className="bg-black/60"><tr className="text-[10px] uppercase font-black tracking-widest text-slate-400"><th className="px-6 py-4">Estágio</th><th className="px-6 py-4 text-right">Saldo Previsto</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                        {results.slice(0, 100).map(r => (<tr key={r.day} className="hover:bg-white/5 transition-colors"><td className="px-6 py-3 font-black text-slate-400">Dia {r.day}</td><td className="px-6 py-3 font-black text-emerald-400 text-right text-lg">{currencySymbol}{formatMoney(r.balance)}</td></tr>))}
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
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-32 h-full overflow-y-auto custom-scrollbar">
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-wider text-amber-400">Ciclos de Ataque</h2>
            <div className={`p-6 md:p-8 rounded-3xl border ${theme.card} grid grid-cols-3 gap-4 shadow-xl`}>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Entrada Inicial</label><input type="number" value={entry} onChange={e => setEntry(Number(e.target.value))} className={`w-full h-12 px-5 rounded-2xl border text-lg font-black ${theme.input}`} /></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Retorno %</label><input type="number" value={payout} onChange={e => setPayout(Number(e.target.value))} className={`w-full h-12 px-5 rounded-2xl border text-lg font-black ${theme.input}`} /></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Níveis</label><input type="number" value={levels} onChange={e => setLevels(Number(e.target.value))} className={`w-full h-12 px-5 rounded-2xl border text-lg font-black ${theme.input}`} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {steps.map(step => (
                    <div key={step.level} className={`p-6 rounded-3xl border ${theme.card} relative shadow-xl overflow-hidden group hover:border-emerald-500/50 transition-all duration-500`}>
                        <div className="absolute top-0 right-0 p-2 bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase border-l border-b border-emerald-500/20">Aporte {step.level}</div>
                        <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Aporte Operacional</p>
                        <p className="text-2xl font-black text-white leading-none">{currencySymbol}{formatMoney(step.entry)}</p>
                        <p className="text-[11px] font-black text-emerald-400 mt-4 bg-emerald-500/10 inline-block px-3 py-1 rounded-full">Lucro: +{currencySymbol}{formatMoney(step.profit)}</p>
                    </div>
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
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-32 h-full overflow-y-auto custom-scrollbar">
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-wider text-cyan-400">Missões de Elite</h2>
            <div className={`p-6 md:p-8 ${theme.card} border ${theme.border} rounded-3xl space-y-6 shadow-2xl`}>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="OBJETIVO (EX: CARRO NOVO)" value={name} onChange={e=>setName(e.target.value)} className={`h-14 px-6 rounded-2xl border text-[12px] font-black uppercase placeholder-slate-600 tracking-widest ${theme.input}`} />
                    <input type="number" placeholder="VALOR ALVO" value={target} onChange={e=>setTarget(e.target.value)} className={`h-14 px-6 rounded-2xl border text-[12px] font-black uppercase placeholder-slate-600 tracking-widest ${theme.input}`} />
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setGoalType('monthly')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border ${goalType === 'monthly' ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg' : 'bg-black/30 border-slate-800 text-slate-500 hover:text-slate-300'}`}>Mensal</button>
                    <button onClick={() => setGoalType('daily')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border ${goalType === 'daily' ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg' : 'bg-black/30 border-slate-800 text-slate-500 hover:text-slate-300'}`}>Direta</button>
                    <button onClick={addGoal} className="flex-[1.5] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Ativar Missão</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((g: Goal) => (
                    <div key={g.id} className={`p-6 ${theme.card} border ${theme.border} rounded-3xl relative shadow-xl group hover:border-emerald-500/30 transition-all duration-500`}>
                        <button onClick={() => removeGoal(g.id)} className="absolute top-4 right-4 text-rose-500/30 group-hover:text-rose-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-[0.3em]">{g.name}</p>
                        <p className="text-3xl md:text-4xl font-black text-cyan-400 tracking-tighter drop-shadow-[0_0_10px_rgba(34,211,238,0.3)] leading-none">{currencySymbol}{formatMoney(g.targetAmount)}</p>
                        <p className="text-[9px] font-black text-slate-600 uppercase mt-4 italic tracking-widest border-t border-white/5 pt-3">{g.type === 'monthly' ? `Esforço diário sniper: ${currencySymbol}${formatMoney(g.targetAmount/22)}` : 'Meta de execução única'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RelatorioPanel: React.FC<any> = ({ isDarkMode, records, currencySymbol, deleteTrade }) => {
    const theme = useThemeClasses(isDarkMode);
    const sortedDays = useMemo(() => [...records].filter(r => r.recordType === 'day').sort((a,b) => b.id.localeCompare(a.id)), [records]);
    return (
        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-32 h-full overflow-y-auto custom-scrollbar">
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-wider text-slate-300">Registro de Incursões</h2>
            {sortedDays.map(day => (
                <div key={day.id} className={`p-6 rounded-3xl border ${theme.card} space-y-4 shadow-xl hover:border-emerald-500/20 transition-all duration-500`}>
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="flex flex-col">
                            <p className="text-[14px] font-black text-white tracking-widest uppercase">{new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">{day.winCount} ACERTOS (HITS) | {day.lossCount} FALHAS (MISSES)</p>
                        </div>
                        <p className={`text-2xl md:text-3xl font-black ${day.netProfitUSD >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]'}`}>
                            {day.netProfitUSD >= 0 ? '+' : ''}{currencySymbol}{formatMoney(day.netProfitUSD)}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{day.trades.map((t: Trade) => (
                        <div key={t.id} className="flex justify-between items-center bg-black/60 p-4 rounded-2xl border border-white/5 group hover:bg-black/80 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${t.result === 'win' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,1)]'}`} />
                                <p className="text-[10px] font-black uppercase text-white tracking-widest">{t.result === 'win' ? 'HIT' : 'MISS'}</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <p className="text-[13px] font-black text-white">{currencySymbol}{formatMoney(t.entryValue)}</p>
                                <button onClick={() => deleteTrade(t.id, day.id)} className="text-rose-500/10 group-hover:text-rose-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ))}</div>
                </div>
            ))}
        </div>
    );
};

const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onLogout, onReset }) => (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto pb-32 h-full overflow-y-auto custom-scrollbar">
        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-wider text-slate-400">Base de Operações</h2>
        <div className={`p-8 md:p-12 rounded-[3rem] border ${theme.card} space-y-10 shadow-2xl`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-4">Capital Inicial Sniper</label><input type="number" value={brokerage?.initialBalance} onChange={e => setBrokerages((prev: any) => [{...prev[0], initialBalance: Number(e.target.value)}])} className={`w-full h-16 px-6 rounded-3xl border text-xl font-black transition-all ${theme.input}`} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-4">Unidade Monetária</label><select value={brokerage?.currency} onChange={e => setBrokerages((prev: any) => [{...prev[0], currency: e.target.value}])} className={`w-full h-16 px-6 rounded-3xl border text-xl font-black transition-all ${theme.input}`}><option value="USD">DOLAR AMERICANO ($)</option><option value="BRL">REAL BRASILEIRO (R$)</option></select></div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 pt-6"><button onClick={onReset} className="w-full py-6 bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 font-black rounded-3xl text-[11px] uppercase tracking-[0.3em] border border-rose-500/20 active:scale-95 transition-all">Eliminar Todo Arsenal</button><button onClick={onLogout} className="w-full py-6 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"><LogoutIcon className="w-5 h-5" />Abortar Missão</button></div>
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
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-16 h-16 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_40px_rgba(16,185,129,0.4)]" /></div>;

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
        <div className={`flex flex-col h-screen overflow-hidden font-sans ${theme.bg} ${theme.text}`}>
            {/* Header h-14 */}
            <header className={`h-14 flex-shrink-0 flex items-center justify-between px-6 md:px-12 border-b border-white/5 backdrop-blur-3xl z-40 bg-black/50`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,1)]" />
                        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none"><span className="text-emerald-500">HRK</span> Sniper</h1>
                    </div>
                    <div className="hidden lg:flex items-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Operacional Elite</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center px-3 py-1.5 rounded-xl bg-black/40 border border-white/5">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${savingStatus === 'saving' ? 'text-blue-400 animate-pulse' : savingStatus === 'saved' ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {savingStatus === 'saving' ? 'SICRONIZANDO...' : savingStatus === 'saved' ? 'SALVO NO ARSENAL' : 'TERMINAL ATIVO'}
                        </span>
                    </div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5">{isDarkMode ? <SunIcon className="w-5 h-5 text-amber-400" /> : <MoonIcon className="w-5 h-5 text-emerald-400" />}</button>
                    <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                        <div className="text-right hidden md:block leading-none">
                            <p className="text-[10px] font-black uppercase text-white truncate max-w-[100px]">{user.username}</p>
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">Nível Especialista</p>
                        </div>
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-slate-950 font-black text-[14px] shadow-lg shadow-emerald-500/20 border border-emerald-400/30">{user.username.slice(0, 2).toUpperCase()}</div>
                    </div>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-grow overflow-hidden relative">
                <div className={`h-full flex flex-col`}>
                    {activeTab === 'dashboard' ? (
                        <div className="flex-1 overflow-hidden">
                            <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={dailyGoalTarget} />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                            {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} />}
                            {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                            {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} currencySymbol={currencySymbol} debouncedSave={debouncedSave} />}
                            {activeTab === 'relatorio' && <RelatorioPanel isDarkMode={isDarkMode} records={records} currencySymbol={currencySymbol} deleteTrade={deleteTrade} />}
                            {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onLogout={onLogout} onReset={() => { if(confirm("Resetar todo o arsenal e missões?")) { setRecords([]); setGoals([]); debouncedSave(); } }} />}
                        </div>
                    )}
                </div>
            </main>

            {/* Barra de Navegação Premium h-20/h-24 */}
            <nav className={`flex-shrink-0 h-20 md:h-24 bg-black/60 backdrop-blur-3xl border-t border-white/10 flex items-center justify-around px-4 md:px-12 z-50`}>
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`flex flex-col items-center justify-center gap-2 px-3 py-2 rounded-2xl transition-all duration-500 min-w-[65px] group ${activeTab === tab.id ? theme.navActive + ' shadow-[0_0_30px_rgba(16,185,129,0.15)] border border-emerald-500/20' : theme.navInactive}`}
                    >
                        <tab.icon className={`w-5 h-5 md:w-6 md:h-6 ${activeTab === tab.id ? 'scale-125 text-emerald-400' : 'scale-100 opacity-60 group-hover:opacity-100 group-hover:scale-110'} transition-all`} />
                        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.25em] block text-center truncate w-full ${activeTab === tab.id ? 'text-emerald-400' : 'text-slate-500'}`}>{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default App;
