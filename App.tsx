import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- Dashboard Panel ---
const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const handleQuickAdd = (type: 'win' | 'loss') => {
         const entryValue = parseFloat(customEntryValue) || activeBrokerage.entryValue || 0;
         const payout = parseFloat(customPayout) || activeBrokerage.payoutPercentage || 0;
         const qty = parseInt(quantity) || 1;
         if (type === 'win') addRecord(qty, 0, entryValue, payout);
         else addRecord(0, qty, entryValue, payout);
         setQuantity('1');
    };

    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) : '0.0';
    
    const dailyGoalPercent = dailyGoalTarget > 0 ? (currentProfit / dailyGoalTarget) * 100 : 0;

    const kpis = [
        { label: 'Banca Atual', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-green-500' },
        { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'Meta Diária', val: `${Math.min(100, dailyGoalPercent).toFixed(0)}%`, subVal: `${currencySymbol}${formatMoney(currentProfit)} de ${formatMoney(dailyGoalTarget)}`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-green-500' : 'text-blue-400' },
        { label: 'Win Rate', val: `${winRate}%`, icon: TrophyIcon, color: 'text-purple-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Gestão ativa de operações</p></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00Z'))} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-4 rounded-3xl border ${theme.card} flex flex-col justify-between`}>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] md:text-[10px] uppercase font-black text-slate-500 tracking-wider leading-none">{kpi.label}</p>
                            <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-80`} />
                        </div>
                        <p className={`text-base md:text-lg lg:text-xl font-black ${kpi.color} truncate`}>{kpi.val}</p>
                        {kpi.subVal && <p className="text-[8px] md:text-[9px] font-bold mt-1 text-slate-500 truncate leading-tight">{kpi.subVal}</p>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl border ${theme.card}`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CalculatorIcon className="w-5 h-5 text-green-500" /> Nova Ordem</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} placeholder="1.00" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} placeholder="80" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                            <div className="space-y-1 col-span-2 md:col-span-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Qtd</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button onClick={() => handleQuickAdd('win')} className="h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 active:scale-95">WIN</button>
                            <button onClick={() => handleQuickAdd('loss')} className="h-14 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95">LOSS</button>
                        </div>
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border flex flex-col ${theme.card}`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60 text-blue-400"><ListBulletIcon className="w-5 h-5" /> Últimas Operações</h3>
                    <div className="flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             <div className="space-y-2">
                                {[...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                    const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    return (
                                        <div key={trade.id} className={`flex items-center justify-between p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-8 rounded-full ${trade.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-500 leading-none">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    <p className="text-sm font-bold">{trade.result === 'win' ? 'Vitória' : 'Derrota'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${tradeProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}</p>
                                                <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-tighter">Excluir</button>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 py-10">
                                <InformationCircleIcon className="w-10 h-10 mb-2" />
                                <p className="text-xs font-black uppercase">Sem registros hoje</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Compound Interest Panel ---
const CompoundInterestPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';

    const tableData = useMemo(() => {
        const rows = [];
        const operatedDays = records
            .filter((r: any): r is DailyRecord => r.recordType === 'day' && r.trades.length > 0)
            .sort((a, b) => a.id.localeCompare(b.id));
        
        let runningBalance = activeBrokerage.initialBalance;

        for (let i = 0; i < 30; i++) {
            const realRecord = operatedDays[i];
            const initial = runningBalance;
            const hasTrades = !!realRecord;
            const win = hasTrades ? realRecord.winCount : 0;
            const loss = hasTrades ? realRecord.lossCount : 0;
            const profit = hasTrades ? realRecord.netProfitUSD : 0;
            const final = hasTrades ? realRecord.endBalanceUSD : initial;

            rows.push({
                diaTrade: i + 1,
                dateDisplay: hasTrades ? new Date(realRecord.id + 'T00:00:00Z').toLocaleDateString('pt-BR') : 'Aguardando...',
                initial,
                win,
                loss,
                profit,
                final,
                hasTrades
            });
            runningBalance = final;
        }
        return rows;
    }, [records, activeBrokerage.initialBalance]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <h2 className={`text-2xl font-black ${theme.text}`}>Planilha de Juros (30 Dias)</h2>
            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[800px]">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}>
                                <th className="py-5 px-3 border-b border-slate-800/20">Dia de Trade</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Data</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Saldo Inicial</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-green-500">Win</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-red-500">Loss</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Lucro</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Saldo Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.diaTrade} className={`text-sm font-bold hover:bg-slate-800/5 transition-colors`}>
                                    <td className="py-4 px-3 opacity-40 font-mono text-xs">#{row.diaTrade}</td>
                                    <td className="py-4 px-3 text-[10px] uppercase font-black opacity-60">{row.dateDisplay}</td>
                                    <td className="py-4 px-3 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-4 px-3">{row.hasTrades ? <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-xl">{row.win}</span> : '-'}</td>
                                    <td className="py-4 px-3">{row.hasTrades ? <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-xl">{row.loss}</span> : '-'}</td>
                                    <td className={`py-4 px-3 font-black ${row.profit > 0 ? 'text-green-500' : row.profit < 0 ? 'text-red-500' : 'opacity-30'}`}>{row.hasTrades ? `${row.profit > 0 ? '+' : ''}${currencySymbol} ${formatMoney(row.profit)}` : '-'}</td>
                                    <td className="py-4 px-3 font-black opacity-90">{currencySymbol} {formatMoney(row.final)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Report Panel ---
const ReportPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records, deleteTrade }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

    const reportData = useMemo(() => {
        const filteredDays = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.id.startsWith(selectedMonth));
        const allTrades = filteredDays.flatMap(day => day.trades.map(t => ({ ...t, date: day.date, dayId: day.id }))).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const dayRecordsBefore = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.id < `${selectedMonth}-01`).sort((a, b) => b.id.localeCompare(a.id));
        const initialMonthBalance = dayRecordsBefore.length > 0 ? dayRecordsBefore[0].endBalanceUSD : activeBrokerage.initialBalance;
        const finalMonthBalance = filteredDays.length > 0 ? filteredDays[filteredDays.length - 1].endBalanceUSD : initialMonthBalance;
        const totalProfit = filteredDays.reduce((acc, r) => acc + r.netProfitUSD, 0);
        return { totalProfit, finalMonthBalance, allTrades };
    }, [records, selectedMonth, activeBrokerage.initialBalance]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Relatório</h2><p className={theme.textMuted}>Histórico detalhado por mês.</p></div>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-6 rounded-3xl border ${theme.card}`}><p className="text-[9px] uppercase font-black opacity-50 mb-1">Lucro no Mês</p><p className={`text-2xl font-black ${reportData.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{reportData.totalProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(reportData.totalProfit)}</p></div>
                <div className={`p-6 rounded-3xl border ${theme.card}`}><p className="text-[9px] uppercase font-black opacity-50 mb-1">Banca Atual</p><p className="text-2xl font-black text-blue-400">{currencySymbol} {formatMoney(reportData.finalMonthBalance)}</p></div>
                <div className={`p-6 rounded-3xl border ${theme.card}`}><p className="text-[9px] uppercase font-black opacity-50 mb-1">Volume de Trades</p><p className="text-2xl font-black">{reportData.allTrades.length}</p></div>
            </div>
            <div className={`rounded-3xl border overflow-hidden ${theme.card}`}>
                <div className="p-6 border-b border-slate-800/10 font-black text-[10px] uppercase opacity-60">Operações Realizadas</div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead><tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}><th className="py-4 px-6">Data</th><th className="py-4 px-6">Status</th><th className="py-4 px-6">Entrada</th><th className="py-4 px-6">Lucro/Prej</th><th className="py-4 px-6 text-right">Ação</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/5">
                            {reportData.allTrades.map((t) => {
                                const profit = t.result === 'win' ? (t.entryValue * (t.payoutPercentage / 100)) : -t.entryValue;
                                return (
                                    <tr key={t.id} className="hover:bg-slate-800/5 transition-colors">
                                        <td className="py-4 px-6 font-bold text-sm">{new Date(t.dayId + 'T00:00:00Z').toLocaleDateString('pt-BR')}</td>
                                        <td className="py-4 px-6"><span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${t.result === 'win' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{t.result.toUpperCase()}</span></td>
                                        <td className="py-4 px-6 font-mono text-sm opacity-60">{currencySymbol} {formatMoney(t.entryValue)}</td>
                                        <td className={`py-4 px-6 font-black ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{profit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(profit)}</td>
                                        <td className="py-4 px-6 text-right"><button onClick={() => deleteTrade(t.id, t.dayId)} className="text-red-500/30 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Soros Calculator Panel ---
const SorosCalculatorPanel: React.FC<any> = ({ theme, activeBrokerage }) => {
    const [initialValue, setInitialValue] = useState('10');
    const [payout, setPayout] = useState(String(activeBrokerage.payoutPercentage || 80));
    const [levels, setLevels] = useState('5');
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';

    const sorosData = useMemo(() => {
        const val = parseFloat(initialValue) || 0;
        const p = (parseFloat(payout) || 0) / 100;
        const lvl = parseInt(levels) || 1;
        const table = [];
        let currentEntry = val;
        
        for (let i = 1; i <= Math.min(lvl, 15); i++) {
            const profit = currentEntry * p;
            const total = currentEntry + profit;
            table.push({
                level: i,
                entry: currentEntry,
                profit: profit,
                total: total
            });
            currentEntry = total;
        }
        return table;
    }, [initialValue, payout, levels]);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
            <h2 className={`text-2xl font-black ${theme.text}`}>Calculadora de Soros</h2>
            <div className={`p-6 rounded-3xl border ${theme.card} grid grid-cols-1 md:grid-cols-3 gap-6`}>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Entrada Inicial</label><input type="number" value={initialValue} onChange={e => setInitialValue(e.target.value)} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Payout %</label><input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Níveis</label><input type="number" value={levels} onChange={e => setLevels(e.target.value)} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} /></div>
            </div>

            <div className={`rounded-3xl border overflow-hidden ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center">
                        <thead><tr className={`text-[10px] uppercase font-black tracking-widest ${theme.header} bg-opacity-50`}><th className="py-4">Nível</th><th className="py-4">Valor Entrada</th><th className="py-4">Lucro Líquido</th><th className="py-4">Total para o Próximo</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {sorosData.map((row) => (
                                <tr key={row.level} className="text-sm font-bold">
                                    <td className="py-5 font-mono opacity-50"># {row.level}</td>
                                    <td className="py-5">{currencySymbol} {formatMoney(row.entry)}</td>
                                    <td className="py-5 text-green-500">+ {currencySymbol} {formatMoney(row.profit)}</td>
                                    <td className="py-5 font-black">{currencySymbol} {formatMoney(row.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset }) => {
    const handleUpdate = (field: keyof Brokerage, value: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: value } : b));
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
            <h2 className={`text-2xl font-black ${theme.text}`}>Configurações</h2>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-6`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Nome da Gestão</label><input type="text" value={brokerage.name} onChange={e => handleUpdate('name', e.target.value)} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Moeda</label><select value={brokerage.currency} onChange={e => handleUpdate('currency', e.target.value)} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`}><option value="USD">USD ($)</option><option value="BRL">BRL (R$)</option></select></div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Banca Inicial</label><input type="number" value={brokerage.initialBalance} onChange={e => handleUpdate('initialBalance', parseFloat(e.target.value))} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Payout Médio %</label><input type="number" value={brokerage.payoutPercentage} onChange={e => handleUpdate('payoutPercentage', parseInt(e.target.value))} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} /></div>
                </div>
                <div className="pt-8 border-t border-slate-800/10">
                    <h3 className="text-sm font-black text-red-500 uppercase mb-4">Zona Crítica</h3>
                    <div className="p-5 bg-red-500/5 rounded-2xl border border-red-500/10">
                        <p className="text-xs font-bold text-red-500/70 mb-5">Ao zerar a planilha, todo o histórico de operações será excluído permanentemente.</p>
                        <button onClick={onReset} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all">Zerar Planilha</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, records, activeBrokerage }) => {
    const [newName, setNewName] = useState('');
    const [newTarget, setNewTarget] = useState('');
    const totalProfit = useMemo(() => records.filter((r: any) => r.recordType === 'day').reduce((acc: number, r: any) => acc + r.netProfitUSD, 0), [records]);
    const handleAddGoal = (e: React.FormEvent) => { e.preventDefault(); if (!newName || !newTarget) return; setGoals((prev: any) => [...prev, { id: crypto.randomUUID(), name: newName, targetAmount: parseFloat(newTarget), type: 'monthly', createdAt: Date.now() }]); setNewName(''); setNewTarget(''); };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
            <h2 className={`text-2xl font-black ${theme.text}`}>Metas Financeiras</h2>
            <form onSubmit={handleAddGoal} className={`p-6 rounded-3xl border ${theme.card} grid grid-cols-1 md:grid-cols-3 gap-4 items-end`}>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Objetivo</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} className={`w-full p-2.5 rounded-xl border text-sm font-bold ${theme.input}`} /></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase opacity-50">Valor Alvo</label><input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} className={`w-full p-2.5 rounded-xl border text-sm font-bold ${theme.input}`} /></div>
                <button type="submit" className="h-[42px] bg-green-500 text-slate-950 font-black rounded-xl uppercase text-[10px] transition-all"><PlusIcon className="w-4 h-4 mx-auto" /></button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((goal: any) => {
                    const progress = Math.max(0, Math.min(100, (totalProfit / goal.targetAmount) * 100));
                    return (
                        <div key={goal.id} className={`p-6 rounded-3xl border ${theme.card}`}>
                            <div className="flex justify-between items-start mb-6"><h3 className="text-xl font-black">{goal.name}</h3><button onClick={() => setGoals((prev: any) => prev.filter((g: any) => g.id !== goal.id))} className="text-red-500/30 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button></div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-2"><div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
                            <div className="flex justify-between text-[10px] font-bold opacity-60"><span>{progress.toFixed(1)}%</span><span>Meta: {formatMoney(goal.targetAmount)}</span></div>
                        </div>
                    );
                })}
            </div>
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

    const latestDataRef = useRef({ userId: user.id, brokerages, records, goals });
    useEffect(() => { latestDataRef.current = { userId: user.id, brokerages, records, goals }; }, [user.id, brokerages, records, goals]);

    const recalibrateHistory = useCallback((allRecords: AppRecord[], initialBal: number) => {
        let runningBalance = initialBal;
        return allRecords
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(r => {
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
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Gestão Profissional', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
                setBrokerages(loadedBrokerages); setRecords(data.records || []); setGoals(data.goals || []);
                if (loadedBrokerages[0]) { setCustomEntryValue(String(loadedBrokerages[0].entryValue)); setCustomPayout(String(loadedBrokerages[0].payoutPercentage)); }
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
            const entryValue = customEntry || (brokerages[0].entryMode === 'fixed' ? brokerages[0].entryValue : startBal * (brokerages[0].entryValue / 100));
            const payout = customPayout || brokerages[0].payoutPercentage;
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
            const recalibrated = recalibrateHistory(updatedRecords, brokerages[0].initialBalance);
            debouncedSave();
            return recalibrated;
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, brokerages[0].initialBalance);
            debouncedSave();
            return recalibrated;
        });
    };

    const handleReset = () => {
        if(confirm("Deseja realmente apagar todos os trades? Esta ação é irreversível.")) {
            setRecords([]);
            debouncedSave();
        }
    };

    const activeBrokerage = brokerages[0];
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-800/50 font-black italic text-green-500 text-xl tracking-tighter">HRK ANALYTICS</div>
                <nav className="flex-1 p-4 space-y-1">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Planilha Juros</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Relatório</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Calc Soros</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Metas</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Configurações</button>
                </nav>
                <div className="p-4 border-t border-slate-800/50"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl"><LogoutIcon className="w-5 h-5" />Sair</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex items-center justify-between px-6 md:px-8 border-b ${theme.header}`}>
                    <div className="flex items-center gap-4"><button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2"><MenuIcon className="w-6 h-6" /></button><SavingStatusIndicator status={savingStatus} /></div>
                    <div className="flex items-center gap-3"><button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button><div className="w-10 h-10 rounded-2xl bg-green-500 flex items-center justify-center text-slate-950 font-black text-xs">{user.username.slice(0, 2).toUpperCase()}</div></div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeBrokerage.initialBalance * 0.03} />}
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
    if (status === 'saving') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><ArrowPathIcon className="w-3 h-3 animate-spin" /> Salvando...</div>;
    if (status === 'saved') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-500"><CheckIcon className="w-3 h-3" /> Sincronizado</div>;
    return null;
};

export default App;