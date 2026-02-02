
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon, CpuChipIcon, TrendingDownIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-950 border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- AI Analysis Panel (V2 - No Bias) ---
interface AIAnalysisResult {
    recommendation: 'COMPRA' | 'VENDA' | 'AGUARDAR';
    entry_time: string;
    timeframe: string;
    confidence: number;
    reasoning: string;
    risks: string;
    bull_force: number;
    bear_force: number;
}

const AIAnalysisPanel: React.FC<any> = ({ isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
                setAnalysisResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeChart = async () => {
        if (!selectedImage) return;
        setIsAnalyzing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = selectedImage.split(',')[1];
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        {
                            text: `Aja como um Algoritmo Sniper de Opções Binárias especialista em Price Action e Fluxo. Analise o gráfico sem viés (venda ou compra). 
                            - Identifique Zonas de Suporte (COMPRA) e Resistência (VENDA).
                            - Analise pavios de rejeição e candles de reversão.
                            - Determine a força atual de Touros e Ursos.
                            
                            Retorne JSON estrito:
                            {
                              "recommendation": "COMPRA" | "VENDA" | "AGUARDAR",
                              "entry_time": "Imediata ou Próxima Vela",
                              "timeframe": "M1 ou M5",
                              "confidence": número,
                              "reasoning": "Breve explicação do gatilho técnico",
                              "risks": "Ponto de atenção no gráfico",
                              "bull_force": 0-100,
                              "bear_force": 0-100
                            }`
                        }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            recommendation: { type: Type.STRING },
                            entry_time: { type: Type.STRING },
                            timeframe: { type: Type.STRING },
                            confidence: { type: Type.NUMBER },
                            reasoning: { type: Type.STRING },
                            risks: { type: Type.STRING },
                            bull_force: { type: Type.NUMBER },
                            bear_force: { type: Type.NUMBER }
                        },
                        required: ["recommendation", "entry_time", "timeframe", "confidence", "reasoning", "risks", "bull_force", "bear_force"]
                    }
                }
            });

            const result = JSON.parse(response.text || '{}');
            setAnalysisResult(result);
        } catch (err: any) {
            setError(err.message?.includes("429") ? "Limite de cota atingido. Tente novamente em 60 segundos." : "Erro na análise técnica.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            <h2 className={`text-3xl font-black tracking-tighter ${theme.text}`}>ANÁLISE SNIPER IA V2</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-4 rounded-[2.5rem] border ${theme.card} flex flex-col min-h-[450px]`}>
                    {!selectedImage ? (
                        <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-800 rounded-[2rem] hover:bg-blue-500/5 transition-all">
                            <PlusIcon className="w-12 h-12 mb-4 text-slate-700" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Upload do Gráfico</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="flex-1 rounded-[1.8rem] overflow-hidden border border-slate-800 relative group">
                                <img src={selectedImage} alt="Chart" className="w-full h-full object-contain bg-black" />
                                <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 bg-red-500 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                            <button onClick={analyzeChart} disabled={isAnalyzing} className="h-14 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest flex items-center justify-center gap-3">
                                {isAnalyzing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CpuChipIcon className="w-5 h-5" />}
                                {isAnalyzing ? 'Processando...' : 'Escanear Gatilho'}
                            </button>
                        </div>
                    )}
                </div>

                <div className={`p-8 rounded-[2.5rem] border ${theme.card} flex flex-col`}>
                    <h3 className="font-black mb-6 text-[10px] uppercase tracking-widest text-blue-400">IA ENGINE STATUS</h3>
                    {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-xs font-bold mb-4">{error}</div>}
                    {analysisResult ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-slate-800 pb-6">
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Recomendação</p>
                                    <p className={`text-5xl font-black ${analysisResult.recommendation === 'COMPRA' ? 'text-green-500' : analysisResult.recommendation === 'VENDA' ? 'text-red-500' : 'text-yellow-500'}`}>
                                        {analysisResult.recommendation === 'COMPRA' ? 'CALL' : analysisResult.recommendation === 'VENDA' ? 'PUT' : 'WAIT'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Confiança</p>
                                    <p className="text-3xl font-black text-white">{analysisResult.confidence}%</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest"><span className="text-green-500">Touros {analysisResult.bull_force}%</span><span className="text-red-500">Ursos {analysisResult.bear_force}%</span></div>
                                <div className="h-2 bg-slate-800 rounded-full flex overflow-hidden">
                                    <div className="bg-green-500 h-full" style={{ width: `${analysisResult.bull_force}%` }} />
                                    <div className="bg-red-500 h-full" style={{ width: `${analysisResult.bear_force}%` }} />
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-medium italic text-slate-300">"{analysisResult.reasoning}"</div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20"><CpuChipIcon className="w-16 h-16 mb-2 text-slate-500" /><p className="text-[10px] font-black uppercase">Aguardando Gráfico</p></div>
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
    
    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) : '0.0';
    
    const dailyGoalPercent = dailyGoalTarget > 0 ? (currentProfit / dailyGoalTarget) * 100 : 0;

    const kpis = [
        { label: 'Banca Atual', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-green-500' },
        { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'Win Rate', val: `${winRate}%`, icon: TrophyIcon, color: 'text-purple-400' },
        { label: 'Meta Diária', val: `${Math.min(100, dailyGoalPercent).toFixed(0)}%`, icon: TargetIcon, color: 'text-blue-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Controle financeiro e metas</p></div>
                <input type="date" value={selectedDateString} onChange={e => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`p-2 rounded-xl font-bold border ${theme.input}`} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-5 rounded-[2rem] border ${theme.card}`}>
                        <div className="flex justify-between items-start mb-2"><p className="text-[9px] uppercase font-black text-slate-500">{kpi.label}</p><kpi.icon className={`w-4 h-4 ${kpi.color}`} /></div>
                        <p className={`text-xl font-black ${kpi.color}`}>{kpi.val}</p>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-50">Lançamento de Ordem</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <div className="space-y-1"><label className="text-[9px] font-black uppercase ml-1">Valor</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black uppercase ml-1">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black uppercase ml-1">Qtd</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => addRecord(parseInt(quantity)||1, 0, parseFloat(customEntryValue), parseFloat(customPayout))} className="h-14 bg-green-500 text-slate-950 font-black rounded-2xl uppercase tracking-widest hover:bg-green-400 active:scale-95 transition-all">WIN</button>
                        <button onClick={() => addRecord(0, parseInt(quantity)||1, parseFloat(customEntryValue), parseFloat(customPayout))} className="h-14 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-red-500 active:scale-95 transition-all">LOSS</button>
                    </div>
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${theme.card} flex flex-col max-h-[400px]`}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-50">Histórico de Hoje</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? [...dailyRecordForSelectedDay.trades].reverse().map(t => (
                            <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
                                <div className="flex items-center gap-3"><div className={`w-1 h-8 rounded-full ${t.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} /><div><p className="text-[9px] font-black text-slate-500">{new Date(t.timestamp || 0).toLocaleTimeString()}</p><p className="text-sm font-bold">{t.result === 'win' ? 'Vitória' : 'Derrota'}</p></div></div>
                                <div className="text-right"><p className={`text-sm font-black ${t.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>{t.result === 'win' ? '+' : '-'}{currencySymbol}{formatMoney(t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : t.entryValue)}</p><button onClick={() => deleteTrade(t.id, selectedDateString)} className="text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase">Excluir</button></div>
                            </div>
                        )) : <div className="h-full flex flex-col items-center justify-center opacity-20 py-10"><InformationCircleIcon className="w-8 h-8 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Nenhuma Operação</p></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Compound Interest Panel ---
const CompoundInterestPanel: React.FC<any> = ({ isDarkMode, activeBrokerage }) => {
    const theme = useThemeClasses(isDarkMode);
    const initial = activeBrokerage.initialBalance || 0;
    const tableData = useMemo(() => {
        let curr = initial;
        return Array.from({ length: 30 }, (_, i) => {
            const start = curr;
            const profit = curr * 0.03;
            curr += profit;
            return { day: i + 1, start, profit, end: curr };
        });
    }, [initial]);
    return (
        <div className="p-8 space-y-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-black uppercase tracking-tight">Projeção Juros Compostos (3% ao Dia)</h2>
            <div className={`rounded-[2rem] border ${theme.card} overflow-hidden`}>
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/50 border-b border-slate-800 font-black text-slate-500 uppercase tracking-widest"><tr><th className="p-4">DIA</th><th className="p-4">BANCA INICIAL</th><th className="p-4">LUCRO ESTIMADO</th><th className="p-4">BANCA FINAL</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                        {tableData.map(d => <tr key={d.day} className="hover:bg-slate-800/20"><td className="p-4 font-black">{d.day}</td><td className="p-4 text-slate-300">R$ {formatMoney(d.start)}</td><td className="p-4 text-green-500 font-bold">+R$ {formatMoney(d.profit)}</td><td className="p-4 font-black text-white">R$ {formatMoney(d.end)}</td></tr>)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Report Panel ---
const ReportPanel: React.FC<any> = ({ isDarkMode, records, deleteTrade }) => {
    const theme = useThemeClasses(isDarkMode);
    const allTrades = useMemo(() => records.flatMap((r: DailyRecord) => r.trades.map(t => ({ ...t, date: r.date }))).sort((a:any, b:any) => (b.timestamp || 0) - (a.timestamp || 0)), [records]);
    return (
        <div className="p-8 space-y-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-black uppercase">Relatório de Performance Completo</h2>
            <div className="space-y-3">
                {allTrades.length > 0 ? allTrades.map((t:any) => (
                    <div key={t.id} className={`p-5 rounded-2xl border ${theme.card} flex justify-between items-center`}>
                        <div className="flex items-center gap-5">
                            <div className={`w-1.5 h-12 rounded-full ${t.result === 'win' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase">{t.date} às {new Date(t.timestamp || 0).toLocaleTimeString()}</p>
                                <p className="font-bold text-slate-200">{t.result === 'win' ? 'VITÓRIA (PRICE ACTION)' : 'LOSS CALCULADO'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-lg font-black ${t.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>R$ {formatMoney(t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : t.entryValue)}</p>
                            <button onClick={() => deleteTrade(t.id, t.date)} className="text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase">Apagar</button>
                        </div>
                    </div>
                )) : <div className="py-20 text-center opacity-30"><DocumentTextIcon className="w-12 h-12 mx-auto mb-2" /><p className="text-xs font-black uppercase">Sem dados históricos</p></div>}
            </div>
        </div>
    );
};

// --- Soros Calculator Panel ---
const SorosCalculatorPanel: React.FC<any> = ({ isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [entry, setEntry] = useState('10');
    const [pay, setPay] = useState('80');
    const levels = useMemo(() => {
        let curr = parseFloat(entry) || 0;
        const p = (parseFloat(pay) || 0) / 100;
        return Array.from({ length: 4 }, (_, i) => {
            const profit = curr * p;
            const next = curr + profit;
            const item = { lv: i + 1, entry: curr, profit, total: next };
            curr = next;
            return item;
        });
    }, [entry, pay]);
    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-black uppercase">Calculadora de Soros Profissional</h2>
            <div className="flex gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
                <div className="flex-1"><label className="text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Capital Inicial</label><input type="number" value={entry} onChange={e => setEntry(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black`} /></div>
                <div className="flex-1"><label className="text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Payout Médio %</label><input type="number" value={pay} onChange={e => setPay(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-black`} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {levels.map(l => (
                    <div key={l.lv} className={`p-8 rounded-[2.5rem] border ${theme.card} relative overflow-hidden group`}>
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUpIcon className="w-16 h-16" /></div>
                        <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">ALAVANCAGEM NÍVEL {l.lv}</p>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-500 uppercase">Próxima Entrada</p>
                            <p className="text-3xl font-black text-white">R$ {formatMoney(l.entry)}</p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-800">
                            <p className="text-xs font-bold text-green-500 uppercase">Possível Lucro Bruto</p>
                            <p className="text-2xl font-black text-green-500">R$ {formatMoney(l.total)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel: React.FC<any> = ({ isDarkMode, records, goals }) => {
    const theme = useThemeClasses(isDarkMode);
    const totalProfit = records.reduce((acc: number, r: DailyRecord) => acc + (r.netProfitUSD || 0), 0);
    const currentMonthTarget = 1000; // Mock target if not set
    const progress = Math.min(100, (totalProfit / currentMonthTarget) * 100);

    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-black uppercase">Metas e Conquistas</h2>
            <div className={`p-10 rounded-[3rem] border ${theme.card} flex flex-col items-center text-center space-y-6 relative overflow-hidden`}>
                <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-xl"><TargetIcon className="w-12 h-12 text-blue-500" /></div>
                <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter">PROGRESSO MENSAL</h3>
                    <p className="text-slate-500 font-bold text-lg">R$ {formatMoney(totalProfit)} acumulados este mês</p>
                </div>
                <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">{progress.toFixed(1)}% DA META ALCANÇADA</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className={`p-6 rounded-3xl border ${theme.card} flex items-center gap-4`}><TrophyIcon className="w-6 h-6 text-yellow-500" /><p className="text-xs font-black uppercase text-slate-300">Primeiro Win</p></div>
                 <div className={`p-6 rounded-3xl border ${theme.card} flex items-center gap-4 opacity-30`}><TargetIcon className="w-6 h-6 text-slate-500" /><p className="text-xs font-black uppercase text-slate-500">10 Dias de Meta</p></div>
                 <div className={`p-6 rounded-3xl border ${theme.card} flex items-center gap-4 opacity-30`}><TrendingUpIcon className="w-6 h-6 text-slate-500" /><p className="text-xs font-black uppercase text-slate-500">Banca Dobrada</p></div>
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<any> = ({ brokerage, setBrokerages, onReset, isDarkMode }) => {
    const theme = useThemeClasses(isDarkMode);
    const [name, setName] = useState(brokerage.name || '');
    const [bal, setBal] = useState(String(brokerage.initialBalance || ''));
    const handleSave = () => {
        setBrokerages((prev: any) => prev.map((b: any) => b.id === brokerage.id ? { ...b, name, initialBalance: parseFloat(bal) || 0 } : b));
        alert("As configurações da sua banca foram atualizadas com sucesso.");
    };
    return (
        <div className="p-8 space-y-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black uppercase">Configurações do Perfil Sniper</h2>
            <div className={`p-10 rounded-[3rem] border ${theme.card} space-y-8`}>
                <div className="space-y-5">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Apelido da Estratégia</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border ${theme.input} font-black text-lg`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Capital Inicial (R$)</label><input type="number" value={bal} onChange={e => setBal(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border ${theme.input} font-black text-lg`} /></div>
                </div>
                <div className="flex flex-col gap-4">
                    <button onClick={handleSave} className="h-16 bg-green-500 text-slate-950 font-black rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-green-500/20 active:scale-95 transition-all">Salvar Alterações</button>
                    <button onClick={onReset} className="h-14 border border-red-500/30 text-red-500 hover:bg-red-500/10 font-black rounded-2xl uppercase tracking-widest transition-all">Zerar Todo o Histórico</button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Logic ---
const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customEntryValue, setCustomEntryValue] = useState('10.00');
    const [customPayout, setCustomPayout] = useState('80');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const latestDataRef = useRef({ userId: user.id, brokerages, records, goals });
    useEffect(() => { latestDataRef.current = { userId: user.id, brokerages, records, goals }; }, [user.id, brokerages, records, goals]);
    
    const activeBrokerage = useMemo(() => brokerages[0] || { id: '1', name: 'Gestão Sniper', initialBalance: 10, currency: 'USD', payoutPercentage: 80 }, [brokerages]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                setBrokerages(data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Gestão Sniper', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }]);
                setRecords(data.records || []);
                setGoals(data.goals || []);
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

    const recalibrateHistory = useCallback((allRecords: AppRecord[], initialBal: number) => {
        let runningBalance = initialBal;
        return allRecords.sort((a, b) => a.id.localeCompare(b.id)).map(r => {
            if (r.recordType !== 'day') return r;
            const daily = r as DailyRecord;
            const netProfitUSD = daily.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
            const endBalanceUSD = runningBalance + netProfitUSD;
            const updated = { ...daily, startBalanceUSD: runningBalance, winCount: daily.trades.filter(t => t.result === 'win').length, lossCount: daily.trades.filter(t => t.result === 'loss').length, netProfitUSD, endBalanceUSD };
            runningBalance = endBalanceUSD;
            return updated;
        });
    }, []);

    const addRecord = (win: number, loss: number, entry: number, pay: number) => {
        setRecords(prev => {
            const dateKey = selectedDate.toISOString().split('T')[0];
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue: entry, payoutPercentage: pay, timestamp: Date.now() });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue: entry, payoutPercentage: pay, timestamp: Date.now() });
            const existingIdx = prev.findIndex(r => r.id === dateKey && r.recordType === 'day');
            let updatedRecords = [...prev];
            if (existingIdx >= 0) {
                const rec = updatedRecords[existingIdx] as DailyRecord;
                updatedRecords[existingIdx] = { ...rec, trades: [...rec.trades, ...newTrades] };
            } else {
                updatedRecords.push({ recordType: 'day', brokerageId: activeBrokerage.id, id: dateKey, date: dateKey, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            const recalibrated = recalibrateHistory(updatedRecords, activeBrokerage.initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, activeBrokerage.initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGridIcon },
        { id: 'ai-analysis', label: 'Análise Sniper IA', icon: CpuChipIcon },
        { id: 'compound', label: 'Planilha Juros', icon: ChartBarIcon },
        { id: 'report', label: 'Relatório Completo', icon: DocumentTextIcon },
        { id: 'soros', label: 'Cálculo Soros', icon: CalculatorIcon },
        { id: 'goals', label: 'Metas e Conquistas', icon: TargetIcon },
        { id: 'settings', label: 'Configurações', icon: SettingsIcon },
    ];

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 font-black italic text-teal-400 text-xl tracking-tighter shadow-sm">HRK SNIPER</div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all group ${activeTab === item.id ? theme.navActive : theme.navInactive}`}>
                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-green-500' : 'group-hover:text-green-400'}`} />{item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800/50"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-black hover:bg-red-500/10 rounded-2xl transition-colors"><LogoutIcon className="w-5 h-5" />Encerrar Sessão</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex items-center justify-between px-6 md:px-8 border-b ${theme.header} z-30`}>
                    <div className="flex items-center gap-4"><button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-500 hover:text-white transition-colors"><MenuIcon className="w-7 h-7" /></button><SavingStatusIndicator status={savingStatus} /></div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-sm">
                            {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block"><p className="text-[9px] font-black uppercase text-slate-500 leading-none">Trader Ativo</p><p className="text-sm font-black text-white">{user.username}</p></div>
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-green-500/10">{user.username.slice(0, 2).toUpperCase()}</div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={selectedDate.toISOString().split('T')[0]} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={records.find(r => r.id === selectedDate.toISOString().split('T')[0])} startBalanceForSelectedDay={activeBrokerage.initialBalance} isDarkMode={isDarkMode} dailyGoalTarget={activeBrokerage.initialBalance * 0.03} />}
                    {activeTab === 'ai-analysis' && <AIAnalysisPanel isDarkMode={isDarkMode} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'report' && <ReportPanel isDarkMode={isDarkMode} records={records} deleteTrade={deleteTrade} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel isDarkMode={isDarkMode} />}
                    {activeTab === 'goals' && <GoalsPanel isDarkMode={isDarkMode} records={records} goals={goals} />}
                    {activeTab === 'settings' && <SettingsPanel isDarkMode={isDarkMode} brokerage={activeBrokerage} setBrokerages={setBrokerages} onReset={() => setRecords([])} />}
                </div>
            </main>
        </div>
    );
};

const SavingStatusIndicator: React.FC<{status: string}> = ({status}) => {
    if (status === 'saving') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 animate-pulse"><ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</div>;
    if (status === 'saved') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-500"><CheckIcon className="w-3.5 h-3.5" /> Nuvem Atualizada</div>;
    if (status === 'error') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500"><InformationCircleIcon className="w-3.5 h-3.5" /> Erro na Conexão</div>;
    return null;
};

export default App;
