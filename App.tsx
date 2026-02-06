
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal, AIAnalysisResult } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { fetchUSDBRLRate } from './services/currencyService';
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon, CpuChipIcon, TrendingDownIcon, ChevronUpIcon, ChevronDownIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900/40 border-slate-800/60 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950/80 border-r border-slate-800/50 backdrop-blur-2xl' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950/50 border-b border-slate-800/30 backdrop-blur-md' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-r-2 border-emerald-500' : 'bg-emerald-50 text-emerald-600 border-r-2 border-emerald-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- Componente de Cotação em Tempo Real ---
const CurrencyWidget: React.FC<{ isDarkMode: boolean, onRateUpdate?: (rate: number) => void }> = ({ isDarkMode, onRateUpdate }) => {
    const [rate, setRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const updateRate = async () => {
        setLoading(true);
        const r = await fetchUSDBRLRate();
        setRate(r);
        if (onRateUpdate) onRateUpdate(r);
        setLoading(false);
    };

    useEffect(() => {
        updateRate();
        const interval = setInterval(updateRate, 60000 * 10); // Cada 10 min
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl border transition-all hover:scale-105 ${isDarkMode ? 'bg-slate-900/80 border-slate-800 shadow-2xl shadow-emerald-500/5' : 'bg-white border-slate-200 shadow-lg'}`}>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Live USD/BRL</span>
                <span className="text-sm font-black text-emerald-400 tabular-nums">{loading ? '---' : `R$ ${rate?.toFixed(3)}`}</span>
            </div>
            <button onClick={updateRate} className="p-1.5 hover:rotate-180 transition-transform duration-700 bg-emerald-500/10 rounded-lg group">
                <ArrowPathIcon className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110" />
            </button>
        </div>
    );
};

// --- AI Analysis Panel (Sniper v7 - Elite Precision) ---
const AIAnalysisPanel: React.FC<any> = ({ theme, isDarkMode }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const compressImage = (dataUrl: string, maxWidth = 1200): Promise<string> => {
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
                resolve(canvas.toDataURL('image/jpeg', 0.85));
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
            // Fix: Initializing GoogleGenAI client with correct configuration.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const compressed = await compressImage(selectedImage);
            const base64Data = compressed.split(',')[1];
            
            const timeString = new Date().toLocaleTimeString('pt-BR');

            // Fix: Using 'gemini-3-pro-preview' for complex reasoning task (trading analysis).
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: `SISTEMA SNIPER ELITE v7 - ANÁLISE QUANTITATIVA DE FLUXO.
                        REGRAS MANDATÓRIAS DE RESPOSTA:
                        1. CONFIDENCE: Deve ser um número INTEIRO entre 0 e 100 (ex: 92, não 0.92).
                        2. RECOMMENDATION: Se CONFIDENCE for menor que 82, force 'WAIT'.
                        3. PRICE ACTION: Analise suporte e resistência imediatos.
                        4. CANDLESTICK: Identifique padrões como Pinbar, Doji ou Engolfo.
                        5. CONTEXTO: Analise se o mercado está em tendência clara ou lateral.
                        
                        Retorne EXCLUSIVAMENTE o JSON estruturado.` },
                    ],
                },
                config: {
                    systemInstruction: "Você é um Trader de Elite v7 Sniper. Sua análise é baseada em probabilidade estatística de reversão e continuidade de movimento. Sua missão é fornecer entradas de alta precisão (>85% confiança). Se houver incerteza visual, recomende WAIT. O campo 'confidence' deve ser sempre um inteiro de 0 a 100.",
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            recommendation: { type: Type.STRING, enum: ['CALL', 'PUT', 'WAIT'] },
                            confidence: { type: Type.INTEGER, description: 'Valor de 0 a 100 representing percentage' },
                            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                            indicatorAnalysis: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            supportLevel: { type: Type.STRING },
                            resistanceLevel: { type: Type.STRING },
                            entryTime: { type: Type.STRING }
                        },
                        required: ['recommendation', 'confidence', 'patterns', 'reasoning', 'supportLevel', 'resistanceLevel', 'entryTime']
                    }
                }
            });
            
            // Fix: Directly accessing text property of GenerateContentResponse as per guidelines.
            const text = response.text;
            if (!text) throw new Error("Sem resposta do motor Sniper.");
            const res = JSON.parse(text);
            setAnalysisResult(res);
        } catch (err: any) {
            console.error(err);
            setError("Falha na calibração Sniper. Recapture o gráfico com zoom melhor.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-6 md:p-12 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-800 pb-8">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 shadow-2xl shadow-emerald-500/5">
                        <CpuChipIcon className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className={`text-4xl font-black italic tracking-tighter ${theme.text}`}>SNIPER ELITE v7</h2>
                        <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-[0.2em]`}>Scanner de Probabilidade Algorítmica</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-[10px] font-black uppercase text-emerald-500 animate-pulse">
                        Neural Core Sync Active
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Input Area */}
                <div className={`p-8 rounded-[2.5rem] border ${theme.card} relative overflow-hidden group`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5"><CpuChipIcon className="w-32 h-32" /></div>
                    <h3 className="font-black mb-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500"><TargetIcon className="w-5 h-5 text-emerald-400" /> Upload de Snapshot</h3>
                    <div className="relative border-2 border-dashed border-slate-800/50 rounded-[2rem] min-h-[450px] flex flex-col items-center justify-center p-8 bg-slate-950/20 transition-all hover:border-emerald-500/30">
                        {!selectedImage ? (
                            <label className="cursor-pointer flex flex-col items-center text-center gap-6">
                                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform">
                                    <PlusIcon className="w-12 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xl font-black tracking-tight">Captura do Gráfico</p>
                                    <p className="text-xs font-medium text-slate-500 max-w-[280px]">Arraste ou clique para enviar a imagem do seu MetaTrader ou Corretora.</p>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        ) : (
                            <div className="w-full flex flex-col gap-6">
                                <div className="relative aspect-video rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
                                    <img src={selectedImage} alt="Analysis Target" className="w-full h-full object-contain" />
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
                                            <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                            <div className="text-center space-y-2">
                                                <p className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400">Escaneando Vetores</p>
                                                <p className="text-[10px] font-bold text-white/30 italic">Calculando RSI e Suportes Dinâmicos...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setSelectedImage(null)} className="h-14 text-[10px] font-black uppercase rounded-2xl border border-slate-800 hover:bg-red-500/5 hover:text-red-500 transition-all">Descartar</button>
                                    <button disabled={isAnalyzing} onClick={runAIAnalysis} className="h-14 text-[10px] font-black uppercase rounded-2xl bg-emerald-500 text-slate-950 shadow-2xl shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all">Iniciar Análise Elite</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Report Area */}
                <div className={`p-8 rounded-[2.5rem] border ${theme.card} flex flex-col`}>
                    <h3 className="font-black mb-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500"><DocumentTextIcon className="w-5 h-5 text-purple-400" /> Relatório de Confluências</h3>
                    
                    {analysisResult ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* Recommendation Hero */}
                            <div className={`p-8 rounded-[2rem] border-2 flex items-center justify-between transition-all ${analysisResult.recommendation === 'CALL' ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.1)]' : analysisResult.recommendation === 'PUT' ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_60px_rgba(244,63,94,0.1)]' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Sinal Estrutural</p>
                                    <h4 className={`text-7xl font-black ${analysisResult.recommendation === 'CALL' ? 'text-emerald-500' : analysisResult.recommendation === 'PUT' ? 'text-red-500' : 'text-slate-400'}`}>
                                        {analysisResult.recommendation === 'CALL' ? '↑ CALL' : analysisResult.recommendation === 'PUT' ? '↓ PUT' : 'WAIT'}
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Confiança Sniper</p>
                                    <p className={`text-5xl font-black tabular-nums ${analysisResult.confidence >= 85 ? 'text-emerald-400' : 'text-slate-500'}`}>{analysisResult.confidence}%</p>
                                </div>
                            </div>

                            {/* Signal Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 group hover:border-emerald-500/30 transition-colors">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUpIcon className="w-4 h-4 text-emerald-400" />
                                        <p className="text-[10px] font-black uppercase text-slate-500">Próxima Entrada</p>
                                    </div>
                                    <p className="text-4xl font-black text-white">{analysisResult.entryTime}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TargetIcon className="w-4 h-4 text-purple-400" />
                                        <p className="text-[10px] font-black uppercase text-slate-500">Zonas de S/R</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-bold text-red-400 truncate">RES: {analysisResult.resistanceLevel}</span>
                                        <span className="text-xs font-bold text-emerald-400 truncate">SUP: {analysisResult.supportLevel}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-slate-950/50 border border-slate-800 space-y-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-600 mb-4 tracking-widest">Gatilhos Identificados</p>
                                    <div className="flex flex-wrap gap-2">
                                        {analysisResult.patterns.map((p, i) => (
                                            <span key={i} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-tighter">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-emerald-500/5 border-l-4 border-emerald-500">
                                    <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                                        "{analysisResult.reasoning}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                <InformationCircleIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h4 className="text-lg font-black mb-2">Erro de Calibração</h4>
                            <p className="text-sm font-bold text-slate-500 max-w-[250px]">{error}</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-24 opacity-30 text-center grayscale">
                            <CpuChipIcon className="w-32 h-32 mb-8 animate-pulse" />
                            <p className="text-sm font-black uppercase tracking-[0.5em]">Neural Link Standby</p>
                            <p className="text-[10px] font-bold mt-4 max-w-[220px]">Forneça dados visuais do mercado para processamento em tempo real.</p>
                        </div>
                    )}
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
    const [usdRate, setUsdRate] = useState<number>(5.35);

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
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Elite Account', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
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

    const debouncedSave = useDebouncedCallback(saveData, 3000);

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

    const handleReset = () => { if(confirm("ALERTA: Isso apagará permanentemente todo o histórico de operações. Continuar?")) { setRecords([]); } };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex flex-col items-center justify-center ${theme.bg}`}>
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Sincronizando Cloud</p>
    </div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    
    const sortedPreviousForDashboard = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.id < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedPreviousForDashboard.length > 0 ? sortedPreviousForDashboard[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

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
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-xl md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-all duration-500 ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-24 flex items-center px-10 border-b border-slate-800/50">
                    <div className="flex flex-col">
                        <span className="text-2xl font-black italic text-emerald-500 tracking-tighter">HRK SNIPER</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 -mt-1">Elite Control System</span>
                    </div>
                </div>
                
                <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('ai-analysis'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'ai-analysis' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Sniper IA v7</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Equity Curve</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Audit Logs</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Calculator</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Financial Targets</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Risk Manager</button>
                </nav>

                <div className="p-6 border-t border-slate-800/50">
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-5 py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 rounded-2xl transition-all active:scale-95"><LogoutIcon className="w-5 h-5" />End Session</button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className={`h-24 flex items-center justify-between px-8 md:px-12 border-b ${theme.header} z-30`}>
                    <div className="flex items-center gap-8">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-3 bg-slate-900 rounded-xl border border-slate-800"><MenuIcon className="w-6 h-6" /></button>
                        <CurrencyWidget isDarkMode={isDarkMode} onRateUpdate={setUsdRate} />
                        <div className="hidden lg:flex items-center gap-6 pl-8 border-l border-slate-800/50">
                            <SavingStatusIndicator status={savingStatus} />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20 group">
                            {isDarkMode ? <SunIcon className="w-6 h-6 text-emerald-500 group-hover:rotate-45" /> : <MoonIcon className="w-6 h-6 text-slate-600 group-hover:-rotate-12" />}
                        </button>
                        <div className="flex items-center gap-4 pl-6 border-l border-slate-800/30">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-black uppercase text-white/80">{user.username}</span>
                                <span className="text-[8px] font-black uppercase text-emerald-500 tracking-[0.2em]">Verified Trader</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-2xl shadow-emerald-500/30 ring-2 ring-emerald-500/20">
                                {user.username.slice(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/10">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeDailyGoal} records={records} usdRate={usdRate} />}
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

const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget, records, usdRate }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const [viewCurrency, setViewCurrency] = useState<'USD'|'BRL'>(activeBrokerage.currency);
    const baseSymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    const displaySymbol = viewCurrency === 'USD' ? '$' : 'R$';
    
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
    
    const convertValue = (val: number) => {
        if (activeBrokerage.currency === viewCurrency) return val;
        if (activeBrokerage.currency === 'USD' && viewCurrency === 'BRL') return val * usdRate;
        if (activeBrokerage.currency === 'BRL' && viewCurrency === 'USD') return val / usdRate;
        return val;
    };

    const stopWinReached = activeBrokerage.stopGainTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades;
    const stopLossReached = activeBrokerage.stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades;

    // Data for charts
    const chartData = useMemo(() => {
        const sorted = records.filter((r: any) => r.recordType === 'day' && r.trades.length > 0).sort((a:any, b:any) => a.id.localeCompare(b.id));
        return sorted.map((r: DailyRecord) => ({
            date: new Date(r.id + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            balance: parseFloat(convertValue(r.endBalanceUSD).toFixed(2))
        }));
    }, [records, viewCurrency, usdRate]);

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-center gap-8 border-b border-slate-800 pb-10">
                <div className="space-y-1">
                    <h2 className={`text-4xl font-black italic tracking-tighter ${theme.text}`}>DASHBOARD CENTRAL</h2>
                    <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-[0.2em]`}>Performance em Tempo Real</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                        <button onClick={() => setViewCurrency('USD')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${viewCurrency === 'USD' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}>USD</button>
                        <button onClick={() => setViewCurrency('BRL')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${viewCurrency === 'BRL' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}>BRL</button>
                    </div>
                    <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`border rounded-2xl px-6 py-3 text-sm font-black focus:outline-none transition-all ${isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-800 focus:border-emerald-500' : 'bg-white text-slate-700 border-slate-200 focus:border-emerald-500 shadow-lg'}`} />
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Patrimônio" val={`${displaySymbol} ${formatMoney(convertValue(currentBalance))}`} icon={PieChartIcon} color="emerald" theme={theme} />
                <StatCard label="Lucro da Sessão" val={`${currentProfit >= 0 ? '+' : ''}${displaySymbol} ${formatMoney(convertValue(currentProfit))}`} icon={TrendingUpIcon} color={currentProfit >= 0 ? 'emerald' : 'red'} theme={theme} />
                <StatCard label="Meta Diária" val={currentProfit >= dailyGoalTarget ? 'COMPLETE' : `${displaySymbol}${formatMoney(convertValue(Math.max(0, dailyGoalTarget - currentProfit)))}`} subVal={`${Math.min(100, (currentProfit/dailyGoalTarget)*100).toFixed(1)}% do Alvo`} icon={TargetIcon} color="blue" theme={theme} />
                <StatCard label="Win Rate" val={`${winRate}%`} subVal={`${dailyRecordForSelectedDay?.winCount || 0}W - ${dailyRecordForSelectedDay?.lossCount || 0}L`} icon={TrophyIcon} color="purple" theme={theme} />
            </div>

            {/* Performance Chart */}
            <div className={`p-8 rounded-[2.5rem] border ${theme.card} shadow-2xl h-[450px] relative overflow-hidden`}>
                <div className="absolute top-0 left-0 p-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2"><ChartBarIcon className="w-4 h-4 text-emerald-500" /> Curva de Equidade</h3>
                </div>
                <div className="h-full pt-16">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            {/* Fix: Changed CartGrid to CartesianGrid as it was incorrectly named and not found. */}
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 900}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 900}} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '16px', border: isDarkMode ? '1px solid #1e293b' : '1px solid #e2e8f0', color: isDarkMode ? '#f8fafc' : '#0f172a', fontWeight: 'bold'}} itemStyle={{color: '#10b981'}} />
                            <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorBal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Manual Register */}
                <div className={`p-10 rounded-[2.5rem] border ${theme.card} shadow-2xl relative overflow-hidden`}>
                    <div className="absolute -top-12 -right-12 p-8 opacity-5"><CalculatorIcon className="w-48 h-48" /></div>
                    <h3 className="font-black mb-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500"><PlusIcon className="w-5 h-5 text-emerald-500" /> Registro de Operação</h3>
                    <div className="space-y-10">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                            <InputGroup label={`Entrada (${baseSymbol})`} val={customEntryValue} setVal={setCustomEntryValue} theme={theme} />
                            <InputGroup label="Payout (%)" val={customPayout} setVal={setCustomPayout} theme={theme} />
                            <InputGroup label="Mãos" val={quantity} setVal={setQuantity} theme={theme} />
                        </div>
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            <button onClick={() => handleQuickAdd('win')} disabled={stopWinReached || stopLossReached} className="h-20 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-3xl uppercase text-xs tracking-[0.3em] transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed border-b-4 border-emerald-700">WIN (COMPRA)</button>
                            <button onClick={() => handleQuickAdd('loss')} disabled={stopWinReached || stopLossReached} className="h-20 bg-red-600 hover:bg-red-500 text-white font-black rounded-3xl uppercase text-xs tracking-[0.3em] transition-all shadow-2xl shadow-red-500/20 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed border-b-4 border-red-800">LOSS (VENDA)</button>
                        </div>
                        {(stopWinReached || stopLossReached) && (
                            <div className={`p-6 rounded-[2rem] border text-center animate-bounce ${stopWinReached ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em]">{stopWinReached ? 'ALVO DE LUCRO ATINGIDO. PARE AGORA!' : 'LIMITE DE PERDA ATINGIDO. VOLTE AMANHÃ.'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className={`p-10 rounded-[2.5rem] border flex flex-col ${theme.card} shadow-2xl`}>
                    <h3 className="font-black mb-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500"><ListBulletIcon className="w-5 h-5 text-blue-500" /> Fluxo de Ordens</h3>
                    <div className="flex-1 overflow-y-auto max-h-[420px] pr-4 custom-scrollbar space-y-4">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             [...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                return (
                                    <div key={trade.id} className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all hover:translate-x-2 ${isDarkMode ? 'bg-slate-950/60 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                        <div className="flex items-center gap-5">
                                            <div className={`w-3.5 h-12 rounded-full ${trade.result === 'win' ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]'}`} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-2">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                <p className="text-sm font-black italic tracking-tight">{trade.result === 'win' ? 'ORDER EXECUTED: PROFIT' : 'ORDER EXECUTED: LOSS'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black tabular-nums ${tradeProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {tradeProfit >= 0 ? '+' : ''}{displaySymbol} {formatMoney(convertValue(tradeProfit))}
                                            </p>
                                            <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="text-[9px] font-black text-red-500/30 hover:text-red-500 uppercase tracking-tighter transition-colors">Abort Order</button>
                                        </div>
                                    </div>
                                );
                             })
                        ) : (<div className="h-full flex flex-col items-center justify-center opacity-20 py-24"><InformationCircleIcon className="w-16 h-16 mb-6" /><p className="text-xs font-black uppercase tracking-[0.4em]">Listening for Incoming Signals</p></div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<any> = ({ label, val, subVal, icon: Icon, color, theme }) => {
    const colorClasses: any = {
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    };
    return (
        <div className={`p-8 rounded-[2.5rem] border ${theme.card} flex flex-col justify-between shadow-2xl transition-transform hover:-translate-y-1`}>
            <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] leading-none">{label}</p>
                <div className={`p-2.5 rounded-xl ${colorClasses[color].split(' ')[1]} ${colorClasses[color].split(' ')[2]}`}><Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[0]}`} /></div>
            </div>
            <div className="space-y-1">
                <p className={`text-3xl font-black tracking-tighter truncate ${colorClasses[color].split(' ')[0]}`}>{val}</p>
                {subVal && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{subVal}</p>}
            </div>
        </div>
    );
};

const InputGroup: React.FC<any> = ({ label, val, setVal, theme }) => (
    <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">{label}</label>
        <input type="number" value={val} onChange={e => setVal(e.target.value)} className={`w-full h-16 px-6 rounded-2xl border-2 focus:ring-4 focus:ring-emerald-500/10 outline-none font-black text-xl transition-all ${theme.input} focus:border-emerald-500`} />
    </div>
);

const SavingStatusIndicator: React.FC<{status: string}> = ({status}) => {
    if (status === 'saving') return <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 animate-pulse"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Neural Sync...</div>;
    if (status === 'saved') return <div className="flex items-center gap-3 text-[10px] font-black uppercase text-emerald-500"><CheckIcon className="w-4 h-4" /> Cloud Secure</div>;
    return <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 opacity-40"><CheckIcon className="w-4 h-4" /> System Idle</div>;
};

// --- Outros componentes simplificados para brevidade, mantendo a estrutura profissional ---

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
                isProjection = true; operationValue = initial * 0.05; win = 2; loss = 0;
                profit = (operationValue * (activeBrokerage.payoutPercentage / 100)) * 2; final = initial + profit;
            }
            rows.push({ diaTrade: i + 1, dateId, dateDisplay: currentDate.toLocaleDateString('pt-BR'), initial, win, loss, profit, final, operationValue, isProjection });
            runningBalance = final;
        }
        return rows;
    }, [records, activeBrokerage.initialBalance, activeBrokerage.payoutPercentage]);

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
            <div className="space-y-1">
                <h2 className={`text-4xl font-black italic tracking-tighter ${theme.text}`}>ESTRATÉGIA 30 DIAS</h2>
                <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-[0.2em]`}>Planejamento de Capital Progressivo</p>
            </div>
            <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-[0.2em] ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100/50'}`}>
                                <th className="py-8 px-6 border-b border-slate-800/20">Step</th>
                                <th className="py-8 px-6 border-b border-slate-800/20">Data</th>
                                <th className="py-8 px-6 border-b border-slate-800/20 text-slate-500">Saldo Início</th>
                                <th className="py-8 px-6 border-b border-slate-800/20 text-blue-400">Ordens</th>
                                <th className="py-8 px-6 border-b border-slate-800/20 text-emerald-500">W</th>
                                <th className="py-8 px-6 border-b border-slate-800/20 text-red-500">L</th>
                                <th className="py-8 px-6 border-b border-slate-800/20">Delta</th>
                                <th className="py-8 px-6 border-b border-slate-800/20">Target</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.diaTrade} className={`text-sm font-black transition-colors ${row.isProjection ? 'opacity-25 grayscale hover:grayscale-0 hover:opacity-100' : 'bg-emerald-500/5'}`}>
                                    <td className="py-6 px-6 font-mono text-xs opacity-40">#{row.diaTrade}</td>
                                    <td className="py-6 px-6 text-[11px] uppercase">{row.dateDisplay}</td>
                                    <td className="py-6 px-6 opacity-70 tabular-nums">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-6 px-6 text-blue-400 tabular-nums">{currencySymbol} {formatMoney(row.operationValue)}</td>
                                    <td className="py-6 px-6"><span className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-xl border border-emerald-500/20">{row.win}</span></td>
                                    <td className="py-6 px-6"><span className="bg-red-500/10 text-red-500 px-4 py-1.5 rounded-xl border border-red-500/20">{row.loss}</span></td>
                                    <td className={`py-6 px-6 tabular-nums ${row.profit > 0 ? 'text-emerald-500' : row.profit < 0 ? 'text-red-500' : 'opacity-30'}`}>{row.profit > 0 ? '+' : ''}{currencySymbol} {formatMoney(row.profit)}</td>
                                    <td className="py-6 px-6 text-white tabular-nums text-lg underline decoration-emerald-500/30 decoration-2 underline-offset-8">{currencySymbol} {formatMoney(row.final)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ReportPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records, deleteTrade }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const dayRecords = records.filter((r: any) => r.recordType === 'day' && r.trades.length > 0).sort((a: any, b: any) => b.id.localeCompare(a.id));
    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
            <div className="space-y-1">
                <h2 className={`text-4xl font-black italic tracking-tighter ${theme.text}`}>ORDENS AUDITADAS</h2>
                <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-[0.2em]`}>Histórico Completo de Execução</p>
            </div>
            <div className="space-y-8">
                {dayRecords.length > 0 ? dayRecords.map((record: DailyRecord) => (
                    <div key={record.id} className={`p-10 rounded-[3rem] border ${theme.card} shadow-2xl space-y-8`}>
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 border-b border-slate-800/50 pb-8">
                            <div>
                                <h4 className="font-black text-xl tracking-tight mb-1">{new Date(record.id + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{record.id}</p>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Resultado Líquido</p>
                                    <p className={`text-3xl font-black tabular-nums ${record.netProfitUSD >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {record.netProfitUSD >= 0 ? '+' : ''}{currencySymbol} {formatMoney(record.netProfitUSD)}
                                    </p>
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${record.netProfitUSD >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {record.netProfitUSD >= 0 ? <TrendingUpIcon className="w-8 h-8" /> : <TrendingDownIcon className="w-8 h-8" />}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {record.trades.map((trade) => {
                                const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                return (
                                    <div key={trade.id} className={`p-6 rounded-[1.8rem] border flex items-center justify-between transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-slate-950/40 border-slate-800/40' : 'bg-slate-50 border-slate-200/50'}`}>
                                        <div className="flex items-center gap-5">
                                            <div className={`w-3 h-12 rounded-full ${trade.result === 'win' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-2">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                <p className="text-xs font-black italic tracking-tighter">{trade.result === 'win' ? 'PROFIT' : 'LOSS'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-base font-black tabular-nums ${tradeProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}</p>
                                            <button onClick={() => deleteTrade(trade.id, record.id)} className="text-[9px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-tighter">Eliminar</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )) : <div className="py-40 text-center opacity-30 grayscale"><InformationCircleIcon className="w-20 h-20 mx-auto mb-8" /><p className="text-sm font-black uppercase tracking-[0.5em]">No Data Found</p></div>}
            </div>
        </div>
    );
};

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
        <div className="p-6 md:p-12 space-y-10 max-w-4xl mx-auto">
            <div className="space-y-1">
                <h2 className="text-4xl font-black italic tracking-tighter">ALAVANCAGEM SOROS</h2>
                <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-[0.2em]`}>Gerenciamento de Risco Exponencial</p>
            </div>
            <div className={`p-10 rounded-[3rem] border ${theme.card} space-y-10 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <InputGroup label="Aporte Inicial" val={initialValue} setVal={setInitialValue} theme={theme} />
                    <InputGroup label="Payout Corretora" val={payout} setVal={setPayout} theme={theme} />
                    <InputGroup label="Ciclos (Mãos)" val={levels} setVal={setLevels} theme={theme} />
                </div>
                <div className="space-y-4">
                    {results.map(r => (
                        <div key={r.level} className="flex items-center justify-between p-8 rounded-[2rem] bg-slate-950/40 border border-slate-800/50 hover:bg-emerald-500/5 transition-all group">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center font-black text-xl text-emerald-500 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform">L{r.level}</div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Aposta Próximo Ciclo</p>
                                    <p className="text-2xl font-black tabular-nums">{currencySymbol} {formatMoney(r.entry)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-emerald-500 mb-1 tracking-widest">Retorno Acumulado</p>
                                <p className="text-2xl font-black text-emerald-500 tabular-nums">+{currencySymbol} {formatMoney(r.profit)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

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
        <div className="p-6 md:p-12 space-y-10 max-w-5xl mx-auto">
            <div className="space-y-1">
                <h2 className="text-4xl font-black italic tracking-tighter">METAS DE LONGO PRAZO</h2>
                <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-[0.2em]`}>Foco e Consistência Financeira</p>
            </div>
            <div className={`p-10 rounded-[3rem] border ${theme.card} space-y-10 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" placeholder="Nome do Objetivo (Ex: Viagem Dubai)" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className={`h-16 px-8 rounded-2xl border-2 outline-none font-black text-sm uppercase tracking-widest ${theme.input} focus:border-emerald-500 transition-all`} />
                    <div className="flex gap-4">
                        <input type="number" placeholder="Valor Alvo" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className={`flex-1 h-16 px-8 rounded-2xl border-2 outline-none font-black text-sm ${theme.input} focus:border-emerald-500 transition-all`} />
                        <button onClick={addGoal} className="px-10 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all">Add</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {goals.map((goal: Goal) => {
                        const progress = goal.targetAmount > 0 ? (monthProfit / goal.targetAmount) * 100 : 0;
                        return (
                            <div key={goal.id} className="p-10 rounded-[2.5rem] bg-slate-950/40 border border-slate-800/50 space-y-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><TrophyIcon className="w-24 h-24" /></div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">{goal.name}</p>
                                        <h4 className="text-4xl font-black tabular-nums tracking-tighter">{currencySymbol} {formatMoney(goal.targetAmount)}</h4>
                                    </div>
                                    <button onClick={() => deleteGoal(goal.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                        <span className="text-slate-500">Saldo Atualizado</span>
                                        <span className={progress >= 100 ? 'text-emerald-500' : 'text-blue-400'}>{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden p-1 border border-slate-800"><div className={`h-full transition-all duration-1000 ease-out rounded-full ${progress >= 100 ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
                                    <p className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest">Diferença de {currencySymbol} {formatMoney(Math.max(0, goal.targetAmount - monthProfit))} para a liberdade</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset }) => {
    const updateBrokerage = (field: keyof Brokerage, value: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: value } : b));
    };
    return (
        <div className="p-6 md:p-12 space-y-10 max-w-4xl mx-auto">
            <div className="space-y-1">
                <h2 className="text-4xl font-black italic tracking-tighter">PARÂMETROS DE RISCO</h2>
                <p className={`${theme.textMuted} font-bold text-xs uppercase tracking-[0.2em]`}>Governança de Conta Elite</p>
            </div>
            <div className={`p-10 rounded-[3rem] border ${theme.card} space-y-12 shadow-2xl`}>
                <section className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-500 pb-4 border-b border-slate-800/50">Identidade & Moeda</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroupText label="Nome da Conta" val={brokerage.name} setVal={(v:string) => updateBrokerage('name', v)} theme={theme} />
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Moeda Base</label>
                            <select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-16 px-6 rounded-2xl border-2 outline-none font-black text-sm uppercase tracking-widest ${theme.input} focus:border-emerald-500`}><option value="USD">Dólar Americano ($)</option><option value="BRL">Real Brasileiro (R$)</option></select>
                        </div>
                    </div>
                </section>
                <section className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-500 pb-4 border-b border-slate-800/50">Capitalização</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Banca Inicial" val={brokerage.initialBalance} setVal={(v:number) => updateBrokerage('initialBalance', v)} theme={theme} />
                        <InputGroup label="Payout Alvo (%)" val={brokerage.payoutPercentage} setVal={(v:number) => updateBrokerage('payoutPercentage', v)} theme={theme} />
                    </div>
                </section>
                <section className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-red-500 pb-4 border-b border-slate-800/50">Circuit Breakers (Stop Rules)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Stop Win (Trades)" val={brokerage.stopGainTrades} setVal={(v:number) => updateBrokerage('stopGainTrades', v)} theme={theme} />
                        <InputGroup label="Stop Loss (Trades)" val={brokerage.stopLossTrades} setVal={(v:number) => updateBrokerage('stopLossTrades', v)} theme={theme} />
                    </div>
                </section>
                <div className="pt-6">
                    <button onClick={onReset} className="w-full px-10 py-6 bg-red-600/5 hover:bg-red-600 text-red-500 hover:text-white font-black rounded-3xl uppercase text-[10px] tracking-[0.4em] transition-all border border-red-500/20 active:scale-95">Hard Reset: Apagar Todos os Dados</button>
                </div>
            </div>
        </div>
    );
};

const InputGroupText: React.FC<any> = ({ label, val, setVal, theme }) => (
    <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">{label}</label>
        <input type="text" value={val} onChange={e => setVal(e.target.value)} className={`w-full h-16 px-6 rounded-2xl border-2 focus:ring-4 focus:ring-emerald-500/10 outline-none font-black text-sm transition-all ${theme.input} focus:border-emerald-500`} />
    </div>
);

export default App;
