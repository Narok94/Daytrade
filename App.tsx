import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, TransactionRecord, AppRecord, Trade, User } from './types';
import { GoogleGenAI, Type } from "@google/genai";
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

interface GoalSettings {
    type: 'weekly' | 'monthly' | 'annual';
    amount: number | '';
}

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

// --- Panels ---

const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, usdToBrlRate, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    
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
    const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-bold ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Resumo de performance diária</p></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00Z'))} className={`border rounded-lg px-4 py-2 text-sm focus:outline-none font-bold ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Banca Atual', val: `${currencySymbol} ${formatCurrency(currentBalance)}`, icon: PieChartIcon, color: 'text-green-500' },
                    { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatCurrency(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-green-500' : 'text-red-500' },
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
                    <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades && dailyRecordForSelectedDay.trades.length > 0 ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] uppercase font-black text-slate-500 border-b border-slate-800/30">
                                        <th className="pb-2">Hora</th>
                                        <th className="pb-2 text-center">Tipo</th>
                                        <th className="pb-2 text-right">Entrada</th>
                                        <th className="pb-2 text-right">Lucro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/20">
                                    {[...dailyRecordForSelectedDay.trades].reverse().map((trade, idx) => {
                                        const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                        const timeStr = trade.timestamp ? new Date(trade.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                        return (
                                            <tr key={idx} className="text-sm">
                                                <td className="py-3 font-mono opacity-60">{timeStr}</td>
                                                <td className="py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${trade.result === 'win' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {trade.result}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right font-mono text-xs opacity-80">{currencySymbol} {formatMoney(trade.entryValue)}</td>
                                                <td className={`py-3 text-right font-black ${tradeProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}
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

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                config: { responseMimeType: "application/json" }
            });
            setSignal(JSON.parse(response.text));
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

const CompoundInterestPanel: React.FC<{ isDarkMode: boolean; activeBrokerage: Brokerage; records: AppRecord[] }> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';

    const tableData = useMemo(() => {
        const realDays = records
            .filter(r => r.recordType === 'day')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) as DailyRecord[];
        
        const rows: any[] = realDays.map(day => {
            const dateObj = new Date(day.date + 'T00:00:00Z');
            const displayDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            const entryVal = day.startBalanceUSD * 0.1;
            
            // Coletar Payout médio REAL das operações realizadas
            const hasOps = day.trades && day.trades.length > 0;
            const avgPayout = hasOps 
                ? day.trades.reduce((acc, t) => acc + t.payoutPercentage, 0) / day.trades.length 
                : 0;

            return {
                isProjection: false,
                displayDate,
                initial: day.startBalanceUSD,
                entry: entryVal,
                payoutPct: avgPayout,
                lucro: hasOps ? day.netProfitUSD : 0,
                win: hasOps ? day.winCount : 0,
                red: hasOps ? day.lossCount : 0
            };
        });

        let currentBalance = realDays.length > 0 ? realDays[realDays.length - 1].endBalanceUSD : activeBrokerage.initialBalance;
        let lastDate = realDays.length > 0 ? new Date(realDays[realDays.length - 1].date + 'T00:00:00Z') : new Date();

        for (let i = 1; i <= 30; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);
            const displayDate = nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            
            rows.push({
                isProjection: true,
                displayDate,
                initial: currentBalance,
                entry: currentBalance * 0.1,
                payoutPct: 0, // Zeroed as per request for future days
                lucro: 0,
                win: 0,
                red: 0
            });
        }

        return rows;
    }, [records, activeBrokerage]);

    const projSummary = useMemo(() => {
        let lastRealBalance = records
            .filter(r => r.recordType === 'day')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .pop()?.endBalanceUSD || activeBrokerage.initialBalance;

        const calculateGoal = (days: number) => {
            let bal = lastRealBalance;
            const payoutPct = activeBrokerage.payoutPercentage / 100;
            for(let i=0; i<days; i++) {
                const entry = bal * 0.1;
                bal += (entry * payoutPct) * 3;
            }
            return bal;
        };

        return { goal15: calculateGoal(15), goal30: calculateGoal(30) };
    }, [records, activeBrokerage]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Planilha de Ganhos</h2>
                    <p className="text-xs text-slate-500 font-medium">Controle automatizado de juros compostos</p>
                </div>
                
                <div className="flex gap-3 md:gap-4 flex-wrap">
                    <div className={`p-4 px-6 rounded-2xl border flex flex-col items-center justify-center min-w-[160px] relative overflow-hidden ${theme.card}`}>
                         <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">ALVO 15 DIAS</p>
                         <p className="text-lg font-black text-purple-400">{currencySymbol} {formatMoney(projSummary.goal15)}</p>
                    </div>
                    <div className={`p-4 px-6 rounded-2xl border flex flex-col items-center justify-center min-w-[160px] relative overflow-hidden ${theme.card}`}>
                         <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">ALVO 30 DIAS</p>
                         <p className="text-lg font-black text-green-500">{currencySymbol} {formatMoney(projSummary.goal30)}</p>
                    </div>
                </div>
            </div>

            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm font-bold text-center border-collapse">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-600'}`}>
                                <th className="py-5 px-4 border-b border-slate-800/30">DATA</th>
                                <th className="py-5 px-4 border-b border-slate-800/30">BANCA</th>
                                <th className="py-5 px-4 border-b border-slate-800/30 text-yellow-500">ENTRADA (10%)</th>
                                <th className="py-5 px-4 border-b border-slate-800/30 text-sky-400">PAYOUT</th>
                                <th className="py-5 px-4 border-b border-slate-800/30">LUCRO</th>
                                <th className="py-5 px-4 border-b border-slate-800/30 text-purple-400">WIN</th>
                                <th className="py-5 px-4 border-b border-slate-800/30 text-red-500">RED</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/20">
                            {tableData.map((row, idx) => (
                                <tr key={idx} className={`transition-all duration-200 group ${row.isProjection ? 'opacity-30 italic' : 'hover:bg-slate-800/20'} ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <td className="py-4 px-4 font-mono text-xs">{row.displayDate}</td>
                                    <td className="py-4 px-4 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-4 px-4 text-yellow-500/80">{currencySymbol} {formatMoney(row.entry)}</td>
                                    <td className="py-4 px-4 text-sky-400/80 font-mono">{row.payoutPct > 0 ? `${row.payoutPct.toFixed(0)}%` : '-'}</td>
                                    <td className={`py-4 px-4 font-black ${row.lucro > 0 ? 'text-green-500' : row.lucro < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {row.lucro !== 0 ? `${row.lucro > 0 ? '+' : ''}${currencySymbol} ${formatMoney(row.lucro)}` : '-'}
                                    </td>
                                    <td className={`py-4 px-4 ${row.win > 0 ? 'bg-purple-500/10 text-purple-400 text-lg' : 'text-slate-700'}`}>
                                        {row.win || 0}
                                    </td>
                                    <td className={`py-4 px-4 ${row.red > 0 ? 'bg-red-500/10 text-red-600 text-lg font-black' : 'text-slate-700'}`}>
                                        {row.red || 0}
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

// --- APP ROOT ---

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

const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'analyze' | 'compound' | 'settings'>('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const [brokerages, setBrokerages] = useState<Brokerage[]>(() => {
        const defaultBrokerage: Brokerage = { id: '1', name: 'Gestão Profissional', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' };
        const s = localStorage.getItem(`app_brokerages_${user.username}`);
        return s ? JSON.parse(s) : [defaultBrokerage];
    });
    const [activeBrokerageId, setActiveBrokerageId] = useState(brokerages[0]?.id || '');
    const activeBrokerage = useMemo(() => brokerages.find(b => b.id === activeBrokerageId) || brokerages[0], [brokerages, activeBrokerageId]);
    
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        const savedRecords = localStorage.getItem(`app_records_${user.username}_${activeBrokerageId}`);
        if (savedRecords) setRecords(JSON.parse(savedRecords));
    }, [activeBrokerageId, user.username]);

    useEffect(() => {
        localStorage.setItem(`app_records_${user.username}_${activeBrokerageId}`, JSON.stringify(records));
        localStorage.setItem(`app_brokerages_${user.username}`, JSON.stringify(brokerages));
    }, [records, brokerages, user.username, activeBrokerageId]);

    const addRecord = (winCount: number, lossCount: number, customEntry?: number, customPayout?: number) => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const lastRec = [...records].filter(r => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.date.localeCompare(a.date))[0] as DailyRecord;
        const startBal = lastRec ? lastRec.endBalanceUSD : activeBrokerage.initialBalance;
        
        const existingIdx = records.findIndex(r => r.id === dateStr && r.recordType === 'day');
        const entry = customEntry || (activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : startBal * (activeBrokerage.entryValue/100));
        const payout = customPayout || activeBrokerage.payoutPercentage;

        const createTrades = (w: number, l: number): Trade[] => {
            const t: Trade[] = [];
            for(let i=0; i<w; i++) t.push({id: `${Date.now()}-w-${i}`, result: 'win', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
            for(let i=0; i<l; i++) t.push({id: `${Date.now()}-l-${i}`, result: 'loss', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
            return t;
        };

        if (existingIdx >= 0) {
            const current = records[existingIdx] as DailyRecord;
            const updatedTrades = [...current.trades, ...createTrades(winCount, lossCount)];
            const profit = updatedTrades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : -t.entryValue), 0);
            const updated = [...records];
            updated[existingIdx] = { ...current, trades: updatedTrades, winCount: updatedTrades.filter(t => t.result === 'win').length, lossCount: updatedTrades.filter(t => t.result === 'loss').length, netProfitUSD: profit, endBalanceUSD: current.startBalanceUSD + profit };
            setRecords(updated);
        } else {
            const trades = createTrades(winCount, lossCount);
            const profit = trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : -t.entryValue), 0);
            setRecords([...records, { recordType: 'day', brokerageId: activeBrokerageId, id: dateStr, date: dateStr, startBalanceUSD: startBal, trades, winCount: trades.filter(t => t.result === 'win').length, lossCount: trades.filter(t => t.result === 'loss').length, netProfitUSD: profit, endBalanceUSD: startBal + profit }]);
        }
    };

    const dailyRecord = records.find(r => r.id === selectedDate.toISOString().split('T')[0] && r.recordType === 'day') as DailyRecord;
    const startBal = records.filter(r => r.recordType === 'day' && r.date < selectedDate.toISOString().split('T')[0]).sort((a,b) => b.date.localeCompare(a.date))[0]?.endBalanceUSD || activeBrokerage.initialBalance;

    return (
        <div className={`flex h-screen overflow-hidden font-sans ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
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
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} addRecord={addRecord} selectedDateString={selectedDate.toISOString().split('T')[0]} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBal} isDarkMode={isDarkMode} dailyGoalTarget={10} />}
                    {activeTab === 'analyze' && <AnalysisPanel isDarkMode={isDarkMode} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                </div>
            </main>
        </div>
    );
};

export default App;