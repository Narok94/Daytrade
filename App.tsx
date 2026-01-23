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

// Helper to manage theme classes
const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
        cardHover: isDarkMode ? 'hover:shadow-md' : 'hover:shadow-md',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950' : 'bg-white border-b border-slate-200',
        tableHeader: isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50',
        tableRow: isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50',
        navActive: isDarkMode ? 'bg-slate-900/50 text-green-400' : 'bg-green-50 text-green-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
        modalOverlay: 'bg-black/80',
        modalContent: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
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
                <div><h2 className={`text-2xl font-bold ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Gestão de performance em tempo real</p></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00Z'))} className={`border rounded-lg px-4 py-2 text-sm focus:outline-none ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-700'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Banca Atual', val: `${currencySymbol} ${formatCurrency(currentBalance)}`, icon: PieChartIcon, color: 'text-green-500' },
                    { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatCurrency(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-green-500' : 'text-red-500' },
                    { label: 'Meta Diária', val: `${dailyGoalTarget > 0 ? ((currentProfit / dailyGoalTarget) * 100).toFixed(0) : 0}%`, icon: TargetIcon, color: 'text-blue-400' },
                    { label: 'Assertividade', val: `${winRate}%`, icon: TrophyIcon, color: 'text-purple-400' },
                ].map((kpi, i) => (
                    <div key={i} className={`p-4 rounded-2xl border ${theme.card}`}>
                        <div className="flex justify-between items-start mb-1">
                            <div><p className="text-[10px] uppercase font-bold text-slate-500">{kpi.label}</p><p className={`text-lg font-bold ${kpi.color}`}>{kpi.val}</p></div>
                            <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className={`p-6 rounded-2xl border ${theme.card}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold">Ações de Trade</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} placeholder="Entrada $" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} />
                    <input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} placeholder="Payout %" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} />
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleQuickAdd('win')} className="h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-xl uppercase tracking-widest transition-all">WIN</button>
                    <button onClick={() => handleQuickAdd('loss')} className="h-14 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl uppercase tracking-widest transition-all">LOSS</button>
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

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const tableData = useMemo(() => {
        // 1. Get real historical days
        const realDays = records
            .filter(r => r.recordType === 'day')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) as DailyRecord[];
        
        const rows: any[] = realDays.map(day => {
            const dateObj = new Date(day.date + 'T00:00:00Z');
            const displayDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            
            // Entrada is exactly 10% of that day's starting bank
            const entryVal = day.startBalanceUSD * 0.1;
            
            // Collect actual Payout percentage from the day's trades (taking the average)
            const dayPayoutPct = day.trades && day.trades.length > 0 
                ? day.trades.reduce((acc, t) => acc + t.payoutPercentage, 0) / day.trades.length 
                : activeBrokerage.payoutPercentage;
            
            const hasOperations = day.trades && day.trades.length > 0;
            const lucroReal = hasOperations ? day.netProfitUSD : 0;

            return {
                isProjection: false,
                displayDate,
                initial: day.startBalanceUSD,
                entry: entryVal,
                payoutPct: dayPayoutPct,
                lucro: lucroReal,
                win: hasOperations ? day.winCount : 0,
                red: hasOperations ? day.lossCount : 0
            };
        });

        // 2. Generate Projection rows (30 days)
        let currentBalance = realDays.length > 0 ? realDays[realDays.length - 1].endBalanceUSD : activeBrokerage.initialBalance;
        let lastDate = realDays.length > 0 ? new Date(realDays[realDays.length - 1].date + 'T00:00:00Z') : new Date();

        for (let i = 1; i <= 30; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);
            const displayDate = nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
            
            const entryVal = currentBalance * 0.1;

            rows.push({
                isProjection: true,
                displayDate,
                initial: currentBalance,
                entry: entryVal,
                payoutPct: activeBrokerage.payoutPercentage,
                lucro: 0, // Zeroed as per request
                win: 0,   // Zeroed as per request
                red: 0    // Zeroed as per request
            });
        }

        return rows;
    }, [records, activeBrokerage]);

    // Summary calculation for 15 and 30 days projection GOALS
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
                const dailyProfit = (entry * payoutPct) * 3; // Goal: 3 wins
                bal += dailyProfit;
            }
            return bal;
        };

        return {
            goal15: calculateGoal(15),
            goal30: calculateGoal(30)
        };
    }, [records, activeBrokerage]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Planilha de Ganhos</h2>
                    <p className="text-xs text-slate-500 font-medium">Controle de juros compostos e projeção de metas</p>
                </div>
                
                <div className="flex gap-3 md:gap-4 flex-wrap">
                    <div className={`p-4 px-6 rounded-2xl border flex flex-col items-center justify-center min-w-[160px] relative overflow-hidden ${theme.card}`}>
                         <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">POTENCIAL 15 DIAS</p>
                         <p className="text-lg font-black text-purple-400">{currencySymbol} {formatMoney(projSummary.goal15)}</p>
                    </div>
                    <div className={`p-4 px-6 rounded-2xl border flex flex-col items-center justify-center min-w-[160px] relative overflow-hidden ${theme.card}`}>
                         <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">POTENCIAL 30 DIAS</p>
                         <p className="text-lg font-black text-green-500">{currencySymbol} {formatMoney(projSummary.goal30)}</p>
                    </div>
                </div>
            </div>

            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm font-bold text-center border-collapse">
                        <thead>
                            <tr className={`text-[11px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                <th className="py-5 px-4 border-b border-slate-800/50">DATA</th>
                                <th className="py-5 px-4 border-b border-slate-800/50">BANCA INICIAL</th>
                                <th className="py-5 px-4 border-b border-slate-800/50 text-yellow-500">ENTRADA (10%)</th>
                                <th className="py-5 px-4 border-b border-slate-800/50 text-sky-400">PAYOUT</th>
                                <th className="py-5 px-4 border-b border-slate-800/50">LUCRO</th>
                                <th className="py-5 px-4 border-b border-slate-800/50 text-purple-400">WIN</th>
                                <th className="py-5 px-4 border-b border-slate-800/50 text-red-500">RED</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/30">
                            {tableData.map((row, idx) => (
                                <tr key={idx} className={`transition-all duration-200 group ${row.isProjection ? 'opacity-40 hover:opacity-100 italic' : 'hover:bg-slate-800/20'} ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <td className="py-4 px-4 font-mono">{row.displayDate}</td>
                                    <td className="py-4 px-4">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-4 px-4 text-yellow-500/90">{currencySymbol} {formatMoney(row.entry)}</td>
                                    <td className="py-4 px-4 text-sky-400/90">{row.payoutPct}%</td>
                                    <td className={`py-4 px-4 font-black ${row.lucro > 0 ? 'text-green-500' : row.lucro < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {row.lucro !== 0 ? `${row.lucro > 0 ? '+' : ''}${currencySymbol} ${formatMoney(row.lucro)}` : '-'}
                                    </td>
                                    <td className={`py-4 px-4 ${row.win > 0 ? 'bg-purple-500/10 text-purple-400 text-lg' : 'text-slate-600'}`}>
                                        {row.win || 0}
                                    </td>
                                    <td className={`py-4 px-4 ${row.red > 0 ? 'bg-red-500/10 text-red-500 text-lg' : 'text-slate-600'}`}>
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

// --- Sidebar Component & Main Logic ---

const Sidebar: React.FC<{
    activeTab: 'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze' | 'soros' | 'compound';
    setActiveTab: (tab: 'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze' | 'soros' | 'compound') => void;
    onLogout: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    isOpen: boolean;
    onClose: () => void;
}> = ({ activeTab, setActiveTab, onLogout, isDarkMode, toggleTheme, isOpen, onClose }) => {
    const theme = useThemeClasses(isDarkMode);

    const navItems: {id: any, label: string, icon: any}[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGridIcon },
        { id: 'analyze', label: 'Analisar (IA)', icon: CpuChipIcon },
        { id: 'compound', label: 'Planilha Juros', icon: ChartBarIcon },
        { id: 'settings', label: 'Configurações', icon: SettingsIcon },
    ];

    return (
        <>
            {isOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm" onClick={onClose}></div>}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${theme.sidebar}`}>
                <div className={`h-20 flex items-center justify-between px-6 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        <span className={`text-xl font-bold tracking-wider ${theme.text}`}>HRK <span className="text-green-500">Analytics</span></span>
                    </div>
                    <button onClick={onClose} className="md:hidden text-slate-500"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${activeTab === item.id ? theme.navActive : theme.navInactive}`}>
                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-green-500' : (isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')}`} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className={`p-6 border-t space-y-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                     <button onClick={toggleTheme} className={`w-full flex items-center gap-3 px-2 py-2 text-sm transition-colors ${theme.navInactive}`}>
                        {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        <span className="font-medium">{isDarkMode ? 'Tema Claro' : 'Tema Escuro'}</span>
                     </button>
                     <button onClick={onLogout} className={`w-full flex items-center gap-3 px-2 py-2 transition-colors ${isDarkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'}`}>
                        <LogoutIcon className="w-5 h-5" />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'operations' | 'goals' | 'settings' | 'analyze' | 'soros' | 'compound'>('dashboard');
    const [usdToBrlRate, setUsdToBrlRate] = useState<number>(5.35);
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
        fetchUSDBRLRate().then(setUsdToBrlRate);
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
        let newRec: DailyRecord;

        const entry = customEntry || (activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : startBal * (activeBrokerage.entryValue/100));
        const payout = customPayout || activeBrokerage.payoutPercentage;

        if (existingIdx >= 0) {
            const current = records[existingIdx] as DailyRecord;
            const updatedTrades = [...current.trades];
            for(let i=0; i<winCount; i++) updatedTrades.push({id: Date.now()+'-w-'+i, result: 'win', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
            for(let i=0; i<lossCount; i++) updatedTrades.push({id: Date.now()+'-l-'+i, result: 'loss', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
            const wins = updatedTrades.filter(t => t.result === 'win').length;
            const losses = updatedTrades.filter(t => t.result === 'loss').length;
            const profit = updatedTrades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : -t.entryValue), 0);
            newRec = { ...current, trades: updatedTrades, winCount: wins, lossCount: losses, netProfitUSD: profit, endBalanceUSD: current.startBalanceUSD + profit };
            const updated = [...records]; updated[existingIdx] = newRec; setRecords(updated);
        } else {
            const trades: Trade[] = [];
            for(let i=0; i<winCount; i++) trades.push({id: Date.now()+'-w-'+i, result: 'win', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
            for(let i=0; i<lossCount; i++) trades.push({id: Date.now()+'-l-'+i, result: 'loss', entryValue: entry, payoutPercentage: payout, timestamp: Date.now()});
            const profit = trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : -t.entryValue), 0);
            newRec = { recordType: 'day', brokerageId: activeBrokerageId, id: dateStr, date: dateStr, startBalanceUSD: startBal, trades, winCount, lossCount, netProfitUSD: profit, endBalanceUSD: startBal + profit };
            setRecords([...records, newRec]);
        }
    };

    const dailyRecord = records.find(r => r.id === selectedDate.toISOString().split('T')[0] && r.recordType === 'day') as DailyRecord;
    const startBal = records.filter(r => r.recordType === 'day' && r.date < selectedDate.toISOString().split('T')[0]).sort((a,b) => b.date.localeCompare(a.date))[0]?.endBalanceUSD || activeBrokerage.initialBalance;

    return (
        <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <main className="flex-1 flex flex-col overflow-hidden w-full">
                <header className={`h-20 flex items-center justify-between md:justify-end px-4 md:px-8 border-b ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 p-2"><MenuIcon className="w-6 h-6" /></button>
                    <div className="flex items-center gap-4">
                         <div className="text-right hidden sm:block"><p className="text-xs opacity-50">Logado como</p><p className="text-sm font-semibold">{user.username}</p></div>
                         <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-green-500/20">{user.username.slice(0, 2).toUpperCase()}</div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto bg-slate-100/10">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} addRecord={addRecord} selectedDateString={selectedDate.toISOString().split('T')[0]} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBal} isDarkMode={isDarkMode} usdToBrlRate={usdToBrlRate} dailyGoalTarget={10} />}
                    {activeTab === 'analyze' && <AnalysisPanel isDarkMode={isDarkMode} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                </div>
            </main>
        </div>
    );
};

export default App;