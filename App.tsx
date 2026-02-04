
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal, AIAnalysisResult } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
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
        card: isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- AI Analysis Panel (ULTRA-TURBO: < 15s latency target) ---
const AIAnalysisPanel: React.FC<any> = ({ theme, isDarkMode }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Compressão ainda mais agressiva para upload instantâneo (800px / 0.5 quality)
    const compressImage = (dataUrl: string, maxWidth = 800): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        });
    };

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

    const runAIAnalysis = async () => {
        if (!selectedImage) return;
        setIsAnalyzing(true);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const compressed = await compressImage(selectedImage);
            const base64Data = compressed.split(',')[1];
            
            // Injeção de tempo real para evitar delay de entrada
            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR');

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: `CONTEXTO ATUAL: O horário do sistema agora é ${timeString}. 
                        Analise o gráfico M1. Determine se a próxima vela terá reversão ou continuidade. 
                        REGRAS: 
                        1. A 'entryTime' deve ser o início do PRÓXIMO MINUTO INTEIRO (ex: se agora é 12:40:20, retorne 12:41:00).
                        2. Responda em JSON puro sem markdown.` },
                    ],
                },
                config: {
                    systemInstruction: "Você é um executor algorítmico de OB (M1). Resposta ultrarrápida. Analise suportes/resistências e volume. Não explique, apenas decida. Foque no tempo de entrada sincronizado com o horário fornecido.",
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            recommendation: { type: Type.STRING, enum: ['CALL', 'PUT', 'WAIT'] },
                            confidence: { type: Type.NUMBER },
                            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                            reasoning: { type: Type.STRING },
                            supportLevel: { type: Type.STRING },
                            resistanceLevel: { type: Type.STRING },
                            entryTime: { type: Type.STRING, description: "HH:MM:SS da próxima entrada válida" }
                        },
                        required: ['recommendation', 'confidence', 'patterns', 'reasoning', 'supportLevel', 'resistanceLevel', 'entryTime']
                    }
                }
            });
            const text = response.text;
            if (!text) throw new Error("Vazio");
            setAnalysisResult(JSON.parse(text));
        } catch (err: any) {
            setError("Falha no sincronismo. Tente novamente.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div>
                    <h2 className={`text-2xl font-black ${theme.text}`}>Análise Turbo v2</h2>
                    <p className={theme.textMuted}>Foco em delay zero e cálculo de próxima vela sincronizado.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 rounded-3xl border flex flex-col ${theme.card}`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><PlusIcon className="w-5 h-5 text-teal-400" /> Upload Gráfico</h3>
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-4 min-h-[300px] relative overflow-hidden">
                        {!selectedImage ? (
                            <label className="cursor-pointer flex flex-col items-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-teal-400"><PlusIcon className="w-8 h-8" /></div>
                                <div className="space-y-1"><p className="font-bold text-sm text-white">Anexar Print M1</p><p className="text-[10px] font-black uppercase opacity-40">Otimizado para M1</p></div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center gap-4">
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-700 bg-black">
                                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 bg-teal-500/20 backdrop-blur-[2px] flex items-center justify-center">
                                            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4 w-full">
                                    <button onClick={() => setSelectedImage(null)} className="flex-1 py-3 text-[10px] font-black uppercase rounded-xl border border-slate-800">Limpar</button>
                                    <button disabled={isAnalyzing} onClick={runAIAnalysis} className="flex-[2] py-3 text-[10px] font-black uppercase rounded-xl bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20">{isAnalyzing ? 'Calculando Tempo...' : 'Análise Instantânea'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className={`p-6 rounded-3xl border flex flex-col ${theme.card}`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CpuChipIcon className="w-5 h-5 text-purple-400" /> Sinal de Operação</h3>
                    {analysisResult ? (
                        <div className="space-y-6">
                            <div className={`p-5 rounded-3xl flex items-center justify-between border ${analysisResult.recommendation === 'CALL' ? 'bg-green-500/10 border-green-500/20' : analysisResult.recommendation === 'PUT' ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-800/20 border-slate-700'}`}>
                                <div><p className="text-[10px] font-black uppercase opacity-60 mb-1">Ação Sugerida</p><h4 className={`text-3xl font-black ${analysisResult.recommendation === 'CALL' ? 'text-green-500' : analysisResult.recommendation === 'PUT' ? 'text-red-500' : 'text-slate-400'}`}>{analysisResult.recommendation === 'CALL' ? '↑ CALL' : analysisResult.recommendation === 'PUT' ? '↓ PUT' : '∅ AGUARDAR'}</h4></div>
                                <div className="text-right"><p className="text-[10px] font-black uppercase opacity-60 mb-1">Confiança</p><p className="text-2xl font-black">{analysisResult.confidence}%</p></div>
                            </div>
                            <div className={`p-6 rounded-3xl border flex items-center justify-between bg-teal-500/10 border-teal-500/30 shadow-inner ring-1 ring-teal-500/50`}>
                                <div><p className="text-[10px] font-black uppercase text-teal-400 mb-1">ENTRADA (Próxima Vela)</p><p className="text-5xl font-black text-white tracking-tighter tabular-nums">{analysisResult.entryTime}</p></div>
                                <div className="text-right animate-pulse"><TargetIcon className="w-10 h-10 text-teal-400" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800"><p className="text-[8px] font-black uppercase text-slate-500 mb-2">Suporte</p><p className="text-xs font-bold text-green-400">{analysisResult.supportLevel}</p></div>
                                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800"><p className="text-[8px] font-black uppercase text-slate-500 mb-2">Resistência</p><p className="text-xs font-bold text-red-400">{analysisResult.resistanceLevel}</p></div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-950/30 border border-slate-800/50"><p className="text-[9px] font-black uppercase opacity-40 mb-2">Racional Estratégico</p><p className="text-xs font-medium text-slate-300 leading-relaxed italic">"{analysisResult.reasoning}"</p></div>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center"><InformationCircleIcon className="w-12 h-12 text-red-500 mb-4" /><p className="text-sm font-bold text-red-400">{error}</p></div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-12 opacity-30 text-center"><CpuChipIcon className="w-12 h-12 mb-4" /><p className="text-xs font-black uppercase">Pronto para análise ultra-rápida</p></div>
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

    const stopWinReached = activeBrokerage.stopGainTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades;
    const stopLossReached = activeBrokerage.stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades;

    const kpis = [
        { label: 'Banca Atual', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-green-500' },
        { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'Meta Diária', val: `${currencySymbol}${formatMoney(dailyGoalTarget)}`, subVal: `${Math.min(100, dailyGoalPercent).toFixed(0)}% Alcançado`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-green-500' : 'text-blue-400' },
        { label: 'Win Rate', val: `${winRate}%`, icon: TrophyIcon, color: 'text-purple-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Dashboard de Gestão</h2><p className={theme.textMuted}>Controle operacional em tempo real.</p></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-4 rounded-3xl border ${theme.card} flex flex-col justify-between`}>
                        <div className="flex justify-between items-start mb-1"><p className="text-[9px] md:text-[10px] uppercase font-black text-slate-500 tracking-wider leading-none">{kpi.label}</p><kpi.icon className={`w-4 h-4 ${kpi.color} opacity-80`} /></div>
                        <p className={`text-base md:text-lg lg:text-xl font-black ${kpi.color} truncate`}>{kpi.val}</p>
                        {kpi.subVal && <p className="text-[8px] md:text-[9px] font-bold mt-1 text-slate-500 truncate leading-tight">{kpi.subVal}</p>}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl border ${theme.card}`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CalculatorIcon className="w-5 h-5 text-green-500" /> Nova Operação</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Qtd</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button onClick={() => handleQuickAdd('win')} disabled={stopWinReached || stopLossReached} className="h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:bg-slate-700 disabled:opacity-50">WIN</button>
                            <button onClick={() => handleQuickAdd('loss')} disabled={stopWinReached || stopLossReached} className="h-14 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:bg-slate-700 disabled:opacity-50">LOSS</button>
                        </div>
                    </div>
                </div>
                <div className={`p-6 rounded-3xl border flex flex-col ${theme.card}`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60 text-blue-400"><ListBulletIcon className="w-5 h-5" /> Histórico do Dia</h3>
                    <div className="flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             <div className="space-y-2">
                                {[...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                    const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    return (
                                        <div key={trade.id} className={`flex items-center justify-between p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                            <div className="flex items-center gap-3"><div className={`w-2 h-8 rounded-full ${trade.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} /><div><p className="text-[10px] font-black uppercase text-slate-500 leading-none">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p><p className="text-sm font-bold">{trade.result === 'win' ? 'Vitória' : 'Derrota'}</p></div></div>
                                            <div className="text-right"><p className={`text-sm font-black ${tradeProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}</p><button onClick={() => deleteTrade(trade.id, selectedDateString)} className="text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-tighter">Excluir</button></div>
                                        </div>
                                    );
                                })}
                             </div>
                        ) : (<div className="h-full flex flex-col items-center justify-center opacity-30 py-10"><InformationCircleIcon className="w-10 h-10 mb-2" /><p className="text-xs font-black uppercase">Sem operações hoje</p></div>)}
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
        const sortedRealRecords = records.filter((r: any): r is DailyRecord => r.recordType === 'day' && r.trades.length > 0).sort((a, b) => a.id.localeCompare(b.id));
        let startDate = sortedRealRecords.length > 0 ? new Date(sortedRealRecords[0].id + 'T12:00:00') : new Date();
        startDate.setHours(12,0,0,0);
        let runningBalance = activeBrokerage.initialBalance;
        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateId = currentDate.toISOString().split('T')[0];
            const realRecord = records.find((r: any) => r.recordType === 'day' && r.id === dateId && r.trades.length > 0);
            let initial = runningBalance, win, loss, profit, final, isProjection, operationValue;
            if (realRecord) {
                win = realRecord.winCount; loss = realRecord.lossCount; profit = realRecord.netProfitUSD; final = realRecord.endBalanceUSD;
                operationValue = (realRecord.trades.length > 0) ? realRecord.trades[0].entryValue : (initial * 0.10);
                isProjection = false;
            } else {
                isProjection = true; operationValue = initial * 0.10; win = 3; loss = 0;
                profit = (operationValue * (activeBrokerage.payoutPercentage / 100)) * 3; final = initial + profit;
            }
            rows.push({ diaTrade: i + 1, dateId, dateDisplay: currentDate.toLocaleDateString('pt-BR'), initial, win, loss, profit, final, operationValue, isProjection });
            runningBalance = final;
        }
        return rows;
    }, [records, activeBrokerage.initialBalance, activeBrokerage.payoutPercentage]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div><h2 className={`text-2xl font-black ${theme.text}`}>Planejamento de Juros Compostos</h2><p className={`${theme.textMuted} text-xs mt-1 font-bold`}>Projeção baseada no histórico real.</p></div>
            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[900px]">
                        <thead><tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}><th className="py-5 px-3 border-b border-slate-800/20">Dia</th><th className="py-5 px-3 border-b border-slate-800/20">Data</th><th className="py-5 px-3 border-b border-slate-800/20">Saldo Inicial</th><th className="py-5 px-3 border-b border-slate-800/20">Operação</th><th className="py-5 px-3 border-b border-slate-800/20 text-green-500">W</th><th className="py-5 px-3 border-b border-slate-800/20 text-red-500">L</th><th className="py-5 px-3 border-b border-slate-800/20">Lucro</th><th className="py-5 px-3 border-b border-slate-800/20">Saldo Final</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.diaTrade} className={`text-sm font-bold hover:bg-slate-800/5 transition-colors ${row.isProjection ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                    <td className="py-4 px-3 opacity-40 font-mono text-xs">#{row.diaTrade}</td>
                                    <td className="py-4 px-3 text-[10px] uppercase font-black opacity-60">{row.dateDisplay}</td>
                                    <td className="py-4 px-3 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-4 px-3 font-mono text-sm text-blue-400">{currencySymbol} {formatMoney(row.operationValue)}</td>
                                    <td className="py-4 px-3"><span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-xl">{row.win}</span></td>
                                    <td className="py-4 px-3"><span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-xl">{row.loss}</span></td>
                                    <td className={`py-4 px-3 font-black ${row.profit > 0 ? 'text-green-500' : row.profit < 0 ? 'text-red-500' : 'opacity-30'}`}>{row.profit > 0 ? '+' : ''}{currencySymbol} {formatMoney(row.profit)}</td>
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
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const dayRecords = records.filter((r: any) => r.recordType === 'day' && r.trades.length > 0).sort((a: any, b: any) => b.id.localeCompare(a.id));
    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div><h2 className={`text-2xl font-black ${theme.text}`}>Extrato de Operações</h2><p className={theme.textMuted}>Histórico completo de performance.</p></div>
            <div className="space-y-4">
                {dayRecords.length > 0 ? dayRecords.map((record: DailyRecord) => (
                    <div key={record.id} className={`p-6 rounded-3xl border ${theme.card}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-black text-sm uppercase tracking-wider">{new Date(record.id + 'T12:00:00').toLocaleDateString('pt-BR')}</h4>
                            <div className="text-right"><p className={`text-sm font-black ${record.netProfitUSD >= 0 ? 'text-green-500' : 'text-red-500'}`}>{record.netProfitUSD >= 0 ? '+' : ''}{currencySymbol} {formatMoney(record.netProfitUSD)}</p></div>
                        </div>
                        <div className="space-y-2">
                            {record.trades.map((trade) => {
                                const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                return (
                                    <div key={trade.id} className={`flex items-center justify-between p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                        <div className="flex items-center gap-3"><div className={`w-2 h-8 rounded-full ${trade.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} /><div><p className="text-[10px] font-black uppercase text-slate-500 leading-none">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p><p className="text-sm font-bold">{trade.result === 'win' ? 'Vitória' : 'Derrota'}</p></div></div>
                                        <div className="text-right"><p className={`text-sm font-black ${tradeProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}</p><button onClick={() => deleteTrade(trade.id, record.id)} className="text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-tighter">Excluir</button></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )) : <div className="py-20 text-center opacity-30"><InformationCircleIcon className="w-12 h-12 mx-auto mb-4" /><p className="text-xs font-black uppercase">Nenhuma operação encontrada</p></div>}
            </div>
        </div>
    );
};

// --- Soros Calculator Panel ---
const SorosCalculatorPanel: React.FC<any> = ({ theme, activeBrokerage }) => {
    const [initialValue, setInitialValue] = useState('10');
    const [payout, setPayout] = useState(String(activeBrokerage?.payoutPercentage || 80));
    const [levels, setLevels] = useState('3');
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const calculateSoros = () => {
        const val = parseFloat(initialValue) || 0;
        const p = (parseFloat(payout) || 0) / 100;
        const l = Math.min(10, parseInt(levels) || 0);
        const results = [];
        let currentEntry = val;
        for (let i = 1; i <= l; i++) {
            const profit = currentEntry * p;
            const total = currentEntry + profit;
            results.push({ level: i, entry: currentEntry, profit, total });
            currentEntry = total;
        }
        return results;
    };
    const results = calculateSoros();
    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div><h2 className="text-2xl font-black">Calculadora de Soros</h2><p className={theme.textMuted}>Planejamento de alavancagem progressiva.</p></div>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-6`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Valor Inicial</label><input type="number" value={initialValue} onChange={e => setInitialValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Payout %</label><input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Níveis</label><input type="number" value={levels} onChange={e => setLevels(e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                </div>
                <div className="space-y-3">
                    {results.map(r => (
                        <div key={r.level} className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/20 border border-slate-800/50">
                            <div><p className="text-[10px] font-black uppercase text-slate-500">Nível {r.level}</p><p className="text-sm font-bold">Entrada: {currencySymbol} {formatMoney(r.entry)}</p></div>
                            <div className="text-right"><p className="text-[10px] font-black uppercase text-green-500">Lucro Estimado</p><p className="text-sm font-black text-green-500">+{currencySymbol} {formatMoney(r.profit)}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, records, activeBrokerage }) => {
    const [newGoalName, setNewGoalName] = useState('');
    const [newGoalAmount, setNewGoalAmount] = useState('');
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const addGoal = () => {
        if (!newGoalName || !newGoalAmount) return;
        const goal: Goal = { id: crypto.randomUUID(), name: newGoalName, type: 'monthly', targetAmount: parseFloat(newGoalAmount) || 0, createdAt: Date.now() };
        setGoals([...goals, goal]);
        setNewGoalName('');
        setNewGoalAmount('');
    };
    const deleteGoal = (id: string) => setGoals(goals.filter((g: Goal) => g.id !== id));
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthProfit = records.filter((r: any) => r.recordType === 'day' && r.id.startsWith(currentMonthStr)).reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div><h2 className="text-2xl font-black">Metas Financeiras</h2><p className={theme.textMuted}>Acompanhamento de objetivos a longo prazo.</p></div>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-8`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nome da Meta (Ex: Mensal)" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className={`h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} />
                    <div className="flex gap-2">
                        <input type="number" placeholder="Valor Alvo" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className={`flex-1 h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} />
                        <button onClick={addGoal} className="px-6 bg-green-500 text-slate-950 font-black rounded-xl uppercase text-[10px] tracking-widest">Adicionar</button>
                    </div>
                </div>
                <div className="space-y-4">
                    {goals.map((goal: Goal) => {
                        const progress = goal.targetAmount > 0 ? (monthProfit / goal.targetAmount) * 100 : 0;
                        return (
                            <div key={goal.id} className="p-6 rounded-3xl bg-slate-950/30 border border-slate-800/50 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">{goal.name}</p><h4 className="text-xl font-black">{currencySymbol} {formatMoney(goal.targetAmount)}</h4></div>
                                    <button onClick={() => deleteGoal(goal.id)} className="text-red-500/50 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-500">Progresso do Mês</span><span className={progress >= 100 ? 'text-green-500' : 'text-blue-400'}>{progress.toFixed(1)}%</span></div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div><h2 className="text-2xl font-black">Configurações de Banca</h2><p className={theme.textMuted}>Gestão de capital e limites de risco.</p></div>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-8`}>
                <section className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Parâmetros Atuais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Nome da Banca</label><input type="text" value={brokerage.name} onChange={e => updateBrokerage('name', e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Moeda</label><select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`}><option value="USD">Dólar ($)</option><option value="BRL">Real (R$)</option></select></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Saldo Inicial</label><input type="number" value={brokerage.initialBalance} onChange={e => updateBrokerage('initialBalance', parseFloat(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Payout Padrão %</label><input type="number" value={brokerage.payoutPercentage} onChange={e => updateBrokerage('payoutPercentage', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                    </div>
                </section>
                <section className="space-y-6 pt-8 border-t border-slate-800/10">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Bloqueio Operacional (Stop)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Stop Gain (Wins)</label><input type="number" value={brokerage.stopGainTrades} onChange={e => updateBrokerage('stopGainTrades', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Stop Loss (Losses)</label><input type="number" value={brokerage.stopLossTrades} onChange={e => updateBrokerage('stopLossTrades', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                    </div>
                </section>
                <button onClick={onReset} className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all">Limpar Histórico de Operações</button>
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

    useEffect(() => {
        if (!isLoading) debouncedSave();
    }, [brokerages, records, goals, isLoading, debouncedSave]);

    const addRecord = (win: number, loss: number, customEntry?: number, customPayout?: number) => {
        setRecords(prev => {
            const dateKey = selectedDate.toISOString().split('T')[0];
            const sortedPrevious = prev.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
            const startBal = sortedPrevious.length > 0 ? sortedPrevious[0].endBalanceUSD : (brokerages[0]?.initialBalance || 0);
            const dailyRecordForSelectedDay = prev.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day');
            const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;
            const suggestedEntryValue = brokerages[0].entryMode === 'fixed' ? brokerages[0].entryValue : currentBalance * (brokerages[0].entryValue / 100);
            const entryValue = (customEntry && customEntry > 0) ? customEntry : suggestedEntryValue;
            const payout = (customPayout && customPayout > 0) ? customPayout : brokerages[0].payoutPercentage;
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
            return recalibrateHistory(updatedRecords, brokerages[0].initialBalance);
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            return recalibrateHistory(updated, brokerages[0].initialBalance);
        });
    };

    const handleReset = () => { if(confirm("Apagar todo histórico?")) { setRecords([]); } };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    
    const sortedPreviousForDashboard = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.id < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedPreviousForDashboard.length > 0 ? sortedPreviousForDashboard[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    // LÓGICA DE META DIÁRIA
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthRecords = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.id.startsWith(currentMonthStr));
    const currentMonthProfit = monthRecords.reduce((acc, r) => acc + r.netProfitUSD, 0);
    const monthlyGoal = goals.find(g => g.type === 'monthly');
    
    let activeDailyGoal = 0;
    if (monthlyGoal) {
        const remainingToTarget = monthlyGoal.targetAmount - currentMonthProfit;
        const remainingDaysEstimate = Math.max(1, 22 - monthRecords.length); 
        activeDailyGoal = Math.max(0, remainingToTarget) / remainingDaysEstimate;
    } else {
        activeDailyGoal = (activeBrokerage?.initialBalance * 0.03 || 1);
    }

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-800/50 font-black italic text-teal-400 text-xl tracking-tighter">HRK</div>
                <nav className="flex-1 p-4 space-y-1">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('ai-analysis'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'ai-analysis' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Análise IA</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Juros Compostos</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Extrato</button>
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
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeDailyGoal} />}
                    {activeTab === 'ai-analysis' && <AIAnalysisPanel theme={theme} isDarkMode={isDarkMode} />}
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
