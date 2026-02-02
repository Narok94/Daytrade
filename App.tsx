
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
        card: isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- AI Analyzer Panel ---
const AIAnalyzerPanel: React.FC<any> = ({ theme, isDarkMode }) => {
    const [imageData, setImageData] = useState<{base64: string, mimeType: string} | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Full = reader.result as string;
                const mimeType = base64Full.match(/data:([^;]+);base64,/)?.[1] || 'image/jpeg';
                const base64Data = base64Full.split(',')[1];
                
                setImageData({ base64: base64Data, mimeType });
                setPreviewUrl(base64Full);
                setResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeChart = async () => {
        if (!imageData) return;
        setAnalyzing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Aja como um motor de análise de visão computacional especializado em geometria de gráficos de velas (Candlesticks).
            Sua tarefa é analisar os padrões visuais, cores e disposições das velas nesta imagem para fins educacionais.
            
            Analise:
            1. Predominância de cor (Vendedores vs Compradores).
            2. Padrões de Price Action (Martelos, Engolfos, Dojis).
            3. Localização de zonas de retração (pavios longos).
            
            RETORNE APENAS UM JSON NO FORMATO ABAIXO. NÃO ADICIONE TEXTO EXPLICATIVO ANTES OU DEPOIS.
            
            {
                "operacao": "CALL" | "PUT" | "AGUARDAR",
                "confianca": numero_de_0_a_100,
                "motivo": "resumo técnico curto do que foi visto",
                "detalhes": ["confluência 1", "confluência 2", "confluência 3"]
            }`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: imageData.base64, mimeType: imageData.mimeType } },
                        { text: prompt }
                    ]
                }
            });

            const text = response.text || '';
            
            // Robust JSON extraction
            let cleanJson = text;
            const jsonBlockMatch = text.match(/```json\s?([\s\S]*?)```/i);
            if (jsonBlockMatch) {
                cleanJson = jsonBlockMatch[1];
            } else {
                const bracketMatch = text.match(/\{[\s\S]*\}/);
                if (bracketMatch) cleanJson = bracketMatch[0];
            }

            try {
                const parsed = JSON.parse(cleanJson);
                setResult(parsed);
            } catch (parseErr) {
                console.error("Incomplete AI Response:", text);
                throw new Error("A IA não conseguiu estruturar os dados. Tente um print mais nítido ou reduza o zoom do gráfico.");
            }
            
        } catch (err: any) {
            console.error("Analysis Error:", err);
            setError(err.message || "Erro de comunicação com o servidor. Verifique sua conexão.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-2xl font-black ${theme.text}`}>Analista de Gráficos IA</h2>
                    <p className={theme.textMuted}>Utilize inteligência artificial para ler padrões de mercado em segundos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className={`p-6 rounded-3xl border ${theme.card} flex flex-col items-center justify-center min-h-[420px] border-dashed border-2 relative overflow-hidden group transition-all duration-300`}>
                    {previewUrl ? (
                        <div className="relative w-full h-full flex items-center justify-center animate-in zoom-in duration-300">
                            <img src={previewUrl} alt="Chart Preview" className="max-w-full max-h-[360px] object-contain rounded-xl shadow-2xl border border-white/5" />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => {setPreviewUrl(null); setImageData(null); setResult(null); setError(null);}} className="p-3 bg-red-600/90 backdrop-blur-md text-white rounded-full hover:scale-110 transition-all shadow-xl"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-4 text-center group w-full h-full justify-center hover:bg-emerald-500/5 transition-colors">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all border border-emerald-500/20">
                                <PlusIcon className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-black text-xs uppercase tracking-[0.2em] text-emerald-500">Enviar Print do Gráfico</p>
                                <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Recomendado: M1 ou M5 com zoom equilibrado</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    )}
                </div>

                {/* Analysis/Results Section */}
                <div className="space-y-6 flex flex-col">
                    <button 
                        onClick={analyzeChart} 
                        disabled={!imageData || analyzing}
                        className={`w-full h-20 rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden
                        ${!imageData || analyzing ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95'}`}
                    >
                        {analyzing ? (
                            <>
                                <ArrowPathIcon className="w-6 h-6 animate-spin mb-1" />
                                <span className="text-[10px]">Interpretando Candles...</span>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <CpuChipIcon className="w-6 h-6" />
                                    <span>Analisar Gráfico</span>
                                </div>
                                <span className="text-[8px] opacity-60 font-bold tracking-[0.3em]">GEMINI 3.0 MULTIMODAL VISON</span>
                            </>
                        )}
                        {analyzing && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                    </button>

                    {error && (
                        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-red-500 animate-in slide-in-from-top-4">
                            <InformationCircleIcon className="w-6 h-6 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1">Erro de Identificação</p>
                                <p className="text-[11px] font-bold opacity-80 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className={`p-8 rounded-3xl border ${theme.card} space-y-6 animate-in slide-in-from-bottom-8 duration-500 shadow-2xl relative overflow-hidden`}>
                            <div className="flex justify-between items-end border-b border-slate-800/10 pb-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Sentimento da IA</p>
                                    <h3 className={`text-6xl font-black tracking-tighter ${result.operacao === 'CALL' ? 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]' : result.operacao === 'PUT' ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-slate-400'}`}>
                                        {result.operacao === 'CALL' ? '↑ CALL' : result.operacao === 'PUT' ? '↓ PUT' : 'ESPERAR'}
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">Confiabilidade</p>
                                    <p className="text-4xl font-black text-blue-400 italic">{result.confianca}%</p>
                                </div>
                            </div>

                            <div className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                                <p className="text-[9px] font-black uppercase text-emerald-500/60 mb-2 tracking-widest">Resumo Técnico</p>
                                <p className="text-sm font-bold leading-relaxed opacity-90">{result.motivo}</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Confluências Identificadas</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {result.detalhes?.map((detail: string, i: number) => (
                                        <div key={i} className="flex items-center gap-3 text-xs font-bold opacity-80 p-2 bg-white/5 rounded-lg">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                            {detail}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-800/10">
                                <p className="text-[8px] text-center uppercase font-black text-slate-600 leading-tight">
                                    AVISO: Esta análise é meramente informativa e baseada em visão computacional. O mercado de renda variável apresenta riscos elevados de perda.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {!result && !analyzing && !error && (
                        <div className="flex-1 border border-slate-800/20 rounded-3xl flex flex-col items-center justify-center opacity-20 text-center space-y-4 p-10 border-dashed">
                            <CpuChipIcon className="w-16 h-16 animate-pulse" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Scanner Offline</p>
                                <p className="text-[9px] font-bold mt-1">Carregue uma imagem para iniciar o processamento neural</p>
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

    const stopWinTrades = activeBrokerage.stopGainTrades || 0;
    const stopLossTrades = activeBrokerage.stopLossTrades || 0;
    const stopWinReached = stopWinTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= stopWinTrades;
    const stopLossReached = stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= stopLossTrades;

    let stopMessage = '';
    if (stopWinReached) {
        stopMessage = `Meta de Stop Win (${stopWinTrades} vitórias) atingida.`;
    } else if (stopLossReached) {
        stopMessage = `Meta de Stop Loss (${stopLossTrades} derrotas) atingida.`;
    }

    const kpis = [
        { label: 'Banca Atual', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-500' },
        { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-500' : 'text-red-500' },
        { label: 'Meta Diária', val: `${Math.min(100, dailyGoalPercent).toFixed(0)}%`, subVal: `${currencySymbol}${formatMoney(currentProfit)} de ${formatMoney(dailyGoalTarget)}`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-emerald-500' : 'text-blue-400' },
        { label: 'Win Rate', val: `${winRate}%`, icon: TrophyIcon, color: 'text-purple-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Gestão ativa de operações</p></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-4 rounded-3xl border ${theme.card} flex flex-col justify-between hover:scale-[1.02] transition-transform`}>
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
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CalculatorIcon className="w-5 h-5 text-emerald-500" /> Nova Ordem</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor (Entrada)</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} placeholder="1.00" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} placeholder="80" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} /></div>
                            <div className="space-y-1 col-span-2 md:col-span-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Qtd</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button onClick={() => handleQuickAdd('win')} disabled={stopWinReached || stopLossReached} className="h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:bg-slate-700 disabled:shadow-none disabled:cursor-not-allowed">WIN</button>
                            <button onClick={() => handleQuickAdd('loss')} disabled={stopWinReached || stopLossReached} className="h-14 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:bg-slate-700 disabled:shadow-none disabled:cursor-not-allowed">LOSS</button>
                        </div>
                         {stopMessage && (
                            <div className="mt-4 text-center text-xs font-bold text-yellow-500 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 animate-pulse">
                                {stopMessage} Operações bloqueadas por hoje.
                            </div>
                        )}
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
                                                <div className={`w-2 h-8 rounded-full ${trade.result === 'win' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-500 leading-none">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    <p className="text-sm font-bold">{trade.result === 'win' ? 'Vitória' : 'Derrota'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${tradeProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}</p>
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
        const sortedRealRecords = records
            .filter((r: any): r is DailyRecord => r.recordType === 'day' && r.trades.length > 0)
            .sort((a, b) => a.id.localeCompare(b.id));
        
        let startDate: Date;
        if (sortedRealRecords.length > 0) {
            startDate = new Date(sortedRealRecords[0].id + 'T12:00:00');
        } else {
            startDate = new Date();
            startDate.setHours(12,0,0,0);
        }

        let runningBalance = activeBrokerage.initialBalance;

        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateId = currentDate.toISOString().split('T')[0];
            
            const realRecord = records.find((r: any) => r.recordType === 'day' && r.id === dateId && r.trades.length > 0);
            
            let initial = runningBalance;
            let win, loss, profit, final, isProjection, operationValue;

            if (realRecord) {
                win = realRecord.winCount;
                loss = realRecord.lossCount;
                profit = realRecord.netProfitUSD;
                final = realRecord.endBalanceUSD;
                operationValue = (realRecord.trades.length > 0) ? realRecord.trades[0].entryValue : (initial * 0.10);
                isProjection = false;
            } else {
                isProjection = true;
                operationValue = initial * 0.10;
                win = 3;
                loss = 0;
                profit = (operationValue * (activeBrokerage.payoutPercentage / 100)) * 3;
                final = initial + profit;
            }

            rows.push({
                diaTrade: i + 1,
                dateId,
                dateDisplay: currentDate.toLocaleDateString('pt-BR'),
                initial,
                win,
                loss,
                profit,
                final,
                operationValue,
                isProjection
            });
            runningBalance = final;
        }
        return rows;
    }, [records, activeBrokerage.initialBalance, activeBrokerage.payoutPercentage]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div>
                <h2 className={`text-2xl font-black ${theme.text}`}>Planilha de Juros (30 Dias)</h2>
                <p className={`${theme.textMuted} text-xs mt-1 font-bold`}>Dias em baixa opacidade são projeções automáticas de 3x0.</p>
            </div>
            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[900px]">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}>
                                <th className="py-5 px-3 border-b border-slate-800/20">Dia</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Data</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Saldo Inicial</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Valor Operação</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-emerald-500">Win</th>
                                <th className="py-5 px-3 border-b border-slate-800/20 text-red-500">Loss</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Lucro</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Saldo Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.diaTrade} className={`text-sm font-bold hover:bg-slate-800/5 transition-colors ${row.isProjection ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                    <td className="py-4 px-3 opacity-40 font-mono text-xs">#{row.diaTrade}</td>
                                    <td className="py-4 px-3 text-[10px] uppercase font-black opacity-60">{row.dateDisplay}</td>
                                    <td className="py-4 px-3 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-4 px-3 font-mono text-sm text-blue-400">{currencySymbol} {formatMoney(row.operationValue)}</td>
                                    <td className="py-4 px-3"><span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-xl">{row.win}</span></td>
                                    <td className="py-4 px-3"><span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-xl">{row.loss}</span></td>
                                    <td className={`py-4 px-3 font-black ${row.profit > 0 ? 'text-emerald-500' : row.profit < 0 ? 'text-red-500' : 'opacity-30'}`}>{row.profit > 0 ? '+' : ''}{currencySymbol} {formatMoney(row.profit)}</td>
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
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Relatório Mensal</h2><p className={theme.textMuted}>Histórico detalhado por competência.</p></div>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-6 rounded-3xl border ${theme.card}`}><p className="text-[9px] uppercase font-black opacity-50 mb-1">Lucro no Mês</p><p className={`text-2xl font-black ${reportData.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{reportData.totalProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(reportData.totalProfit)}</p></div>
                <div className={`p-6 rounded-3xl border ${theme.card}`}><p className="text-[9px] uppercase font-black opacity-50 mb-1">Banca Final</p><p className="text-2xl font-black text-blue-400">{currencySymbol} {formatMoney(reportData.finalMonthBalance)}</p></div>
                <div className={`p-6 rounded-3xl border ${theme.card}`}><p className="text-[9px] uppercase font-black opacity-50 mb-1">Volume de Trades</p><p className="text-2xl font-black">{reportData.allTrades.length}</p></div>
            </div>
            <div className={`rounded-3xl border overflow-hidden ${theme.card}`}>
                <div className="p-6 border-b border-slate-800/10 font-black text-[10px] uppercase opacity-60">Lista de Operações</div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead><tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}><th className="py-4 px-6">Data / Hora</th><th className="py-4 px-6">Status</th><th className="py-4 px-6">Entrada</th><th className="py-4 px-6">Resultado</th><th className="py-4 px-6 text-right">Ação</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/5">
                            {reportData.allTrades.map((t) => {
                                const profit = t.result === 'win' ? (t.entryValue * (t.payoutPercentage / 100)) : -t.entryValue;
                                const tradeDate = t.timestamp ? new Date(t.timestamp) : new Date(t.dayId + 'T12:00:00');
                                return (
                                    <tr key={t.id} className="hover:bg-slate-800/5 transition-colors">
                                        <td className="py-4 px-6 font-bold text-sm">
                                            {tradeDate.toLocaleDateString('pt-BR')}
                                            <span className="ml-2 text-[10px] opacity-40 font-mono">
                                                {tradeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6"><span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${t.result === 'win' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{t.result.toUpperCase()}</span></td>
                                        <td className="py-4 px-6 font-mono text-sm opacity-60">{currencySymbol} {formatMoney(t.entryValue)}</td>
                                        <td className={`py-4 px-6 font-black ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{profit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(profit)}</td>
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
    const [initialEntry, setInitialEntry] = useState('10');
    const [payout, setPayout] = useState(activeBrokerage?.payoutPercentage || '80');
    const [levels, setLevels] = useState('4');

    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    const calculations = useMemo(() => {
        const entry = parseFloat(initialEntry) || 0;
        const p = (parseFloat(payout) || 0) / 100;
        const lvls = parseInt(levels) || 1;
        const results = [];
        let currentEntry = entry;

        for (let i = 1; i <= lvls; i++) {
            const profit = currentEntry * p;
            const total = currentEntry + profit;
            results.push({ level: i, entry: currentEntry, profit, total });
            currentEntry = total;
        }
        return results;
    }, [initialEntry, payout, levels]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div>
                <h2 className="text-2xl font-black">Calculadora de Soros</h2>
                <p className={theme.textMuted}>Planeje seus ciclos de reinvestimento agressivo.</p>
            </div>
            <div className={`p-6 rounded-3xl border ${theme.card} grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl`}>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Entrada Inicial ({currencySymbol})</label>
                    <input type="number" value={initialEntry} onChange={e => setInitialEntry(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Payout %</label>
                    <input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Níveis</label>
                    <input type="number" value={levels} onChange={e => setLevels(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {calculations.map((res) => (
                    <div key={res.level} className={`p-6 rounded-3xl border ${theme.card} relative overflow-hidden group hover:border-emerald-500/50 transition-colors`}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-4xl group-hover:scale-110 transition-transform">L{res.level}</div>
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Nível {res.level}</p>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400">Entrada: {currencySymbol} {formatMoney(res.entry)}</p>
                            <p className="text-lg font-black text-emerald-500">Lucro: +{currencySymbol} {formatMoney(res.profit)}</p>
                            <div className="h-px bg-slate-800/20 my-2" />
                            <p className="text-xs font-bold opacity-60">Próxima Mão: {currencySymbol} {formatMoney(res.total)}</p>
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
        const newGoal: Goal = {
            id: crypto.randomUUID(),
            name,
            targetAmount: parseFloat(target),
            type,
            createdAt: Date.now()
        };
        setGoals((prev: Goal[]) => [...prev, newGoal]);
        setName(''); setTarget('');
    };

    const deleteGoal = (id: string) => {
        setGoals((prev: Goal[]) => prev.filter(g => g.id !== id));
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black">Metas Financeiras</h2>
                    <p className={theme.textMuted}>Defina e acompanhe seus objetivos de longo prazo.</p>
                </div>
            </div>

            <div className={`p-6 rounded-3xl border ${theme.card} shadow-lg`}>
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6">Cadastrar Novo Objetivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Nome da Meta</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Viagem de Luxo" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Valor Alvo ({currencySymbol})</label><input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="5000" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Frequência</label><select value={type} onChange={e => setType(e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option><option value="annual">Anual</option></select></div>
                    <div className="flex items-end"><button onClick={addGoal} className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"><PlusIcon className="w-4 h-4" /> Adicionar</button></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {goals.map(goal => {
                    const currentProfit = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day').reduce((acc, r) => acc + r.netProfitUSD, 0);
                    const progress = Math.min(100, (currentProfit / goal.targetAmount) * 100);
                    return (
                        <div key={goal.id} className={`p-6 rounded-3xl border ${theme.card} hover:shadow-2xl transition-all`}>
                            <div className="flex justify-between items-start mb-4">
                                <div><p className="text-[10px] font-black uppercase text-slate-500">{goal.type}</p><h4 className="text-xl font-black">{goal.name}</h4></div>
                                <button onClick={() => deleteGoal(goal.id)} className="text-red-500/50 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>Progresso Atual</span>
                                    <span className="text-emerald-500">{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-800/20 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex justify-between items-baseline pt-2">
                                    <p className="text-2xl font-black text-emerald-500">{currencySymbol} {formatMoney(currentProfit)}</p>
                                    <p className="text-xs font-bold opacity-40">de {currencySymbol} {formatMoney(goal.targetAmount)}</p>
                                </div>
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
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-black">Configurações do Perfil</h2>
                <p className={theme.textMuted}>Ajuste os parâmetros globais da sua banca e gestão.</p>
            </div>

            <div className={`p-8 rounded-3xl border ${theme.card} space-y-8 shadow-xl`}>
                <section className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2 text-emerald-500">Capital & Moeda</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Identificação da Banca</label>
                            <input type="text" value={brokerage.name} onChange={e => updateBrokerage('name', e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Moeda de Operação</label>
                            <select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`}>
                                <option value="USD">Dólar ($)</option>
                                <option value="BRL">Real (R$)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Capital Inicial</label>
                            <input type="number" value={brokerage.initialBalance} onChange={e => updateBrokerage('initialBalance', parseFloat(e.target.value))} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout Médio %</label>
                            <input type="number" value={brokerage.payoutPercentage} onChange={e => updateBrokerage('payoutPercentage', parseInt(e.target.value))} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                        </div>
                    </div>
                </section>

                <section className="space-y-6 pt-8 border-t border-slate-800/10">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2 text-blue-500">Gestão de Lotes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Método de Entrada</label>
                            <div className="flex bg-slate-800/10 p-1 rounded-xl">
                                <button onClick={() => updateBrokerage('entryMode', 'percentage')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${brokerage.entryMode === 'percentage' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Porcentagem</button>
                                <button onClick={() => updateBrokerage('entryMode', 'fixed')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${brokerage.entryMode === 'fixed' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Fixo</button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor/Pct de Entrada ({brokerage.entryMode === 'percentage' ? '%' : (brokerage.currency === 'USD' ? '$' : 'R$')})</label>
                            <input type="number" value={brokerage.entryValue} onChange={e => updateBrokerage('entryValue', parseFloat(e.target.value))} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                        </div>
                    </div>
                </section>

                <section className="space-y-6 pt-8 border-t border-slate-800/10">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2 text-red-500">Controle de Risco (Stop)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Stop Win (Metas Batidas)</label>
                            <input type="number" value={brokerage.stopGainTrades} onChange={e => updateBrokerage('stopGainTrades', parseInt(e.target.value))} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Stop Loss (Limite de Perda)</label>
                            <input type="number" value={brokerage.stopLossTrades} onChange={e => updateBrokerage('stopLossTrades', parseInt(e.target.value))} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-emerald-500 outline-none font-bold ${theme.input}`} />
                        </div>
                    </div>
                </section>

                <section className="pt-12 space-y-4">
                    <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20">
                        <h4 className="text-sm font-black text-red-500 uppercase mb-2">Segurança de Dados</h4>
                        <p className="text-xs font-bold text-red-500/60 mb-6">A limpeza de histórico é irreversível. Certifique-se de exportar seus dados se necessário.</p>
                        <button onClick={onReset} className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-red-500/20">Limpar Histórico Completo</button>
                    </div>
                </section>
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
        
        const suggestedValue = activeBrokerage.entryMode === 'fixed'
            ? activeBrokerage.entryValue
            : currentBalance * (activeBrokerage.entryValue / 100);
        
        setCustomEntryValue(String(suggestedValue.toFixed(2)));
        setCustomPayout(String(activeBrokerage.payoutPercentage));

    }, [activeBrokerage, records, selectedDate]);


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

            const suggestedEntryValue = brokerages[0].entryMode === 'fixed' 
                ? brokerages[0].entryValue 
                : currentBalance * (brokerages[0].entryValue / 100);

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

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    // Dynamic Daily Goal derived from Monthly Goal
    const monthlyGoal = goals.find(g => g.type === 'monthly');
    const activeDailyGoal = monthlyGoal ? (monthlyGoal.targetAmount / 22) : (activeBrokerage?.initialBalance * 0.03 || 1);

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-800/50 font-black italic text-emerald-400 text-2xl tracking-tighter">HRK</div>
                <nav className="flex-1 p-4 space-y-1">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Planilha Juros</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Relatório</button>
                    <button onClick={() => {setActiveTab('ai'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'ai' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Analista IA</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Calc Soros</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Metas</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Configurações</button>
                </nav>
                <div className="p-4 border-t border-slate-800/50"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl"><LogoutIcon className="w-5 h-5" />Sair</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex items-center justify-between px-6 md:px-8 border-b ${theme.header}`}>
                    <div className="flex items-center gap-4"><button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2"><MenuIcon className="w-6 h-6" /></button><SavingStatusIndicator status={savingStatus} /></div>
                    <div className="flex items-center gap-3"><button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-800/20 rounded-full transition-colors">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button><div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.5)]">{user.username.slice(0, 2).toUpperCase()}</div></div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeDailyGoal} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'report' && <ReportPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} deleteTrade={deleteTrade} />}
                    {activeTab === 'ai' && <AIAnalyzerPanel theme={theme} isDarkMode={isDarkMode} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} records={records} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onReset={handleReset} />}
                </div>
            </main>
        </div>
    );
};

const SavingStatusIndicator: React.FC<{status: string}> = ({status}) => {
    if (status === 'saving') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 animate-pulse"><ArrowPathIcon className="w-3 h-3 animate-spin" /> Sincronizando...</div>;
    if (status === 'saved') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500"><CheckIcon className="w-3 h-3" /> Nuvem Atualizada</div>;
    if (status === 'error') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500"><InformationCircleIcon className="w-3 h-3" /> Erro ao salvar</div>;
    return null;
};

export default App;
