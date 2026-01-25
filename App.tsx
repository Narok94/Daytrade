import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { 
    SettingsIcon, XMarkIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    CpuChipIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, TrashIcon
} from './components/icons';
import { generateInitialData, getNextCandle } from './services/tradingDataService';
import { calculateBollingerBands, calculateRSI, findFractals } from './services/indicatorService';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

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
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Gerenciamento de ordens em tempo real</p></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00Z'))} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
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
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CalculatorIcon className="w-5 h-5 text-green-500" /> Registrar Operação</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Entrada</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} placeholder="1.00" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
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

    const [startDateStr, setStartDateStr] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });

    const tableData = useMemo(() => {
        const rows = [];
        const startOfView = new Date(startDateStr + 'T00:00:00Z');
        const dayRecords = records.filter((r: any) => r.recordType === 'day');
        const recordMap = new Map(dayRecords.map((r: any) => [r.id, r]));
        
        const recordsBefore = dayRecords
            .filter((r: any) => r.date < startDateStr)
            .sort((a: any, b: any) => b.id.localeCompare(a.id));
            
        let runningBalance = recordsBefore.length > 0 ? recordsBefore[0].endBalanceUSD : activeBrokerage.initialBalance;

        for (let i = 0; i < 31; i++) {
            const currentCursor = new Date(startOfView);
            currentCursor.setDate(startOfView.getDate() + i);
            const dateKey = currentCursor.toISOString().split('T')[0];
            
            if (currentCursor.getMonth() !== startOfView.getMonth()) break;

            const realRecord = recordMap.get(dateKey) as DailyRecord | undefined;
            
            const initial = realRecord ? realRecord.startBalanceUSD : runningBalance;
            const win = realRecord ? realRecord.winCount : 0;
            const loss = realRecord ? realRecord.lossCount : 0;
            const profit = realRecord ? realRecord.netProfitUSD : 0;
            const final = realRecord ? realRecord.endBalanceUSD : runningBalance;
            const avgPayout = realRecord?.trades?.length 
                ? (realRecord.trades.reduce((acc, t) => acc + t.payoutPercentage, 0) / realRecord.trades.length) 
                : activeBrokerage.payoutPercentage;

            rows.push({
                dia: i + 1,
                dateKey,
                initial,
                payout: avgPayout,
                win,
                loss,
                profit,
                final,
                isToday: dateKey === new Date().toISOString().split('T')[0]
            });

            runningBalance = final;
        }
        return rows;
    }, [records, activeBrokerage, startDateStr]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-2xl font-black ${theme.text}`}>Planilha de Juros</h2>
                    <p className="text-[10px] uppercase font-bold text-slate-500 opacity-60">Histórico acumulado de crescimento</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-black uppercase text-slate-500">Mês Início:</label>
                    <input type="date" value={startDateStr} onChange={(e) => setStartDateStr(e.target.value)} className={`border rounded-xl px-3 py-1.5 text-sm font-bold ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'}`} />
                </div>
            </div>

            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[800px]">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}>
                                <th className="py-5 px-3 border-b border-slate-800/20">Dia</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Saldo Inicial</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-blue-400">Payout (%)</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-green-500">Win</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-red-500">Loss</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Lucro/Prejuízo</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Saldo Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.dateKey} className={`text-sm font-bold transition-colors ${row.isToday ? 'bg-green-500/5' : ''} hover:bg-slate-800/5`}>
                                    <td className="py-4 px-3 opacity-40 font-mono text-xs">{row.dia}</td>
                                    <td className="py-4 px-3 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-4 px-3 text-blue-400 font-mono">{row.payout.toFixed(0)}%</td>
                                    <td className="py-4 px-3">
                                        <span className={row.win > 0 ? 'bg-green-500/10 text-green-500 px-3 py-1 rounded-xl' : 'opacity-20'}>{row.win}</span>
                                    </td>
                                    <td className="py-4 px-3">
                                        <span className={row.loss > 0 ? 'bg-red-500/10 text-red-500 px-3 py-1 rounded-xl' : 'opacity-20'}>{row.loss}</span>
                                    </td>
                                    <td className={`py-4 px-3 font-black ${row.profit > 0 ? 'text-green-500' : row.profit < 0 ? 'text-red-500' : 'opacity-30'}`}>
                                        {row.profit !== 0 ? `${row.profit > 0 ? '+' : ''}${currencySymbol} ${formatMoney(row.profit)}` : '-'}
                                    </td>
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
const ReportPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

    const reportData = useMemo(() => {
        const filteredDays = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.id.startsWith(selectedMonth));
        const allTrades = filteredDays.flatMap(day => day.trades.map(t => ({
            ...t,
            date: day.date,
            dayId: day.id
        }))).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const lastRecordBefore = records
            .filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.id < `${selectedMonth}-01`)
            .sort((a, b) => b.id.localeCompare(a.id))[0];
        
        const initialMonthBalance = lastRecordBefore ? lastRecordBefore.endBalanceUSD : activeBrokerage.initialBalance;
        const finalMonthBalance = filteredDays.length > 0 ? filteredDays[filteredDays.length - 1].endBalanceUSD : initialMonthBalance;
        const totalProfit = filteredDays.reduce((acc, r) => acc + r.netProfitUSD, 0);
        const wins = filteredDays.reduce((acc, r) => acc + r.winCount, 0);
        const losses = filteredDays.reduce((acc, r) => acc + r.lossCount, 0);
        
        return { totalProfit, initialMonthBalance, finalMonthBalance, wins, losses, allTrades };
    }, [records, selectedMonth, activeBrokerage.initialBalance]);

    const winRate = (reportData.wins + reportData.losses) > 0 ? (reportData.wins / (reportData.wins + reportData.losses) * 100) : 0;
    
    const kpis = [
        { label: 'Lucro/Prejuízo no Mês', val: `${reportData.totalProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(reportData.totalProfit)}`, icon: TrendingUpIcon, color: reportData.totalProfit >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'Banca Atual (Consolidada)', val: `${currencySymbol} ${formatMoney(reportData.finalMonthBalance)}`, icon: PieChartIcon, color: 'text-blue-400' },
        { label: 'Quantidade de Trades', val: reportData.allTrades.length, icon: ChartBarIcon, color: 'text-slate-400' },
        { label: 'Aproveitamento', val: `${winRate.toFixed(1)}%`, icon: TrophyIcon, color: 'text-purple-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
             <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Relatório Mensal</h2><p className={theme.textMuted}>Análise profunda de performance por período.</p></div>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-4 rounded-3xl border ${theme.card}`}>
                        <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider mb-1">{kpi.label}</p>
                        <p className={`text-base md:text-xl font-black ${kpi.color}`}>{kpi.val}</p>
                    </div>
                ))}
            </div>

            <div className={`rounded-3xl border overflow-hidden ${theme.card}`}>
                <div className="p-6 border-b border-slate-800/10">
                    <h3 className="font-black text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2">
                        <ListBulletIcon className="w-4 h-4" /> Histórico Individual de Operações
                    </h3>
                </div>
                {reportData.allTrades.length > 0 ? (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}>
                                    <th className="py-4 px-6 border-b border-slate-800/10">Data</th>
                                    <th className="py-4 px-6 border-b border-slate-800/10">Hora</th>
                                    <th className="py-4 px-6 border-b border-slate-800/10">Resultado</th>
                                    <th className="py-4 px-6 border-b border-slate-800/10">Valor Entrada</th>
                                    <th className="py-4 px-6 border-b border-slate-800/10">Payout</th>
                                    <th className="py-4 px-6 border-b border-slate-800/10 text-right">Lucro/Prej.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/5">
                                {reportData.allTrades.map((trade) => {
                                    const profit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    const tradeDate = new Date(trade.dayId + 'T00:00:00Z');
                                    return (
                                        <tr key={trade.id} className="hover:bg-slate-800/5 transition-colors">
                                            <td className="py-4 px-6 font-bold text-sm">{tradeDate.toLocaleDateString('pt-BR')}</td>
                                            <td className="py-4 px-6 text-[10px] font-black uppercase opacity-50">{new Date(trade.timestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="py-4 px-6">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${trade.result === 'win' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {trade.result === 'win' ? 'Win' : 'Loss'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-mono text-sm opacity-60">{currencySymbol} {formatMoney(trade.entryValue)}</td>
                                            <td className="py-4 px-6 font-mono text-sm opacity-60">{trade.payoutPercentage}%</td>
                                            <td className={`py-4 px-6 text-right font-black ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {profit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(profit)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-20 text-center opacity-20">
                        <InformationCircleIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-black uppercase text-xs">Nenhum trade este mês</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages }) => {
    const handleUpdate = (field: keyof Brokerage, value: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: value } : b));
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className={`text-2xl font-black ${theme.text}`}>Configurações</h2>
                <p className={theme.textMuted}>Gerencie seus parâmetros operacionais e corretora.</p>
            </div>

            <div className={`p-8 rounded-3xl border ${theme.card} space-y-6`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-50">Nome da Corretora / Gestão</label>
                        <input type="text" value={brokerage.name} onChange={e => handleUpdate('name', e.target.value)} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-50">Moeda Base</label>
                        <select value={brokerage.currency} onChange={e => handleUpdate('currency', e.target.value)} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`}>
                            <option value="USD">Dólar ($)</option>
                            <option value="BRL">Real (R$)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-50">Banca Inicial</label>
                        <input type="number" value={brokerage.initialBalance} onChange={e => handleUpdate('initialBalance', parseFloat(e.target.value))} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase opacity-50">Payout Padrão (%)</label>
                        <input type="number" value={brokerage.payoutPercentage} onChange={e => handleUpdate('payoutPercentage', parseInt(e.target.value))} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} />
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800/10">
                    <h3 className="text-xs font-black uppercase mb-4 opacity-70">Gerenciamento de Entrada</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase opacity-50">Modo de Entrada</label>
                            <div className="flex bg-slate-900 p-1 rounded-xl">
                                <button onClick={() => handleUpdate('entryMode', 'percentage')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${brokerage.entryMode === 'percentage' ? 'bg-green-500 text-slate-950' : 'text-slate-500'}`}>Porcentagem</button>
                                <button onClick={() => handleUpdate('entryMode', 'fixed')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${brokerage.entryMode === 'fixed' ? 'bg-green-500 text-slate-950' : 'text-slate-500'}`}>Valor Fixo</button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase opacity-50">{brokerage.entryMode === 'percentage' ? 'Porcentagem (%)' : 'Valor ($)'}</label>
                            <input type="number" value={brokerage.entryValue} onChange={e => handleUpdate('entryValue', parseFloat(e.target.value))} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800/10">
                    <h3 className="text-xs font-black uppercase mb-4 opacity-70">Trava de Segurança (Stop)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase opacity-50 text-green-500">Stop Gain (Wins Seguídos)</label>
                            <input type="number" value={brokerage.stopGainTrades} onChange={e => handleUpdate('stopGainTrades', parseInt(e.target.value))} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase opacity-50 text-red-500">Stop Loss (Loss Seguídos)</label>
                            <input type="number" value={brokerage.stopLossTrades} onChange={e => handleUpdate('stopLossTrades', parseInt(e.target.value))} className={`w-full p-3 rounded-xl border font-bold ${theme.input}`} />
                        </div>
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
    const [newType, setNewType] = useState<'daily'|'weekly'|'monthly'|'annual'>('monthly');

    const totalProfit = useMemo(() => {
        return records.filter((r: any) => r.recordType === 'day').reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
    }, [records]);

    const handleAddGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newTarget) return;
        const newGoal: Goal = { id: crypto.randomUUID(), name: newName, targetAmount: parseFloat(newTarget), type: newType, createdAt: Date.now() };
        setGoals((prev: Goal[]) => [...prev, newGoal]);
        setNewName(''); setNewTarget('');
    };

    const handleDelete = (id: string) => {
        setGoals((prev: Goal[]) => prev.filter((g: Goal) => g.id !== id));
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div>
                    <h2 className={`text-2xl font-black ${theme.text}`}>Metas Financeiras</h2>
                    <p className={theme.textMuted}>Visualize seus objetivos de longo prazo.</p>
                </div>
            </div>

            <form onSubmit={handleAddGoal} className={`p-6 rounded-3xl border ${theme.card} grid grid-cols-1 md:grid-cols-4 gap-4 items-end`}>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-50">Objetivo</label>
                    <input type="text" placeholder="Ex: Viagem, Carro..." value={newName} onChange={e => setNewName(e.target.value)} className={`w-full p-2.5 rounded-xl border text-sm font-bold ${theme.input}`} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-50">Valor Alvo</label>
                    <input type="number" placeholder="0.00" value={newTarget} onChange={e => setNewTarget(e.target.value)} className={`w-full p-2.5 rounded-xl border text-sm font-bold ${theme.input}`} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase opacity-50">Período</label>
                    <select value={newType} onChange={e => setNewType(e.target.value as any)} className={`w-full p-2.5 rounded-xl border text-sm font-bold ${theme.input}`}>
                        <option value="daily">Diária</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                        <option value="annual">Anual</option>
                    </select>
                </div>
                <button type="submit" className="h-[42px] bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-xl uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                    <PlusIcon className="w-4 h-4" /> Criar Meta
                </button>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {goals.length > 0 ? goals.map((goal: Goal) => {
                    const progress = Math.max(0, Math.min(100, (totalProfit / goal.targetAmount) * 100));
                    return (
                        <div key={goal.id} className={`p-6 rounded-3xl border ${theme.card} relative overflow-hidden group`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[9px] font-black uppercase px-2 py-1 bg-slate-800 rounded-lg text-slate-500 tracking-tighter mb-2 inline-block">Meta {goal.type}</span>
                                    <h3 className="text-xl font-black">{goal.name}</h3>
                                </div>
                                <button onClick={() => handleDelete(goal.id)} className="p-2 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black uppercase opacity-50">Progresso Atual</p>
                                    <p className="text-sm font-black text-green-500">{progress.toFixed(1)}%</p>
                                </div>
                                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold opacity-60">
                                    <span>{activeBrokerage.currency === 'USD' ? '$' : 'R$'} {formatMoney(totalProfit)}</span>
                                    <span>{activeBrokerage.currency === 'USD' ? '$' : 'R$'} {formatMoney(goal.targetAmount)}</span>
                                </div>
                            </div>

                            {progress >= 100 && (
                                <div className="absolute top-0 right-0 p-1">
                                    <div className="bg-green-500 text-slate-950 text-[8px] font-black px-2 py-1 rounded-bl-xl uppercase tracking-tighter">Concluído!</div>
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <div className={`col-span-full p-12 text-center rounded-3xl border border-dashed border-slate-800/30 opacity-30`}>
                        <TargetIcon className="w-12 h-12 mx-auto mb-4" />
                        <p className="font-black uppercase text-xs">Nenhuma meta ativa</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- AI Analysis Panel (Simplified View) ---
const Candlestick = (props: any) => {
    const { x, y, width, height, open, close, high, low } = props;
    const isBullish = close > open;
    const color = isBullish ? '#10B981' : '#EF4444';
    return (
        <g stroke={color} fill="none">
            <path d={`M ${x + width/2} ${y} L ${x + width/2} ${y + height}`} />
            <rect x={x} y={isBullish ? y + (high-close) : y + (high-open)} width={width} height={Math.max(1, Math.abs(open-close))} fill={color} />
        </g>
    );
};

const AIPanel: React.FC<{ theme: any }> = ({ theme }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [signal, setSignal] = useState<any>(null);
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

    const runAnalysis = useCallback(async (data: any[]) => {
        if (!data.length) return;
        const last = data[data.length-1];
        try {
            const prompt = `Analise este trade BTC/USD M1. RSI: ${last.rsi?.toFixed(2)}. Posição BB: ${last.close > last.bb.upper ? 'Sobrecomprado' : last.close < last.bb.lower ? 'Sobrevendido' : 'Neutro'}. Dê um sinal: COMPRA | VENDA | NEUTRO e uma justificativa curta. Formato: SINAL | Justificativa | Confiança(0-100)`;
            const resp = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            const parts = (resp.text || 'NEUTRO | Analisando | 50').split('|').map(p => p.trim());
            setSignal({ action: parts[0], reason: parts[1], conf: parts[2] });
        } catch (e) { console.error(e); }
    }, [ai]);

    useEffect(() => {
        if (!isAnalyzing) return;
        const data = calculateBollingerBands(calculateRSI(findFractals(generateInitialData(50))));
        setChartData(data);
        runAnalysis(data);
        const inv = setInterval(() => {
            setChartData(prev => {
                const next = [...prev.slice(1), getNextCandle(prev[prev.length-1])];
                const processed = calculateBollingerBands(calculateRSI(findFractals(next)));
                runAnalysis(processed);
                return processed;
            });
        }, 5000);
        return () => clearInterval(inv);
    }, [isAnalyzing, runAnalysis]);

    if (!isAnalyzing) return <div className="p-20 text-center"><button onClick={() => setIsAnalyzing(true)} className="bg-green-500 text-slate-950 font-black px-8 py-4 rounded-2xl shadow-xl shadow-green-500/20 active:scale-95 transition-all">INICIAR ANÁLISE IA EM TEMPO REAL</button></div>;

    const domain = [Math.min(...chartData.map(d => d.low)), Math.max(...chartData.map(d => d.high))];

    return (
        <div className="p-6 h-full flex flex-col xl:flex-row gap-6">
            <div className={`flex-1 rounded-3xl border ${theme.card} p-4 flex flex-col h-[500px]`}>
                 <ResponsiveContainer>
                    <ComposedChart data={chartData}>
                        <XAxis dataKey="time" tick={{fontSize: 10}} />
                        <YAxis domain={domain} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Line dataKey="bb.upper" stroke="#38BDF8" dot={false} strokeOpacity={0.2} />
                        <Line dataKey="bb.lower" stroke="#38BDF8" dot={false} strokeOpacity={0.2} />
                        <Bar dataKey="close" shape={<Candlestick />} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <div className={`w-full xl:w-96 rounded-3xl border ${theme.card} p-8 flex flex-col justify-between`}>
                <div className="text-center">
                    <h3 className="text-xs font-black uppercase opacity-40 mb-4 tracking-widest">Sinal Estratégico</h3>
                    {signal ? (
                        <div className="animate-fade-in">
                            <p className={`text-6xl font-black ${signal.action === 'COMPRA' ? 'text-green-500' : signal.action === 'VENDA' ? 'text-red-500' : 'text-yellow-500'}`}>{signal.action}</p>
                            <p className="text-sm font-bold mt-4 opacity-80">{signal.reason}</p>
                            <div className="mt-8 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                <p className="text-[10px] uppercase font-black opacity-40 mb-1">Confiança da IA</p>
                                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-1000" style={{width: `${signal.conf}%`}} />
                                </div>
                                <p className="text-right text-[10px] font-black mt-1">{signal.conf}%</p>
                            </div>
                        </div>
                    ) : <div className="animate-pulse text-slate-500">Calculando...</div>}
                </div>
                <button onClick={() => setIsAnalyzing(false)} className="mt-8 w-full py-4 border border-slate-700 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all">Parar Análise</button>
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
    const [saveError, setSaveError] = useState<string | null>(null);

    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);
    
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');

    const latestDataRef = useRef({ userId: user.id, brokerages, records, goals });
    useEffect(() => { latestDataRef.current = { userId: user.id, brokerages, records, goals }; }, [user.id, brokerages, records, goals]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Gestão Profissional', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
                setBrokerages(loadedBrokerages);
                setRecords(data.records || []);
                setGoals(data.goals || []);
                if (loadedBrokerages[0]) {
                    setCustomEntryValue(String(loadedBrokerages[0].entryValue));
                    setCustomPayout(String(loadedBrokerages[0].payoutPercentage));
                }
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); isInitialLoad.current = false; }
    }, [user.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveData = useCallback(async () => {
        if (isInitialLoad.current) return;
        setSavingStatus('saving');
        try {
            const payload = { userId: latestDataRef.current.userId, brokerages: latestDataRef.current.brokerages, records: latestDataRef.current.records, goals: latestDataRef.current.goals };
            const response = await fetch('/api/save-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) { setSavingStatus('saved'); setTimeout(() => setSavingStatus('idle'), 2000); }
            else { throw new Error('Erro ao salvar no servidor'); }
        } catch (error: any) { setSavingStatus('error'); setSaveError(error.message); }
    }, []);

    const debouncedSave = useDebouncedCallback(saveData, 2000);
    useEffect(() => { if (!isInitialLoad.current) debouncedSave(); }, [brokerages, records, goals, debouncedSave]);

    const activeBrokerage = brokerages[0];
    const [selectedDate, setSelectedDate] = useState(new Date());
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    
    const startBal = useMemo(() => {
        const sorted = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
        return sorted.length > 0 ? sorted[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);
    }, [records, dateStr, activeBrokerage?.initialBalance]);

    const recalibrateHistory = (allRecords: AppRecord[]) => {
        let runningBalance = activeBrokerage.initialBalance;
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
    };

    const addRecord = (win: number, loss: number, customEntry?: number, customPayout?: number) => {
        setRecords(prev => {
            const newRecords = [...prev];
            const idx = newRecords.findIndex(r => r.id === dateStr && r.recordType === 'day');
            const entryValue = customEntry || (activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : startBal * (activeBrokerage.entryValue / 100));
            const payout = customPayout || activeBrokerage.payoutPercentage;
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            if (idx >= 0) {
                const rec = newRecords[idx] as DailyRecord;
                newRecords[idx] = { ...rec, trades: [...rec.trades, ...newTrades] };
            } else {
                newRecords.push({ recordType: 'day', brokerageId: activeBrokerage.id, id: dateStr, date: dateStr, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            return recalibrateHistory(newRecords);
        });
    };

    const deleteTrade = (id: string, d: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === d && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            return recalibrateHistory(updated);
        });
    };

    const theme = useThemeClasses(isDarkMode);
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBal} isDarkMode={isDarkMode} dailyGoalTarget={activeBrokerage.initialBalance * 0.03} />;
            case 'compound': return <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />;
            case 'report': return <ReportPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />;
            case 'ai-analysis': return <AIPanel theme={theme} />;
            case 'goals': return <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} records={records} activeBrokerage={activeBrokerage} />;
            case 'settings': return <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} />;
            default: return null;
        }
    };

    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className={`flex h-screen overflow-hidden font-sans ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 transform border-r ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-800/50"><span className="text-xl font-black italic text-green-500 tracking-tighter">HRK <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>ANALYTICS</span></span></div>
                <nav className="flex-1 p-4 space-y-1">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Planilha Juros</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Relatório</button>
                    <button onClick={() => {setActiveTab('ai-analysis'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'ai-analysis' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Análise IA</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Metas</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Configurações</button>
                </nav>
                <div className="p-4 border-t border-slate-800/50">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl transition-all"><LogoutIcon className="w-5 h-5" />Sair</button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className={`h-20 flex items-center justify-between px-6 md:px-8 border-b ${theme.header}`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-500"><MenuIcon className="w-6 h-6" /></button>
                        <SavingStatusIndicator status={savingStatus} error={saveError} />
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 hover:text-white transition-colors">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button>
                        <div className="w-10 h-10 rounded-2xl bg-green-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-green-500/20 uppercase text-xs">{user.username.slice(0, 2)}</div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

const SavingStatusIndicator: React.FC<{status: string, error: string | null}> = ({status, error}) => {
    if (status === 'saving') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><ArrowPathIcon className="w-3 h-3 animate-spin" /> Salvando</div>;
    if (status === 'saved') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-500"><CheckIcon className="w-3 h-3" /> Salvo</div>;
    if (status === 'error') return <div title={error || 'Erro'} className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500 cursor-help bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20"><InformationCircleIcon className="w-3.5 h-3.5" /> Erro ao salvar</div>;
    return null;
};

export default App;