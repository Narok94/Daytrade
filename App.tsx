
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, TrendingDownIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon, CpuChipIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getLocalISOString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

// --- AI Analyzer Panel ---
const AIAnalyzerPanel: React.FC<any> = ({ theme, isDarkMode }) => {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const processFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) processFile(blob);
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const analyzeChart = async () => {
        if (!image) return;
        setAnalyzing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const mimeType = image.split(';')[0].split(':')[1];
            const base64Data = image.split(',')[1];
            
            // Sniper Vision v10.0 - ULTIMATE QUANTUM SEGMENTATION
            const prompt = `VOCÊ É O SISTEMA SNIPER VISION v10.0 - MOTOR DE VISÃO CIBERNÉTICO DE ALTA PERFORMANCE.

            ALGORITMO DE FILTRAGEM (MODO X-RAY):
            1. ISOLAMENTO TÁTICO: A imagem contém marcas d'água "AXIUN" ou padrões de fundo repetitivos. VOCÊ DEVE FILTRAR E IGNORAR COMPLETAMENTE ESSES PIXELS. Eles são ruído estático.
            2. FOCO GEOMÉTRICO: Extraia apenas a geometria dos CANDLESTICKS (Velas). Identifique Corpos (Verde/Vermelho) e Pavios (Sombras).
            3. ANÁLISE DE FLUXO: Identifique a micro-tendência atual (Price Action) ignorando qualquer obstrução visual do fundo.
            
            MISSÃO: Fornecer um sinal de alta probabilidade (M1) para Opções Binárias baseado em:
            - Confluência de Rejeição de Pavio.
            - Padrões de Continuidade ou Reversão.
            - Zonas de Exaustão.

            REQUISITO DE RESPOSTA: Se houver qualquer vela visível, você DEVE fornecer a análise. Ignore o ruído da Axiun como se fosse transparente.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: mimeType } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            operacao: { type: Type.STRING, description: "CALL, PUT ou AGUARDAR" },
                            confianca: { type: Type.NUMBER, description: "Probabilidade 0-100" },
                            leitura_tecnica: { type: Type.STRING, description: "Explicação técnica ignorando o ruído de fundo" },
                            setup_detectado: { type: Type.STRING, description: "Nome do padrão gráfico" },
                            gatilhos: { type: Type.ARRAY, items: { type: Type.STRING } },
                            tendencia: { type: Type.STRING, description: "ALTA, BAIXA ou LATERAL" }
                        },
                        required: ["operacao", "confianca", "leitura_tecnica", "setup_detectado", "gatilhos", "tendencia"]
                    },
                    temperature: 0, // Zero para máxima precisão e consistência
                }
            });

            const text = response.text;
            if (text) {
                // Limpeza agressiva para garantir JSON puro
                const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                setResult(JSON.parse(cleanedJson));
            } else {
                throw new Error("Empty Response");
            }
        } catch (err: any) {
            console.error("Sniper v10.0 Critical Error:", err);
            setError("FALHA CRÍTICA DE VISÃO: O motor não conseguiu separar o sinal do ruído Axiun. DICA: Tente uma captura com menos zoom ou mude o tema da corretora para 'Escuro' total.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className={`text-4xl font-black ${theme.text} tracking-tighter uppercase italic flex items-center gap-4`}>
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-30 animate-pulse" />
                            <div className="w-14 h-14 bg-slate-900 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-center relative z-10">
                                 <CpuChipIcon className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>
                        Sniper <span className="text-emerald-500">Vision v10.0</span>
                    </h2>
                    <p className={`${theme.textMuted} mt-1 font-black text-[9px] uppercase tracking-[0.5em] flex items-center gap-2`}>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Motor de Isolamento Quântico Ativo
                    </p>
                </div>
                <div className="hidden md:flex flex-col items-end">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Protocolo de Redundância</p>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">PX-ISOLATION: ENABLED</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden min-h-0">
                <div className="lg:col-span-7 flex flex-col gap-6 overflow-hidden">
                    <div className={`relative flex-1 rounded-[4.5rem] border-2 border-dashed ${image ? 'border-emerald-500/60' : 'border-slate-800'} ${theme.card} flex flex-col items-center justify-center overflow-hidden bg-slate-950 transition-all group shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]`}>
                        {image ? (
                            <div className="relative w-full h-full p-8 flex items-center justify-center">
                                <img src={image} alt="Chart" className="max-h-full max-w-full object-contain rounded-3xl shadow-[0_0_150px_rgba(0,0,0,1)] ring-1 ring-white/5" />
                                
                                {analyzing && (
                                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-[4px] bg-emerald-400 shadow-[0_0_50px_#4ade80] animate-[scan_1.2s_ease-in-out_infinite]" />
                                        <div className="absolute inset-0 bg-emerald-500/[0.06] backdrop-blur-[4px]" />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="w-80 h-80 border-[8px] border-emerald-500/10 rounded-full animate-ping" />
                                            <p className="mt-8 text-emerald-400 text-xs font-black uppercase tracking-[1em] animate-pulse">Scanning Layers...</p>
                                        </div>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-3xl">
                                    <button onClick={() => setImage(null)} className="p-8 bg-red-600 text-white rounded-full hover:scale-110 transition-all shadow-2xl active:scale-90 border-[10px] border-white/5"><TrashIcon className="w-14 h-14" /></button>
                                </div>
                            </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-14 text-center p-24 w-full h-full justify-center hover:bg-emerald-500/[0.04] transition-all duration-700">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                                    <div className="w-36 h-36 bg-emerald-500/10 rounded-[3.5rem] flex items-center justify-center border-2 border-emerald-500/40 relative z-10 group-hover:rotate-12 transition-all duration-1000">
                                        <PlusIcon className="w-20 h-20 text-emerald-500" />
                                    </div>
                                </div>
                                <div className="max-w-md space-y-5">
                                    <p className="font-black text-3xl uppercase tracking-[0.4em] text-white">Quantum Input</p>
                                    <p className="text-[12px] opacity-70 font-bold text-slate-400 uppercase tracking-[0.3em] leading-loose px-8">Capture o gráfico (Ctrl+V).<br/>O Motor v10 atravessa qualquer marca d'água Axiun para identificar o sinal.</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>
                    
                    <button 
                        onClick={analyzeChart} 
                        disabled={!image || analyzing}
                        className={`h-28 shrink-0 rounded-[4rem] font-black uppercase tracking-[1em] transition-all flex items-center justify-center gap-8 text-base shadow-2xl
                        ${!image || analyzing ? 'bg-slate-900 text-slate-700 cursor-not-allowed border-2 border-slate-800' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/50 active:scale-95'}`}
                    >
                        {analyzing ? (
                            <>
                                <ArrowPathIcon className="w-10 h-10 animate-spin" />
                                <span className="animate-pulse italic">Processando Visão v10...</span>
                            </>
                        ) : (
                            <>
                                <CpuChipIcon className="w-12 h-12" />
                                Executar Varredura Quântica
                            </>
                        )}
                    </button>
                </div>

                <div className="lg:col-span-5 overflow-y-auto custom-scrollbar pr-3 space-y-10">
                    {error && (
                        <div className="p-12 bg-red-500/10 border-2 border-red-500/40 rounded-[5rem] flex items-start gap-10 text-red-500 animate-in slide-in-from-right duration-700 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                            <InformationCircleIcon className="w-16 h-16 shrink-0" />
                            <div className="space-y-5">
                                <p className="text-2xl font-black uppercase tracking-widest">Alerta v10.0</p>
                                <p className="text-sm font-bold opacity-90 leading-relaxed uppercase">{error}</p>
                                <div className="pt-6">
                                    <button onClick={() => setImage(null)} className="px-10 py-5 bg-red-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl active:scale-95">Resetar Filtros</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {result ? (
                        <div className={`p-14 rounded-[6rem] border-2 ${theme.card} space-y-14 animate-in fade-in slide-in-from-bottom-20 duration-1000 shadow-[0_0_200px_rgba(16,185,129,0.15)] relative overflow-hidden bg-slate-900/90 backdrop-blur-3xl`}>
                            <div className={`absolute -top-40 -right-40 w-[30rem] h-[30rem] blur-[180px] opacity-40 rounded-full ${result.operacao === 'CALL' ? 'bg-emerald-500' : result.operacao === 'PUT' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            
                            <div className="flex justify-between items-end relative z-10 border-b-2 border-white/5 pb-14">
                                <div className="space-y-4">
                                    <p className="text-[16px] font-black uppercase text-slate-500 tracking-[0.6em]">Sinal Sniper</p>
                                    <h3 className={`text-[12rem] font-black tracking-tighter italic leading-none ${result.operacao === 'CALL' ? 'text-emerald-500' : result.operacao === 'PUT' ? 'text-red-500' : 'text-slate-200'}`}>
                                        {result.operacao}
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[14px] font-black uppercase text-slate-500 tracking-widest">Precision</p>
                                    <p className={`text-8xl font-black leading-none ${result.confianca > 85 ? 'text-blue-400' : 'text-yellow-500'}`}>{result.confianca}%</p>
                                </div>
                            </div>

                            <div className="space-y-12 relative z-10">
                                <div className="p-12 bg-slate-950/95 rounded-[4rem] border-2 border-white/10 space-y-6 shadow-2xl relative group overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 group-hover:bg-emerald-400 transition-colors" />
                                    <p className="text-[14px] font-black uppercase tracking-[0.5em] text-emerald-500/80 flex items-center gap-5">
                                        <TrendingUpIcon className="w-7 h-7" /> Quantum Feedback
                                    </p>
                                    <p className="text-lg font-bold leading-relaxed italic text-white/95">"{result.leitura_tecnica}"</p>
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    <div className="p-9 bg-white/5 rounded-[3rem] border-2 border-white/5 flex justify-between items-center group hover:bg-white/[0.08] transition-all">
                                         <div>
                                            <p className="text-[14px] font-black uppercase text-slate-500 tracking-widest">Padrão Tático</p>
                                            <p className="text-2xl font-black text-white mt-2 uppercase italic">{result.setup_detectado}</p>
                                         </div>
                                         <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-slate-950 shadow-[0_0_40px_#10b98166] transform -rotate-3">
                                             <CheckIcon className="w-10 h-10" />
                                         </div>
                                    </div>
                                    
                                    <div className="p-9 bg-white/5 rounded-[3rem] border-2 border-white/5">
                                        <p className="text-[14px] font-black uppercase text-slate-500 tracking-widest mb-8">Confluências Sniper</p>
                                        <div className="flex flex-wrap gap-5">
                                            {result.gatilhos?.map((item: string, i: number) => (
                                                <span key={i} className="px-8 py-5 bg-emerald-500/10 text-emerald-400 text-[14px] font-black uppercase rounded-3xl border-2 border-emerald-500/20 shadow-[0_0_30px_#10b98144] flex items-center gap-4">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-10 rounded-[3.5rem] border-4 flex items-center justify-between transition-all ${result.tendencia === 'ALTA' ? 'bg-emerald-500/10 border-emerald-500/30' : result.tendencia === 'BAIXA' ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                                    <div className="flex items-center gap-8">
                                        <TargetIcon className={`w-12 h-12 ${result.tendencia === 'ALTA' ? 'text-emerald-500' : result.tendencia === 'BAIXA' ? 'text-red-500' : 'text-blue-400'}`} />
                                        <div>
                                            <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-80 text-white/50">Fluxo Dominante</p>
                                            <p className={`text-2xl font-black uppercase tracking-widest ${result.tendencia === 'ALTA' ? 'text-emerald-500' : result.tendencia === 'BAIXA' ? 'text-red-500' : 'text-blue-400'}`}>{result.tendencia}</p>
                                        </div>
                                    </div>
                                    <div className={`w-20 h-20 flex items-center justify-center rounded-3xl ${result.tendencia === 'ALTA' ? 'bg-emerald-500 text-slate-950' : result.tendencia === 'BAIXA' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                                        {result.tendencia === 'ALTA' ? <TrendingUpIcon className="w-10 h-10" /> : result.tendencia === 'BAIXA' ? <TrendingDownIcon className="w-10 h-10" /> : <ArrowPathIcon className="w-10 h-10" />}
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-[12px] text-center uppercase font-black text-slate-600 mt-16 italic opacity-80 tracking-[0.6em]">Sniper v10.0 Engine - Quantum Layer Analysis Protocol</p>
                        </div>
                    ) : !analyzing && !error && (
                        <div className="h-full rounded-[6rem] border-2 border-slate-800/30 flex flex-col items-center justify-center opacity-40 text-center space-y-16 py-40 bg-slate-900/30 backdrop-blur-sm">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] animate-pulse rounded-full" />
                                <CpuChipIcon className="w-40 h-40 text-slate-600 relative z-10 transition-all hover:scale-110 duration-1000" />
                                <div className="absolute -top-6 -right-6 w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-slate-950 font-black text-base shadow-2xl animate-bounce">10</div>
                            </div>
                            <div className="max-w-md space-y-6 px-10">
                                <p className="text-2xl font-black uppercase tracking-[0.8em] text-white">X-Ray Ready</p>
                                <p className="text-[14px] font-bold opacity-60 uppercase leading-loose text-center tracking-widest">O Motor v10 atravessa marcas d'água para análise pura. Cole seu print para iniciar o processamento quântico.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

// --- Dashboard Panel ---
const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    
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

    const stopWinTrades = activeBrokerage?.stopGainTrades || 0;
    const stopLossTrades = activeBrokerage?.stopLossTrades || 0;
    const stopWinReached = stopWinTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= stopWinTrades;
    const stopLossReached = stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= stopLossTrades;

    let stopMessage = '';
    if (stopWinReached) {
        stopMessage = `Meta de Stop Win atingida.`;
    } else if (stopLossReached) {
        stopMessage = `Meta de Stop Loss atingida.`;
    }

    const kpis = [
        { label: 'Banca Atual', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-green-500' },
        { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'Meta Diária', val: `${Math.min(100, dailyGoalPercent).toFixed(0)}%`, subVal: `${currencySymbol}${formatMoney(currentProfit)} de ${formatMoney(dailyGoalTarget)}`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-green-500' : 'text-blue-400' },
        { label: 'Win Rate', val: `${winRate}%`, icon: TrophyIcon, color: 'text-purple-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Dashboard</h2><p className={theme.textMuted}>Gestão ativa de operações</p></div>
                <input 
                    type="date" 
                    value={selectedDateString} 
                    onChange={(e) => {
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        const newDate = new Date(y, m - 1, d, 12, 0, 0);
                        setSelectedDate(newDate);
                    }} 
                    className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} 
                />
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
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} placeholder="1.00" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
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
                                <p className="text-xs font-black uppercase text-slate-400">Sem registros hoje</p>
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
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    const tableData = useMemo(() => {
        const rows = [];
        const sortedRealRecords = records
            .filter((r: any): r is DailyRecord => r.recordType === 'day' && r.trades.length > 0)
            .sort((a, b) => a.id.localeCompare(b.id));
        
        let startDate: Date;
        if (sortedRealRecords.length > 0) {
            const [y, m, d] = sortedRealRecords[0].id.split('-').map(Number);
            startDate = new Date(y, m - 1, d, 12, 0, 0);
        } else {
            startDate = new Date();
            startDate.setHours(12,0,0,0);
        }

        let runningBalance = activeBrokerage?.initialBalance || 0;

        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateId = getLocalISOString(currentDate);
            
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
                profit = (operationValue * ((activeBrokerage?.payoutPercentage || 80) / 100)) * 3;
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
    }, [records, activeBrokerage]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
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
                                <th className="py-5 px-3 border-b border-slate-800/20 text-green-500">Win</th>
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

    const allTrades = useMemo(() => {
        return records
            .filter((r: any): r is DailyRecord => r.recordType === 'day')
            .flatMap(r => r.trades.map(t => ({ ...t, dateId: r.id })))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [records]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
            <h2 className={`text-2xl font-black ${theme.text}`}>Relatório de Operações</h2>
            <div className={`rounded-3xl border overflow-hidden ${theme.card}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}>
                            <tr>
                                <th className="p-5">Data/Hora</th>
                                <th className="p-5">Resultado</th>
                                <th className="p-5">Entrada</th>
                                <th className="p-5">Lucro/Prejuízo</th>
                                <th className="p-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {allTrades.map((trade) => {
                                const profit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                return (
                                    <tr key={trade.id} className="text-sm font-bold">
                                        <td className="p-5 font-mono text-xs opacity-60">
                                            {trade.dateId} {new Date(trade.timestamp || 0).toLocaleTimeString()}
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black ${trade.result === 'win' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {trade.result}
                                            </span>
                                        </td>
                                        <td className="p-5">{currencySymbol} {formatMoney(trade.entryValue)}</td>
                                        <td className={`p-5 font-black ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {profit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(profit)}
                                        </td>
                                        <td className="p-5 text-right">
                                            <button onClick={() => deleteTrade(trade.id, trade.dateId)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
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
    const [payout, setPayout] = useState('80');
    const [levels, setLevels] = useState('4');

    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    const calculations = useMemo(() => {
        const entry = parseFloat(initialEntry) || 0;
        const p = (parseFloat(payout) || 0) / 100;
        const l = parseInt(levels) || 0;
        const rows = [];
        let currentEntry = entry;

        for (let i = 1; i <= l; i++) {
            const profit = currentEntry * p;
            const total = currentEntry + profit;
            rows.push({ level: i, entry: currentEntry, profit, total });
            currentEntry = total;
        }
        return rows;
    }, [initialEntry, payout, levels]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto h-full overflow-y-auto custom-scrollbar">
            <h2 className={`text-2xl font-black ${theme.text}`}>Calculadora de Soros</h2>
            <div className={`p-6 rounded-3xl border ${theme.card} space-y-4`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Entrada Inicial</label>
                        <input type="number" value={initialEntry} onChange={e => setInitialEntry(e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Payout %</label>
                        <input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Níveis</label>
                        <input type="number" value={levels} onChange={e => setLevels(e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} />
                    </div>
                </div>
            </div>

            <div className={`rounded-3xl border overflow-hidden ${theme.card}`}>
                <table className="w-full text-center">
                    <thead className={`text-[10px] uppercase font-black tracking-widest ${theme.border} border-b`}>
                        <tr>
                            <th className="p-5">Nível</th>
                            <th className="p-5">Valor da Entrada</th>
                            <th className="p-5">Lucro Bruto</th>
                            <th className="p-5 text-green-500">Próxima Entrada</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/10">
                        {calculations.map((row) => (
                            <tr key={row.level} className="text-sm font-bold">
                                <td className="p-5 opacity-40">#{row.level}</td>
                                <td className="p-5">{currencySymbol} {formatMoney(row.entry)}</td>
                                <td className="p-5 text-green-500">+{currencySymbol} {formatMoney(row.profit)}</td>
                                <td className="p-5 font-black text-blue-400">{currencySymbol} {formatMoney(row.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, records, activeBrokerage }) => {
    const [newGoalAmount, setNewGoalAmount] = useState('');
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    const addMonthlyGoal = () => {
        const amount = parseFloat(newGoalAmount);
        if (isNaN(amount)) return;
        const newGoal: Goal = {
            id: crypto.randomUUID(),
            name: 'Meta Mensal',
            type: 'monthly',
            targetAmount: amount,
            createdAt: Date.now()
        };
        setGoals([newGoal]);
        setNewGoalAmount('');
    };

    const monthlyGoal = goals.find((g: any) => g.type === 'monthly');
    const totalProfit = useMemo(() => {
        return records
            .filter((r: any): r is DailyRecord => r.recordType === 'day')
            .reduce((acc, r) => acc + r.netProfitUSD, 0);
    }, [records]);

    const progress = monthlyGoal ? (totalProfit / monthlyGoal.targetAmount) * 100 : 0;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto h-full overflow-y-auto custom-scrollbar">
            <h2 className={`text-2xl font-black ${theme.text}`}>Minhas Metas</h2>
            
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-6`}>
                {monthlyGoal ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Meta Mensal</p>
                                <h3 className="text-3xl font-black">{currencySymbol} {formatMoney(monthlyGoal.targetAmount)}</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Alcançado</p>
                                <p className={`text-2xl font-black ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {currencySymbol} {formatMoney(totalProfit)}
                                </p>
                            </div>
                        </div>
                        
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div 
                                className="h-full bg-green-500 shadow-[0_0_20px_#22c55e] transition-all duration-1000" 
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} 
                            />
                        </div>
                        
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 italic">
                            <span>0%</span>
                            <span>{progress.toFixed(1)}% Completo</span>
                            <span>100%</span>
                        </div>

                        <button onClick={() => setGoals([])} className="text-red-500 text-[10px] font-black uppercase hover:underline">Remover Meta</button>
                    </div>
                ) : (
                    <div className="space-y-4 text-center py-8">
                        <p className="text-sm font-bold opacity-60">Defina seu objetivo financeiro para o mês.</p>
                        <div className="flex gap-4 max-w-sm mx-auto">
                            <input 
                                type="number" 
                                value={newGoalAmount} 
                                onChange={e => setNewGoalAmount(e.target.value)} 
                                placeholder="Meta mensal (ex: 1000)" 
                                className={`flex-1 h-12 px-6 rounded-2xl border outline-none font-bold ${theme.input}`}
                            />
                            <button onClick={addMonthlyGoal} className="px-8 bg-green-500 text-slate-950 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-green-400 transition-all">Definir</button>
                        </div>
                    </div>
                )}
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

        const dateKey = getLocalISOString(selectedDate);
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
            const dateKey = getLocalISOString(selectedDate);
            const sortedPrevious = prev.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
            const startBal = sortedPrevious.length > 0 ? sortedPrevious[0].endBalanceUSD : (brokerages[0]?.initialBalance || 0);

            const dailyRecordForSelectedDay = prev.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day');
            const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;

            const suggestedEntryValue = brokerages[0]?.entryMode === 'fixed' 
                ? (brokerages[0]?.entryValue || 1) 
                : currentBalance * ((brokerages[0]?.entryValue || 10) / 100);

            const entryValue = (customEntry && customEntry > 0) ? customEntry : suggestedEntryValue;
            const payout = (customPayout && customPayout > 0) ? customPayout : (brokerages[0]?.payoutPercentage || 80);
            
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            
            const existingIdx = prev.findIndex(r => r.id === dateKey && r.recordType === 'day');
            let updatedRecords = [...prev];
            if (existingIdx >= 0) {
                const rec = updatedRecords[existingIdx] as DailyRecord;
                updatedRecords[existingIdx] = { ...rec, trades: [...rec.trades, ...newTrades] };
            } else {
                updatedRecords.push({ recordType: 'day', brokerageId: brokerages[0]?.id || crypto.randomUUID(), id: dateKey, date: dateKey, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            const recalibrated = recalibrateHistory(updatedRecords, brokerages[0]?.initialBalance || 0);
            debouncedSave();
            return recalibrated;
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, brokerages[0]?.initialBalance || 0);
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

    const dateStr = getLocalISOString(selectedDate);
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
                <nav className="flex-1 p-4 space-y-1">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Planilha Juros</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Relatório</button>
                    <button onClick={() => {setActiveTab('ai'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'ai' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Analista IA</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Calc Soros</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Metas</button>
                </nav>
                <div className="p-4 border-t border-slate-800/50"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl"><LogoutIcon className="w-5 h-5" />Sair</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex items-center justify-between px-6 md:px-8 border-b ${theme.header}`}>
                    <div className="flex items-center gap-4"><button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2"><MenuIcon className="w-6 h-6" /></button><SavingStatusIndicator status={savingStatus} /></div>
                    <div className="flex items-center gap-3"><button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button><div className="w-10 h-10 rounded-2xl bg-green-500 flex items-center justify-center text-slate-950 font-black text-xs">{user.username.slice(0, 2).toUpperCase()}</div></div>
                </header>
                <div className="flex-1 overflow-hidden">
                    {activeTab === 'dashboard' && <div className="h-full overflow-y-auto custom-scrollbar"><DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeDailyGoal} /></div>}
                    {activeTab === 'compound' && <div className="h-full overflow-y-auto custom-scrollbar"><CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} /></div>}
                    {activeTab === 'report' && <div className="h-full overflow-y-auto custom-scrollbar"><ReportPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} deleteTrade={deleteTrade} /></div>}
                    {activeTab === 'ai' && <AIAnalyzerPanel theme={theme} isDarkMode={isDarkMode} />}
                    {activeTab === 'soros' && <div className="h-full overflow-y-auto custom-scrollbar"><SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} /></div>}
                    {activeTab === 'goals' && <div className="h-full overflow-y-auto custom-scrollbar"><GoalsPanel theme={theme} goals={goals} setGoals={setGoals} records={records} activeBrokerage={activeBrokerage} /></div>}
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
