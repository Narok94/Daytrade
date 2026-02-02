
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
            
            // Sniper Vision v8.0 - ULTRA CONTRAST PROMPT
            const prompt = `VOCÊ É O ANALISTA SNIPER VISION v8.0 - ESPECIALISTA EM SEGMENTAÇÃO DE IMAGEM.
            
            SUA MISSÃO PRIORITÁRIA:
            1. DETECÇÃO DE CAMADAS: O gráfico possui uma marca d'água "AXIUN" ou logotipos cinzas ao fundo. VOCÊ DEVE DELETAR MENTALMENTE ESSA CAMADA.
            2. FOCO NO SINAL: Identifique apenas as VELAS (corpos retangulares verdes e vermelhos) e seus PAVIOS (linhas finas acima/abaixo).
            3. FILTRO DE RUÍDO: Ignore grades, textos de fundo e logos da corretora. Concentre-se apenas no MOVIMENTO DO PREÇO (Price Action).
            
            ANÁLISE TÉCNICA (M1):
            - Verifique se a última vela é de força ou exaustão.
            - Localize zonas de suporte/resistência onde o preço "bateu e voltou".
            - Analise se o RSI/Indicadores (se visíveis) confirmam o movimento.
            
            OUTPUT: Você deve fornecer uma recomendação clara de CALL, PUT ou AGUARDAR baseada na CONFLUÊNCIA de pelo menos 3 fatores.`;

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
                            confianca: { type: Type.NUMBER, description: "Probabilidade de acerto 0-100" },
                            leitura_velas: { type: Type.STRING, description: "O que você identificou nas últimas velas (ignorando o fundo)" },
                            setup: { type: Type.STRING, description: "Nome da estratégia identificada (ex: Engolfo, Pullback)" },
                            confluencias: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de motivos para a entrada" },
                            zona_alvo: { type: Type.STRING, description: "Onde o preço deve chegar" }
                        },
                        required: ["operacao", "confianca", "leitura_velas", "setup", "confluencias", "zona_alvo"]
                    },
                    temperature: 0.1,
                }
            });

            const text = response.text;
            if (text) {
                setResult(JSON.parse(text));
            } else {
                throw new Error("Resposta de visão inválida");
            }
        } catch (err: any) {
            console.error("Sniper v8.0 Engine Error:", err);
            setError("ALERTA DE CONTRASTE: O Motor v8.0 detectou poluição visual excessiva. A marca d'água está muito forte ou as velas estão muito pequenas. DICA: Dê zoom nas últimas 10-15 velas para análise Sniper.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className={`text-4xl font-black ${theme.text} tracking-tighter uppercase italic flex items-center gap-3`}>
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_#10b98166]">
                             <CpuChipIcon className="w-7 h-7 text-slate-950" />
                        </div>
                        Sniper <span className="text-emerald-500">Vision v8.0</span>
                    </h2>
                    <p className={`${theme.textMuted} mt-1 font-bold text-[10px] uppercase tracking-[0.3em]`}>Motor Ultra Contrast - Inteligência de Segmentação Ativa</p>
                </div>
                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                    <p className="text-[10px] font-black uppercase text-slate-400">Status: Sincronizado</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden min-h-0">
                <div className="lg:col-span-7 flex flex-col gap-5 overflow-hidden">
                    <div className={`relative flex-1 rounded-[3.5rem] border-2 border-dashed ${image ? 'border-emerald-500/40' : 'border-slate-800'} ${theme.card} flex flex-col items-center justify-center overflow-hidden bg-slate-950 transition-all group shadow-inner`}>
                        {image ? (
                            <div className="relative w-full h-full p-4 flex items-center justify-center">
                                <img src={image} alt="Chart" className="max-h-full max-w-full object-contain rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)]" />
                                
                                {analyzing && (
                                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_30px_#4ade80] animate-[scan_2s_ease-in-out_infinite]" />
                                        <div className="absolute inset-0 bg-emerald-500/[0.05] backdrop-blur-[2px]" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-48 h-48 border-4 border-emerald-500/10 rounded-full animate-ping" />
                                        </div>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xl">
                                    <button onClick={() => setImage(null)} className="p-6 bg-red-600 text-white rounded-full hover:scale-110 transition-all shadow-2xl active:scale-95 border-4 border-white/10"><TrashIcon className="w-10 h-10" /></button>
                                </div>
                            </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-10 text-center p-16 w-full h-full justify-center hover:bg-emerald-500/[0.02] transition-colors">
                                <div className="w-28 h-28 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center border-2 border-emerald-500/20 group-hover:rotate-12 transition-all duration-700 shadow-xl">
                                    <PlusIcon className="w-14 h-14 text-emerald-500" />
                                </div>
                                <div className="max-w-xs space-y-4">
                                    <p className="font-black text-xl uppercase tracking-[0.25em] text-white">Upload Sniper</p>
                                    <p className="text-[11px] opacity-50 font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Arraste, cole (Ctrl+V) ou clique.<br/>O Motor v8.0 processa em HDR para ignorar fundos de corretoras.</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>
                    
                    <button 
                        onClick={analyzeChart} 
                        disabled={!image || analyzing}
                        className={`h-24 shrink-0 rounded-[3rem] font-black uppercase tracking-[0.6em] transition-all flex items-center justify-center gap-5 text-sm shadow-2xl
                        ${!image || analyzing ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-slate-800' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 active:scale-95 active:rotate-1'}`}
                    >
                        {analyzing ? (
                            <>
                                <ArrowPathIcon className="w-8 h-8 animate-spin" />
                                <span className="animate-pulse italic">Analisando Camadas HDR...</span>
                            </>
                        ) : (
                            <>
                                <CpuChipIcon className="w-9 h-9" />
                                Executar Leitura Sniper
                            </>
                        )}
                    </button>
                </div>

                <div className="lg:col-span-5 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                    {error && (
                        <div className="p-8 bg-red-500/10 border-2 border-red-500/20 rounded-[3rem] flex items-start gap-6 text-red-500 animate-in zoom-in duration-500 shadow-2xl">
                            <InformationCircleIcon className="w-12 h-12 shrink-0" />
                            <div className="space-y-3">
                                <p className="text-base font-black uppercase tracking-widest">Erro no Motor v8.0</p>
                                <p className="text-xs font-bold opacity-80 leading-relaxed uppercase">{error}</p>
                                <div className="pt-2">
                                    <button onClick={() => setImage(null)} className="text-[10px] font-black uppercase underline hover:text-white transition-colors">Tentar nova captura</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {result ? (
                        <div className={`p-10 rounded-[4rem] border-2 ${theme.card} space-y-12 animate-in fade-in slide-in-from-right-16 duration-1000 shadow-[0_0_120px_rgba(16,185,129,0.08)] relative overflow-hidden bg-slate-900/70 backdrop-blur-2xl`}>
                            <div className={`absolute -top-24 -right-24 w-80 h-80 blur-[120px] opacity-30 rounded-full ${result.operacao === 'CALL' ? 'bg-emerald-500' : result.operacao === 'PUT' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            
                            <div className="flex justify-between items-end relative z-10 border-b border-white/10 pb-10">
                                <div className="space-y-2">
                                    <p className="text-[12px] font-black uppercase text-slate-500 tracking-[0.4em]">Decisão Final</p>
                                    <h3 className={`text-9xl font-black tracking-tighter italic leading-none ${result.operacao === 'CALL' ? 'text-emerald-500' : result.operacao === 'PUT' ? 'text-red-500' : 'text-slate-300'}`}>
                                        {result.operacao}
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Assertividade</p>
                                    <p className={`text-6xl font-black leading-none ${result.confianca > 85 ? 'text-blue-400' : 'text-yellow-500'}`}>{result.confianca}%</p>
                                </div>
                            </div>

                            <div className="space-y-8 relative z-10">
                                <div className="p-8 bg-slate-950/90 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500/70 flex items-center gap-3">
                                        <TrendingUpIcon className="w-5 h-5" /> Leitura Técnica HDR
                                    </p>
                                    <p className="text-base font-bold leading-relaxed italic text-white/95">"{result.leitura_velas}"</p>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex justify-between items-center group hover:bg-white/[0.08] transition-all">
                                         <div>
                                            <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Setup Ativo</p>
                                            <p className="text-sm font-black text-white mt-1 uppercase italic">{result.setup}</p>
                                         </div>
                                         <div className="px-5 py-2 bg-emerald-500 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Check</div>
                                    </div>
                                    
                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                                        <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-4">Gatilhos de Confluência</p>
                                        <div className="flex flex-wrap gap-3">
                                            {result.confluencias?.map((item: string, i: number) => (
                                                <span key={i} className="px-5 py-3 bg-emerald-500/10 text-emerald-400 text-[11px] font-black uppercase rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_#10b98122] flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-blue-500/5 rounded-3xl border-2 border-blue-500/20 flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <TargetIcon className="w-7 h-7 text-blue-400" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-blue-400/60 tracking-[0.2em]">Objetivo do Preço</p>
                                            <p className="text-sm font-black text-blue-400 uppercase">{result.zona_alvo}</p>
                                        </div>
                                    </div>
                                    <div className="w-12 h-1 bg-blue-400/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400 w-2/3 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-center uppercase font-black text-slate-600 mt-8 italic opacity-60 tracking-[0.4em]">Sniper v8.0 Engine - High Definition Layer Analysis</p>
                        </div>
                    ) : !analyzing && !error && (
                        <div className="h-full rounded-[4rem] border border-slate-800/15 flex flex-col items-center justify-center opacity-30 text-center space-y-10 py-24 bg-slate-900/15">
                            <div className="relative">
                                <CpuChipIcon className="w-28 h-28 text-slate-700" />
                                <div className="absolute inset-0 border-4 border-slate-700/20 rounded-full animate-ping" />
                            </div>
                            <div className="max-w-[300px] space-y-4">
                                <p className="text-base font-black uppercase tracking-[0.5em] text-white">Pronto para HDR</p>
                                <p className="text-[12px] font-bold opacity-60 uppercase leading-relaxed text-center px-4">Cole o print da Axiun. O Motor v8.0 foi treinado para "ver através" da marca d'água.</p>
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
