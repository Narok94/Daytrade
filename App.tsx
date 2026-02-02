
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

// --- AI Analysis Panel ---
interface AIAnalysisResult {
    recommendation: 'COMPRA' | 'VENDA' | 'AGUARDAR';
    entry_time: string;
    timeframe: string;
    confidence: number;
    reasoning: string;
    risks: string;
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
            // FIX: Using Gemini 3 Flash for optimized chart analysis and vision reasoning.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = selectedImage.split(',')[1];
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: base64Data
                            }
                        },
                        {
                            text: `Você é um ALGORITMO DE ALTA ASSERTIVIDADE em Opções Binárias. Analise este gráfico e retorne um JSON estrito.
                            REGRAS: 
                            1. Identifique Gatilhos Sniper: Rejeição em pavio, Pullback, Engolfo ou Retração de M1.
                            2. Decisão Rápida: Se houver volatilidade, decida entre COMPRA ou VENDA. Só use AGUARDAR se o gráfico estiver parado (Dojis).
                            3. Retorne EXCLUSIVAMENTE o JSON no formato:
                            {
                              "recommendation": "COMPRA" | "VENDA" | "AGUARDAR",
                              "entry_time": "Imediata ou Próxima Vela",
                              "timeframe": "M1 ou M5",
                              "confidence": número,
                              "reasoning": "Gatilho técnico detectado",
                              "risks": "Ponto de atenção"
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
                            risks: { type: Type.STRING }
                        },
                        required: ["recommendation", "entry_time", "timeframe", "confidence", "reasoning", "risks"]
                    }
                }
            });

            // FIX: Access .text property directly instead of method call.
            const text = response.text;
            if (!text) throw new Error("Resposta vazia da IA");
            
            const result = JSON.parse(text);
            setAnalysisResult(result);
        } catch (err: any) {
            console.error("AI Analysis Error:", err);
            setError(`Erro técnico: ${err.message || "Tente novamente com outro print."}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div>
                    <h2 className={`text-3xl font-black tracking-tighter ${theme.text}`}>ANÁLISE SNIPER IA</h2>
                    <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-widest`}>Algoritmo de Fluxo e Retração</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className={`p-4 rounded-[2.5rem] border ${theme.card} flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden`}>
                    {!selectedImage ? (
                        <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full border-2 border-dashed border-slate-800 rounded-[2rem] hover:bg-green-500/5 transition-all group">
                            <PlusIcon className="w-16 h-16 text-slate-700 group-hover:text-green-500 transition-colors mb-4" />
                            <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] group-hover:text-green-500">Enviar Print do Gráfico</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                    ) : (
                        <div className="w-full h-full flex flex-col gap-4">
                            <div className="flex-1 rounded-[1.8rem] overflow-hidden border border-slate-800 relative group">
                                <img src={selectedImage} alt="Chart" className="w-full h-full object-contain bg-black" />
                                <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <button 
                                onClick={analyzeChart} 
                                disabled={isAnalyzing}
                                className="h-16 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black rounded-[1.5rem] uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                        ESCANEANDO MERCADO...
                                    </>
                                ) : (
                                    <>
                                        <CpuChipIcon className="w-6 h-6" />
                                        ANALISAR ENTRADA
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                <div className={`p-8 rounded-[2.5rem] border ${theme.card} flex flex-col relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <TrendingUpIcon className="w-32 h-32" />
                    </div>
                    
                    <h3 className="font-black mb-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-blue-400">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" /> IA ENGINE STATUS
                    </h3>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-3xl text-red-500 text-xs font-bold mb-6">
                            {error}
                        </div>
                    )}

                    {analysisResult ? (
                        <div className="flex-1 space-y-8 relative z-10">
                            <div className="flex items-end justify-between border-b border-slate-800 pb-8">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Recomendação</p>
                                    <div className={`text-5xl font-black flex items-center gap-4 ${
                                        analysisResult.recommendation === 'COMPRA' ? 'text-green-500' : 
                                        analysisResult.recommendation === 'VENDA' ? 'text-red-500' : 'text-yellow-500'
                                    }`}>
                                        {analysisResult.recommendation === 'COMPRA' ? 'CALL' : 
                                         analysisResult.recommendation === 'VENDA' ? 'PUT' : 'WAIT'}
                                        {analysisResult.recommendation === 'COMPRA' && <TrendingUpIcon className="w-10 h-10" />}
                                        {analysisResult.recommendation === 'VENDA' && <TrendingDownIcon className="w-10 h-10" />}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Confiança</p>
                                    <p className="text-4xl font-black text-white">{analysisResult.confidence}%</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Time de Entrada</p>
                                    <p className="text-sm font-black text-white uppercase">{analysisResult.entry_time}</p>
                                </div>
                                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Expiração</p>
                                    <p className="text-sm font-black text-white uppercase">{analysisResult.timeframe}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 rounded-[1.8rem] bg-blue-500/5 border border-blue-500/10">
                                    <p className="text-[10px] font-black uppercase text-blue-400 mb-3 tracking-widest">Gatilho de Operação</p>
                                    <p className="text-sm font-bold text-slate-300 leading-relaxed italic">"{analysisResult.reasoning}"</p>
                                </div>
                                <div className="px-6">
                                    <p className="text-[10px] font-black uppercase text-red-400 mb-2 tracking-widest">Ponto de Atenção</p>
                                    <p className="text-xs font-bold text-slate-500">{analysisResult.risks}</p>
                                </div>
                            </div>

                            <div className="pt-4 mt-auto">
                                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <TrophyIcon className="w-5 h-5 text-green-500" />
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 leading-tight uppercase tracking-widest">
                                        Análise Sniper processada com sucesso. Aguarde o ponto exato indicado pela IA.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-24 h-24 rounded-full border-2 border-slate-800 border-t-blue-500 animate-spin flex items-center justify-center">
                                <CpuChipIcon className="w-10 h-10 text-slate-800" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 max-w-[250px]">Sistema em Standby: Aguardando imagem do gráfico para análise</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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
        { label: 'Banca Atual', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-green-500' },
        { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'Meta Diária', val: `${Math.min(100, dailyGoalPercent).toFixed(0)}%`, subVal: `${currencySymbol}${formatMoney(currentProfit)} de ${formatMoney(dailyGoalTarget)}`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-green-500' : 'text-blue-400' },
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
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor (10% Banca)</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} placeholder="1.00" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} placeholder="80" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                            <div className="space-y-1 col-span-2 md:col-span-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Qtd</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button onClick={() => handleQuickAdd('win')} disabled={stopWinReached || stopLossReached} className="h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 active:scale-95 disabled:bg-slate-700 disabled:shadow-none disabled:cursor-not-allowed">WIN</button>
                            <button onClick={() => handleQuickAdd('loss')} disabled={stopWinReached || stopLossReached} className="h-14 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:bg-slate-700 disabled:shadow-none disabled:cursor-not-allowed">LOSS</button>
                        </div>
                         {stopMessage && (
                            <div className="mt-4 text-center text-xs font-bold text-yellow-500 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
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

// --- FIX: Added CompoundInterestPanel component ---
const CompoundInterestPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const initialBal = activeBrokerage?.initialBalance || 0;
    const days = 30;
    const dailyProfitPercent = 3;

    const data = useMemo(() => {
        let current = initialBal;
        const result = [];
        for (let i = 1; i <= days; i++) {
            const profit = current * (dailyProfitPercent / 100);
            const end = current + profit;
            result.push({ day: i, start: current, profit, end });
            current = end;
        }
        return result;
    }, [initialBal, dailyProfitPercent, days]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            <h2 className={`text-2xl font-black ${theme.text}`}>PROJEÇÃO DE JUROS COMPOSTOS (30 DIAS)</h2>
            <div className={`overflow-x-auto rounded-[2rem] border ${theme.card}`}>
                <table className="w-full text-left text-sm">
                    <thead className={`border-b ${theme.border} text-[10px] uppercase font-black text-slate-500`}>
                        <tr>
                            <th className="px-6 py-4">DIA</th>
                            <th className="px-6 py-4">BANCA INICIAL</th>
                            <th className="px-6 py-4">LUCRO (3%)</th>
                            <th className="px-6 py-4">BANCA FINAL</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${theme.border}`}>
                        {data.map(d => (
                            <tr key={d.day} className="hover:bg-slate-500/5 transition-colors">
                                <td className="px-6 py-4 font-black">{d.day}</td>
                                <td className="px-6 py-4">R$ {formatMoney(d.start)}</td>
                                <td className="px-6 py-4 text-green-500 font-bold">+R$ {formatMoney(d.profit)}</td>
                                <td className="px-6 py-4 font-black">R$ {formatMoney(d.end)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- FIX: Added ReportPanel component ---
const ReportPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records, deleteTrade }) => {
    const theme = useThemeClasses(isDarkMode);
    const allTrades = useMemo(() => {
        const trades: any[] = [];
        records.forEach((r: DailyRecord) => {
            r.trades.forEach(t => {
                trades.push({ ...t, date: r.date });
            });
        });
        return trades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [records]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            <h2 className={`text-2xl font-black ${theme.text}`}>RELATÓRIO COMPLETO</h2>
            <div className="space-y-3">
                {allTrades.length > 0 ? allTrades.map(t => (
                    <div key={t.id} className={`p-4 rounded-2xl border ${theme.card} flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-1 h-10 rounded-full ${t.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase">{t.date} - {new Date(t.timestamp || 0).toLocaleTimeString()}</p>
                                <p className="text-sm font-bold">{t.result === 'win' ? 'VITÓRIA (CALL/PUT)' : 'DERROTA (LOSS)'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-base font-black ${t.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                                {t.result === 'win' ? '+' : '-'} R$ {formatMoney(t.result === 'win' ? (t.entryValue * t.payoutPercentage / 100) : t.entryValue)}
                            </p>
                            <button onClick={() => deleteTrade(t.id, t.date)} className="text-[9px] font-bold text-red-500 uppercase tracking-tighter hover:underline">Remover</button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 opacity-30">
                        <DocumentTextIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-xs font-black uppercase">Nenhum trade registrado ainda</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- FIX: Added SorosCalculatorPanel component ---
const SorosCalculatorPanel: React.FC<any> = ({ theme, activeBrokerage }) => {
    const [initialEntry, setInitialEntry] = useState('10');
    const [payout, setPayout] = useState('80');
    const [levels, setLevels] = useState('4');

    const sorosData = useMemo(() => {
        const entry = parseFloat(initialEntry) || 0;
        const pay = (parseFloat(payout) || 0) / 100;
        const count = parseInt(levels) || 1;
        
        const results = [];
        let currentEntry = entry;
        for (let i = 1; i <= count; i++) {
            const profit = currentEntry * pay;
            const nextEntry = currentEntry + profit;
            results.push({ level: i, entry: currentEntry, profit, total: nextEntry });
            currentEntry = nextEntry;
        }
        return results;
    }, [initialEntry, payout, levels]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <h2 className={`text-2xl font-black ${theme.text}`}>CALCULADORA DE SOROS</h2>
            <div className={`p-6 rounded-3xl border ${theme.card} grid grid-cols-1 md:grid-cols-3 gap-6`}>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Entrada Inicial (R$)</label>
                    <input type="number" value={initialEntry} onChange={e => setInitialEntry(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-bold`} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Payout %</label>
                    <input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-bold`} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Níveis</label>
                    <input type="number" value={levels} onChange={e => setLevels(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-bold`} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sorosData.map(d => (
                    <div key={d.level} className={`p-6 rounded-[2rem] border ${theme.card} relative overflow-hidden`}>
                        <p className="text-[9px] font-black text-blue-500 uppercase mb-4 tracking-widest">NÍVEL {d.level}</p>
                        <div className="space-y-2">
                            <div>
                                <p className="text-[8px] font-bold text-slate-500 uppercase">Entrada</p>
                                <p className="text-lg font-black">R$ {formatMoney(d.entry)}</p>
                            </div>
                            <div className="pt-2 border-t border-slate-800/50">
                                <p className="text-[8px] font-bold text-green-500 uppercase">Retorno Total</p>
                                <p className="text-xl font-black text-green-500">R$ {formatMoney(d.total)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- FIX: Added GoalsPanel component ---
const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, records, activeBrokerage }) => {
    const totalProfit = records.reduce((acc: number, r: DailyRecord) => acc + (r.netProfitUSD || 0), 0);
    
    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <h2 className={`text-2xl font-black ${theme.text}`}>METAS E CONQUISTAS</h2>
            <div className={`p-8 rounded-[2.5rem] border ${theme.card} flex flex-col items-center text-center space-y-4`}>
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <TargetIcon className="w-10 h-10 text-blue-500" />
                </div>
                <div>
                    <h3 className="text-xl font-black">PROGRESSO ACUMULADO</h3>
                    <p className="text-slate-500 font-bold">R$ {formatMoney(totalProfit)} lucrados no total</p>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden max-w-md">
                    <div className="bg-blue-500 h-full w-[15%]" />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">15% DA META MENSAL ATINGIDA</p>
            </div>
        </div>
    );
};

// --- FIX: Added SettingsPanel component ---
const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset }) => {
    const [name, setName] = useState(brokerage?.name || '');
    const [initialBalance, setInitialBalance] = useState(String(brokerage?.initialBalance || ''));
    const [stopWin, setStopWin] = useState(String(brokerage?.stopGainTrades || ''));
    const [stopLoss, setStopLoss] = useState(String(brokerage?.stopLossTrades || ''));

    const handleSave = () => {
        setBrokerages((prev: Brokerage[]) => prev.map(b => b.id === brokerage.id ? {
            ...b,
            name,
            initialBalance: parseFloat(initialBalance) || 0,
            stopGainTrades: parseInt(stopWin) || 0,
            stopLossTrades: parseInt(stopLoss) || 0
        } : b));
        alert('Configurações salvas com sucesso!');
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
            <h2 className={`text-2xl font-black ${theme.text}`}>CONFIGURAÇÕES</h2>
            <div className={`p-8 rounded-[2.5rem] border ${theme.card} space-y-6`}>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome da Estratégia/Banca</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-bold`} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Banca Inicial (R$)</label>
                        <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-bold`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Stop Win (Vitórias)</label>
                            <input type="number" value={stopWin} onChange={e => setStopWin(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-bold`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Stop Loss (Derrotas)</label>
                            <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className={`w-full h-12 px-4 rounded-xl border ${theme.input} font-bold`} />
                        </div>
                    </div>
                </div>
                
                <div className="pt-4 flex flex-col gap-3">
                    <button onClick={handleSave} className="h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-2xl uppercase tracking-widest transition-all">Salvar Alterações</button>
                    <button onClick={onReset} className="h-14 border border-red-500/30 text-red-500 hover:bg-red-500/10 font-black rounded-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <TrashIcon className="w-5 h-5" /> LIMPAR TODO O HISTÓRICO
                    </button>
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

    const monthlyGoal = goals.find(g => g.type === 'monthly');
    const activeDailyGoal = monthlyGoal ? (monthlyGoal.targetAmount / 22) : (activeBrokerage?.initialBalance * 0.03 || 1);

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-800/50 font-black italic text-teal-400 text-xl tracking-tighter">HRK</div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('ai-analysis'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'ai-analysis' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Análise IA</button>
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
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeDailyGoal} />}
                    {activeTab === 'ai-analysis' && <AIAnalysisPanel isDarkMode={isDarkMode} />}
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
