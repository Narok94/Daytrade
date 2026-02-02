
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { GoogleGenAI } from "@google/genai";
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon, CpuChipIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900/40 border-slate-800/60 backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-md',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800/50' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800/50' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-emerald-50 text-emerald-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/60' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
        roundedCard: 'rounded-[2.2rem]', // Levemente reduzido para acompanhar o tamanho menor dos cards
    }), [isDarkMode]);
};

// --- AI Analyzer Panel ---
const AIAnalyzerPanel: React.FC<any> = ({ theme, isDarkMode }) => {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeChart = async () => {
        if (!image) return;
        setAnalyzing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = image.split(',')[1];
            
            const prompt = `Aja como um trader profissional de Opções Binárias com 10 anos de experiência em M1. Analise esta imagem do gráfico de velas. Retorne um JSON com: { "operacao": "CALL" | "PUT" | "AGUARDAR", "confianca": numero, "motivo": "string curta", "detalhes": ["array de 3 pontos"] }`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                        { text: prompt }
                    ]
                }
            });

            const text = response.text || '';
            const cleanJson = text.replace(/```json|```/g, '').trim();
            setResult(JSON.parse(cleanJson));
        } catch (err) {
            console.error(err);
            setError("Falha na varredura. Tente novamente.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className={`text-2xl font-black tracking-tighter ${theme.text}`}>Visão <span className="text-emerald-400 italic">HRK Sniper</span></h2>
                    <p className={`${theme.textMuted} text-xs uppercase tracking-widest`}>IA Balística de Precisão.</p>
                </div>
                <div className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-full tracking-[0.2em]">RADAR ON</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-6 ${theme.roundedCard} border ${theme.card} flex flex-col items-center justify-center min-h-[350px] border-dashed border-2 relative group overflow-hidden`}>
                    {image ? (
                        <div className="relative w-full h-full animate-in zoom-in-95">
                            <img src={image} alt="Target" className="w-full h-full object-contain rounded-2xl shadow-lg" />
                            <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 p-3 bg-rose-600 text-white rounded-full hover:bg-rose-500 border-2 border-slate-950"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-4 text-center">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20">
                                <PlusIcon className="w-10 h-10 text-emerald-400" />
                            </div>
                            <p className="font-black text-sm uppercase tracking-widest text-emerald-400">Travar Alvo</p>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    )}
                </div>

                <div className="space-y-6">
                    <button 
                        onClick={analyzeChart} 
                        disabled={!image || analyzing}
                        className={`w-full h-16 ${theme.roundedCard} font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4
                        ${!image || analyzing ? 'bg-slate-800 text-slate-600' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'}`}
                    >
                        {analyzing ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <CpuChipIcon className="w-6 h-6" />}
                        {analyzing ? 'ESCANEANDO' : 'DISPARAR'}
                    </button>

                    {error && (
                        <div className={`p-4 bg-rose-500/10 border border-rose-500/30 ${theme.roundedCard} flex items-center gap-3 text-rose-500`}>
                            <InformationCircleIcon className="w-6 h-6 shrink-0" />
                            <p className="text-[10px] font-black uppercase">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className={`p-8 ${theme.roundedCard} border ${theme.card} space-y-6 shadow-xl relative overflow-hidden`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[9px] font-black uppercase opacity-50 tracking-[0.2em] mb-1">Veredito</p>
                                    <h3 className={`text-4xl font-black ${result.operacao === 'CALL' ? 'text-emerald-400' : 'text-rose-500'}`}>{result.operacao}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black uppercase opacity-50 tracking-[0.2em] mb-1">Confiança</p>
                                    <p className="text-3xl font-black text-blue-400 font-mono">{result.confianca}%</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
                                <p className="text-xs font-bold text-slate-200 italic">"{result.motivo}"</p>
                            </div>
                            <div className="space-y-3">
                                {result.detalhes?.map((detail: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]" />
                                        {detail}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Dashboard Panel ---
const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const handleQuickAdd = (type: 'win' | 'loss') => {
         const entryValue = parseFloat(customEntryValue) || 0;
         const payout = parseFloat(customPayout) || 0;
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
        { label: 'Arsenal', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-400' },
        { label: 'Lucro', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-500' },
        { label: 'Missão', val: `${Math.min(100, dailyGoalPercent).toFixed(0)}%`, subVal: `${currencySymbol}${formatMoney(currentProfit)} / ${formatMoney(dailyGoalTarget)}`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-emerald-400' : 'text-blue-400' },
        { label: 'Precisão', val: `${winRate}%`, icon: TrophyIcon, color: 'text-fuchsia-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:justify-between items-center gap-4">
                <div className="text-center md:text-left">
                    <h2 className={`text-2xl font-black tracking-tighter ${theme.text}`}>Painel <span className="text-emerald-400 italic">HRK Sniper</span></h2>
                    <p className={`${theme.textMuted} text-xs`}>Gestão tática compacta.</p>
                </div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`border rounded-full px-6 py-2.5 text-xs font-black focus:outline-none transition-all ${isDarkMode ? 'bg-slate-900 text-emerald-400 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-5 ${theme.roundedCard} border ${theme.card} flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 shadow-lg`}>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{kpi.label}</p>
                            <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                        </div>
                        <p className={`text-lg md:text-xl font-black ${kpi.color} truncate tracking-tighter`}>{kpi.val}</p>
                        {kpi.subVal && <p className="text-[8px] font-black mt-1 text-slate-500 truncate uppercase opacity-60">{kpi.subVal}</p>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`p-8 ${theme.roundedCard} border ${theme.card} relative overflow-hidden shadow-xl`}>
                    <h3 className="font-black mb-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-emerald-400"><CalculatorIcon className="w-4 h-4" /> Ordem Sniper</h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Calibre</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 px-5 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                            <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Retorno %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-12 px-5 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                            <div className="space-y-2 col-span-2 md:col-span-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Lotes</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-12 px-5 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleQuickAdd('win')} className="h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl uppercase text-lg tracking-widest transition-all shadow-md active:scale-95">WIN</button>
                            <button onClick={() => handleQuickAdd('loss')} className="h-14 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl uppercase text-lg tracking-widest transition-all shadow-md active:scale-95">LOSS</button>
                        </div>
                    </div>
                </div>

                <div className={`p-8 ${theme.roundedCard} border flex flex-col ${theme.card} shadow-xl`}>
                    <h3 className="font-black mb-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-blue-400"><ListBulletIcon className="w-4 h-4" /> Log de Disparos</h3>
                    <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             <div className="space-y-3">
                                {[...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                    const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    return (
                                        <div key={trade.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-8 rounded-full ${trade.result === 'win' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-500 uppercase">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    <p className="text-sm font-black uppercase tracking-tighter">{trade.result === 'win' ? 'HIT' : 'MISS'}</p>
                                                </div>
                                            </div>
                                            <p className={`text-base font-black ${tradeProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{tradeProfit >= 0 ? '+' : ''}{currencySymbol}{formatMoney(tradeProfit)}</p>
                                        </div>
                                    );
                                })}
                             </div>
                        ) : (
                            <div className="py-10 text-center opacity-20">
                                <InformationCircleIcon className="w-10 h-10 mx-auto mb-2" />
                                <p className="text-[9px] font-black uppercase">Nenhum disparo registrado</p>
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
        const sortedRealRecords = records
            .filter((r: any): r is DailyRecord => r.recordType === 'day' && r.trades.length > 0)
            .sort((a, b) => a.id.localeCompare(b.id));
        
        let startDate: Date;
        if (sortedRealRecords.length > 0) startDate = new Date(sortedRealRecords[0].id + 'T12:00:00');
        else { startDate = new Date(); startDate.setHours(12,0,0,0); }

        let runningBalance = activeBrokerage.initialBalance;

        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateId = currentDate.toISOString().split('T')[0];
            const realRecord = records.find((r: any) => r.recordType === 'day' && r.id === dateId && r.trades.length > 0);
            
            let initial = runningBalance;
            let win, loss, profit, final, isProjection, operationValue;

            if (realRecord) {
                win = realRecord.winCount; loss = realRecord.lossCount; profit = realRecord.netProfitUSD; final = realRecord.endBalanceUSD;
                operationValue = (realRecord.trades.length > 0) ? realRecord.trades[0].entryValue : (initial * 0.10);
                isProjection = false;
            } else {
                isProjection = true; operationValue = initial * 0.10; win = 3; loss = 0; profit = (operationValue * (activeBrokerage.payoutPercentage / 100)) * 3; final = initial + profit;
            }
            rows.push({ diaTrade: i + 1, dateDisplay: currentDate.toLocaleDateString('pt-BR'), initial, win, loss, profit, final, operationValue, isProjection });
            runningBalance = final;
        }
        return rows;
    }, [records, activeBrokerage.initialBalance, activeBrokerage.payoutPercentage]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            <h2 className={`text-2xl font-black tracking-tighter ${theme.text}`}>Crescimento <span className="text-emerald-400 italic">HRK</span></h2>
            <div className={`${theme.roundedCard} border overflow-hidden shadow-xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[900px]">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-900/90' : 'bg-slate-100/60'}`}>
                                <th className="py-6 px-4">Fase</th>
                                <th className="py-6 px-4">Arsenal</th>
                                <th className="py-6 px-4">Disparo</th>
                                <th className="py-6 px-4 text-emerald-400">W</th>
                                <th className="py-6 px-4 text-rose-500">L</th>
                                <th className="py-6 px-4">Lucro</th>
                                <th className="py-6 px-4">Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/20">
                            {tableData.map((row) => (
                                <tr key={row.diaTrade} className={`text-xs font-black hover:bg-emerald-500/5 transition-all ${row.isProjection ? 'opacity-30' : ''}`}>
                                    <td className="py-4 px-4 font-mono">#{row.diaTrade}</td>
                                    <td className="py-4 px-4">{currencySymbol}{formatMoney(row.initial)}</td>
                                    <td className="py-4 px-4 text-emerald-400">{currencySymbol}{formatMoney(row.operationValue)}</td>
                                    <td className="py-4 px-4"><span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full">{row.win}</span></td>
                                    <td className="py-4 px-4"><span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full">{row.loss}</span></td>
                                    <td className={`py-4 px-4 ${row.profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{currencySymbol}{formatMoney(row.profit)}</td>
                                    <td className="py-4 px-4 text-emerald-400">{currencySymbol}{formatMoney(row.final)}</td>
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
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:justify-between items-center gap-4">
                <h2 className={`text-2xl font-black tracking-tighter ${theme.text}`}>Relatórios <span className="text-emerald-400 italic">Confidenciais</span></h2>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`border rounded-full px-8 py-2.5 text-xs font-black focus:outline-none ${isDarkMode ? 'bg-slate-900 text-emerald-400 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 ${theme.roundedCard} border ${theme.card} shadow-lg`}><p className="text-[9px] uppercase font-black opacity-50 mb-2">Retorno</p><p className={`text-2xl font-black ${reportData.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{currencySymbol}{formatMoney(reportData.totalProfit)}</p></div>
                <div className={`p-6 ${theme.roundedCard} border ${theme.card} shadow-lg`}><p className="text-[9px] uppercase font-black opacity-50 mb-2">Banca Atual</p><p className="text-2xl font-black text-blue-400">{currencySymbol}{formatMoney(reportData.finalMonthBalance)}</p></div>
                <div className={`p-6 ${theme.roundedCard} border ${theme.card} shadow-lg`}><p className="text-[9px] uppercase font-black opacity-50 mb-2">Total Disparos</p><p className="text-2xl font-black text-emerald-400">{reportData.allTrades.length}</p></div>
            </div>
            <div className={`${theme.roundedCard} border overflow-hidden ${theme.card} shadow-xl`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead><tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-900/90' : 'bg-slate-100/60'}`}><th className="py-5 px-8">Data</th><th className="py-5 px-8">Status</th><th className="py-5 px-8">Impacto</th><th className="py-5 px-8 text-right">Comando</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/15">
                            {reportData.allTrades.map((t) => {
                                const profit = t.result === 'win' ? (t.entryValue * (t.payoutPercentage / 100)) : -t.entryValue;
                                const tradeDate = t.timestamp ? new Date(t.timestamp) : new Date(t.dayId + 'T12:00:00');
                                return (
                                    <tr key={t.id} className="hover:bg-emerald-500/5 transition-all text-xs font-black">
                                        <td className="py-4 px-8">{tradeDate.toLocaleDateString('pt-BR')} <span className="opacity-30 text-[9px]">{tradeDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></td>
                                        <td className="py-4 px-8"><span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${t.result === 'win' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>{t.result === 'win' ? 'HIT' : 'MISS'}</span></td>
                                        <td className={`py-4 px-8 ${profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{currencySymbol}{formatMoney(profit)}</td>
                                        <td className="py-4 px-8 text-right"><button onClick={() => deleteTrade(t.id, t.dayId)} className="text-rose-500/30 hover:text-rose-500"><TrashIcon className="w-5 h-5" /></button></td>
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
    const [initialEntry, setInitialEntry] = useState('10');
    const [payout, setPayout] = useState(activeBrokerage?.payoutPercentage || '80');
    const [levels, setLevels] = useState('4');
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    const calculations = useMemo(() => {
        const entry = parseFloat(initialEntry) || 0;
        const p = (parseFloat(payout) || 0) / 100;
        const lvls = Math.min(10, parseInt(levels) || 1);
        const results = [];
        let currentEntry = entry;
        for (let i = 1; i <= lvls; i++) {
            const profit = currentEntry * p; const total = currentEntry + profit;
            results.push({ level: i, entry: currentEntry, profit, total });
            currentEntry = total;
        }
        return results;
    }, [initialEntry, payout, levels]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in zoom-in-95 duration-500">
            <h2 className="text-2xl font-black tracking-tighter">Calc <span className="text-emerald-400 italic">Soros</span></h2>
            <div className={`p-8 ${theme.roundedCard} border ${theme.card} grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl`}>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Calibre Inicial</label><input type="number" value={initialEntry} onChange={e => setInitialEntry(e.target.value)} className={`w-full h-12 px-6 rounded-2xl border font-black text-lg outline-none ${theme.input}`} /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Payout %</label><input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-12 px-6 rounded-2xl border font-black text-lg outline-none ${theme.input}`} /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Fases</label><input type="number" value={levels} onChange={e => setLevels(e.target.value)} className={`w-full h-12 px-6 rounded-2xl border font-black text-lg outline-none ${theme.input}`} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {calculations.map((res) => (
                    <div key={res.level} className={`p-6 ${theme.roundedCard} border ${theme.card} hover:border-emerald-500/40 transition-all shadow-lg`}>
                        <p className="text-[10px] font-black uppercase text-emerald-400 mb-4">Nível {res.level}</p>
                        <div className="space-y-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Entrada: {currencySymbol}{formatMoney(res.entry)}</p>
                            <p className="text-xl font-black text-emerald-400">+{currencySymbol}{formatMoney(res.profit)}</p>
                            <p className="text-[9px] font-black uppercase opacity-40">Próxima: {currencySymbol}{formatMoney(res.total)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, records, activeBrokerage }) => {
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [type, setType] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('monthly');
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    const addGoal = () => {
        if (!name || !target) return;
        const newGoal: Goal = { id: crypto.randomUUID(), name, targetAmount: parseFloat(target), type, createdAt: Date.now() };
        setGoals((prev: Goal[]) => [...prev, newGoal]);
        setName(''); setTarget('');
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-700">
            <h2 className="text-2xl font-black tracking-tighter">Missões <span className="text-emerald-400 italic">Especiais</span></h2>
            <div className={`p-8 ${theme.roundedCard} border ${theme.card} shadow-xl`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Nome</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full h-12 px-6 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Alvo</label><input type="number" value={target} onChange={e => setTarget(e.target.value)} className={`w-full h-12 px-6 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ciclo</label><select value={type} onChange={e => setType(e.target.value as any)} className={`w-full h-12 px-6 rounded-2xl border text-xs font-black uppercase outline-none ${theme.input}`}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option><option value="annual">Anual</option></select></div>
                    <div className="flex items-end"><button onClick={addGoal} className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all">INICIAR</button></div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {goals.map(goal => {
                    const currentProfit = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day').reduce((acc, r) => acc + r.netProfitUSD, 0);
                    const progress = Math.min(100, (currentProfit / goal.targetAmount) * 100);
                    return (
                        <div key={goal.id} className={`p-8 ${theme.roundedCard} border ${theme.card} shadow-xl relative group`}>
                            <button onClick={() => setGoals((prev: Goal[]) => prev.filter(g => g.id !== goal.id))} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-rose-500"><TrashIcon className="w-5 h-5" /></button>
                            <p className="text-[9px] font-black uppercase text-emerald-400 mb-1">{goal.type}</p>
                            <h4 className="text-xl font-black uppercase italic mb-6">{goal.name}</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="opacity-40">Captura</span>
                                    <span className="text-emerald-400">{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-900/60 rounded-full overflow-hidden p-0.5">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-2xl font-black text-emerald-400">{currencySymbol}{formatMoney(currentProfit)} <span className="text-[10px] text-slate-500 uppercase">/ {formatMoney(goal.targetAmount)}</span></p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset }) => {
    const updateBrokerage = (field: keyof Brokerage, value: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: value } : b));
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto animate-in fade-in duration-700">
            <h2 className="text-2xl font-black tracking-tighter">Sala de <span className="text-emerald-400 italic">Comando</span></h2>
            <div className={`p-8 ${theme.roundedCard} border ${theme.card} space-y-8 shadow-xl`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Identificação</label><input type="text" value={brokerage.name} onChange={e => updateBrokerage('name', e.target.value)} className={`w-full h-12 px-6 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Moeda</label><select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-12 px-6 rounded-2xl border text-xs font-black uppercase outline-none ${theme.input}`}><option value="USD">Dólar ($)</option><option value="BRL">Real (R$)</option></select></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Arsenal Inicial</label><input type="number" value={brokerage.initialBalance} onChange={e => updateBrokerage('initialBalance', parseFloat(e.target.value))} className={`w-full h-12 px-6 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                    <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase ml-2">Payout Base %</label><input type="number" value={brokerage.payoutPercentage} onChange={e => updateBrokerage('payoutPercentage', parseInt(e.target.value))} className={`w-full h-12 px-6 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                </div>
                <div className="pt-6 border-t border-slate-800">
                    <button onClick={onReset} className="px-8 py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white font-black rounded-full text-[10px] tracking-widest uppercase transition-all">EXECUTAR WIPE TOTAL</button>
                </div>
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
        return allRecords.sort((a, b) => a.id.localeCompare(b.id)).map(r => {
            if (r.recordType !== 'day') return r;
            const daily = r as DailyRecord;
            const netProfitUSD = daily.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
            const endBalanceUSD = runningBalance + netProfitUSD;
            const updated = { ...daily, startBalanceUSD: runningBalance, netProfitUSD, endBalanceUSD };
            runningBalance = endBalanceUSD; return updated;
        });
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Alpha Sniper', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
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
            const entryValue = customEntry || (brokerages[0].entryMode === 'fixed' ? brokerages[0].entryValue : currentBalance * (brokerages[0].entryValue / 100));
            const payout = customPayout || brokerages[0].payoutPercentage;
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
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, brokerages[0].initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const handleReset = () => {
        if(confirm("Deseja realmente executar o protocolo de Wipe total?")) { setRecords([]); debouncedSave(); }
    };

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);
    const monthlyGoal = goals.find(g => g.type === 'monthly');
    const activeDailyGoal = monthlyGoal ? (monthlyGoal.targetAmount / 22) : (activeBrokerage?.initialBalance * 0.03 || 1);

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/95 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-all duration-500 ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex flex-col justify-center px-10 border-b border-slate-800/40">
                    <h1 className="text-xl font-black italic text-emerald-400 tracking-tighter">HRK SNIPER</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2 custom-scrollbar overflow-y-auto">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-black ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('ai'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-black ${activeTab === 'ai' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Visão Sniper</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-black ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Escalada</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-black ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Arquivos</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-black ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Soros</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-black ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Missões</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-black ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Comando</button>
                </nav>
                <div className="p-4 border-t border-slate-800/40"><button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-3 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 rounded-full"><LogoutIcon className="w-5 h-5" />Sair</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className={`h-20 flex items-center justify-between px-8 border-b ${theme.header}`}>
                    <div className="flex items-center gap-6"><button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-3 bg-slate-900 rounded-full border border-slate-800"><MenuIcon className="w-5 h-5" /></button><SavingStatusIndicator status={savingStatus} /></div>
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-900/60 rounded-full border border-slate-800">{isDarkMode ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4 text-emerald-400" />}</button>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-[9px] font-black uppercase text-emerald-400">{user.username}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs">{user.username.slice(0, 2).toUpperCase()}</div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeDailyGoal} />}
                    {activeTab === 'ai' && <AIAnalyzerPanel theme={theme} isDarkMode={isDarkMode} />}
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
    if (status === 'saving') return <div className="text-[9px] font-black uppercase text-slate-500">Sincronizando...</div>;
    if (status === 'saved') return <div className="text-[9px] font-black uppercase text-emerald-400">HQ Pronto</div>;
    return null;
};

export default App;
