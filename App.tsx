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
    CpuChipIcon
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
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Resumo de performance diária</p></div>
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
                                <p className="text-xs font-black uppercase">Sem registros</p>
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

    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        today.setDate(1);
        return today.toISOString().split('T')[0];
    });

    const tableData = useMemo(() => {
        const rows = [];
        const dateCursor = new Date(startDate + 'T00:00:00Z');
        const dayRecords = records.filter((r: any) => r.recordType === 'day');
        const recordMap = new Map(dayRecords.map((r: any) => [r.id, r]));
        
        const recordBeforeStart = dayRecords.filter((r: any) => r.date < startDate).sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
        let currentBalance = recordBeforeStart ? recordBeforeStart.endBalanceUSD : activeBrokerage.initialBalance;

        for (let i = 1; i <= 31; i++) {
            const dateStr = dateCursor.toISOString().split('T')[0];
            const realRecord = recordMap.get(dateStr) as DailyRecord | undefined;
            
            const initial = realRecord ? realRecord.startBalanceUSD : currentBalance;
            const win = realRecord ? realRecord.winCount : 0;
            const loss = realRecord ? realRecord.lossCount : 0;
            const profit = realRecord ? realRecord.netProfitUSD : 0;
            const final = realRecord ? realRecord.endBalanceUSD : currentBalance;
            const avgPayout = realRecord?.trades?.length ? (realRecord.trades.reduce((acc, t) => acc + t.payoutPercentage, 0) / realRecord.trades.length) : activeBrokerage.payoutPercentage;

            rows.push({
                dia: i,
                dateStr,
                initial,
                payout: avgPayout,
                win,
                loss,
                profit,
                final,
                isPast: dateStr < new Date().toISOString().split('T')[0],
                isToday: dateStr === new Date().toISOString().split('T')[0]
            });

            currentBalance = final;
            dateCursor.setDate(dateCursor.getDate() + 1);
        }
        return rows;
    }, [records, activeBrokerage, startDate]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-2xl font-black ${theme.text}`}>Planilha de Juros</h2>
                    <p className="text-[10px] uppercase font-bold text-slate-500 opacity-60">Espelhamento de Operações Diárias</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-black uppercase text-slate-500">Mês Início:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`border rounded-xl px-3 py-1.5 text-sm font-bold ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} />
                </div>
            </div>

            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}>
                                <th className="py-5 px-3 border-b border-slate-800/20">Dia</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Banca Inicial</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-blue-400">Payout (%)</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-green-500">Win (Qtd)</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-red-500">Loss (Qtd)</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Lucro/Prejuízo ($)</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Banca Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.dateStr} className={`text-sm font-bold transition-colors ${row.isToday ? 'bg-green-500/5' : ''} hover:bg-slate-800/5`}>
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
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

    const monthlyData = useMemo(() => {
        const filteredRecords = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.id.startsWith(selectedMonth));
        
        const lastRecordBeforeMonth = records
            .filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.id < `${selectedMonth}-01`)
            .sort((a, b) => b.id.localeCompare(a.id))[0];
        
        const balanceForEmptyMonth = lastRecordBeforeMonth ? lastRecordBeforeMonth.endBalanceUSD : activeBrokerage.initialBalance;

        if (filteredRecords.length === 0) {
            return {
                totalWins: 0,
                totalLosses: 0,
                totalNetProfit: 0,
                finalBalance: balanceForEmptyMonth,
                operatedDays: [],
                hasData: false,
            };
        }

        const totalWins = filteredRecords.reduce((acc, r) => acc + r.winCount, 0);
        const totalLosses = filteredRecords.reduce((acc, r) => acc + r.lossCount, 0);
        const totalNetProfit = filteredRecords.reduce((acc, r) => acc + r.netProfitUSD, 0);
        const finalBalance = filteredRecords[filteredRecords.length - 1].endBalanceUSD;
        
        const operatedDays = filteredRecords.map(r => ({
            date: r.date,
            wins: r.winCount,
            losses: r.lossCount,
            profit: r.netProfitUSD
        }));

        return {
            totalWins,
            totalLosses,
            totalNetProfit,
            finalBalance,
            operatedDays,
            hasData: true,
        };
    }, [records, selectedMonth, activeBrokerage.initialBalance]);

    const winRate = (monthlyData.totalWins + monthlyData.totalLosses) > 0 ? (monthlyData.totalWins / (monthlyData.totalWins + monthlyData.totalLosses) * 100) : 0;
    
    const kpis = [
        { label: 'Lucro/Prejuízo Total', val: `${monthlyData.totalNetProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(monthlyData.totalNetProfit)}`, icon: TrendingUpIcon, color: monthlyData.totalNetProfit >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'Banca Final do Mês', val: `${currencySymbol} ${formatMoney(monthlyData.finalBalance)}`, icon: PieChartIcon, color: 'text-blue-400' },
        { label: 'Total de Wins', val: monthlyData.totalWins, icon: CheckIcon, color: 'text-green-500' },
        { label: 'Win Rate Mensal', val: `${winRate.toFixed(1)}%`, icon: TrophyIcon, color: 'text-purple-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
             <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Relatório Mensal</h2><p className={theme.textMuted}>Análise de performance consolidada.</p></div>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-4 rounded-3xl border ${theme.card}`}>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[9px] md:text-[10px] uppercase font-black text-slate-500 tracking-wider">{kpi.label}</p>
                            <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-80`} />
                        </div>
                        <p className={`text-xl md:text-2xl font-black ${kpi.color}`}>{kpi.val}</p>
                    </div>
                ))}
            </div>

            <div className={`rounded-3xl border p-6 ${theme.card}`}>
                <h3 className="font-black mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60">
                    <ListBulletIcon className="w-5 h-5" /> Resumo de Dias Operados
                </h3>
                {monthlyData.hasData ? (
                    <div className="overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                        <ul className="space-y-2">
                            {monthlyData.operatedDays.map(day => (
                                <li key={day.date} className={`flex items-center justify-between p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                    <p className="font-bold text-sm">{new Date(day.date + 'T00:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                    <div className="flex items-center gap-4 text-xs font-bold">
                                        <span className="bg-green-500/10 text-green-500 px-2.5 py-1 rounded-lg">{day.wins} W</span>
                                        <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-lg">{day.losses} L</span>
                                    </div>
                                    <p className={`font-black text-sm ${day.profit > 0 ? 'text-green-500' : day.profit < 0 ? 'text-red-500' : 'opacity-50'}`}>
                                        {day.profit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(day.profit)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 py-16">
                        <InformationCircleIcon className="w-10 h-10 mb-2" />
                        <p className="text-xs font-black uppercase">Sem operações neste mês</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsPanel: React.FC<{ theme: ReturnType<typeof useThemeClasses> }> = ({ theme }) => (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <h2 className={`text-2xl font-black ${theme.text}`}>Configurações</h2>
        <p className={theme.textMuted}>Gerencie suas corretoras e preferências.</p>
        <div className={`mt-8 p-10 rounded-3xl border ${theme.card} flex flex-col items-center justify-center text-center opacity-50`}>
            <SettingsIcon className={`w-12 h-12 ${theme.textMuted} mb-4`} />
            <h3 className={`font-bold ${theme.text}`}>Em Breve</h3>
            <p className={theme.textMuted}>A funcionalidade de configurações detalhadas está em desenvolvimento.</p>
        </div>
    </div>
);

const GoalsPanel: React.FC<{ theme: ReturnType<typeof useThemeClasses> }> = ({ theme }) => (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <h2 className={`text-2xl font-black ${theme.text}`}>Metas</h2>
        <p className={theme.textMuted}>Defina e acompanhe seus objetivos financeiros.</p>
        <div className={`mt-8 p-10 rounded-3xl border ${theme.card} flex flex-col items-center justify-center text-center opacity-50`}>
            <TargetIcon className={`w-12 h-12 ${theme.textMuted} mb-4`} />
            <h3 className={`font-bold ${theme.text}`}>Em Breve</h3>
            <p className={theme.textMuted}>A funcionalidade de metas personalizadas está em desenvolvimento.</p>
        </div>
    </div>
);

// --- AI Analysis Panel ---
const Candlestick = (props: any) => {
    const { x, y, width, height, low, high, open, close } = props;
    const isBullish = close > open;
    const color = isBullish ? '#10B981' : '#EF4444'; // green-500, red-500
    const bodyHeight = Math.abs(open - close);
    const bodyY = isBullish ? y + (high - close) : y + (high - open);

    return (
        <g stroke={color} fill="none" strokeWidth="1">
            <path d={`M ${x + width / 2} ${y} L ${x + width / 2} ${y + (high - low)}`} />
            <path d={`M ${x} ${bodyY} L ${x + width} ${bodyY} L ${x + width} ${bodyY + bodyHeight} L ${x} ${bodyY + bodyHeight} Z`} fill={color} />
        </g>
    );
};

const AIPanel: React.FC<{ theme: ReturnType<typeof useThemeClasses> }> = ({ theme }) => {
    const [asset, setAsset] = useState('BTC/USD');
    const [timeframe, setTimeframe] = useState('M1');
    const [strategy, setStrategy] = useState('Crypto Shield Core');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const [chartData, setChartData] = useState<any[]>([]);
    const [aiSignal, setAiSignal] = useState<{ signal: string, reason: string, confidence: number } | null>(null);
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

    const getAIAnalysis = useCallback(async (data: any[]) => {
        if (data.length < 20) return; // Need enough data
        const lastCandle = data[data.length - 1];
        const rsiVal = lastCandle.rsi?.toFixed(2);
        const bb = lastCandle.bb;
        const lastFractal = [...data].reverse().find(d => d.fractal)?.fractal;

        let pricePosition = 'no meio das bandas';
        if (lastCandle.close > bb.upper) pricePosition = 'acima da banda superior';
        else if (lastCandle.close < bb.lower) pricePosition = 'abaixo da banda inferior';
        else if (Math.abs(lastCandle.close - bb.upper) < Math.abs(lastCandle.close - bb.middle)) pricePosition = 'próximo à banda superior';
        else if (Math.abs(lastCandle.close - bb.lower) < Math.abs(lastCandle.close - bb.middle)) pricePosition = 'próximo à banda inferior';

        const prompt = `Você é um analista de trading de IA para o par ${asset} em M1.
        Baseado nos seguintes dados, gere um sinal de COMPRA ou VENDA e uma justificativa técnica curta e direta.
        - Posição do Preço: ${pricePosition}.
        - Índice de Força Relativa (RSI): ${rsiVal}.
        - Último Fractal: ${lastFractal || 'Nenhum recente'}.
        - Ação: (COMPRA/VENDA) | Justificativa: (explique em poucas palavras) | Confiança: (0-100)`;
        
        try {
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            const text = response.text || "COMPRA | Análise Indisponível | 50";
            const parts = text.split('|').map(p => p.trim());
            const signal = parts[0].includes('COMPRA') ? 'COMPRA' : 'VENDA';
            const reason = parts[1].replace('Justificativa:', '').trim();
            const confidence = parseInt(parts[2].replace('Confiança:', '').trim()) || 75;
            setAiSignal({ signal, reason, confidence });
        } catch (error) {
            console.error("Gemini API Error:", error);
            setAiSignal({ signal: 'NEUTRO', reason: 'Erro na análise da IA.', confidence: 0 });
        }
    }, [asset, ai.models]);

    useEffect(() => {
        if (!isAnalyzing) return;
        
        const initialData = generateInitialData(50);
        const dataWithIndicators = calculateBollingerBands(calculateRSI(findFractals(initialData)));
        setChartData(dataWithIndicators);
        getAIAnalysis(dataWithIndicators);
        
        const interval = setInterval(() => {
            setChartData(prevData => {
                const nextData = [...prevData.slice(1), getNextCandle(prevData[prevData.length - 1])];
                const newDataWithIndicators = calculateBollingerBands(calculateRSI(findFractals(nextData)));
                getAIAnalysis(newDataWithIndicators);
                return newDataWithIndicators;
            });
        }, 5000); // Update every 5 seconds

        return () => clearInterval(interval);
    }, [isAnalyzing, getAIAnalysis]);


    if (!isAnalyzing) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col items-center justify-center h-full">
                <div className={`w-full p-8 rounded-3xl border ${theme.card} bg-slate-900/50 border-slate-800`}>
                    <h2 className={`text-2xl font-black ${theme.text}`}>CONFIGURAÇÕES DE ANÁLISE</h2>
                     <p className={theme.textMuted}>Selecione os parâmetros para a IA</p>
                    
                    <div className="space-y-6 mt-8">
                        <div>
                            <label className="text-sm font-bold text-slate-400">ATIVO</label>
                            <select value={asset} onChange={e => setAsset(e.target.value)} className={`w-full mt-2 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}>
                                <option>BTC/USD</option>
                                <option>ETH/USD</option>
                                <option>EUR/USD</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-400">TIMEFRAME</label>
                            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} disabled className={`w-full mt-2 p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-500`}>
                                <option>M1</option>
                            </select>
                        </div>
                         <div>
                            <label className="text-sm font-bold text-slate-400">ESTRATÉGIA</label>
                             <select value={strategy} onChange={e => setStrategy(e.target.value)} className={`w-full mt-2 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}>
                                <option>Crypto Shield Core</option>
                            </select>
                        </div>
                    </div>
                     <button onClick={() => setIsAnalyzing(true)} className="w-full mt-10 py-4 px-4 border border-transparent rounded-lg shadow-lg shadow-emerald-900/50 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                         <CpuChipIcon className="w-5 h-5"/> INICIAR ANÁLISE AO VIVO
                    </button>
                </div>
            </div>
        );
    }

    const lastDataPoint = chartData[chartData.length - 1] || {};
    const domain = [Math.min(...chartData.map(d => d.low)), Math.max(...chartData.map(d => d.high))];
    const signalColor = aiSignal?.signal === 'COMPRA' ? 'text-green-400' : aiSignal?.signal === 'VENDA' ? 'text-red-500' : 'text-yellow-400';

    return (
        <div className="p-4 md:p-6 h-full flex flex-col xl:flex-row gap-6">
            <div className={`flex-1 rounded-3xl border ${theme.card} p-4 flex flex-col`}>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-xl font-black">{asset} - {timeframe}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>AO VIVO</div>
                </div>
                <div className="flex-1 w-full h-64">
                    <ResponsiveContainer>
                        <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                            <YAxis domain={domain} orientation="left" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#CBD5E1' }} />
                            <Line dataKey="bb.upper" stroke="#38BDF8" strokeOpacity={0.5} dot={false} strokeWidth={1} />
                            <Line dataKey="bb.lower" stroke="#38BDF8" strokeOpacity={0.5} dot={false} strokeWidth={1} />
                            <Line dataKey="bb.middle" stroke="#FBBF24" strokeOpacity={0.6} dot={false} strokeDasharray="3 3" strokeWidth={1} />
                            <Bar dataKey="close" shape={<Candlestick />} />
                            {chartData.map((entry, index) => entry.fractal && (
                                <ReferenceLine key={index} x={entry.time} segment={[{ x: entry.time, y: entry.fractal === 'bearish' ? entry.high + (domain[1] - domain[0]) * 0.05 : entry.low - (domain[1] - domain[0]) * 0.05 }]} 
                                    label={{ value: entry.fractal === 'bearish' ? '▼' : '▲', position: 'top', fill: entry.fractal === 'bearish' ? '#EF4444' : '#10B981', fontSize: 12 }} 
                                    stroke="none" 
                                />
                            ))}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                 <div className="flex-1 w-full h-32 mt-4">
                     <ResponsiveContainer>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                            <YAxis domain={[0, 100]} orientation="left" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', color: '#CBD5E1' }} />
                            <ReferenceLine y={70} stroke="#F87171" strokeDasharray="3 3" strokeOpacity={0.5}><span className="text-red-500 text-[8px]">70</span></ReferenceLine>
                            <ReferenceLine y={30} stroke="#4ADE80" strokeDasharray="3 3" strokeOpacity={0.5}><span className="text-green-500 text-[8px]">30</span></ReferenceLine>
                            <Line type="monotone" dataKey="rsi" stroke="#C084FC" dot={false} strokeWidth={2} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={`w-full xl:w-96 rounded-3xl border ${theme.card} p-6 flex flex-col justify-between`}>
                 <div>
                    <h3 className="text-lg font-black text-slate-300">SINAL DA IA</h3>
                    <p className="text-sm text-slate-500">Análise baseada em múltiplos indicadores</p>
                    
                    {!aiSignal ? (
                         <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                        <div className="my-6 text-center animate-fade-in">
                            <p className={`font-black text-6xl ${signalColor}`}>{aiSignal.signal}</p>
                            <p className="text-sm font-bold text-slate-400 mt-1">Confiança: {aiSignal.confidence}%</p>
                        </div>
                    )}
                    
                    <div className="mt-4 space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Justificativa Técnica</h4>
                         <p className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-lg border border-slate-800 h-24">
                            {aiSignal?.reason || 'Aguardando análise...'}
                        </p>
                    </div>
                </div>
                <button onClick={() => setIsAnalyzing(false)} className="w-full mt-6 py-3 px-4 border border-slate-700 rounded-lg text-base font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all">
                     PARAR ANÁLISE
                </button>
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
    
    // State for the dashboard's custom entry fields
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

                // Set default values for custom entry based on loaded brokerage
                if (loadedBrokerages[0]) {
                    setCustomEntryValue(String(loadedBrokerages[0].entryMode === 'fixed' ? loadedBrokerages[0].entryValue : ''));
                    setCustomPayout(String(loadedBrokerages[0].payoutPercentage));
                }
            }
        } catch (e) {
            console.error("Fetch error", e);
        } finally { setIsLoading(false); isInitialLoad.current = false; }
    }, [user.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveData = useCallback(async () => {
        if (isInitialLoad.current) return;
        setSavingStatus('saving');
        try {
            const payload = {
                userId: latestDataRef.current.userId,
                brokerages: latestDataRef.current.brokerages,
                records: latestDataRef.current.records.map(r => r.recordType === 'day' ? {
                    ...r,
                    trades: r.trades.map(t => ({
                        ...t,
                        entryValue: t.entryValue || 0,
                        payoutPercentage: t.payoutPercentage || 0
                    }))
                } : r),
                goals: latestDataRef.current.goals
            };

            const response = await fetch('/api/save-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                setSavingStatus('saved');
                setTimeout(() => setSavingStatus('idle'), 2000);
            } else {
                const err = await response.json();
                throw new Error(err.error || 'Erro no servidor');
            }
        } catch (error: any) {
            setSavingStatus('error');
            setSaveError(error.message);
        }
    }, []);

    const debouncedSave = useDebouncedCallback(saveData, 2000);
    
    useEffect(() => { if (!isInitialLoad.current) debouncedSave(); }, [brokerages, records, goals, debouncedSave]);

    useEffect(() => {
        if (savingStatus === 'error') {
            const retryTimeout = setTimeout(() => {
                debouncedSave();
            }, 5000);
            return () => clearTimeout(retryTimeout);
        }
    }, [savingStatus, debouncedSave]);

    const activeBrokerage = brokerages[0];
    const [selectedDate, setSelectedDate] = useState(new Date());
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const startBal = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.date.localeCompare(a.date))[0]?.endBalanceUSD || activeBrokerage?.initialBalance;

    const addRecord = (win: number, loss: number, customEntry?: number, customPayout?: number) => {
        setRecords(prev => {
            const newRecords = [...prev];
            const idx = newRecords.findIndex(r => r.id === dateStr && r.recordType === 'day');
            const entry = customEntry || (activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : startBal * (activeBrokerage.entryValue/100));
            const payout = customPayout || activeBrokerage.payoutPercentage;
            
            const createTrades = (w: number, l: number): Trade[] => {
                const t: Trade[] = [];
                for(let i=0; i<w; i++) t.push({id: crypto.randomUUID(), result: 'win', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
                for(let i=0; i<l; i++) t.push({id: crypto.randomUUID(), result: 'loss', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
                return t;
            };

            if (idx >= 0) {
                const rec = newRecords[idx] as DailyRecord;
                newRecords[idx] = { ...rec, trades: [...rec.trades, ...createTrades(win, loss)] };
            } else {
                newRecords.push({ recordType: 'day', brokerageId: activeBrokerage.id, id: dateStr, date: dateStr, startBalanceUSD: startBal, trades: createTrades(win, loss), winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            
            let balance = activeBrokerage.initialBalance;
            return newRecords.sort((a,b) => a.id.localeCompare(b.id)).map(r => {
                if (r.recordType !== 'day') return r;
                const daily = r as DailyRecord;
                daily.startBalanceUSD = balance;
                daily.winCount = daily.trades.filter(t => t.result === 'win').length;
                daily.lossCount = daily.trades.filter(t => t.result === 'loss').length;
                daily.netProfitUSD = daily.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : -t.entryValue), 0);
                daily.endBalanceUSD = daily.startBalanceUSD + daily.netProfitUSD;
                balance = daily.endBalanceUSD;
                return daily;
            });
        });
    };

    const deleteTrade = (id: string, d: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === d && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            let balance = activeBrokerage.initialBalance;
            return updated.map(r => {
                if (r.recordType !== 'day') return r;
                const daily = r as DailyRecord;
                daily.startBalanceUSD = balance;
                daily.netProfitUSD = daily.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : -t.entryValue), 0);
                daily.endBalanceUSD = daily.startBalanceUSD + daily.netProfitUSD;
                balance = daily.endBalanceUSD;
                return daily;
            });
        });
    };

    const theme = useThemeClasses(isDarkMode);
    
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardPanel 
                            activeBrokerage={activeBrokerage}
                            customEntryValue={customEntryValue}
                            setCustomEntryValue={setCustomEntryValue}
                            customPayout={customPayout}
                            setCustomPayout={setCustomPayout}
                            addRecord={addRecord} 
                            deleteTrade={deleteTrade}
                            selectedDateString={dateStr}
                            setSelectedDate={setSelectedDate}
                            dailyRecordForSelectedDay={dailyRecord}
                            startBalanceForSelectedDay={startBal}
                            isDarkMode={isDarkMode}
                            dailyGoalTarget={activeBrokerage.initialBalance * 0.03}
                        />;
            case 'compound':
                return <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />;
            case 'report':
                return <ReportPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />;
            case 'ai-analysis':
                return <AIPanel theme={theme} />;
            case 'goals':
                return <GoalsPanel theme={theme} />;
            case 'settings':
                return <SettingsPanel theme={theme} />;
            default:
                return null;
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
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 hover:text-white">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button>
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
    if (status === 'error') return (
        <div title={error || 'Erro'} className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500 cursor-help bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
            <InformationCircleIcon className="w-3.5 h-3.5" /> Falha ao salvar
        </div>
    );
    return null;
};

export default App;