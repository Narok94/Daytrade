import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, TransactionRecord, AppRecord, Trade, User, Goal } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { fetchUSDBRLRate } from './services/currencyService';
import { 
    SettingsIcon, PlusIcon, DepositIcon, WithdrawalIcon, XMarkIcon, 
    TrashIcon, LogoutIcon, BellIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, TrendingDownIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ChevronUpIcon, 
    ChevronDownIcon, ArrowPathIcon, CpuChipIcon, InformationCircleIcon,
    EditIcon, TrophyIcon, ChartBarIcon
} from './components/icons';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getRemainingBusinessDays = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let count = 0;
    for (let d = today.getDate(); d <= lastDay.getDate(); d++) {
        const currentDate = new Date(today.getFullYear(), today.getMonth(), d);
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek > 0 && dayOfWeek < 6) { // Monday to Friday
            count++;
        }
    }
    return count;
};

const getRemainingWeeks = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const remainingDays = lastDay.getDate() - today.getDate() + 1;
    return Math.max(1, Math.ceil(remainingDays / 7));
};


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

// --- Edit Trade Modal ---
const EditTradeModal: React.FC<{
    trade: Trade;
    isDarkMode: boolean;
    onClose: () => void;
    onSave: (updated: Partial<Trade>) => void;
}> = ({ trade, isDarkMode, onClose, onSave }) => {
    const [val, setVal] = useState(trade.entryValue.toString());
    const [payout, setPayout] = useState(trade.payoutPercentage.toString());
    const [res, setRes] = useState<'win' | 'loss'>(trade.result);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl">Editar Operação</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800/20 rounded-full transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Entrada ($)</label>
                        <input type="number" value={val} onChange={e => setVal(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold focus:ring-1 focus:ring-green-500 outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Payout (%)</label>
                        <input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold focus:ring-1 focus:ring-green-500 outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setRes('win')} className={`h-12 rounded-xl font-black uppercase tracking-widest transition-all border ${res === 'win' ? 'bg-green-500 text-slate-950 border-green-500 shadow-lg shadow-green-500/20' : 'border-slate-800 opacity-40'}`}>WIN</button>
                        <button onClick={() => setRes('loss')} className={`h-12 rounded-xl font-black uppercase tracking-widest transition-all border ${res === 'loss' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'border-slate-800 opacity-40'}`}>LOSS</button>
                    </div>
                </div>
                <button 
                    onClick={() => onSave({ entryValue: parseFloat(val), payoutPercentage: parseFloat(payout), result: res })}
                    className="w-full h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-xl mt-8 transition-all shadow-xl shadow-green-500/20 uppercase tracking-widest"
                >
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};

// --- Dashboard Panel ---

const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, updateTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
    
    const handleQuickAdd = (type: 'win' | 'loss') => {
         const entryValue = customEntryValue ? parseFloat(customEntryValue) : undefined;
         const payout = customPayout ? parseFloat(customPayout) : undefined;
         const qty = parseInt(quantity) || 1;
         if (type === 'win') addRecord(qty, 0, entryValue, payout);
         else addRecord(0, qty, entryValue, payout);
         setQuantity('1');
    };

    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) : '0.0';
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    return (
        <div className="p-4 md:p-8 space-y-6">
            {editingTrade && (
                <EditTradeModal 
                    trade={editingTrade} 
                    isDarkMode={isDarkMode} 
                    onClose={() => setEditingTrade(null)} 
                    onSave={(updated) => { updateTrade(editingTrade.id, selectedDateString, updated); setEditingTrade(null); }} 
                />
            )}
            
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-bold ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Resumo de performance diária</p></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00Z'))} className={`border rounded-lg px-4 py-2 text-sm focus:outline-none font-bold ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Banca Atual', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-green-500' },
                    { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-green-500' : 'text-red-500' },
                    { label: 'Meta Diária', val: `${dailyGoalTarget > 0 ? ((currentProfit / dailyGoalTarget) * 100).toFixed(0) : 0}%`, icon: TargetIcon, color: 'text-blue-400' },
                    { label: 'Win Rate', val: `${winRate}%`, icon: TrophyIcon, color: 'text-purple-400' },
                ].map((kpi, i) => (
                    <div key={i} className={`p-4 rounded-2xl border ${theme.card}`}>
                        <div className="flex justify-between items-start mb-1">
                            <div><p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">{kpi.label}</p><p className={`text-lg font-black ${kpi.color}`}>{kpi.val}</p></div>
                            <kpi.icon className={`w-5 h-5 ${kpi.color} opacity-80`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border ${theme.card}`}>
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                        <CalculatorIcon className="w-5 h-5 text-green-500" /> Registrar Operação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Entrada</label>
                            <input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} placeholder="0.00" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout %</label>
                            <input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} placeholder="80" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Qtd</label>
                            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleQuickAdd('win')} className="h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-green-500/20">WIN</button>
                        <button onClick={() => handleQuickAdd('loss')} className="h-14 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-red-500/20">LOSS</button>
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border flex flex-col ${theme.card}`}>
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                        <ListBulletIcon className="w-5 h-5 text-blue-500" /> Relatório de Operações
                    </h3>
                    <div className="flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades && dailyRecordForSelectedDay.trades.length > 0 ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] uppercase font-black text-slate-500 border-b border-slate-800/30">
                                        <th className="pb-2">Hora</th>
                                        <th className="pb-2 text-center">Tipo</th>
                                        <th className="pb-2 text-right">Resultado</th>
                                        <th className="pb-2 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/20">
                                    {[...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                        const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                        const timeStr = trade.timestamp ? new Date(trade.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                        return (
                                            <tr key={trade.id} className="text-sm group">
                                                <td className="py-3 font-mono opacity-60">{timeStr}</td>
                                                <td className="py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${trade.result === 'win' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {trade.result}
                                                    </span>
                                                </td>
                                                <td className={`py-3 text-right font-black ${tradeProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}
                                                </td>
                                                <td className="py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingTrade(trade)} className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-md transition-colors" title="Editar"><EditIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition-colors" title="Excluir"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 py-10">
                                <InformationCircleIcon className="w-10 h-10 mb-2" />
                                <p className="text-sm font-bold">Nenhuma operação registrada hoje</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AnalysisPanel: React.FC<any> = ({ isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [loading, setLoading] = useState(false);
    const [signal, setSignal] = useState<any>(null);
    const [timeframe, setTimeframe] = useState<'M1' | 'M2' | 'M5' | 'AUTO'>('M1');

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Analise o mercado de criptoativos e retorne um JSON puro para um sinal de trading no tempo ${timeframe}. { "action": "COMPRA" | "VENDA", "asset": "BTC/USDT", "timeframe": "M1|M2|M5", "confidence": 70-98, "reason": ["...", "..."] }`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            action: { type: Type.STRING },
                            asset: { type: Type.STRING },
                            timeframe: { type: Type.STRING },
                            confidence: { type: Type.NUMBER },
                            reason: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ['action', 'asset', 'timeframe', 'confidence', 'reason']
                    }
                }
            });
            if (response.text) {
                setSignal(JSON.parse(response.text));
            }
        } finally { setLoading(false); }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
            <div className="text-center"><h2 className={`text-3xl font-black ${theme.text}`}>HRK Signals AI</h2></div>
            <div className={`p-6 rounded-3xl border ${theme.card}`}>
                <div className="flex justify-center gap-2 mb-6">
                    {['M1', 'M2', 'M5', 'AUTO'].map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf as any)} className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all ${timeframe === tf ? 'bg-green-500 text-slate-950 border-green-500' : 'text-slate-500 border-slate-800'}`}>{tf}</button>
                    ))}
                </div>
                {!loading && !signal && <button onClick={handleGenerate} className="w-full py-4 bg-green-500 text-slate-950 font-bold rounded-2xl hover:bg-green-400">ANALISAR AGORA</button>}
                {loading && <div className="text-center py-10"><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}
                {signal && !loading && (
                    <div className="text-center space-y-4">
                        <h3 className={`text-6xl font-black ${signal.action === 'COMPRA' ? 'text-green-500' : 'text-red-500'}`}>{signal.action}</h3>
                        <p className="text-slate-400 font-bold">Confiança: {signal.confidence}%</p>
                        <button onClick={() => setSignal(null)} className="text-xs text-slate-600 font-bold">LIMPAR</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPOUND INTEREST PANEL (Planilha de Ganhos) ---

const EditableCell: React.FC<{
    value: number;
    onSave: (newValue: number) => void;
}> = ({ value, onSave }) => {
    const [currentValue, setCurrentValue] = useState(value);
    
    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleBlur = () => {
        if (Number(currentValue) !== value) {
            onSave(Number(currentValue));
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <input 
            type="number"
            min="0"
            value={currentValue}
            onChange={e => setCurrentValue(parseInt(e.target.value, 10) || 0)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-16 bg-transparent text-center font-bold border-none focus:outline-none focus:ring-1 focus:ring-green-500 rounded-md transition p-1"
        />
    );
};

const CompoundInterestPanel: React.FC<{ 
    isDarkMode: boolean; 
    activeBrokerage: Brokerage; 
    records: AppRecord[];
    onUpdateDay: (dateStr: string, newWin: number, newLoss: number) => void;
}> = ({ isDarkMode, activeBrokerage, records, onUpdateDay }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';

    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        today.setDate(1); // Default to start of current month
        return today.toISOString().split('T')[0];
    });

    const tableData = useMemo(() => {
        const rows = [];
        const dateCursor = new Date(startDate + 'T00:00:00Z');
        
        const dayRecords = records.filter((r): r is DailyRecord => r.recordType === 'day');
        const recordMap = new Map(dayRecords.map(r => [r.id, r]));
        const sortedRecords = [...dayRecords].sort((a, b) => a.date.localeCompare(b.date));
        
        const recordBeforeStart = sortedRecords.filter(r => r.date < startDate).pop();
        let lastKnownBalance = recordBeforeStart ? recordBeforeStart.endBalanceUSD : activeBrokerage.initialBalance;

        for (let i = 0; i < 30; i++) {
            const dateStr = dateCursor.toISOString().split('T')[0];
            const displayDate = dateCursor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            
            const realDayRecord = recordMap.get(dateStr);

            if (realDayRecord) {
                const dailyRecord = realDayRecord as DailyRecord;
                const hasOps = dailyRecord.trades && dailyRecord.trades.length > 0;
                const avgPayout = hasOps ? dailyRecord.trades.reduce((acc, t) => acc + t.payoutPercentage, 0) / dailyRecord.trades.length : 0;
                
                rows.push({
                    isProjection: false,
                    dateStr, displayDate,
                    initial: dailyRecord.startBalanceUSD,
                    entry: dailyRecord.startBalanceUSD * 0.1,
                    payoutPct: avgPayout,
                    lucro: dailyRecord.netProfitUSD,
                    win: dailyRecord.winCount,
                    red: dailyRecord.lossCount
                });
                lastKnownBalance = dailyRecord.endBalanceUSD;
            } else {
                rows.push({
                    isProjection: true,
                    dateStr, displayDate,
                    initial: lastKnownBalance,
                    entry: lastKnownBalance * 0.1,
                    payoutPct: 0, lucro: 0, win: 0, red: 0
                });
            }
            
            dateCursor.setDate(dateCursor.getDate() + 1);
        }
        return rows;
    }, [records, activeBrokerage.initialBalance, startDate]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Planilha de Ganhos</h2>
                    <p className="text-xs text-slate-500 font-medium">Controle e projeção de juros compostos</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500">Data de Início:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`border rounded-lg px-3 py-1.5 text-sm focus:outline-none font-bold ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
                </div>
            </div>

            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm font-bold text-center border-collapse">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-600'}`}>
                                <th className="py-5 px-4 border-b border-slate-800/30">DATA</th>
                                <th className="py-5 px-4 border-b border-slate-800/30">BANCA</th>
                                <th className="py-5 px-4 border-b border-slate-800/30 text-yellow-500">ENTRADA</th>
                                <th className="py-5 px-4 border-b border-slate-800/30 text-sky-400">PAYOUT</th>
                                <th className="py-5 px-4 border-b border-slate-800/30">LUCRO</th>
                                <th className="py-5 px-4 border-b border-slate-800/30 text-purple-400">WIN</th>
                                <th className="py-5 px-4 border-b border-slate-800/30 text-red-500">RED</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/20">
                            {tableData.map((row) => (
                                <tr key={row.dateStr} className={`transition-all duration-200 ${row.isProjection ? 'opacity-40' : 'hover:bg-slate-800/20'} ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <td className="py-3 px-4 font-mono text-xs">{row.displayDate}</td>
                                    <td className="py-3 px-4 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-3 px-4 text-yellow-500/80">{currencySymbol} {formatMoney(row.entry)}</td>
                                    <td className="py-3 px-4 text-sky-400/80 font-mono">{row.payoutPct > 0 ? `${row.payoutPct.toFixed(0)}%` : '-'}</td>
                                    <td className={`py-3 px-4 font-black ${row.lucro > 0 ? 'text-green-500' : row.lucro < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {row.lucro !== 0 || !row.isProjection ? `${row.lucro >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(row.lucro)}` : '-'}
                                    </td>
                                    <td className={`py-3 px-4 ${row.win > 0 ? 'bg-purple-500/10 text-purple-400 text-lg' : ''}`}>
                                        <EditableCell value={row.win} onSave={(newWin) => onUpdateDay(row.dateStr, newWin, row.red)} />
                                    </td>
                                    <td className={`py-3 px-4 ${row.red > 0 ? 'bg-red-500/10 text-red-600 text-lg font-black' : ''}`}>
                                        <EditableCell value={row.red} onSave={(newRed) => onUpdateDay(row.dateStr, row.win, newRed)} />
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


// --- Reset Confirmation Modal ---
const ResetConfirmationModal: React.FC<{
    isDarkMode: boolean;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ isDarkMode, onClose, onConfirm }) => {
    const theme = useThemeClasses(isDarkMode);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${theme.card}`}>
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrashIcon className="w-8 h-8" />
                    </div>
                    <h3 className={`font-black text-xl ${theme.text}`}>Você tem certeza?</h3>
                    <p className={`mt-2 text-sm ${theme.textMuted}`}>
                        Esta ação é irreversível. Todos os seus registros de operações e metas serão permanentemente excluídos. Suas configurações de gestão serão restauradas para o padrão.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button
                        onClick={onClose}
                        className={`h-12 rounded-xl font-black uppercase tracking-widest transition-all border ${theme.border} ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="h-12 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                    >
                        Sim, Resetar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<{
    activeBrokerage: Brokerage;
    onSave: (updatedBrokerage: Brokerage) => void;
    onReset: () => void;
    isDarkMode: boolean;
}> = ({ activeBrokerage, onSave, onReset, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [formData, setFormData] = useState<Brokerage>(activeBrokerage);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setFormData(activeBrokerage);
    }, [activeBrokerage]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        const processedValue = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div>
                <h2 className={`text-2xl font-bold ${theme.text}`}>Configurações</h2>
                <p className={theme.textMuted}>Ajuste os parâmetros da sua gestão de banca.</p>
            </div>
            
            <form onSubmit={handleSubmit} className={`p-6 rounded-2xl border ${theme.card} max-w-3xl mx-auto`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    
                    <div className="md:col-span-2">
                        <label htmlFor="name" className="block text-xs font-black uppercase text-slate-500 mb-1">Nome da Gestão</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} />
                    </div>

                    <div>
                        <label htmlFor="initialBalance" className="block text-xs font-black uppercase text-slate-500 mb-1">Banca Inicial ({formData.currency})</label>
                        <input type="number" id="initialBalance" name="initialBalance" value={formData.initialBalance} onChange={handleChange} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} />
                    </div>
                    
                    <div>
                        <label htmlFor="payoutPercentage" className="block text-xs font-black uppercase text-slate-500 mb-1">Payout Padrão (%)</label>
                        <input type="number" id="payoutPercentage" name="payoutPercentage" value={formData.payoutPercentage} onChange={handleChange} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} />
                    </div>

                    <div>
                        <label htmlFor="stopGainTrades" className="block text-xs font-black uppercase text-slate-500 mb-1">Stop Gain (nº de wins)</label>
                        <input type="number" id="stopGainTrades" name="stopGainTrades" value={formData.stopGainTrades} onChange={handleChange} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} />
                    </div>

                    <div>
                        <label htmlFor="stopLossTrades" className="block text-xs font-black uppercase text-slate-500 mb-1">Stop Loss (nº de loss)</label>
                        <input type="number" id="stopLossTrades" name="stopLossTrades" value={formData.stopLossTrades} onChange={handleChange} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} />
                    </div>

                </div>
                <div className="mt-8 flex justify-end items-center gap-4">
                    {isSaved && <p className="text-sm font-bold text-green-500 transition-opacity">Salvo com sucesso!</p>}
                    <button type="submit" className="h-12 px-8 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-green-500/20">
                        Salvar
                    </button>
                </div>
            </form>

             <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50'} max-w-3xl mx-auto mt-8`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className={`font-black ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>Zona de Perigo</h4>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-red-400/70' : 'text-red-600'}`}>Resetar sua conta irá apagar todos os dados permanentemente.</p>
                    </div>
                     <button 
                        onClick={onReset}
                        className="h-11 px-6 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 text-sm flex-shrink-0"
                     >
                        Resetar Dados
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Add Goal Modal ---
const AddGoalModal: React.FC<{
    isDarkMode: boolean;
    onClose: () => void;
    onSave: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
}> = ({ isDarkMode, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [type, setType] = useState<'weekly' | 'monthly' | 'annual'>('monthly');

    const handleSave = () => {
        if (name && targetAmount) {
            onSave({
                name,
                targetAmount: parseFloat(targetAmount),
                type,
            });
            onClose();
        }
    };
    
    const theme = useThemeClasses(isDarkMode);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${theme.card}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl">Criar Nova Meta</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800/20 rounded-full transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome da Meta</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Entrada do apartamento" className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Valor Alvo ($)</label>
                        <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="5000" className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tipo de Meta</label>
                         <div className="grid grid-cols-3 gap-2 mt-1">
                            {(['weekly', 'monthly', 'annual'] as const).map(t => (
                                <button key={t} onClick={() => setType(t)} className={`h-12 rounded-xl font-bold text-xs border transition-all capitalize ${type === t ? 'bg-green-500 text-slate-950 border-green-500' : 'text-slate-500 border-slate-800'}`}>{t === 'weekly' ? 'Semanal' : t === 'monthly' ? 'Mensal' : 'Anual'}</button>
                            ))}
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleSave}
                    className="w-full h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-xl mt-8 transition-all shadow-xl shadow-green-500/20 uppercase tracking-widest"
                >
                    Salvar Meta
                </button>
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel: React.FC<{
    goals: Goal[];
    setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
    records: AppRecord[];
    isDarkMode: boolean;
    activeBrokerage: Brokerage;
}> = ({ goals, setGoals, records, isDarkMode, activeBrokerage }) => {
    const theme = useThemeClasses(isDarkMode);
    const [isAddingGoal, setIsAddingGoal] = useState(false);

    const getProfitForPeriod = (type: 'weekly' | 'monthly' | 'annual') => {
        const now = new Date();
        let startDate = new Date();

        if (type === 'weekly') {
            const firstDayOfWeek = now.getDate() - now.getDay();
            startDate = new Date(now.setDate(firstDayOfWeek));
        } else if (type === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (type === 'annual') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }
        startDate.setHours(0,0,0,0);
        
        const relevantRecords = records.filter((r): r is DailyRecord => 
            r.recordType === 'day' && new Date(r.date + 'T00:00:00Z') >= startDate
        );

        return relevantRecords.reduce((acc, rec) => acc + rec.netProfitUSD, 0);
    };

    const handleAddGoal = (goalData: Omit<Goal, 'id' | 'createdAt'>) => {
        const newGoal: Goal = {
            ...goalData,
            id: Date.now().toString(),
            createdAt: Date.now(),
        };
        setGoals(prev => [...prev, newGoal]);
    };
    
    const handleDeleteGoal = (id: string) => {
        setGoals(prev => prev.filter(g => g.id !== id));
    };

    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';

    return (
        <div className="p-4 md:p-8 space-y-6">
             {isAddingGoal && (
                <AddGoalModal 
                    isDarkMode={isDarkMode} 
                    onClose={() => setIsAddingGoal(false)} 
                    onSave={handleAddGoal}
                />
            )}
            <div className="flex justify-between items-center">
                 <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Metas Financeiras</h2>
                    <p className={theme.textMuted}>Defina e acompanhe seus objetivos de lucro.</p>
                </div>
                <button onClick={() => setIsAddingGoal(true)} className="flex items-center gap-2 h-10 px-4 bg-green-500 hover:bg-green-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-green-500/20">
                    <PlusIcon className="w-5 h-5" />
                    <span>Nova Meta</span>
                </button>
            </div>

            {goals.length === 0 ? (
                 <div className={`p-10 rounded-2xl border ${theme.card} text-center ${theme.textMuted}`}>
                    <TrophyIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <h3 className={`font-bold text-lg mb-1 ${theme.text}`}>Nenhuma meta definida</h3>
                    <p>Clique em "Nova Meta" para começar a planejar seus objetivos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map(goal => {
                        const currentProfit = getProfitForPeriod(goal.type);
                        const progress = Math.min((currentProfit / goal.targetAmount) * 100, 100);
                        const remainingAmount = Math.max(0, goal.targetAmount - currentProfit);
                        
                        let dailyTarget = 0, weeklyTarget = 0;
                        if(goal.type === 'monthly' && remainingAmount > 0) {
                            const remainingDays = getRemainingBusinessDays();
                            const remainingWeeks = getRemainingWeeks();
                            dailyTarget = remainingDays > 0 ? remainingAmount / remainingDays : 0;
                            weeklyTarget = remainingWeeks > 0 ? remainingAmount / remainingWeeks : 0;
                        }

                        return (
                            <div key={goal.id} className={`p-6 rounded-2xl border ${theme.card} flex flex-col group`}>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs uppercase font-black text-slate-500 tracking-wider">{goal.type === 'weekly' ? 'Semanal' : goal.type === 'monthly' ? 'Mensal' : 'Anual'}</p>
                                        <button onClick={() => handleDeleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-500/10 p-1.5 rounded-full">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                    <h3 className={`font-black text-lg ${theme.text} mt-1`}>{goal.name}</h3>
                                    <p className="text-2xl font-black text-green-500 mt-2">
                                        {currencySymbol} {formatMoney(currentProfit)}
                                        <span className={`text-sm font-bold ml-2 ${theme.textMuted}`}>de {currencySymbol} {formatMoney(goal.targetAmount)}</span>
                                    </p>
                                </div>
                                <div className="mt-4">
                                    <div className="w-full bg-slate-800 rounded-full h-2.5">
                                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="text-right text-xs font-bold mt-2 text-slate-400">{progress.toFixed(1)}%</p>
                                </div>
                                {goal.type === 'monthly' && dailyTarget > 0 && (
                                    <div className={`mt-4 pt-4 border-t ${theme.border} grid grid-cols-2 gap-4 text-center`}>
                                        <div>
                                            <p className="text-xs uppercase font-black text-slate-500 tracking-wider">Meta Diária</p>
                                            <p className={`font-bold text-sm ${theme.text}`}>{currencySymbol} {formatMoney(dailyTarget)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase font-black text-slate-500 tracking-wider">Meta Semanal</p>
                                            <p className={`font-bold text-sm ${theme.text}`}>{currencySymbol} {formatMoney(weeklyTarget)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};


// --- Sidebar Component ---

const Sidebar: React.FC<{
    activeTab: any;
    setActiveTab: any;
    onLogout: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    isOpen: boolean;
    onClose: () => void;
}> = ({ activeTab, setActiveTab, onLogout, isDarkMode, toggleTheme, isOpen, onClose }) => {
    const theme = useThemeClasses(isDarkMode);
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGridIcon },
        { id: 'analyze', label: 'Analisar (IA)', icon: CpuChipIcon },
        { id: 'compound', label: 'Planilha Ganhos', icon: ChartBarIcon },
        { id: 'goals', label: 'Metas', icon: TrophyIcon },
        { id: 'settings', label: 'Configurações', icon: SettingsIcon },
    ];

    return (
        <>
            {isOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm" onClick={onClose}></div>}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${theme.sidebar}`}>
                <div className="h-20 flex items-center justify-center border-b border-slate-800/50">
                    <span className="text-xl font-black tracking-tighter text-green-500 uppercase italic">HRK <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>Analytics</span></span>
                </div>
                <nav className="flex-1 px-4 py-8 space-y-2">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${activeTab === item.id ? theme.navActive : theme.navInactive}`}>
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="p-4 space-y-2 border-t border-slate-800/50">
                     <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-bold hover:text-white transition-colors">
                        {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        <span>{isDarkMode ? 'Tema Claro' : 'Tema Escuro'}</span>
                     </button>
                     <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition-all">
                        <LogoutIcon className="w-5 h-5" />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

// --- App Root Logic ---

const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'analyze' | 'compound' | 'settings' | 'goals'>('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');

    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const defaultBrokerage: Brokerage = { id: crypto.randomUUID(), name: 'Gestão Profissional', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' };
    
    // Fetch all user data from the server on initial load
    useEffect(() => {
        const fetchData = async () => {
            isInitialLoad.current = true;
            setIsLoading(true);
            try {
                const response = await fetch(`/api/get-data?userId=${user.id}`);
                const data = await response.json();
                if (response.ok) {
                    if (!data.brokerages || data.brokerages.length === 0) {
                        setBrokerages([defaultBrokerage]);
                    } else {
                        setBrokerages(data.brokerages);
                    }
                    setRecords(data.records || []);
                    setGoals(data.goals || []);
                } else {
                    console.error("Failed to fetch data:", data.error);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
                setTimeout(() => { isInitialLoad.current = false; }, 500);
            }
        };
        fetchData();
    }, [user.id]);

    const saveDataToServer = useCallback(async () => {
        if (isInitialLoad.current) return;
        try {
            await fetch('/api/save-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, brokerages, records, goals }),
            });
        } catch (error) {
            console.error("Failed to save data:", error);
        }
    }, [user.id, brokerages, records, goals]);

    const debouncedSave = useDebouncedCallback(saveDataToServer, 2000);

    useEffect(() => {
        if (!isInitialLoad.current) {
            debouncedSave();
        }
    }, [brokerages, records, goals, debouncedSave]);

    const [activeBrokerageId, setActiveBrokerageId] = useState('');
    const activeBrokerage = useMemo(() => brokerages.find(b => b.id === activeBrokerageId) || brokerages[0], [brokerages, activeBrokerageId]);
    
    useEffect(() => {
        if (brokerages.length > 0 && !activeBrokerageId) {
            setActiveBrokerageId(brokerages[0].id);
        }
    }, [brokerages, activeBrokerageId]);
    
    const [selectedDate, setSelectedDate] = useState(new Date());

    const recalculateAllBalances = useCallback((dayRecords: DailyRecord[], initialBalance: number) => {
        const sortedRecords = [...dayRecords].sort((a, b) => a.date.localeCompare(b.date));
        let currentBalance = initialBalance;
        
        return sortedRecords.map(rec => {
            const startBalanceUSD = currentBalance;
            const netProfitUSD = rec.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
            const endBalanceUSD = startBalanceUSD + netProfitUSD;
            currentBalance = endBalanceUSD;
            
            return {
                ...rec,
                startBalanceUSD,
                netProfitUSD,
                endBalanceUSD,
                winCount: rec.trades.filter(t => t.result === 'win').length,
                lossCount: rec.trades.filter(t => t.result === 'loss').length,
            };
        });
    }, []);

    const handleUpdateBrokerage = (updatedBrokerage: Brokerage) => {
        const oldBrokerage = brokerages.find(b => b.id === updatedBrokerage.id);
        setBrokerages(prev => prev.map(b => b.id === updatedBrokerage.id ? updatedBrokerage : b));
    
        if (oldBrokerage && oldBrokerage.initialBalance !== updatedBrokerage.initialBalance && activeBrokerage) {
            setRecords(prevRecords => {
                const dayRecords = prevRecords.filter((r): r is DailyRecord => r.recordType === 'day');
                const nonDayRecords = prevRecords.filter(r => r.recordType !== 'day');
                const recalculated = recalculateAllBalances(dayRecords, updatedBrokerage.initialBalance);
                return [...recalculated, ...nonDayRecords];
            });
        }
    };

    const handleDataReset = () => {
        const newDefaultBrokerage = { ...defaultBrokerage, id: crypto.randomUUID() };
        setBrokerages([newDefaultBrokerage]);
        setActiveBrokerageId(newDefaultBrokerage.id);
        setRecords([]);
        setGoals([]);
        setIsResetting(false);
    };

    const addRecord = (winCount: number, lossCount: number, customEntry?: number, customPayout?: number) => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        setRecords(prev => {
            const tempRecords = [...prev];
            const lastRec = tempRecords.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.date.localeCompare(a.date))[0];
            const startBal = lastRec ? lastRec.endBalanceUSD : activeBrokerage.initialBalance;
            
            const existingIdx = tempRecords.findIndex(r => r.id === dateStr && r.recordType === 'day');
            const entry = customEntry || (activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : startBal * (activeBrokerage.entryValue/100));
            const payout = customPayout || activeBrokerage.payoutPercentage;

            const createTrades = (w: number, l: number): Trade[] => {
                const t: Trade[] = [];
                for(let i=0; i<w; i++) t.push({id: crypto.randomUUID(), result: 'win', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
                for(let i=0; i<l; i++) t.push({id: crypto.randomUUID(), result: 'loss', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
                return t;
            };

            if (existingIdx >= 0) {
                const current = tempRecords[existingIdx] as DailyRecord;
                const updatedTrades = [...current.trades, ...createTrades(winCount, lossCount)];
                tempRecords[existingIdx] = { ...current, trades: updatedTrades };
            } else {
                const trades = createTrades(winCount, lossCount);
                tempRecords.push({ recordType: 'day', brokerageId: activeBrokerageId, id: dateStr, date: dateStr, startBalanceUSD: startBal, trades, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            
            const dayRecords = tempRecords.filter((r): r is DailyRecord => r.recordType === 'day');
            const nonDayRecords = tempRecords.filter(r => r.recordType !== 'day');
            const recalculated = recalculateAllBalances(dayRecords, activeBrokerage.initialBalance);
            return [...recalculated, ...nonDayRecords];
        });
    };
    
    const handleUpdateDayRecord = (dateStr: string, newWin: number, newLoss: number) => {
        setRecords(prevRecords => {
            let baseRecords = [...prevRecords];
            let recordToUpdate: DailyRecord;
            const recordIdx = baseRecords.findIndex(r => r.id === dateStr && r.recordType === 'day');

            if (recordIdx !== -1) {
                recordToUpdate = { ...baseRecords[recordIdx] as DailyRecord };
            } else {
                const lastRec = baseRecords.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.date.localeCompare(a.date))[0];
                const startBal = lastRec ? lastRec.endBalanceUSD : activeBrokerage.initialBalance;
                recordToUpdate = { recordType: 'day', brokerageId: activeBrokerageId, id: dateStr, date: dateStr, startBalanceUSD: startBal, trades: [], winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: startBal };
            }

            const trades = [...recordToUpdate.trades];
            const winDiff = newWin - recordToUpdate.winCount;
            const lossDiff = newLoss - recordToUpdate.lossCount;
            const entry = recordToUpdate.startBalanceUSD * (activeBrokerage.entryValue / 100) || activeBrokerage.entryValue;
            const payout = activeBrokerage.payoutPercentage;

            if (winDiff > 0) for (let i = 0; i < winDiff; i++) trades.push({ id: crypto.randomUUID(), result: 'win', entryValue: entry, payoutPercentage: payout, timestamp: new Date(dateStr).getTime() });
            else if (winDiff < 0) for (let i = 0; i < Math.abs(winDiff); i++) { const idx = trades.map(t => t.result).lastIndexOf('win'); if(idx > -1) trades.splice(idx, 1); }
            if (lossDiff > 0) for (let i = 0; i < lossDiff; i++) trades.push({ id: crypto.randomUUID(), result: 'loss', entryValue: entry, payoutPercentage: payout, timestamp: new Date(dateStr).getTime() });
            else if (lossDiff < 0) for (let i = 0; i < Math.abs(lossDiff); i++) { const idx = trades.map(t => t.result).lastIndexOf('loss'); if(idx > -1) trades.splice(idx, 1); }
            
            recordToUpdate.trades = trades;

            if (recordIdx !== -1) baseRecords[recordIdx] = recordToUpdate;
            else baseRecords.push(recordToUpdate);
            
            const dayRecords = baseRecords.filter((r): r is DailyRecord => r.recordType === 'day');
            const nonDayRecords = baseRecords.filter(r => r.recordType !== 'day');
            const recalculated = recalculateAllBalances(dayRecords, activeBrokerage.initialBalance);
            return [...recalculated, ...nonDayRecords];
        });
    };

    const deleteTrade = (tradeId: string, dateStr: string) => {
        setRecords(prev => {
            const newRecords = [...prev];
            const idx = newRecords.findIndex(r => r.id === dateStr && r.recordType === 'day');
            if (idx === -1) return prev;
            
            const record = newRecords[idx] as DailyRecord;
            const newTrades = record.trades.filter(t => t.id !== tradeId);
            
            if (newTrades.length === 0 && record.trades.length > 0) {
                newRecords.splice(idx, 1);
            } else {
                newRecords[idx] = { ...record, trades: newTrades };
            }
            
            const dayRecords = newRecords.filter((r): r is DailyRecord => r.recordType === 'day');
            const nonDayRecords = newRecords.filter(r => r.recordType !== 'day');
            const recalculated = recalculateAllBalances(dayRecords, activeBrokerage.initialBalance);
            return [...recalculated, ...nonDayRecords];
        });
    };

    const updateTrade = (tradeId: string, dateStr: string, updatedData: Partial<Trade>) => {
        setRecords(prev => {
            const newRecords = [...prev];
            const idx = newRecords.findIndex(r => r.id === dateStr && r.recordType === 'day');
            if (idx === -1) return prev;
            
            const record = newRecords[idx] as DailyRecord;
            const newTrades = record.trades.map(t => t.id === tradeId ? { ...t, ...updatedData } : t);
            newRecords[idx] = { ...record, trades: newTrades };

            const dayRecords = newRecords.filter((r): r is DailyRecord => r.recordType === 'day');
            const nonDayRecords = newRecords.filter(r => r.recordType !== 'day');
            const recalculated = recalculateAllBalances(dayRecords, activeBrokerage.initialBalance);
            return [...recalculated, ...nonDayRecords];
        });
    };

    const dailyRecord = records.find(r => r.id === selectedDate.toISOString().split('T')[0] && r.recordType === 'day') as DailyRecord;
    const startBal = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < selectedDate.toISOString().split('T')[0]).sort((a,b) => b.date.localeCompare(a.date))[0]?.endBalanceUSD || activeBrokerage?.initialBalance;

    if (isLoading) {
        return (
            <div className={`flex h-screen w-full items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className={`flex h-screen overflow-hidden font-sans ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            {isResetting && <ResetConfirmationModal isDarkMode={isDarkMode} onClose={() => setIsResetting(false)} onConfirm={handleDataReset} />}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <main className="flex-1 flex flex-col overflow-hidden w-full">
                <header className={`h-20 flex items-center justify-between md:justify-end px-4 md:px-8 border-b ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2"><MenuIcon className="w-6 h-6" /></button>
                    <div className="flex items-center gap-4">
                         <div className="text-right hidden sm:block"><p className="text-[10px] font-black uppercase text-slate-500">Daytrader</p><p className="text-sm font-black">{user.username}</p></div>
                         <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-green-500/20 uppercase">{user.username.slice(0, 2)}</div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'dashboard' && activeBrokerage && (
                        <DashboardPanel 
                            activeBrokerage={activeBrokerage} 
                            addRecord={addRecord} 
                            deleteTrade={deleteTrade}
                            updateTrade={updateTrade}
                            customEntryValue={customEntryValue}
                            setCustomEntryValue={setCustomEntryValue}
                            customPayout={customPayout}
                            setCustomPayout={setCustomPayout}
                            selectedDateString={selectedDate.toISOString().split('T')[0]} 
                            setSelectedDate={setSelectedDate} 
                            dailyRecordForSelectedDay={dailyRecord} 
                            startBalanceForSelectedDay={startBal} 
                            isDarkMode={isDarkMode} 
                            dailyGoalTarget={10} 
                        />
                    )}
                    {activeTab === 'analyze' && <AnalysisPanel isDarkMode={isDarkMode} />}
                    {activeTab === 'compound' && activeBrokerage && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} onUpdateDay={handleUpdateDayRecord} />}
                    {activeTab === 'settings' && activeBrokerage && <SettingsPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} onSave={handleUpdateBrokerage} onReset={() => setIsResetting(true)} />}
                    {activeTab === 'goals' && activeBrokerage && <GoalsPanel goals={goals} setGoals={setGoals} records={records} isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} />}
                </div>
            </main>
        </div>
    );
};

export default App;