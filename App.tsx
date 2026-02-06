
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
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
        navActive: isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- Componente de Cotação em Tempo Real ---
const CurrencyWidget: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
    const [rate, setRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const updateRate = async () => {
        setLoading(true);
        const r = await fetchUSDBRLRate();
        setRate(r);
        setLoading(false);
    };

    useEffect(() => {
        updateRate();
        const interval = setInterval(updateRate, 60000 * 5); // Cada 5 min
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase leading-none">Câmbio USD/BRL</span>
                <span className="text-sm font-black text-emerald-400">{loading ? '...' : `R$ ${rate?.toFixed(2)}`}</span>
            </div>
            <button onClick={updateRate} className="p-1 hover:rotate-180 transition-transform duration-500">
                <ArrowPathIcon className="w-3 h-3 text-slate-500" />
            </button>
        </div>
    );
};

// --- AI Analysis Panel (Sniper Assertivo v6 - Otimizado) ---
const AIAnalysisPanel: React.FC<any> = ({ theme, isDarkMode }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    const compressImage = (dataUrl: string, maxWidth = 1600): Promise<string> => {
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
                resolve(canvas.toDataURL('image/jpeg', 0.9));
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
            
            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR');

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: `SISTEMA SNIPER V6 - PROTOCOLO DE ALTA ASSERTIVIDADE.
                        REGRAS DE OURO:
                        1. IDENTIFICAÇÃO DE ESTRUTURA: Se o preço estiver em lateralização, priorize suporte/resistência extrema.
                        2. REJEIÇÃO DE PAVIO: Analise as últimas 3 velas. Se houver pavio longo contra a tendência em zona de SNR, é sinal forte.
                        3. TENDÊNCIA: Não sugira CALL se a micro-tendência for de baixa clara (LH/LL).
                        4. ASSERTIVIDADE: Seja extremamente conservador. Só sugira CALL ou PUT se a probabilidade for > 85%. Caso contrário, retorne WAIT.
                        5. ANÁLISE TÉCNICA: Procure por Engolfo, Martelo ou Estrela da Manhã/Noite.
                        
                        Contexto: Agora são ${timeString}. Analise para a próxima vela M1.
                        Retorne em JSON puro.` },
                    ],
                },
                config: {
                    systemInstruction: "Você é um Trader de Elite especializado em Opções Binárias e Price Action. Sua missão é reduzir erros de análise. Você deve ser cético. Se o gráfico estiver confuso ou sem volume, recomende WAIT. Foque em rejeições e fluxo de velas. Responda tecnicamente no schema JSON fornecido.",
                    temperature: 0.1,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            recommendation: { type: Type.STRING, enum: ['CALL', 'PUT', 'WAIT'] },
                            confidence: { type: Type.NUMBER },
                            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                            indicatorAnalysis: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            supportLevel: { type: Type.STRING },
                            resistanceLevel: { type: Type.STRING },
                            entryTime: { type: Type.STRING }
                        },
                        required: ['recommendation', 'confidence', 'patterns', 'indicatorAnalysis', 'reasoning', 'supportLevel', 'resistanceLevel', 'entryTime']
                    }
                }
            });
            
            const text = response.text;
            if (!text) throw new Error("Motor não respondeu.");
            const res = JSON.parse(text);
            setAnalysisResult(res);
            setHistory(prev => [{...res, time: timeString}, ...prev].slice(0, 5));
        } catch (err: any) {
            console.error(err);
            setError("Erro no processamento Sniper. Tente uma captura mais limpa do gráfico.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <CpuChipIcon className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className={`text-2xl font-black ${theme.text}`}>Scanner Sniper v6</h2>
                        <p className={theme.textMuted}>Algoritmo de alta precisão focado em mitigação de perdas.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Análise Estrutural Ativa</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className={`p-6 rounded-3xl border ${theme.card} flex flex-col shadow-xl`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><TargetIcon className="w-5 h-5 text-emerald-400" /> Gráfico M1 / M5</h3>
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-6 min-h-[400px] relative overflow-hidden bg-slate-950/20">
                        {!selectedImage ? (
                            <label className="cursor-pointer flex flex-col items-center gap-4 text-center">
                                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 border border-emerald-500/20"><PlusIcon className="w-10 h-10" /></div>
                                <div className="space-y-1">
                                    <p className="font-black text-white uppercase tracking-tighter">Enviar Screenshot</p>
                                    <p className="text-[10px] font-bold text-white/40 max-w-[220px]">A IA analisará pavios, volume e estrutura de mercado</p>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center gap-4">
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
                                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center gap-4">
                                            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Processando Price Action</p>
                                                <p className="text-[8px] font-bold text-white/50 mt-2">Calculando vetores de pressão...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4 w-full">
                                    <button onClick={() => setSelectedImage(null)} className="flex-1 py-4 text-[10px] font-black uppercase rounded-2xl border border-slate-800 hover:bg-slate-800/50 transition-all">Cancelar</button>
                                    <button disabled={isAnalyzing} onClick={runAIAnalysis} className="flex-[2] py-4 text-[10px] font-black uppercase rounded-2xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all">{isAnalyzing ? 'Analisando Estrutura...' : 'Iniciar Escaneamento Sniper'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Section */}
                <div className={`p-6 rounded-3xl border ${theme.card} flex flex-col shadow-xl`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CpuChipIcon className="w-5 h-5 text-purple-400" /> Veredito Técnico</h3>
                    {analysisResult ? (
                        <div className="space-y-6">
                            <div className={`p-8 rounded-3xl border-2 flex items-center justify-between transition-all ${analysisResult.recommendation === 'CALL' ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : analysisResult.recommendation === 'PUT' ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : 'bg-slate-800/20 border-slate-700'}`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase opacity-60 mb-2">Recomendação Sniper</p>
                                    <h4 className={`text-6xl font-black ${analysisResult.recommendation === 'CALL' ? 'text-emerald-500' : analysisResult.recommendation === 'PUT' ? 'text-red-500' : 'text-slate-400'}`}>
                                        {analysisResult.recommendation === 'CALL' ? '↑ CALL' : analysisResult.recommendation === 'PUT' ? '↓ PUT' : '∅ WAIT'}
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase opacity-60 mb-2">Confiança</p>
                                    <p className={`text-4xl font-black ${analysisResult.confidence >= 85 ? 'text-emerald-400' : 'text-slate-400'}`}>{analysisResult.confidence}%</p>
                                </div>
                            </div>

                            <div className="p-6 rounded-3xl border border-emerald-500/30 bg-slate-950/40 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-emerald-400 mb-2">Próxima Entrada (M1)</p>
                                    <p className="text-5xl font-black text-white tracking-tighter tabular-nums">{analysisResult.entryTime}</p>
                                </div>
                                <div className="p-4 bg-emerald-500/20 rounded-2xl">
                                    <TargetIcon className="w-8 h-8 text-emerald-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Zona de Suporte</p>
                                    <p className="text-xs font-bold text-emerald-400">{analysisResult.supportLevel}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Zona de Resistência</p>
                                    <p className="text-xs font-bold text-red-400">{analysisResult.resistanceLevel}</p>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                                <p className="text-[9px] font-black uppercase text-slate-500 mb-3">Confluências Operacionais</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {analysisResult.patterns.map((p, i) => (
                                        <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider">{p}</span>
                                    ))}
                                </div>
                                <div className="p-4 border-l-4 border-emerald-500 bg-emerald-500/5 rounded-r-xl">
                                    <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                                        "{analysisResult.reasoning}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                <InformationCircleIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <p className="text-sm font-bold text-red-400 max-w-[280px]">{error}</p>
                            <button onClick={() => setSelectedImage(null)} className="mt-6 text-[10px] font-black uppercase text-slate-500 hover:text-white">Tentar Novamente</button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-24 opacity-30 text-center grayscale">
                            <CpuChipIcon className="w-24 h-24 mb-8" />
                            <p className="text-xs font-black uppercase tracking-[0.3em]">Aguardando Fluxo de Dados</p>
                            <p className="text-[9px] mt-2 max-w-[200px] font-bold">Envie uma imagem do gráfico para iniciar a análise sniper v6.</p>
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
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

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
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-800/50 font-black italic text-emerald-400 text-xl tracking-tighter">HRK SNIPER</div>
                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('ai-analysis'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'ai-analysis' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Análise IA Sniper</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Plano 30 Dias</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Extrato</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Calc Soros</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Objetivos</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Gestão</button>
                </nav>
                <div className="p-4 border-t border-slate-800/50"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl transition-colors"><LogoutIcon className="w-5 h-5" />Encerrar Sessão</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex items-center justify-between px-6 md:px-8 border-b ${theme.header} shadow-sm z-30`}>
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2"><MenuIcon className="w-6 h-6" /></button>
                        <CurrencyWidget isDarkMode={isDarkMode} />
                        <div className="hidden lg:block"><SavingStatusIndicator status={savingStatus} /></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors">
                            {isDarkMode ? <SunIcon className="w-5 h-5 text-emerald-400" /> : <MoonIcon className="w-5 h-5 text-slate-600" />}
                        </button>
                        <div className="flex items-center gap-3 pl-3 border-l border-slate-800/20">
                            <span className="hidden sm:block text-xs font-black uppercase opacity-60">{user.username}</span>
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20">
                                {user.username.slice(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/20">
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

// --- Outros componentes omitidos para brevidade, mantendo a estrutura do App.tsx original ---
const SavingStatusIndicator: React.FC<{status: string}> = ({status}) => {
    if (status === 'saving') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><ArrowPathIcon className="w-3 h-3 animate-spin" /> Sincronizando...</div>;
    if (status === 'saved') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500"><CheckIcon className="w-3 h-3" /> Nuvem Atualizada</div>;
    return null;
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

    const stopWinReached = activeBrokerage.stopGainTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades;
    const stopLossReached = activeBrokerage.stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades;

    const kpis = [
        { label: 'Capital Líquido', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-500' },
        { label: 'Lucro do Dia', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-500' : 'text-red-500' },
        { label: 'Faltam para Meta', val: dailyGoalPercent >= 100 ? 'META ATINGIDA' : `${currencySymbol}${formatMoney(Math.max(0, dailyGoalTarget - currentProfit))}`, subVal: `${Math.min(100, dailyGoalPercent).toFixed(0)}% do objetivo`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-emerald-500' : 'text-blue-400' },
        { label: 'Taxa de Win', val: `${winRate}%`, icon: TrophyIcon, color: 'text-purple-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Visão Geral da Banca</h2><p className={theme.textMuted}>Gestão de risco e monitoramento de saldo.</p></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none transition-all ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-800 focus:border-emerald-500' : 'bg-white text-slate-700 border-slate-200 focus:border-emerald-500'}`} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-5 rounded-3xl border ${theme.card} flex flex-col justify-between shadow-lg`}>
                        <div className="flex justify-between items-start mb-2"><p className="text-[9px] md:text-[10px] uppercase font-black text-slate-500 tracking-wider leading-none">{kpi.label}</p><kpi.icon className={`w-4 h-4 ${kpi.color} opacity-80`} /></div>
                        <p className={`text-base md:text-xl lg:text-2xl font-black ${kpi.color} truncate tracking-tighter`}>{kpi.val}</p>
                        {kpi.subVal && <p className="text-[8px] md:text-[10px] font-bold mt-2 text-slate-500 truncate leading-tight">{kpi.subVal}</p>}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`p-8 rounded-3xl border ${theme.card} shadow-xl`}>
                    <h3 className="font-black mb-8 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CalculatorIcon className="w-5 h-5 text-emerald-500" /> Registrar Operações</h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor do Trader</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-14 px-5 rounded-2xl border focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg ${theme.input}`} /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout (%)</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-14 px-5 rounded-2xl border focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg ${theme.input}`} /></div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Quantidade</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-14 px-5 rounded-2xl border focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg ${theme.input}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <button onClick={() => handleQuickAdd('win')} disabled={stopWinReached || stopLossReached} className="h-16 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed">VITÓRIA (WIN)</button>
                            <button onClick={() => handleQuickAdd('loss')} disabled={stopWinReached || stopLossReached} className="h-16 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed">DERROTA (LOSS)</button>
                        </div>
                        {(stopWinReached || stopLossReached) && (
                            <div className={`p-4 rounded-2xl border text-center ${stopWinReached ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest">{stopWinReached ? 'STOP GAIN ATINGIDO! META DO DIA CONCLUÍDA.' : 'STOP LOSS ATINGIDO! PRESERVE SEU CAPITAL.'}</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className={`p-8 rounded-3xl border flex flex-col ${theme.card} shadow-xl`}>
                    <h3 className="font-black mb-8 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60 text-blue-400"><ListBulletIcon className="w-5 h-5" /> Fluxo de Operações</h3>
                    <div className="flex-1 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             <div className="space-y-3">
                                {[...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                    const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    return (
                                        <div key={trade.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:translate-x-1 ${isDarkMode ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-10 rounded-full ${trade.result === 'win' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'}`} />
                                                <div>
                                                    <p className="text-[9px] font-black uppercase text-slate-500 leading-none mb-1">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    <p className="text-sm font-black">{trade.result === 'win' ? 'TAKE PROFIT' : 'STOP LOSS'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-base font-black ${tradeProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}
                                                </p>
                                                <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="text-[9px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-tighter transition-colors">Remover</button>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        ) : (<div className="h-full flex flex-col items-center justify-center opacity-20 py-16"><InformationCircleIcon className="w-12 h-12 mb-4" /><p className="text-xs font-black uppercase tracking-widest">Aguardando primeira entrada</p></div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... Restante dos componentes (Soros, Compound, Goals, Settings) com ajustes visuais para Emerald/Slate ...
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
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div><h2 className={`text-2xl font-black ${theme.text}`}>Planejamento de Juros Compostos</h2><p className={`${theme.textMuted} text-xs mt-1 font-bold`}>Projeção para os próximos 30 dias de operação.</p></div>
            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[900px]">
                        <thead><tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}><th className="py-6 px-4 border-b border-slate-800/20">Dia</th><th className="py-6 px-4 border-b border-slate-800/20">Data</th><th className="py-6 px-4 border-b border-slate-800/20">Banca Inicial</th><th className="py-6 px-4 border-b border-slate-800/20">Entrada</th><th className="py-6 px-4 border-b border-slate-800/20 text-emerald-500">W</th><th className="py-6 px-4 border-b border-slate-800/20 text-red-500">L</th><th className="py-6 px-4 border-b border-slate-800/20">Expectativa</th><th className="py-6 px-4 border-b border-slate-800/20">Saldo Final</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.diaTrade} className={`text-sm font-bold hover:bg-emerald-500/5 transition-colors ${row.isProjection ? 'opacity-30' : 'bg-emerald-500/5'}`}>
                                    <td className="py-5 px-4 font-mono text-xs text-slate-500">#{row.diaTrade}</td>
                                    <td className="py-5 px-4 text-[10px] uppercase font-black">{row.dateDisplay}</td>
                                    <td className="py-5 px-4 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-5 px-4 font-black text-blue-400">{currencySymbol} {formatMoney(row.operationValue)}</td>
                                    <td className="py-5 px-4"><span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg">{row.win}</span></td>
                                    <td className="py-5 px-4"><span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg">{row.loss}</span></td>
                                    <td className={`py-5 px-4 font-black ${row.profit > 0 ? 'text-emerald-500' : row.profit < 0 ? 'text-red-500' : 'opacity-30'}`}>{row.profit > 0 ? '+' : ''}{currencySymbol} {formatMoney(row.profit)}</td>
                                    <td className="py-5 px-4 font-black text-white">{currencySymbol} {formatMoney(row.final)}</td>
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
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div><h2 className={`text-2xl font-black ${theme.text}`}>Extrato de Auditoria</h2><p className={theme.textMuted}>Relatório detalhado de todas as sessões finalizadas.</p></div>
            <div className="space-y-4">
                {dayRecords.length > 0 ? dayRecords.map((record: DailyRecord) => (
                    <div key={record.id} className={`p-8 rounded-[2rem] border ${theme.card} shadow-xl`}>
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-black text-sm uppercase tracking-widest opacity-80">{new Date(record.id + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-slate-500">Resultado Líquido</p>
                                <p className={`text-xl font-black ${record.netProfitUSD >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {record.netProfitUSD >= 0 ? '+' : ''}{currencySymbol} {formatMoney(record.netProfitUSD)}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {record.trades.map((trade) => {
                                const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                return (
                                    <div key={trade.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-10 rounded-full ${trade.result === 'win' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-500">{new Date(trade.timestamp || 0).toLocaleTimeString()}</p>
                                                <p className="text-xs font-bold">{trade.result === 'win' ? 'VITÓRIA' : 'DERROTA'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-black ${tradeProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}</p>
                                            <button onClick={() => deleteTrade(trade.id, record.id)} className="text-[8px] font-black text-red-500/30 hover:text-red-500 uppercase">Apagar</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )) : <div className="py-32 text-center opacity-30"><InformationCircleIcon className="w-16 h-16 mx-auto mb-6" /><p className="text-xs font-black uppercase tracking-[0.4em]">Histórico em branco</p></div>}
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
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div><h2 className="text-2xl font-black">Calculadora de Alavancagem (Soros)</h2><p className={theme.textMuted}>Projeção de lucros com reinvestimento de capital.</p></div>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-8 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Mão Inicial</label><input type="number" value={initialValue} onChange={e => setInitialValue(e.target.value)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black text-lg ${theme.input}`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout (%)</label><input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black text-lg ${theme.input}`} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Níveis</label><input type="number" value={levels} onChange={e => setLevels(e.target.value)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black text-lg ${theme.input}`} /></div>
                </div>
                <div className="space-y-3">
                    {results.map(r => (
                        <div key={r.level} className="flex items-center justify-between p-6 rounded-[1.5rem] bg-slate-950/20 border border-slate-800/50 hover:bg-emerald-500/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center font-black text-emerald-500">#{r.level}</div>
                                <div><p className="text-[10px] font-black uppercase text-slate-500">Valor da Entrada</p><p className="text-lg font-black">{currencySymbol} {formatMoney(r.entry)}</p></div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-emerald-500">Lucro Acumulado</p>
                                <p className="text-lg font-black text-emerald-500">+{currencySymbol} {formatMoney(r.profit)}</p>
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
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div><h2 className="text-2xl font-black">Metas Financeiras</h2><p className={theme.textMuted}>Acompanhe seus objetivos de longo prazo.</p></div>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-8 shadow-2xl`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Ex: Meta de Janeiro" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className={`h-14 px-5 rounded-2xl border outline-none font-black ${theme.input}`} />
                    <div className="flex gap-2">
                        <input type="number" placeholder="Valor Alvo" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className={`flex-1 h-14 px-5 rounded-2xl border outline-none font-black ${theme.input}`} />
                        <button onClick={addGoal} className="px-8 bg-emerald-500 text-slate-950 font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Adicionar</button>
                    </div>
                </div>
                <div className="space-y-6">
                    {goals.map((goal: Goal) => {
                        const progress = goal.targetAmount > 0 ? (monthProfit / goal.targetAmount) * 100 : 0;
                        return (
                            <div key={goal.id} className="p-8 rounded-[2rem] bg-slate-950/30 border border-slate-800/50 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div><p className="text-[10px] font-black uppercase text-slate-500 mb-2">{goal.name}</p><h4 className="text-3xl font-black">{currencySymbol} {formatMoney(goal.targetAmount)}</h4></div>
                                    <button onClick={() => deleteGoal(goal.id)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors"><TrashIcon className="w-6 h-6" /></button>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-500">Progresso Atual</span>
                                        <span className={progress >= 100 ? 'text-emerald-500' : 'text-blue-400'}>{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ease-out ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'} shadow-[0_0_15px_rgba(16,185,129,0.3)]`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
                                    <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-tighter">Faltam {currencySymbol} {formatMoney(Math.max(0, goal.targetAmount - monthProfit))} para a liberdade financeira</p>
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
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div><h2 className="text-2xl font-black">Configuração de Gestão</h2><p className={theme.textMuted}>Defina os parâmetros de risco da sua banca principal.</p></div>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-10 shadow-2xl`}>
                <section className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 text-emerald-400">Dados da Banca</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Identificação</label><input type="text" value={brokerage.name} onChange={e => updateBrokerage('name', e.target.value)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black ${theme.input}`} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Moeda Principal</label><select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black ${theme.input}`}><option value="USD">Dólar ($)</option><option value="BRL">Real (R$)</option></select></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Saldo de Partida</label><input type="number" value={brokerage.initialBalance} onChange={e => updateBrokerage('initialBalance', parseFloat(e.target.value) || 0)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black ${theme.input}`} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout Padrão (%)</label><input type="number" value={brokerage.payoutPercentage} onChange={e => updateBrokerage('payoutPercentage', parseInt(e.target.value) || 0)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black ${theme.input}`} /></div>
                    </div>
                </section>
                <section className="space-y-6 pt-10 border-t border-slate-800/10">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 text-red-500">Parâmetros de Stop</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Meta de Wins (Stop Gain)</label><input type="number" value={brokerage.stopGainTrades} onChange={e => updateBrokerage('stopGainTrades', parseInt(e.target.value) || 0)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black ${theme.input}`} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Limite de Loss (Stop Loss)</label><input type="number" value={brokerage.stopLossTrades} onChange={e => updateBrokerage('stopLossTrades', parseInt(e.target.value) || 0)} className={`w-full h-14 px-5 rounded-2xl border outline-none font-black ${theme.input}`} /></div>
                    </div>
                </section>
                <div className="pt-6">
                    <button onClick={onReset} className="w-full md:w-auto px-10 py-5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] transition-all border border-red-500/20">Zerar Todo o Histórico</button>
                </div>
            </div>
        </div>
    );
};

export default App;
