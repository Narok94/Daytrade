
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Brokerage, DailyRecord, TransactionRecord, AppRecord, Trade, User, Goal, AIAnalysisResult } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, ListBulletIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    InformationCircleIcon, TrophyIcon, 
    ChartBarIcon, CheckIcon, DocumentTextIcon,
    PlusIcon, TrashIcon, CpuChipIcon, TrendingDownIcon,
    ChevronLeftIcon, ChevronRightIcon, PhotoIcon,
    SparklesIcon, CheckCircleIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon,
    ExclamationTriangleIcon, BoltIcon, ClockIcon, PlayIcon, CameraIcon,
    ChevronDownIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
};

const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getLocalMonthString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 2000, onRetry?: (attempt: number) => void): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const isRetryable = 
                err.message?.includes('503') || 
                err.message?.includes('429') || 
                err.message?.toLowerCase().includes('high demand') ||
                err.message?.toLowerCase().includes('unavailable') ||
                err.message?.toLowerCase().includes('overloaded');
            
            if (!isRetryable || i === maxRetries - 1) throw err;
            
            if (onRetry) onRetry(i + 1);
            
            const delay = initialDelay * Math.pow(2, i);
            console.log(`Erro de demanda (503/429). Tentativa ${i + 1}/${maxRetries}. Retentando em ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-zinc-100',
        text: isDarkMode ? 'text-slate-50' : 'text-zinc-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-zinc-500',
        card: isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-zinc-50 border-zinc-200 shadow-sm',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400',
        border: isDarkMode ? 'border-slate-800' : 'border-zinc-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-zinc-50 border-r border-zinc-200',
        header: isDarkMode ? 'bg-slate-950' : 'bg-zinc-50',
        navActive: isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50',
    }), [isDarkMode]);
};

// --- AI Analysis Panel (Sniper Assertivo v5) ---
const AIAnalysisPanel: React.FC<any> = ({ theme, isDarkMode }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showDetailed, setShowDetailed] = useState(false);
    const [progress, setProgress] = useState({
        upload: 0,
        data: 0,
        patterns: 0,
        result: 0
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
                setAnalysisResult(null);
                setError(null);
                setProgress({ upload: 0, data: 0, patterns: 0, result: 0 });
            };
            reader.readAsDataURL(file);
        }
    };

    const runAIAnalysis = async () => {
        if (!selectedImage) return;
        setIsAnalyzing(true);
        setError(null);
        setShowDetailed(false);
        
        // Simulate progress for UI
        const simulateProgress = async () => {
            setProgress(p => ({ ...p, upload: 100 }));
            await new Promise(r => setTimeout(r, 800));
            setProgress(p => ({ ...p, data: 65 }));
            await new Promise(r => setTimeout(r, 1200));
            setProgress(p => ({ ...p, data: 100 }));
            await new Promise(r => setTimeout(r, 500));
            setProgress(p => ({ ...p, patterns: 45 }));
            await new Promise(r => setTimeout(r, 1000));
            setProgress(p => ({ ...p, patterns: 100 }));
            await new Promise(r => setTimeout(r, 500));
            setProgress(p => ({ ...p, result: 80 }));
        };
        
        simulateProgress();

        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
            
            if (!apiKey) {
                throw new Error("Chave de API não encontrada. Configure a GEMINI_API_KEY.");
            }

            const ai = new GoogleGenAI({ apiKey });
            const compressed = await compressImage(selectedImage, 1000);
            const base64Data = compressed.split(',')[1];
            
            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const prompt = `HORÁRIO ATUAL: ${timeString}. 
            ANÁLISE OBRIGATÓRIA M1:
            Analise o gráfico seguindo estas prioridades:
            1. Identificar a tendência predominante.
            2. Identificar possíveis reversões ou figuras gráficas (padrões).
            3. Identificar suportes, resistências e zonas intermediárias.
            4. Recomendar operações a favor da tendência, priorizando rompimentos.

            Retorne um JSON com:
            1. asset: Par de moedas.
            2. recommendation: CALL, PUT ou AGUARDAR.
            3. confidence: 0-100.
            4. reasoning: Explicação técnica baseada em tendência, suportes/resistências e rompimentos.
            5. expiration: Tempo de expiração (ex: M1).
            6. trend: ALTA, BAIXA ou LATERAL.
            7. precision: ALTA, MEDIA ou BAIXA.
            8. volume: ALTO, MEDIO ou BAIXO.
            9. timeframe: M1, M5, etc.
            10. entryTime: Horário sugerido de entrada (ex: ${timeString}).`;

            const config = {
                systemInstruction: "Você é um analista sênior de Price Action especializado em Opções Binárias. Sua metodologia foca em identificar tendências, figuras gráficas, zonas de suporte/resistência e operar a favor da tendência com foco em rompimentos. Retorne APENAS JSON.",
                temperature: 0.2,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        asset: { type: Type.STRING },
                        recommendation: { type: Type.STRING, enum: ['CALL', 'PUT', 'AGUARDAR'] },
                        confidence: { type: Type.NUMBER },
                        reasoning: { type: Type.STRING },
                        expiration: { type: Type.STRING },
                        trend: { type: Type.STRING },
                        precision: { type: Type.STRING },
                        volume: { type: Type.STRING },
                        timeframe: { type: Type.STRING },
                        entryTime: { type: Type.STRING }
                    },
                    required: ['asset', 'recommendation', 'confidence', 'reasoning', 'expiration', 'trend', 'precision', 'volume', 'timeframe', 'entryTime']
                }
            };

            let response;
            try {
                response = await withRetry(() => ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: prompt }] },
                    config
                }));
            } catch (flashErr) {
                console.warn("Flash model failed, trying Pro model...", flashErr);
                response = await withRetry(() => ai.models.generateContent({
                    model: 'gemini-3.1-pro-preview',
                    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: prompt }] },
                    config
                }));
            }

            if (!response.text) throw new Error("Resposta inválida da IA.");
            
            const result = JSON.parse(response.text.trim());
            setProgress(p => ({ ...p, result: 100 }));
            await new Promise(r => setTimeout(r, 500));
            setAnalysisResult(result);
        } catch (err: any) {
            console.error("AI Analysis Error:", err);
            let userMessage = "Erro na análise. Tente novamente.";
            if (err.message?.includes('429')) userMessage = "Muitas solicitações. Aguarde um momento.";
            if (err.message?.includes('API key')) userMessage = "Erro na chave de API. Verifique as configurações.";
            setError(userMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] p-6 space-y-12 bg-black text-white">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-800 flex items-center justify-center relative z-10 bg-black">
                        <CpuChipIcon className="w-12 h-12 text-blue-500 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-ping opacity-20" />
                    <div className="absolute -inset-4 border border-blue-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-black tracking-tighter">Analisando gráfico...</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Processando com inteligência artificial</p>
                </div>

                <div className="w-full max-w-md space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="flex items-center gap-2"><PhotoIcon className="w-4 h-4 text-blue-400" /> Carregando Imagem</span>
                            <span className="text-blue-400">{progress.upload}%</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress.upload}%` }} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="flex items-center gap-2"><CpuChipIcon className="w-4 h-4 text-purple-400" /> Processando Dados</span>
                            <span className="text-purple-400">{progress.data}%</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" style={{ width: `${progress.data}%` }} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-green-400" /> Analisando Padrões</span>
                            <span className="text-green-400">{progress.patterns}%</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress.patterns}%` }} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-orange-400" /> Gerando Resultado</span>
                            <span className="text-orange-400">{progress.result}%</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${progress.result}%` }} />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-3 bg-slate-900/50 border border-slate-800 rounded-full flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-slate-300">Processando dados...</span>
                </div>
            </div>
        );
    }

    if (analysisResult) {
        return (
            <div className="max-w-md mx-auto p-4 space-y-4 bg-black min-h-screen text-white">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black">Resultado da Análise</h2>
                    <button onClick={() => setAnalysisResult(null)} className="p-2 bg-slate-900 rounded-full"><XMarkIcon className="w-5 h-5" /></button>
                </div>

                {/* Asset Card */}
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center">
                        <ChartBarIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Sinal Gerado</p>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black tracking-tight">{analysisResult.asset}</h3>
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[8px] font-black rounded-md">IA</span>
                        </div>
                    </div>
                </div>

                {/* Timer Card */}
                <div className="p-6 bg-slate-900/30 border border-blue-500/20 rounded-3xl text-center space-y-1">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <h4 className="text-4xl font-black text-blue-500 tracking-tighter uppercase">
                            {analysisResult.recommendation === 'AGUARDAR' ? 'AGUARDE' : 'ENTRE AGORA'}
                        </h4>
                    </div>
                    <p className="text-xs font-bold text-blue-400/60">
                        {analysisResult.recommendation === 'AGUARDAR' ? 'Aguardando melhor momento...' : 'Momento ideal para entrar!'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 mt-2">Entrar às <span className="text-white">{analysisResult.entryTime}</span></p>
                </div>

                {/* Action Button */}
                <button className={`w-full py-6 rounded-3xl flex items-center justify-center gap-3 shadow-2xl transition-transform active:scale-95 ${
                    analysisResult.recommendation === 'CALL' ? 'bg-green-500 shadow-green-500/20' : 
                    analysisResult.recommendation === 'PUT' ? 'bg-red-500 shadow-red-500/20' : 'bg-slate-800'
                }`}>
                    {analysisResult.recommendation === 'CALL' ? <ArrowUpIcon className="w-8 h-8" /> : <ArrowDownIcon className="w-8 h-8" />}
                    <span className="text-2xl font-black tracking-widest">{analysisResult.recommendation === 'CALL' ? 'COMPRA' : analysisResult.recommendation === 'PUT' ? 'VENDA' : 'AGUARDAR'}</span>
                </button>

                {/* Confidence */}
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span>Confiança</span>
                        <span>{analysisResult.confidence}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${analysisResult.confidence}%` }} />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-1">
                        <div className="flex items-center gap-2 text-[8px] font-black text-green-500 uppercase">
                            <ArrowUpIcon className="w-3 h-3" /> Tendência
                        </div>
                        <p className="text-sm font-black uppercase">{analysisResult.trend}</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-1">
                        <div className="flex items-center gap-2 text-[8px] font-black text-orange-500 uppercase">
                            <ExclamationTriangleIcon className="w-3 h-3" /> Precisão
                        </div>
                        <p className="text-sm font-black uppercase">{analysisResult.precision}</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-1">
                        <div className="flex items-center gap-2 text-[8px] font-black text-yellow-500 uppercase">
                            <BoltIcon className="w-3 h-3" /> Volume
                        </div>
                        <p className="text-sm font-black uppercase">{analysisResult.volume}</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-1">
                        <div className="flex items-center gap-2 text-[8px] font-black text-blue-500 uppercase">
                            <ClockIcon className="w-3 h-3" /> Time Frame
                        </div>
                        <p className="text-sm font-black uppercase">{analysisResult.timeframe}</p>
                    </div>
                </div>

                {/* Detailed Analysis */}
                <div className="border border-slate-800 rounded-3xl overflow-hidden">
                    <button 
                        onClick={() => setShowDetailed(!showDetailed)}
                        className="w-full p-4 flex items-center justify-between bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <PlayIcon className="w-5 h-5 text-blue-500" />
                            <span className="text-xs font-black uppercase tracking-widest">Análise Detalhada</span>
                        </div>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${showDetailed ? 'rotate-180' : ''}`} />
                    </button>
                    {showDetailed && (
                        <div className="p-5 bg-slate-950/50 text-xs font-medium text-slate-300 leading-relaxed">
                            {analysisResult.reasoning}
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => {
                        setAnalysisResult(null);
                        setSelectedImage(null);
                    }}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-3xl flex items-center justify-center gap-3 font-black text-sm transition-colors"
                >
                    <CameraIcon className="w-5 h-5" /> Nova Análise
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
            {!selectedImage ? (
                <div className="space-y-8">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[40px] p-12 bg-slate-950/20 space-y-6">
                        <div className="w-24 h-24 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-2xl shadow-blue-500/10">
                            <CameraIcon className="w-12 h-12" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black tracking-tight">Enviar Gráfico</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Escolha como deseja enviar</p>
                        </div>
                        
                        <div className="w-full space-y-3">
                            <label className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl flex items-center justify-center gap-3 font-black text-sm cursor-pointer transition-colors">
                                <CameraIcon className="w-5 h-5" /> Tirar Foto
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                            </label>
                            <label className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center gap-3 font-black text-sm cursor-pointer transition-colors">
                                <PhotoIcon className="w-5 h-5" /> Escolher da Galeria
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                        
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Ou arraste e solte o arquivo aqui</p>
                    </div>
                    
                    <button disabled className="w-full py-5 bg-blue-600/20 text-blue-500/50 rounded-3xl flex items-center justify-center gap-3 font-black text-lg cursor-not-allowed">
                        <CpuChipIcon className="w-6 h-6" /> Analisar Gráfico
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="relative aspect-video rounded-[40px] overflow-hidden border-2 border-blue-500/30 shadow-2xl bg-black group">
                        <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                        <button 
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <button 
                        onClick={runAIAnalysis}
                        className="w-full py-6 bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20 rounded-[35px] flex items-center justify-center gap-4 font-black text-xl transition-all active:scale-95"
                    >
                        <CpuChipIcon className="w-8 h-8" /> Analisar Gráfico
                    </button>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
                            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                </div>
            )}
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
    const [activeBrokerageId, setActiveBrokerageId] = useState<string | null>(null);
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [trash, setTrash] = useState<AppRecord[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const latestDataRef = useRef({ userId: user.id, brokerages, records, goals });
    useEffect(() => { latestDataRef.current = { userId: user.id, brokerages, records, goals }; }, [user.id, brokerages, records, goals]);
    
    const activeBrokerage = useMemo(() => {
        return brokerages.find(b => b.id === activeBrokerageId) || brokerages[0];
    }, [brokerages, activeBrokerageId]);

    useEffect(() => {
        if (activeBrokerage && !activeBrokerageId) {
            setActiveBrokerageId(activeBrokerage.id);
        }
    }, [activeBrokerage, activeBrokerageId]);

    useEffect(() => {
        if (!activeBrokerage) return;
        const dateKey = getLocalDateString(selectedDate);
        const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
        const startBal = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);
        const dailyRecordForSelectedDay = records.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day');
        const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;
        const suggestedValue = activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : currentBalance * (activeBrokerage.entryValue / 100);
        setCustomEntryValue(String(suggestedValue.toFixed(2)));
        setCustomPayout(String(activeBrokerage.payoutPercentage));
    }, [activeBrokerage, records, selectedDate]);

    const recalibrateHistory = useCallback((allRecords: AppRecord[], initialBal: number, brokerageId: string) => {
        const otherRecords = allRecords.filter(r => r.brokerageId !== brokerageId);
        const brokerageRecords = allRecords.filter(r => r.brokerageId === brokerageId)
            .sort((a, b) => {
                const dateA = a.recordType === 'day' ? a.id : a.date;
                const dateB = b.recordType === 'day' ? b.id : b.date;
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                const timeA = (a as any).timestamp || 0;
                const timeB = (b as any).timestamp || 0;
                return timeA - timeB;
            });
        
        let runningBalance = initialBal;
        const updatedBrokerageRecords = brokerageRecords.map(r => {
            if (r.recordType === 'day') {
                const winCount = r.trades.filter(t => t.result === 'win').length;
                const lossCount = r.trades.filter(t => t.result === 'loss').length;
                const netProfitUSD = r.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
                const endBalanceUSD = runningBalance + netProfitUSD;
                const updated = { ...r, startBalanceUSD: runningBalance, winCount, lossCount, netProfitUSD, endBalanceUSD };
                runningBalance = endBalanceUSD;
                return updated;
            } else {
                const amount = r.recordType === 'deposit' ? r.amountUSD : -r.amountUSD;
                runningBalance += amount;
                return { ...r, runningBalanceUSD: runningBalance };
            }
        });

        return [...otherRecords, ...updatedBrokerageRecords];
    }, []);

    const recalibrateAll = useCallback((allRecords: AppRecord[], allBrokerages: Brokerage[]) => {
        let currentRecords = [...allRecords];
        for (const b of allBrokerages) {
            currentRecords = recalibrateHistory(currentRecords, b.initialBalance, b.id);
        }
        return currentRecords;
    }, [recalibrateHistory]);

    const updateBrokerageSetting = useCallback((id: string, field: string, value: any) => {
        setBrokerages(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Gestão Profissional', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
                const recalibratedRecords = recalibrateAll(data.records || [], loadedBrokerages);
                setBrokerages(loadedBrokerages); 
                setRecords(recalibratedRecords); 
                setGoals(data.goals || []);
                
                // Load trash from localStorage as a local safety net
                const localTrash = localStorage.getItem(`trash_${user.id}`);
                if (localTrash) {
                    try { setTrash(JSON.parse(localTrash)); } catch(e) {}
                }
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [user.id, recalibrateAll]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveData = useCallback(async () => {
        setSavingStatus('saving');
        try {
            const payload = { userId: latestDataRef.current.userId, brokerages: latestDataRef.current.brokerages, records: latestDataRef.current.records, goals: latestDataRef.current.goals };
            const response = await fetch('/api/save-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) { setSavingStatus('saved'); setTimeout(() => setSavingStatus('idle'), 2000); }
        } catch (error: any) { setSavingStatus('error'); }
    }, []);

    const debouncedSave = useDebouncedCallback(saveData, 1000);

    useEffect(() => {
        if (!isLoading) debouncedSave();
    }, [brokerages, records, goals, isLoading, debouncedSave]);

    const addRecord = (win: number, loss: number, customEntry?: number, customPayout?: number, isSoros?: boolean) => {
        if (!activeBrokerage) return;
        setRecords(prev => {
            const dateKey = getLocalDateString(selectedDate);
            const sortedPrevious = prev.filter((r): r is DailyRecord => r.recordType === 'day' && r.brokerageId === activeBrokerage.id && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
            const startBal = sortedPrevious.length > 0 ? sortedPrevious[0].endBalanceUSD : (activeBrokerage.initialBalance || 0);
            const dailyRecordForSelectedDay = prev.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day' && r.brokerageId === activeBrokerage.id);
            const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;
            const suggestedEntryValue = activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : currentBalance * (activeBrokerage.entryValue / 100);
            const entryValue = (customEntry && customEntry > 0) ? customEntry : suggestedEntryValue;
            const payout = (customPayout && customPayout > 0) ? customPayout : activeBrokerage.payoutPercentage;
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue, payoutPercentage: payout, timestamp: Date.now(), isSoros });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue, payoutPercentage: payout, timestamp: Date.now(), isSoros });
            const existingIdx = prev.findIndex(r => r.id === dateKey && r.recordType === 'day' && r.brokerageId === activeBrokerage.id);
            let updatedRecords = [...prev];
            if (existingIdx >= 0) {
                const rec = updatedRecords[existingIdx] as DailyRecord;
                updatedRecords[existingIdx] = { ...rec, trades: [...rec.trades, ...newTrades] };
            } else {
                updatedRecords.push({ recordType: 'day', brokerageId: activeBrokerage.id, id: dateKey, date: dateKey, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 });
            }
            return recalibrateHistory(updatedRecords, activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        if (!activeBrokerage) return;
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day' && r.brokerageId === activeBrokerage.id) ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            return recalibrateHistory(updated, activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const addTransaction = (type: 'deposit' | 'withdrawal', amount: number, notes: string = '') => {
        if (!activeBrokerage || amount <= 0) return;
        setRecords(prev => {
            const dateKey = getLocalDateString(selectedDate);
            const newTransaction: TransactionRecord = {
                recordType: type,
                brokerageId: activeBrokerage.id,
                id: crypto.randomUUID(),
                date: dateKey,
                displayDate: selectedDate.toLocaleDateString('pt-BR'),
                amountUSD: amount,
                notes,
                timestamp: Date.now()
            };
            return recalibrateHistory([...prev, newTransaction], activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const deleteTransaction = (id: string) => {
        if (!activeBrokerage) return;
        setRecords(prev => {
            const updated = prev.filter(r => r.id !== id);
            return recalibrateHistory(updated, activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const handleReset = () => { 
        if(confirm("ATENÇÃO: Isso apagará todo o histórico de operações permanentemente no servidor. Deseja continuar? (Uma cópia será salva na Lixeira local)")) { 
            setTrash([...records]);
            localStorage.setItem(`trash_${user.id}`, JSON.stringify(records));
            setRecords([]); 
            alert("Histórico movido para a Lixeira local. Você pode restaurá-lo nas Configurações se necessário.");
        } 
    };

    const restoreTrash = () => {
        if (trash.length > 0) {
            setRecords([...trash]);
            setTrash([]);
            localStorage.removeItem(`trash_${user.id}`);
            alert("Histórico restaurado com sucesso!");
        }
    };

    const addBulkTrades = (tradesToImport: { date: string, result: 'win' | 'loss', entryValue: number, payoutPercentage: number }[]) => {
        if (!activeBrokerage) return;
        setRecords(prev => {
            let updatedRecords = [...prev];
            tradesToImport.forEach(t => {
                const dateKey = t.date;
                const newTrade: Trade = { 
                    id: crypto.randomUUID(), 
                    result: t.result, 
                    entryValue: t.entryValue, 
                    payoutPercentage: t.payoutPercentage, 
                    timestamp: new Date(t.date + 'T12:00:00').getTime() 
                };
                
                const existingIdx = updatedRecords.findIndex(r => r.id === dateKey && r.recordType === 'day' && r.brokerageId === activeBrokerage.id);
                if (existingIdx >= 0) {
                    const rec = updatedRecords[existingIdx] as DailyRecord;
                    updatedRecords[existingIdx] = { ...rec, trades: [...rec.trades, newTrade] };
                } else {
                    updatedRecords.push({ 
                        recordType: 'day', 
                        brokerageId: activeBrokerage.id, 
                        id: dateKey, 
                        date: dateKey, 
                        trades: [newTrade], 
                        startBalanceUSD: 0, 
                        winCount: 0, 
                        lossCount: 0, 
                        netProfitUSD: 0, 
                        endBalanceUSD: 0 
                    });
                }
            });
            return recalibrateHistory(updatedRecords, activeBrokerage.initialBalance, activeBrokerage.id);
        });
    };

    const brokerageBalances = useMemo(() => {
        return brokerages.map(b => {
            const bRecords = records.filter(r => r.brokerageId === b.id)
                .sort((a, b) => {
                    const dateA = a.recordType === 'day' ? a.id : a.date;
                    const dateB = b.recordType === 'day' ? b.id : b.date;
                    if (dateA !== dateB) return dateA.localeCompare(dateB);
                    return ((a as any).timestamp || 0) - ((b as any).timestamp || 0);
                });
            
            if (bRecords.length === 0) return { name: b.name, balance: b.initialBalance, currency: b.currency };
            
            const last = bRecords[bRecords.length - 1];
            const balance = last.recordType === 'day' ? last.endBalanceUSD : (last as TransactionRecord).runningBalanceUSD || 0;
            return { name: b.name, balance, currency: b.currency };
        });
    }, [brokerages, records]);

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;

    const dateStr = getLocalDateString(selectedDate);
    const brokerageRecords = records.filter(r => r.brokerageId === activeBrokerage?.id);
    
    // Helper to get balance from a record
    const getRecordBalance = (r: AppRecord) => r.recordType === 'day' ? r.endBalanceUSD : (r as TransactionRecord).runningBalanceUSD || 0;
    const getRecordDate = (r: AppRecord) => r.recordType === 'day' ? r.id : r.date;

    const recordsOnDay = brokerageRecords.filter(r => getRecordDate(r) === dateStr)
        .sort((a, b) => ((a as any).timestamp || 0) - ((b as any).timestamp || 0));
    
    const recordsBeforeDay = brokerageRecords.filter(r => getRecordDate(r) < dateStr)
        .sort((a, b) => {
             const d1 = getRecordDate(a);
             const d2 = getRecordDate(b);
             if (d1 !== d2) return d1.localeCompare(d2);
             return ((a as any).timestamp || 0) - ((b as any).timestamp || 0);
        });

    const lastRecordBeforeDay = recordsBeforeDay[recordsBeforeDay.length - 1];
    const startBalDashboard = lastRecordBeforeDay ? getRecordBalance(lastRecordBeforeDay) : (activeBrokerage?.initialBalance || 0);

    const lastRecordOfDay = recordsOnDay[recordsOnDay.length - 1];
    const currentBalanceForDashboard = lastRecordOfDay ? getRecordBalance(lastRecordOfDay) : startBalDashboard;

    const dailyRecord = recordsOnDay.find((r): r is DailyRecord => r.recordType === 'day');
    const dayTransactions = recordsOnDay.filter((r): r is TransactionRecord => r.recordType === 'deposit' || r.recordType === 'withdrawal');

    // LÓGICA DE META DIÁRIA
    const currentMonthStr = getLocalMonthString();
    const dailyBrokerageRecords = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id);
    
    const customGoal = goals.find(g => g.type === 'custom' && g.deadline && g.brokerageId === activeBrokerage?.id);
    const monthlyGoal = goals.find(g => g.type === 'monthly' && g.brokerageId === activeBrokerage?.id);
    
    let activeDailyGoal = 0;

    if (customGoal && customGoal.deadline) {
        const startStr = getLocalDateString(new Date(customGoal.createdAt));
        const currentProfit = dailyBrokerageRecords
            .filter((r: DailyRecord) => r.id >= startStr && r.id <= customGoal.deadline!)
            .reduce((acc: number, r: DailyRecord) => acc + r.netProfitUSD, 0);
        
        const remainingToTarget = customGoal.targetAmount - currentProfit;
        
        // Calculate remaining days
        const today = new Date();
        today.setHours(0,0,0,0);
        const deadlineDate = new Date(customGoal.deadline + 'T12:00:00');
        deadlineDate.setHours(0,0,0,0);
        
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include today
        
        const remainingDays = Math.max(1, diffDays);
        activeDailyGoal = Math.max(0, remainingToTarget) / remainingDays;
    } else if (monthlyGoal) {
        const monthRecords = dailyBrokerageRecords.filter((r: DailyRecord) => r.id.startsWith(currentMonthStr));
        const currentMonthProfit = monthRecords.reduce((acc, r) => acc + r.netProfitUSD, 0);
        const remainingToTarget = monthlyGoal.targetAmount - currentMonthProfit;
        const remainingDaysEstimate = Math.max(1, 22 - monthRecords.length); 
        activeDailyGoal = Math.max(0, remainingToTarget) / remainingDaysEstimate;
    } else {
        activeDailyGoal = (activeBrokerage?.initialBalance * 0.03 || 1);
    }

    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    return (
        <div className={`flex h-screen overflow-hidden overflow-x-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className={`h-20 flex-none flex items-center justify-center border-b ${theme.border} ${theme.header} relative overflow-hidden`}>
                    <div className="flex flex-col items-center relative z-10">
                        <span className="font-black italic text-teal-400 text-3xl tracking-tighter leading-none">HRK</span>
                        <span className="text-[6px] font-black uppercase tracking-[0.3em] text-teal-500/40 mt-1">Binary Options Control</span>
                    </div>
                    {/* Subtle background decorations */}
                    <div className="absolute right-4 bottom-2 flex items-end gap-[2px] opacity-10">
                        <div className="w-[2px] h-3 bg-green-500" />
                        <div className="w-[2px] h-5 bg-red-500" />
                        <div className="w-[2px] h-4 bg-green-500" />
                    </div>
                    <div className="absolute left-4 top-2 flex items-start gap-[2px] opacity-10">
                        <div className="w-[2px] h-4 bg-red-500" />
                        <div className="w-[2px] h-2 bg-green-500" />
                        <div className="w-[2px] h-3 bg-red-500" />
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <div className="px-4 py-2 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-teal-500/40">
                            <div className="w-1 h-1 rounded-full bg-teal-500" />
                            Trading Mode: M1 / OTC
                        </div>
                        <div className="px-1 py-0.5 rounded bg-teal-500/10 text-[6px] font-black text-teal-500/50 uppercase">Binary</div>
                    </div>
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => {setActiveTab('ai-analysis'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'ai-analysis' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Análise IA</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Juros Compostos</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Extrato</button>
                    <button onClick={() => {setActiveTab('history'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'history' ? theme.navActive : theme.navInactive}`}><ListBulletIcon className="w-5 h-5" />Histórico</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Calc Soros</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Metas</button>
                    <button onClick={() => {setActiveTab('management-sheet'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'management-sheet' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Planilha Gestão</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Configurações</button>
                </nav>
                <div className="p-4 border-t border-slate-800/50">
                    <div className="flex items-center justify-between px-4 mb-4 opacity-20">
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-[7px] font-black uppercase tracking-widest">Call</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[7px] font-black uppercase tracking-widest">Put</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl"><LogoutIcon className="w-5 h-5" />Sair</button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex-none flex items-center justify-between px-6 md:px-8 border-b ${theme.border} ${theme.header}`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2"><MenuIcon className="w-6 h-6" /></button>
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/30 border border-slate-800/50 text-[8px] font-black uppercase tracking-widest text-teal-400/60">
                            <div className="w-1 h-1 rounded-full bg-teal-400 animate-pulse" />
                            Market: Active
                        </div>
                        <SavingStatusIndicator status={savingStatus} />
                        <div className="flex items-center gap-1 md:gap-2 ml-1 md:ml-4 max-w-[100px] md:max-w-none">
                            <select 
                                value={activeBrokerageId || ''} 
                                onChange={(e) => setActiveBrokerageId(e.target.value)}
                                className={`text-[9px] md:text-xs font-black uppercase tracking-widest bg-transparent border-none focus:ring-0 cursor-pointer truncate ${theme.text}`}
                            >
                                {brokerages.map(b => (
                                    <option key={b.id} value={b.id} className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-3 overflow-hidden justify-end">
                        <div className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar py-1">
                            {brokerageBalances.map((b, i) => (
                                <div key={i} className={`flex flex-col items-end px-1.5 md:px-3 py-0.5 md:py-1 rounded-md md:rounded-xl border shrink-0 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-zinc-200/50 border-zinc-300/50'}`}>
                                    <span className="text-[5px] md:text-[8px] font-black uppercase opacity-40 leading-none">{b.name}</span>
                                    <span className={`text-[8px] md:text-xs font-bold leading-tight ${b.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {b.currency === 'USD' ? '$' : 'R$'} {formatMoney(b.balance)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-1 md:gap-3 shrink-0">
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1 md:p-2 text-slate-400 hover:text-teal-400 transition-colors">
                                {isDarkMode ? <SunIcon className="w-3.5 h-3.5 md:w-5 md:h-5" /> : <MoonIcon className="w-3.5 h-3.5 md:w-5 md:h-5" />}
                            </button>
                            <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-2xl bg-teal-500 flex items-center justify-center text-slate-950 font-black text-[9px] md:text-xs shadow-lg shadow-teal-500/20">
                                {user.username.slice(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {activeTab === 'dashboard' && (
                        <DashboardPanel 
                            activeBrokerage={activeBrokerage} 
                            updateBrokerageSetting={updateBrokerageSetting}
                            customEntryValue={customEntryValue} 
                            setCustomEntryValue={setCustomEntryValue} 
                            customPayout={customPayout} 
                            setCustomPayout={setCustomPayout} 
                            addRecord={addRecord} 
                            deleteTrade={deleteTrade} 
                            addTransaction={addTransaction}
                            deleteTransaction={deleteTransaction}
                            selectedDateString={dateStr} 
                            setSelectedDate={setSelectedDate} 
                            dailyRecordForSelectedDay={dailyRecord} 
                            transactionsForSelectedDay={dayTransactions}
                            startBalanceForSelectedDay={startBalDashboard} 
                            currentBalanceForDashboard={currentBalanceForDashboard}
                            isDarkMode={isDarkMode} 
                            dailyGoalTarget={activeDailyGoal} 
                        />
                    )}
                    {activeTab === 'ai-analysis' && <AIAnalysisPanel theme={theme} isDarkMode={isDarkMode} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'report' && <ReportPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} deleteTrade={deleteTrade} />}
                    {activeTab === 'history' && <HistoryPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} addBulkTrades={addBulkTrades} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} records={records} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'management-sheet' && <ManagementSheetPanel theme={theme} activeBrokerage={activeBrokerage} isDarkMode={isDarkMode} records={records} />}
                {activeTab === 'settings' && (
                    <SettingsPanel 
                        theme={theme} 
                        brokerage={activeBrokerage} 
                        setBrokerages={setBrokerages} 
                        onReset={handleReset} 
                        trashCount={trash.length}
                        onRestore={restoreTrash}
                    />
                )}
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

// Sub-components like DashboardPanel, CompoundInterestPanel, etc., should be defined correctly here if not in separate files.
// For brevity, assuming they are within this file but omitted in the update to focus on the change.
// (I will keep the logic from the previous provided file structure)

const DashboardPanel: React.FC<any> = ({ activeBrokerage, updateBrokerageSetting, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, addTransaction, deleteTransaction, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, transactionsForSelectedDay, startBalanceForSelectedDay, currentBalanceForDashboard, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const [transAmount, setTransAmount] = useState('');
    const [transType, setTransType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [isNextTradeSoros, setIsNextTradeSoros] = useState(false);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const handlePayoutChange = (val: string) => {
        setCustomPayout(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            updateBrokerageSetting(activeBrokerage.id, 'payoutPercentage', num);
        }
    };

    const handleQuickAdd = (type: 'win' | 'loss') => {
         const entryValue = parseFloat(customEntryValue) || 0;
         const payout = parseFloat(customPayout) || 0;
         const qty = parseInt(quantity) || 1;
         if (type === 'win') addRecord(qty, 0, entryValue, payout, isNextTradeSoros);
         else addRecord(0, qty, entryValue, payout, isNextTradeSoros);
         setQuantity('1');
         setIsNextTradeSoros(false);
    };

    const handleTransaction = () => {
        const amount = parseFloat(transAmount) || 0;
        if (amount > 0) {
            addTransaction(transType, amount);
            setTransAmount('');
        }
    };

    const handleSoros = () => {
        if (!dailyRecordForSelectedDay?.trades?.length) return;
        const trades = dailyRecordForSelectedDay.trades;
        const lastTrade = trades[trades.length - 1];
        const profit = lastTrade.result === 'win' ? (lastTrade.entryValue * (lastTrade.payoutPercentage / 100)) : 0;
        const sorosValue = lastTrade.entryValue + profit;
        setCustomEntryValue(sorosValue.toFixed(2));
        setIsNextTradeSoros(true);
    };

    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = currentBalanceForDashboard;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) : '0.0';
    
    const dailyGoalPercent = dailyGoalTarget > 0 ? (currentProfit / dailyGoalTarget) * 100 : 0;

    const entryValueNum = parseFloat(customEntryValue) || 0;
    const payoutNum = parseFloat(customPayout) || 0;
    const qtyNum = parseInt(quantity) || 1;
    const estimatedProfit = entryValueNum * (payoutNum / 100) * qtyNum;
    const estimatedLoss = entryValueNum * qtyNum;

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-3 md:p-4 rounded-2xl md:rounded-3xl border ${theme.card} flex flex-col justify-between`}>
                        <div className="flex justify-between items-start mb-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-500 tracking-wider leading-none">{kpi.label}</p><kpi.icon className={`w-3 h-3 md:w-4 md:h-4 ${kpi.color} opacity-80`} /></div>
                        <p className={`text-sm md:text-lg lg:text-xl font-black ${kpi.color} truncate`}>{kpi.val}</p>
                        {kpi.subVal && <p className="text-[7px] md:text-[9px] font-bold mt-1 text-slate-500 truncate leading-tight">{kpi.subVal}</p>}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className={`p-6 rounded-3xl border ${theme.card}`}>
                        <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CalculatorIcon className="w-5 h-5 text-green-500" /> Nova Operação</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor</label>
                                    <div className="relative">
                                        <input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} />
                                        <button 
                                            onClick={handleSoros}
                                            title="Calcular Soros (Última entrada + lucro)"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[8px] font-black uppercase rounded-lg transition-all active:scale-95 shadow-sm"
                                        >
                                            Soros
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout</label>
                                    <div className="relative">
                                        <input type="number" value={customPayout} onChange={e => handlePayoutChange(e.target.value)} className={`w-full h-12 px-4 pr-8 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 font-bold">%</span>
                                    </div>
                                </div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Qtd</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-green-500 outline-none font-bold ${theme.input}`} /></div>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-red-500/40">
                                    Risco: <span className="text-red-500/60">{currencySymbol} {formatMoney(estimatedLoss)}</span>
                                </p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-green-500/40">
                                    Estimativa de Ganho: <span className="text-green-500/80">{currencySymbol} {formatMoney(estimatedProfit)}</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <button onClick={() => handleQuickAdd('win')} disabled={stopWinReached || stopLossReached} className="h-14 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:bg-slate-700 disabled:opacity-50">WIN</button>
                                <button onClick={() => handleQuickAdd('loss')} disabled={stopWinReached || stopLossReached} className="h-14 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:bg-slate-700 disabled:opacity-50">LOSS</button>
                            </div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-3xl border ${theme.card}`}>
                        <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><ArrowPathIcon className="w-5 h-5 text-blue-500" /> Movimentação de Banca</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo</label>
                                    <select value={transType} onChange={e => setTransType(e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-blue-500 outline-none font-bold ${theme.input}`}>
                                        <option value="deposit">Depósito</option>
                                        <option value="withdrawal">Saque</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor</label>
                                    <input type="number" value={transAmount} onChange={e => setTransAmount(e.target.value)} placeholder="0.00" className={`w-full h-12 px-4 rounded-xl border focus:ring-1 focus:ring-blue-500 outline-none font-bold ${theme.input}`} />
                                </div>
                            </div>
                            <button onClick={handleTransaction} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg active:scale-95">Confirmar Lançamento</button>
                        </div>
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border flex flex-col ${theme.card}`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60 text-blue-400"><ListBulletIcon className="w-5 h-5" /> Histórico do Dia</h3>
                    <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        <div className="space-y-2">
                            {/* Transactions first */}
                            {transactionsForSelectedDay.map((trans: any) => (
                                <div key={trans.id} className={`flex items-center justify-between p-3 rounded-2xl border ${isDarkMode ? 'bg-blue-950/20 border-blue-800/30' : 'bg-blue-50 border-blue-200/50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-8 rounded-full ${trans.recordType === 'deposit' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-500 leading-none">{new Date(trans.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            <p className="text-sm font-bold">{trans.recordType === 'deposit' ? 'Depósito' : 'Saque'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-black ${trans.recordType === 'deposit' ? 'text-blue-500' : 'text-orange-500'}`}>
                                            {trans.recordType === 'deposit' ? '+' : '-'}{currencySymbol} {formatMoney(trans.amountUSD)}
                                        </p>
                                        <button onClick={() => deleteTransaction(trans.id)} className="text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-tighter">Excluir</button>
                                    </div>
                                </div>
                            ))}

                            {/* Trades */}
                            {dailyRecordForSelectedDay?.trades?.length ? (
                                [...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                    const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    return (
                                        <div key={trade.id} className={`flex items-center justify-between p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200/50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-8 rounded-full ${trade.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-500 leading-none">
                                                        {new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        <span className="ml-2 opacity-50">Payout: {trade.payoutPercentage}%</span>
                                                    </p>
                                                    <p className="text-sm font-bold">
                                                        {trade.result === 'win' ? 'Vitória' : 'Derrota'}
                                                        {trade.isSoros && <span className="ml-2 text-[8px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Soros</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${tradeProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}
                                                </p>
                                                <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="text-[9px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-tighter">Excluir</button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : null}

                            {!dailyRecordForSelectedDay?.trades?.length && !transactionsForSelectedDay.length && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 py-10">
                                    <InformationCircleIcon className="w-10 h-10 mb-2" />
                                    <p className="text-xs font-black uppercase">Sem atividades hoje</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... Omitted other panels as they remain the same as previous logic ...
const CompoundInterestPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const [projMetaPercent, setProjMetaPercent] = useState(10);
    const [projStopPercent, setProjStopPercent] = useState(3);
    const [projEntryPercent, setProjEntryPercent] = useState(1);

    const tableData = useMemo(() => {
        const rows = [];
        const sortedRealRecords = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id && r.trades.length > 0).sort((a: DailyRecord, b: DailyRecord) => a.id.localeCompare(b.id));
        let startDate = sortedRealRecords.length > 0 ? new Date(sortedRealRecords[0].id + 'T12:00:00') : new Date();
        startDate.setHours(12,0,0,0);
        let runningBalance = activeBrokerage?.initialBalance || 0;
        
        const todayStr = getLocalDateString();
        
        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateId = getLocalDateString(currentDate);
            const isPast = dateId < todayStr;
            
            const dayRecords = records.filter((r: any) => 
                (r.recordType === 'day' ? r.id : r.date) === dateId && 
                r.brokerageId === activeBrokerage?.id
            ).sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));

            const realRecord = dayRecords.find((r: any) => r.recordType === 'day' && r.trades.length > 0);
            const transactions = dayRecords.filter((r: any) => r.recordType === 'deposit' || r.recordType === 'withdrawal');
            const transProfit = transactions.reduce((acc: number, t: any) => acc + (t.recordType === 'deposit' ? t.amountUSD : -t.amountUSD), 0);
            
            let initial = runningBalance, profit, final, isProjection, status = 'META BATIDA', hasOperation = false;
            const targetProfit = initial * (projMetaPercent / 100);
            const stopValue = initial * (projStopPercent / 100);
            const entryValue = initial * (projEntryPercent / 100);
            
            if (realRecord) {
                profit = realRecord.netProfitUSD + transProfit; 
                final = initial + profit;
                status = profit >= 0 ? 'META BATIDA' : 'STOP-LOSS';
                isProjection = false;
                hasOperation = true;
            } else if (transactions.length > 0) {
                profit = transProfit;
                final = initial + profit;
                status = profit >= 0 ? 'META BATIDA' : 'STOP-LOSS';
                isProjection = false;
                hasOperation = true;
            } else {
                isProjection = true; 
                if (isPast) {
                    profit = 0;
                    final = initial;
                    status = 'SEM OPERAÇÃO';
                    hasOperation = false;
                } else {
                    profit = targetProfit;
                    final = initial + profit;
                    status = 'META BATIDA';
                    hasOperation = true; // Planned operation
                }
            }
            rows.push({ 
                diaTrade: i + 1, 
                dateId, 
                dateDisplay: currentDate.toLocaleDateString('pt-BR'), 
                initial, 
                profit, 
                final, 
                isProjection, 
                status,
                hasOperation,
                metaPercent: projMetaPercent,
                targetProfit,
                stopValue,
                entryValue
            });
            runningBalance = final;
        }

        // We keep all rows now to show the "SEM OPERAÇÃO" gaps if they exist within the 30-day window
        return rows.map((row, index) => ({
            ...row,
            diaTrade: index + 1
        }));
    }, [records, activeBrokerage.initialBalance, projMetaPercent, projStopPercent, projEntryPercent]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div>
                    <h2 className={`text-2xl font-black ${theme.text}`}>Planejamento de Juros Compostos</h2>
                    <p className={`${theme.textMuted} text-xs mt-1 font-bold`}>Projeção baseada no histórico real e metas futuras.</p>
                </div>
            </div>

            <div className={`rounded-3xl border overflow-hidden shadow-2xl ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-100/50'}`}>
                                <th className="py-5 px-3 border-b border-slate-800/20">Data</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Capital</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">
                                    <div className="flex flex-col items-center gap-1">
                                        <span>Meta</span>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={projMetaPercent} onChange={e => setProjMetaPercent(parseFloat(e.target.value) || 0)} className={`w-12 h-6 px-1 rounded border text-[10px] text-center font-black outline-none ${theme.input}`} />
                                            <span className="opacity-30">%</span>
                                        </div>
                                    </div>
                                </th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Lucro</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">Status</th>
                                <th className="py-5 px-3 border-b border-slate-800/20">
                                    <div className="flex flex-col items-center gap-1">
                                        <span>Stop</span>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={projStopPercent} onChange={e => setProjStopPercent(parseFloat(e.target.value) || 0)} className={`w-12 h-6 px-1 rounded border text-[10px] text-center font-black outline-none ${theme.input}`} />
                                            <span className="opacity-30">%</span>
                                        </div>
                                    </div>
                                </th>
                                <th className="py-5 px-3 border-b border-slate-800/20">
                                    <div className="flex flex-col items-center gap-1">
                                        <span>Entrada</span>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={projEntryPercent} onChange={e => setProjEntryPercent(parseFloat(e.target.value) || 0)} className={`w-12 h-6 px-1 rounded border text-[10px] text-center font-black outline-none ${theme.input}`} />
                                            <span className="opacity-30">%</span>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/10">
                            {tableData.map((row) => (
                                <tr key={row.dateId} className={`text-sm font-bold hover:bg-slate-800/5 transition-colors ${row.isProjection ? 'opacity-40 grayscale-[0.5]' : row.status === 'STOP-LOSS' ? 'bg-red-500/5' : ''}`}>
                                    <td className="py-4 px-3 text-[10px] uppercase font-black opacity-60">
                                        {row.hasOperation ? row.dateDisplay : ''}
                                    </td>
                                    <td className="py-4 px-3 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-4 px-3 opacity-60">{row.metaPercent}%</td>
                                    <td className="py-4 px-3 font-black text-blue-400">{currencySymbol} {formatMoney(row.targetProfit)}</td>
                                    <td className="py-4 px-3">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${row.status === 'META BATIDA' ? 'bg-green-500/20 text-green-500' : row.status === 'STOP-LOSS' ? 'bg-red-500/20 text-red-500' : 'bg-slate-500/20 text-slate-500'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-3 text-red-500/80">{currencySymbol} {formatMoney(row.stopValue)}</td>
                                    <td className="py-4 px-3 opacity-80">{currencySymbol} {formatMoney(row.entryValue)}</td>
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
    const dayRecords = records.filter((r: any) => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id && r.trades.length > 0).sort((a: any, b: any) => b.id.localeCompare(a.id));
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
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-8 rounded-full ${trade.result === 'win' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-slate-500 leading-none">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                <p className="text-sm font-bold">
                                                    {trade.result === 'win' ? 'Vitória' : 'Derrota'}
                                                    {trade.isSoros && <span className="ml-2 text-[8px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Soros</span>}
                                                </p>
                                            </div>
                                        </div>
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

const CalendarHistory: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = startDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const dailyProfits = useMemo(() => {
        const profits: Record<string, number> = {};
        records.filter((r: any): r is DailyRecord => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id)
            .forEach((r: DailyRecord) => {
                profits[r.id] = r.netProfitUSD;
            });
        return profits;
    }, [records, activeBrokerage]);

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) calendarDays.push(null);
    for (let d = 1; d <= totalDays; d++) calendarDays.push(d);

    return (
        <div className={`p-1.5 md:p-3 rounded-xl border ${theme.card} w-full max-w-xl mx-auto`}>
            <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-800/50 rounded-md transition-colors"><ChevronLeftIcon className="w-3.5 h-3.5" /></button>
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-teal-400">{monthName}</h3>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-800/50 rounded-md transition-colors"><ChevronRightIcon className="w-3.5 h-3.5" /></button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 md:gap-1">
                {dayNames.map(day => (
                    <div key={day} className="text-center text-[8px] md:text-[9px] font-black uppercase text-slate-500 py-0.5">{day}</div>
                ))}
                {calendarDays.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;
                    
                    const dateId = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const profit = dailyProfits[dateId];
                    const isToday = getLocalDateString() === dateId;

                    return (
                        <div key={dateId} className={`aspect-square rounded-md md:rounded-lg border ${isDarkMode ? 'border-slate-800/50' : 'border-zinc-200'} flex flex-col items-center justify-center p-0.5 relative transition-all hover:scale-105 cursor-default ${isToday ? 'ring-1 ring-teal-500/50' : ''} ${profit !== undefined ? (profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10') : ''}`}>
                            <span className="text-[8px] md:text-[10px] font-black opacity-40 mb-0.5">{day}</span>
                            {profit !== undefined && (
                                <span className={`text-[5px] md:text-[8px] font-black ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex justify-center gap-3 text-[8px] font-black uppercase tracking-widest opacity-40">
                <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-green-500" /> Lucro</div>
                <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-red-500" /> Prejuízo</div>
            </div>
        </div>
    );
};

const HistoryPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records, addBulkTrades }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'calendar'>('calendar');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [importText, setImportText] = useState('');

    const handleTextImport = async () => {
        if (!importText.trim()) return;

        setIsImporting(true);
        setImportError(null);
        setRetryCount(0);

        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("Chave de API não encontrada.");
            const ai = new GoogleGenAI({ apiKey });

            const response = await withRetry(() => ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { text: `Analise este texto que contém um histórico de operações de trading, possivelmente no formato: Data,Horário,Par de Moedas,Valor Entrada,Payout (%),Resultado.
                        Exemplo: 02/03,08:27:01,CAD/JPY,"R$ 5,00",90%,"+ R$ 9,50"
                        
                        Regras de extração:
                        1. Data: Converta para o formato YYYY-MM-DD. Use o ano de 2026.
                        2. Resultado: Identifique como 'win' ou 'loss'.
                           - Se houver lucro ("+ R$") ou for uma operação vencedora, use 'win'.
                           - Se houver prejuízo ("- R$") ou for uma operação perdedora, use 'loss'.
                           - Se for "Empate", use 'win' mas defina o Payout como 0 (isso garante que o lucro seja zero).
                        3. Valor de Entrada: Extraia apenas o valor numérico (ex: 5.00).
                        4. Payout %: Extraia apenas o número (ex: 90). Se for "-", use 0.
                        
                        Texto:
                        ${importText}
                        
                        Retorne APENAS um array JSON de objetos.` }
                    ],
                },
                config: {
                    systemInstruction: "Você é um assistente especializado em extração de dados de trading. Você deve processar textos (incluindo formatos CSV) e extrair operações para um formato JSON padronizado. Trate 'Empate' como 'win' com payout 0.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                date: { type: Type.STRING, description: "Data da operação YYYY-MM-DD" },
                                result: { type: Type.STRING, enum: ['win', 'loss'] },
                                entryValue: { type: Type.NUMBER },
                                payoutPercentage: { type: Type.NUMBER }
                            },
                            required: ['date', 'result', 'entryValue', 'payoutPercentage']
                        }
                    }
                }
            }), 5, 2000, (attempt) => setRetryCount(attempt));

            const text = response.text;
            if (text) {
                const trades = JSON.parse(text);
                if (Array.isArray(trades) && trades.length > 0) {
                    addBulkTrades(trades);
                    alert(`${trades.length} operações importadas com sucesso!`);
                    setIsTextModalOpen(false);
                    setImportText('');
                } else {
                    setImportError("Nenhuma operação encontrada no texto enviado.");
                }
            }
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes('503') || err.message?.includes('high demand')) {
                setImportError("O Google está com alta demanda no momento (Erro 503). Por favor, aguarde 10 segundos e tente novamente.");
            } else {
                setImportError("Erro ao processar texto: " + err.message);
            }
        } finally {
            setIsImporting(false);
        }
    };

    const stats = useMemo(() => {
        const dayRecords = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id && r.trades.length > 0);
        
        if (viewMode === 'daily') {
            return dayRecords.sort((a: DailyRecord, b: DailyRecord) => b.id.localeCompare(a.id)).map((r: DailyRecord) => ({
                id: r.id,
                label: new Date(r.id + 'T12:00:00').toLocaleDateString('pt-BR'),
                profit: r.netProfitUSD,
                wins: r.winCount,
                losses: r.lossCount,
                total: r.winCount + r.lossCount,
                winRate: (r.winCount + r.lossCount) > 0 ? (r.winCount / (r.winCount + r.lossCount)) * 100 : 0
            }));
        }

        if (viewMode === 'weekly') {
            const weeks: Record<string, any> = {};
            dayRecords.forEach((r: DailyRecord) => {
                const date = new Date(r.id + 'T12:00:00');
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                const monday = new Date(date.setDate(diff));
                const weekId = getLocalDateString(monday);
                
                if (!weeks[weekId]) {
                    weeks[weekId] = { id: weekId, label: `Semana de ${monday.toLocaleDateString('pt-BR')}`, profit: 0, wins: 0, losses: 0, total: 0 };
                }
                weeks[weekId].profit += r.netProfitUSD;
                weeks[weekId].wins += r.winCount;
                weeks[weekId].losses += r.lossCount;
                weeks[weekId].total += (r.winCount + r.lossCount);
            });
            return Object.values(weeks).sort((a, b) => b.id.localeCompare(a.id)).map(w => ({
                ...w,
                winRate: w.total > 0 ? (w.wins / w.total) * 100 : 0
            }));
        }

        if (viewMode === 'monthly') {
            const months: Record<string, any> = {};
            dayRecords.forEach((r: DailyRecord) => {
                const monthId = r.id.slice(0, 7); // YYYY-MM
                if (!months[monthId]) {
                    const [year, month] = monthId.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    months[monthId] = { id: monthId, label: label.charAt(0).toUpperCase() + label.slice(1), profit: 0, wins: 0, losses: 0, total: 0 };
                }
                months[monthId].profit += r.netProfitUSD;
                months[monthId].wins += r.winCount;
                months[monthId].losses += r.lossCount;
                months[monthId].total += (r.winCount + r.lossCount);
            });
            return Object.values(months).sort((a, b) => b.id.localeCompare(a.id)).map(m => ({
                ...m,
                winRate: m.total > 0 ? (m.wins / m.total) * 100 : 0
            }));
        }

        return [];
    }, [records, viewMode]);

    return (
        <div className="p-2 md:p-4 space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-3">
                <div className="flex justify-between w-full md:w-auto items-center gap-4">
                    <div>
                        <h2 className={`text-xl md:text-2xl font-black ${theme.text}`}>Histórico de Performance</h2>
                        <p className={`text-[10px] md:text-xs ${theme.textMuted}`}>Análise detalhada por períodos.</p>
                    </div>
                    <button 
                        onClick={() => setIsTextModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {isImporting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <DocumentTextIcon className="w-4 h-4" />}
                        {isImporting ? 'Processando...' : 'Importar Texto'}
                    </button>
                </div>
                {importError && (
                    <div className="w-full md:w-auto px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{importError}</p>
                    </div>
                )}
                <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto no-scrollbar">
                    {(['calendar', 'daily', 'weekly', 'monthly'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === mode ? 'bg-teal-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {mode === 'calendar' ? 'Calendário' : mode === 'daily' ? 'Diário' : mode === 'weekly' ? 'Semanal' : 'Mensal'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {viewMode === 'calendar' ? (
                    <CalendarHistory isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />
                ) : stats.length > 0 ? stats.map((item: any) => (
                    <div key={item.id} className={`p-6 rounded-3xl border ${theme.card} flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${item.profit >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {item.profit >= 0 ? <TrendingUpIcon className="w-6 h-6" /> : <TrendingDownIcon className="w-6 h-6" />}
                            </div>
                            <div>
                                <h4 className="font-black text-lg leading-none mb-1">{item.label}</h4>
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{item.total} Operações Realizadas</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                            <div>
                                <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Resultado</p>
                                <p className={`text-lg font-black ${item.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {item.profit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(item.profit)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Win / Loss %</p>
                                <p className="text-lg font-black">
                                    <span className="text-green-500">{item.winRate.toFixed(0)}%</span>
                                    <span className="mx-1 opacity-20">/</span>
                                    <span className="text-red-500">{(100 - item.winRate).toFixed(0)}%</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Wins / Losses</p>
                                <p className="text-lg font-black">
                                    <span className="text-green-500">{item.wins}</span>
                                    <span className="mx-1 opacity-20">/</span>
                                    <span className="text-red-500">{item.losses}</span>
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Performance</p>
                                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                                    <div className="h-full bg-green-500" style={{ width: `${item.winRate}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center opacity-30">
                        <InformationCircleIcon className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-xs font-black uppercase">Nenhum dado para este período</p>
                    </div>
                )}
            </div>

            {/* Modal de Importação de Texto */}
            {isTextModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className={`w-full max-w-2xl rounded-3xl border ${theme.card} p-6 md:p-8 space-y-6 shadow-2xl`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className={`text-xl font-black ${theme.text}`}>Importar Histórico</h3>
                                <p className={`text-xs ${theme.textMuted}`}>Cole o texto do seu histórico de operações abaixo.</p>
                                <p className="text-[10px] text-teal-500 font-bold mt-1 uppercase tracking-tighter">Dica: Se der erro de demanda, tente importar em partes menores.</p>
                            </div>
                            <button onClick={() => setIsTextModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                                <TrashIcon className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="Ex: 11/03/2026 - Win - $10.00 - 80%..."
                            className={`w-full h-64 p-4 rounded-2xl border outline-none font-bold resize-none ${theme.input} text-xs`}
                        />

                        {importError && (
                            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{importError}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsTextModalOpen(false)}
                                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border ${theme.card} hover:bg-slate-800 transition-all`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleTextImport}
                                disabled={isImporting || !importText.trim()}
                                className="flex-1 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isImporting && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                                {isImporting ? (retryCount > 0 ? `Tentativa ${retryCount + 1}...` : 'Processando...') : 'Confirmar Importação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
            <div><h2 className="text-2xl font-black">Calculadora de Soros</h2><p className={theme.textMuted}>Planejamento de alavancagem progressiva.</p></div>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-6`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Valor Inicial</label><input type="number" value={initialValue} onChange={e => setInitialValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Payout</label>
                        <div className="relative">
                            <input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-12 px-4 pr-8 rounded-xl border outline-none font-bold ${theme.input}`} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 font-bold">%</span>
                        </div>
                    </div>
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

const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, records, activeBrokerage }) => {
    const [newGoalName, setNewGoalName] = useState('');
    const [newGoalAmount, setNewGoalAmount] = useState('');
    const [newGoalType, setNewGoalType] = useState<'weekly' | 'monthly' | 'custom'>('monthly');
    const [newGoalDeadline, setNewGoalDeadline] = useState('');
    
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    
    const addGoal = () => {
        if (!newGoalName || !newGoalAmount || !activeBrokerage) return;
        if (newGoalType === 'custom' && !newGoalDeadline) return;
        
        const goal: Goal = { 
            id: crypto.randomUUID(), 
            brokerageId: activeBrokerage.id,
            name: newGoalName, 
            type: newGoalType, 
            targetAmount: parseFloat(newGoalAmount) || 0, 
            deadline: newGoalType === 'custom' ? newGoalDeadline : undefined,
            createdAt: Date.now() 
        };
        setGoals([...goals, goal]);
        setNewGoalName('');
        setNewGoalAmount('');
        setNewGoalDeadline('');
    };
    
    const deleteGoal = (id: string) => setGoals(goals.filter((g: Goal) => g.id !== id));
    
    const calculateProgress = (goal: Goal) => {
        const brokerageRecords = records.filter((r: any) => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id);
        let relevantProfit = 0;
        let label = "Progresso";

        if (goal.type === 'monthly') {
            const currentMonthStr = getLocalMonthString();
            relevantProfit = brokerageRecords
                .filter((r: any) => r.id.startsWith(currentMonthStr))
                .reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
            label = "Progresso do Mês";
        } else if (goal.type === 'weekly') {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now.setDate(diff));
            monday.setHours(0,0,0,0);
            const mondayStr = getLocalDateString(monday);
            
            relevantProfit = brokerageRecords
                .filter((r: any) => r.id >= mondayStr)
                .reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
            label = "Progresso da Semana";
        } else if (goal.type === 'custom' && goal.deadline) {
            const startStr = getLocalDateString(new Date(goal.createdAt));
            relevantProfit = brokerageRecords
                .filter((r: any) => r.id >= startStr && r.id <= goal.deadline!)
                .reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
            label = `Até ${new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}`;
        }

        const percentage = goal.targetAmount > 0 ? (relevantProfit / goal.targetAmount) * 100 : 0;
        return { percentage, label, current: relevantProfit };
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div><h2 className="text-2xl font-black">Metas Financeiras</h2><p className={theme.textMuted}>Acompanhamento de objetivos a longo prazo.</p></div>
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-8`}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Nome da Meta" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className={`h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} />
                        <select value={newGoalType} onChange={e => setNewGoalType(e.target.value as any)} className={`h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`}>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                            <option value="custom">Até certa data</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="number" placeholder="Valor Alvo" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className={`h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} />
                        {newGoalType === 'custom' ? (
                            <input type="date" value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)} className={`h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} />
                        ) : (
                            <div className="h-12" />
                        )}
                    </div>
                    <button onClick={addGoal} className="w-full h-12 bg-teal-500 text-slate-950 font-black rounded-xl uppercase text-[10px] tracking-widest">Adicionar Meta</button>
                </div>
                
                <div className="space-y-4">
                    {goals.filter((g: Goal) => g.brokerageId === activeBrokerage?.id).map((goal: Goal) => {
                        const { percentage, label, current } = calculateProgress(goal);
                        return (
                            <div key={goal.id} className="p-6 rounded-3xl bg-slate-950/30 border border-slate-800/50 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{goal.name}</p>
                                        <h4 className="text-xl font-black">{currencySymbol} {formatMoney(goal.targetAmount)}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1">Atual: {currencySymbol} {formatMoney(current)}</p>
                                    </div>
                                    <button onClick={() => deleteGoal(goal.id)} className="text-red-500/50 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-500">{label}</span><span className={percentage >= 100 ? 'text-green-500' : 'text-blue-400'}>{percentage.toFixed(1)}%</span></div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} /></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset, trashCount, onRestore }) => {
    const [newBrokerageName, setNewBrokerageName] = useState('');
    
    const updateBrokerage = (field: keyof Brokerage, value: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b) => b.id === brokerage.id ? { ...b, [field]: value } : b));
    };

    const addNewBrokerage = () => {
        if (!newBrokerageName) return;
        const newB: Brokerage = {
            id: crypto.randomUUID(),
            name: newBrokerageName,
            initialBalance: 10,
            entryMode: 'percentage',
            entryValue: 10,
            payoutPercentage: 80,
            stopGainTrades: 3,
            stopLossTrades: 2,
            currency: 'USD'
        };
        setBrokerages((prev: Brokerage[]) => [...prev, newB]);
        setNewBrokerageName('');
    };

    const deleteBrokerage = (id: string) => {
        setBrokerages((prev: Brokerage[]) => prev.filter(b => b.id !== id));
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div><h2 className="text-2xl font-black">Configurações de Banca</h2><p className={theme.textMuted}>Gestão de capital e limites de risco.</p></div>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Nome da Nova Corretora" 
                        value={newBrokerageName}
                        onChange={e => setNewBrokerageName(e.target.value)}
                        className={`h-10 px-4 rounded-xl border text-xs font-bold outline-none ${theme.input}`}
                    />
                    <button onClick={addNewBrokerage} className="h-10 px-4 bg-teal-500 text-slate-950 font-black rounded-xl uppercase text-[10px] tracking-widest">Nova</button>
                </div>
            </div>
            
            <div className={`p-8 rounded-3xl border ${theme.card} space-y-8`}>
                <section className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Parâmetros de {brokerage.name}</h3>
                        <button onClick={() => deleteBrokerage(brokerage.id)} className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline">Excluir Corretora</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Nome da Banca</label><input type="text" value={brokerage.name} onChange={e => updateBrokerage('name', e.target.value)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Moeda</label><select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`}><option value="USD">Dólar ($)</option><option value="BRL">Real (R$)</option></select></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Saldo Inicial</label><input type="number" value={brokerage.initialBalance} onChange={e => updateBrokerage('initialBalance', parseFloat(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Payout Padrão</label>
                            <div className="relative">
                                <input type="number" value={brokerage.payoutPercentage} onChange={e => updateBrokerage('payoutPercentage', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 pr-8 rounded-xl border outline-none font-bold ${theme.input}`} />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 font-bold">%</span>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="space-y-6 pt-8 border-t border-slate-800/10">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">Bloqueio Operacional (Stop)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Stop Gain (Wins)</label><input type="number" value={brokerage.stopGainTrades} onChange={e => updateBrokerage('stopGainTrades', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Stop Loss (Losses)</label><input type="number" value={brokerage.stopLossTrades} onChange={e => updateBrokerage('stopLossTrades', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border outline-none font-bold ${theme.input}`} /></div>
                    </div>
                </section>
                <div className="flex flex-col md:flex-row gap-4">
                    <button onClick={onReset} className="flex-1 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all">Limpar Histórico de Operações</button>
                    {trashCount > 0 && (
                        <button onClick={onRestore} className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2">
                            <ArrowPathIcon className="w-4 h-4" /> Restaurar da Lixeira ({trashCount})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ManagementSheetPanel: React.FC<any> = ({ theme, activeBrokerage, isDarkMode, records }) => {
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const [selectedMonth, setSelectedMonth] = useState(() => getLocalMonthString());
    
    // Storage keys based on brokerage and month
    const getStorageKey = (suffix: string) => `ms_${activeBrokerage?.id || 'default'}_${selectedMonth}_${suffix}`;

    const [daysData, setDaysData] = useState<any[]>([]);
    const [bank, setBank] = useState(1000);
    const [stopPercent, setStopPercent] = useState(10);
    const [exchangeRate, setExchangeRate] = useState(5.0);
    const [cycle1, setCycle1] = useState({ e1: 0, e2: 0, s1: 0, s2: 0 });
    const [cycle2, setCycle2] = useState({ e1: 0, e2: 0, s1: 0, s2: 0 });
    const [deposits, setDeposits] = useState<any[]>(Array(10).fill({ date: '', value: 0 }));
    const [withdrawals, setWithdrawals] = useState<any[]>(Array(10).fill({ date: '', value: 0 }));

    // Load data when brokerage or month changes
    useEffect(() => {
        const savedDays = localStorage.getItem(getStorageKey('days'));
        const savedBank = localStorage.getItem(getStorageKey('bank'));
        const savedStop = localStorage.getItem(getStorageKey('stop'));
        const savedExchange = localStorage.getItem(getStorageKey('exchange'));
        const savedCycle1 = localStorage.getItem(getStorageKey('cycle1'));
        const savedCycle2 = localStorage.getItem(getStorageKey('cycle2'));
        const savedDeposits = localStorage.getItem(getStorageKey('deposits'));
        const savedWithdrawals = localStorage.getItem(getStorageKey('withdrawals'));

        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        const currentMonthStr = getLocalMonthString(today);
        const isCurrentMonth = selectedMonth === currentMonthStr;
        const startDay = isCurrentMonth ? today.getDate() : 1;
        const expectedDaysCount = daysInMonth - startDay + 1;

        let initialDays = savedDays ? JSON.parse(savedDays) : Array.from({ length: daysInMonth }, (_, i) => ({
            id: i + 1,
            date: `${String(i + 1).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
            payout: activeBrokerage?.payoutPercentage || 80,
            entry: 0,
            result: 0,
            winCycle1: false,
            lossCycle1: false,
            winCycle2: false,
            lossCycle2: false
        }));

        // Filter to start from today if it's the current month
        if (isCurrentMonth) {
            initialDays = initialDays.filter((d: any) => d.id >= startDay);
        }
        
        // Ensure we have the correct number of days if month changed or if it's current month
        if (initialDays.length !== expectedDaysCount) {
            const adjustedDays = Array.from({ length: expectedDaysCount }, (_, i) => {
                const dayNum = startDay + i;
                const existing = initialDays.find((d: any) => d.id === dayNum);
                return existing || {
                    id: dayNum,
                    date: `${String(dayNum).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
                    payout: activeBrokerage?.payoutPercentage || 80,
                    entry: 0,
                    result: 0,
                    winCycle1: false,
                    lossCycle1: false,
                    winCycle2: false,
                    lossCycle2: false
                };
            });
            setDaysData(adjustedDays);
        } else {
            setDaysData(initialDays);
        }

        setBank(savedBank ? Number(savedBank) : (activeBrokerage?.initialBalance || 1000));
        setStopPercent(savedStop ? Number(savedStop) : 10);
        setExchangeRate(savedExchange ? Number(savedExchange) : 5.0);
        setCycle1(savedCycle1 ? JSON.parse(savedCycle1) : { e1: 0, e2: 0, s1: 0, s2: 0 });
        setCycle2(savedCycle2 ? JSON.parse(savedCycle2) : { e1: 0, e2: 0, s1: 0, s2: 0 });
        setDeposits(savedDeposits ? JSON.parse(savedDeposits) : Array(10).fill({ date: '', value: 0 }));
        setWithdrawals(savedWithdrawals ? JSON.parse(savedWithdrawals) : Array(10).fill({ date: '', value: 0 }));
    }, [activeBrokerage?.id, selectedMonth]);

    const yesterdayBalance = useMemo(() => {
        if (!records || !activeBrokerage) return activeBrokerage?.initialBalance || 0;
        const todayStr = getLocalDateString();
        const pastRecords = records.filter((r: any) => 
            r.brokerageId === activeBrokerage.id && 
            r.id < todayStr
        );
        const profit = pastRecords.reduce((sum: number, r: any) => {
            if (r.recordType === 'day') return sum + r.netProfitUSD;
            if (r.recordType === 'deposit') return sum + r.amountUSD;
            if (r.recordType === 'withdrawal') return sum - r.amountUSD;
            return sum;
        }, 0);
        return (activeBrokerage?.initialBalance || 0) + profit;
    }, [records, activeBrokerage?.id]);

    // Sync with App Records
    useEffect(() => {
        if (!records || !activeBrokerage) return;

        const todayStr = getLocalDateString();
        const todayRecord = records.find((r: any) => r.recordType === 'day' && r.id === todayStr && r.brokerageId === activeBrokerage.id);
        
        // If it's a new day (no trades yet), reset the bank to yesterday's closing balance
        if (!todayRecord) {
            setBank(yesterdayBalance);
            setCycle1({ e1: 0, e2: 0, s1: 0, s2: 0 });
            setCycle2({ e1: 0, e2: 0, s1: 0, s2: 0 });
        }

        const trades = todayRecord?.trades || [];
        const firstTrade = trades[0];
        const secondTrade = trades[1];
        const thirdTrade = trades[2];
        const fourthTrade = trades[3];

        setCycle1(prev => {
            const next = { ...prev, e1: 0, e2: 0, s1: 0, s2: 0 };
            if (firstTrade) {
                next.e1 = firstTrade.entryValue;
                if (secondTrade) {
                    // Heuristic: if 2nd trade > 1st, it's likely a Soros (S1)
                    if (secondTrade.entryValue > firstTrade.entryValue) {
                        next.s1 = secondTrade.entryValue;
                        if (thirdTrade) next.e2 = thirdTrade.entryValue;
                        if (fourthTrade) next.s2 = fourthTrade.entryValue;
                    } else {
                        next.e2 = secondTrade.entryValue;
                        if (thirdTrade) {
                            if (thirdTrade.entryValue > secondTrade.entryValue) next.s1 = thirdTrade.entryValue;
                            else if (fourthTrade) next.s2 = fourthTrade.entryValue;
                        }
                    }
                }
            }
            // Check all fields to ensure we don't skip an update when a trade is deleted
            if (prev.e1 === next.e1 && prev.e2 === next.e2 && prev.s1 === next.s1 && prev.s2 === next.s2) return prev;
            return next;
        });

        setDaysData(prev => prev.map(day => {
            const [d, m] = day.date.split('/');
            const [year, month] = selectedMonth.split('-');
            const dateStr = `${year}-${m}-${d}`;
            
            const record = records.find((r: any) => r.recordType === 'day' && r.id === dateStr && r.brokerageId === activeBrokerage.id);
            
            if (record) {
                const trades = record.trades || [];
                const firstTrade = trades[0];
                
                return {
                    ...day,
                    entry: firstTrade?.entryValue || 0,
                    payout: firstTrade?.payoutPercentage || (dateStr === todayStr ? activeBrokerage.payoutPercentage : day.payout),
                    result: record.netProfitUSD,
                    winCycle1: trades.some((t: any) => t.result === 'win'),
                    lossCycle1: trades.some((t: any) => t.result === 'loss'),
                    hasSoros: trades.some((t: any) => t.isSoros),
                };
            }
            
            // If record not found, reset values for this day in the sheet to stay in sync with dashboard
            return {
                ...day,
                entry: 0,
                result: 0,
                winCycle1: false,
                lossCycle1: false,
                hasSoros: false,
                payout: dateStr === todayStr ? activeBrokerage.payoutPercentage : day.payout
            };
        }));

        // Sync deposits/withdrawals
        const appDeposits = records.filter((r: any) => r.recordType === 'deposit' && r.brokerageId === activeBrokerage.id && r.date.startsWith(selectedMonth));
        const appWithdrawals = records.filter((r: any) => r.recordType === 'withdrawal' && r.brokerageId === activeBrokerage.id && r.date.startsWith(selectedMonth));

        setDeposits(prev => {
            const newDeps = Array(10).fill({ date: '', value: 0 });
            appDeposits.forEach((ad: any, idx: number) => {
                if (idx < 10) newDeps[idx] = { date: ad.displayDate, value: ad.amountUSD };
            });
            return newDeps;
        });

        setWithdrawals(prev => {
            const newWits = Array(10).fill({ date: '', value: 0 });
            appWithdrawals.forEach((aw: any, idx: number) => {
                if (idx < 10) newWits[idx] = { date: aw.displayDate, value: aw.amountUSD };
            });
            return newWits;
        });

    }, [records, activeBrokerage?.id, selectedMonth]);

    // Save data
    useEffect(() => {
        if (daysData.length === 0) return;
        localStorage.setItem(getStorageKey('days'), JSON.stringify(daysData));
        localStorage.setItem(getStorageKey('bank'), bank.toString());
        localStorage.setItem(getStorageKey('stop'), stopPercent.toString());
        localStorage.setItem(getStorageKey('exchange'), exchangeRate.toString());
        localStorage.setItem(getStorageKey('cycle1'), JSON.stringify(cycle1));
        localStorage.setItem(getStorageKey('cycle2'), JSON.stringify(cycle2));
        localStorage.setItem(getStorageKey('deposits'), JSON.stringify(deposits));
        localStorage.setItem(getStorageKey('withdrawals'), JSON.stringify(withdrawals));
    }, [daysData, bank, stopPercent, exchangeRate, cycle1, cycle2, deposits, withdrawals]);

    const updateDay = (id: number, field: string, value: any) => {
        setDaysData((prev: any[]) => prev.map((d: any) => d.id === id ? { ...d, [field]: value } : d));
    };

    const monthRecords = useMemo(() => {
        if (!records || !activeBrokerage) return [];
        return records.filter((r: any) => 
            r.recordType === 'day' && 
            r.brokerageId === activeBrokerage.id && 
            r.id.startsWith(selectedMonth)
        );
    }, [records, activeBrokerage?.id, selectedMonth]);

    const totalProfit = daysData.reduce((acc: number, d: any) => acc + (Number(d.result) || 0), 0);
    const totalWins = monthRecords.reduce((acc: number, r: any) => acc + (r.winCount || 0), 0);
    const totalLosses = monthRecords.reduce((acc: number, r: any) => acc + (r.lossCount || 0), 0);
    const currentBank = bank + totalProfit;

    const cycle1Profit = (Number(cycle1.e1) || 0) + (Number(cycle1.e2) || 0) + (Number(cycle1.s1) || 0) + (Number(cycle1.s2) || 0);
    const cycle2Profit = (Number(cycle2.e1) || 0) + (Number(cycle2.e2) || 0) + (Number(cycle2.s1) || 0) + (Number(cycle2.s2) || 0);

    const totalDeposits = deposits.reduce((acc: number, d: any) => acc + (Number(d.value) || 0), 0);
    const totalWithdrawals = withdrawals.reduce((acc: number, d: any) => acc + (Number(d.value) || 0), 0);

    const months = useMemo(() => {
        const result = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push(getLocalMonthString(d));
        }
        return result;
    }, []);

    return (
        <div className="p-1 md:p-2 space-y-2 w-full mx-auto text-black text-[11px]">
            <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl border border-black/10 shadow-sm">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-black flex items-center gap-2">
                        <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                        Planilha de Gerenciamento
                    </h2>
                    <p className="text-black/60 text-xs font-bold uppercase tracking-widest mt-1">
                        {activeBrokerage?.name} • {selectedMonth}
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-slate-100 border border-black/20 rounded-xl px-4 py-2 text-xs font-black uppercase outline-none focus:border-blue-500 transition-all"
                    >
                        {months.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <button 
                        onClick={() => {
                            if(confirm('Deseja resetar os dados deste mês para esta corretora?')) {
                                localStorage.removeItem(getStorageKey('days'));
                                localStorage.removeItem(getStorageKey('bank'));
                                localStorage.removeItem(getStorageKey('stop'));
                                localStorage.removeItem(getStorageKey('exchange'));
                                localStorage.removeItem(getStorageKey('cycle1'));
                                localStorage.removeItem(getStorageKey('cycle2'));
                                localStorage.removeItem(getStorageKey('deposits'));
                                localStorage.removeItem(getStorageKey('withdrawals'));
                                window.location.reload();
                            }
                        }}
                        className="px-4 py-2 bg-red-500/10 text-red-600 rounded-xl text-[10px] font-black uppercase hover:bg-red-500/20 transition-all"
                    >
                        Resetar Mês
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-1 w-full">
                {/* GESTÃO MENSAL */}
                <div className="col-span-3 space-y-1">
                    <div className="bg-blue-600 text-white font-black text-center py-1.5 uppercase text-xs border border-black rounded-t-lg">Gestão Mensal</div>
                    <div className="grid grid-cols-5 gap-0 border border-black text-[9px] font-black uppercase text-center bg-slate-800 text-white">
                        <div className="border-r border-black py-1">RF</div>
                        <div className="border-r border-black py-1">Data</div>
                        <div className="border-r border-black py-1">Payout</div>
                        <div className="border-r border-black py-1">Entrada</div>
                        <div className="py-1">Lucro/Prej</div>
                    </div>
                    <div className="max-h-[700px] overflow-y-auto border-b border-black custom-scrollbar">
                        {daysData.map((d: any, idx: number) => (
                            <div key={d.id} className={`grid grid-cols-5 gap-0 border-x border-b border-black text-[10px] ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                <div className="border-r border-black bg-yellow-400 text-black font-bold text-center py-0.5 relative">
                                    {d.id}
                                    {d.hasSoros && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-bl-sm" title="Soros realizado" />}
                                </div>
                                <div className="border-r border-black text-black">
                                    <input 
                                        type="text" 
                                        value={d.date} 
                                        onChange={e => updateDay(d.id, 'date', e.target.value)}
                                        className="w-full bg-transparent text-center outline-none font-medium py-0.5"
                                    />
                                </div>
                                <div className="border-r border-black bg-blue-50 text-black">
                                    <input 
                                        type="text" 
                                        value={d.payout + '%'} 
                                        onChange={e => updateDay(d.id, 'payout', e.target.value.replace('%', ''))}
                                        className="w-full bg-transparent text-center outline-none py-0.5"
                                    />
                                </div>
                                <div className="border-r border-black bg-blue-100/30 text-black">
                                    <input 
                                        type="number" 
                                        value={d.entry || ''} 
                                        onChange={e => updateDay(d.id, 'entry', e.target.value)}
                                        className="w-full bg-transparent text-center outline-none font-bold py-0.5"
                                    />
                                </div>
                                <div className={`text-center py-0.5 font-black ${d.result > 0 ? 'bg-green-100 text-green-700' : d.result < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                                    <input 
                                        type="number" 
                                        value={d.result || ''} 
                                        onChange={e => updateDay(d.id, 'result', e.target.value)}
                                        className="w-full bg-transparent text-center outline-none py-0.5"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MIDDLE COLUMN */}
                <div className="col-span-3 space-y-4">
                    {/* GESTÃO DE CAPITAL */}
                    <div className="space-y-1">
                        <div className="bg-slate-800 text-white font-black text-center py-1.5 uppercase text-xs border border-black rounded-t-lg">Gestão de Capital</div>
                        <div className="grid grid-cols-3 border border-black text-[9px] font-black uppercase text-center bg-slate-200 text-black">
                            <div className="border-r border-black py-1">Banca</div>
                            <div className="border-r border-black py-1">Stop</div>
                            <div className="py-1">Valor Stop</div>
                        </div>
                        <div className="grid grid-cols-3 border-x border-b border-black text-[10px]">
                            <div className="border-r border-black bg-white text-black">
                                <input type="number" value={bank} onChange={e => setBank(Number(e.target.value))} className="w-full bg-transparent text-center py-2 outline-none font-bold" />
                            </div>
                            <div className="border-r border-black bg-white text-black">
                                <input type="number" value={stopPercent} onChange={e => setStopPercent(Number(e.target.value))} className="w-full bg-transparent text-center py-2 outline-none font-bold" />
                            </div>
                            <div className="bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                                {currencySymbol} {formatMoney(bank * (stopPercent / 100))}
                            </div>
                        </div>
                    </div>

                    {/* BANCA INICIAL / ATUALIZADA */}
                    <div className="grid grid-cols-1 gap-2">
                        <div className="flex border border-black rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-blue-600 text-white font-black text-[10px] uppercase px-3 py-3 flex-1 border-r border-black flex items-center">Banca Inicial</div>
                            <div className="bg-white text-black font-black text-sm px-4 py-3 flex-1 text-center">{currencySymbol} {formatMoney(bank)}</div>
                        </div>
                        <div className="flex border border-black rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-emerald-600 text-white font-black text-[10px] uppercase px-3 py-3 flex-1 border-r border-black flex items-center">Banca Atualizada</div>
                            <div className="bg-white text-black font-black text-sm px-4 py-3 flex-1 text-center">{currencySymbol} {formatMoney(currentBank)}</div>
                        </div>
                    </div>

                    {/* GESTÃO DE ENTRADAS CICLO 01 */}
                    <div className="space-y-1">
                        <div className="bg-orange-500 text-white font-black text-center py-1.5 uppercase text-[10px] border border-black rounded-t-lg">Gestão de Entradas Ciclo 01</div>
                        <div className="border border-black text-[10px] font-bold rounded-b-lg overflow-hidden">
                            <div className="flex border-b border-black">
                                <div className="w-1/2 bg-orange-50 p-2 border-r border-black text-orange-800">Entrada 01</div>
                                <div className="w-1/2 bg-white"><input type="number" value={cycle1.e1} onChange={e => setCycle1({...cycle1, e1: Number(e.target.value)})} className="w-full h-full outline-none px-2 text-black font-black" /></div>
                            </div>
                            <div className="flex border-b border-black">
                                <div className="w-1/2 bg-orange-50 p-2 border-r border-black text-orange-800">Entrada 02</div>
                                <div className="w-1/2 bg-white"><input type="number" value={cycle1.e2} onChange={e => setCycle1({...cycle1, e2: Number(e.target.value)})} className="w-full h-full outline-none px-2 text-black font-black" /></div>
                            </div>
                            <div className="flex border-b border-black">
                                <div className="w-1/2 bg-emerald-50 p-2 border-r border-black text-emerald-800 flex items-center justify-between">
                                    <span>Entrada 03</span>
                                    <span className="text-[8px] bg-emerald-200 px-1 rounded font-black uppercase">Soros</span>
                                </div>
                                <div className="w-1/2 bg-white"><input type="number" value={cycle1.s1} onChange={e => setCycle1({...cycle1, s1: Number(e.target.value)})} className="w-full h-full outline-none px-2 text-black font-black" /></div>
                            </div>
                            <div className="flex border-b border-black">
                                <div className="w-1/2 bg-emerald-50 p-2 border-r border-black text-emerald-800 flex items-center justify-between">
                                    <span>Entrada 04</span>
                                    <span className="text-[8px] bg-emerald-200 px-1 rounded font-black uppercase">Soros</span>
                                </div>
                                <div className="w-1/2 bg-white"><input type="number" value={cycle1.s2} onChange={e => setCycle1({...cycle1, s2: Number(e.target.value)})} className="w-full h-full outline-none px-2 text-black font-black" /></div>
                            </div>
                            <div className="flex bg-orange-100">
                                <div className="w-1/2 p-2 border-r border-black uppercase text-[9px] font-black text-orange-900">Lucro / Prejuízo</div>
                                <div className={`w-1/2 text-center py-2 font-black ${cycle1Profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{currencySymbol} {formatMoney(cycle1Profit)}</div>
                            </div>
                        </div>
                    </div>

                    {/* GESTÃO DE ENTRADAS CICLO 02 */}
                    <div className="space-y-1">
                        <div className="bg-orange-500 text-white font-black text-center py-1.5 uppercase text-[10px] border border-black rounded-t-lg">Gestão de Entradas Ciclo 02</div>
                        <div className="border border-black text-[10px] font-bold rounded-b-lg overflow-hidden">
                            <div className="flex border-b border-black">
                                <div className="w-1/2 bg-orange-50 p-2 border-r border-black text-orange-800">Entrada 01</div>
                                <div className="w-1/2 bg-white"><input type="number" value={cycle2.e1} onChange={e => setCycle2({...cycle2, e1: Number(e.target.value)})} className="w-full h-full outline-none px-2 text-black font-black" /></div>
                            </div>
                            <div className="flex border-b border-black">
                                <div className="w-1/2 bg-orange-50 p-2 border-r border-black text-orange-800">Entrada 02</div>
                                <div className="w-1/2 bg-white"><input type="number" value={cycle2.e2} onChange={e => setCycle2({...cycle2, e2: Number(e.target.value)})} className="w-full h-full outline-none px-2 text-black font-black" /></div>
                            </div>
                            <div className="flex border-b border-black">
                                <div className="w-1/2 bg-emerald-50 p-2 border-r border-black text-emerald-800 flex items-center justify-between">
                                    <span>Entrada 03</span>
                                    <span className="text-[8px] bg-emerald-200 px-1 rounded font-black uppercase">Soros</span>
                                </div>
                                <div className="w-1/2 bg-white"><input type="number" value={cycle2.s1} onChange={e => setCycle2({...cycle2, s1: Number(e.target.value)})} className="w-full h-full outline-none px-2 text-black font-black" /></div>
                            </div>
                            <div className="flex border-b border-black">
                                <div className="w-1/2 bg-emerald-50 p-2 border-r border-black text-emerald-800 flex items-center justify-between">
                                    <span>Entrada 04</span>
                                    <span className="text-[8px] bg-emerald-200 px-1 rounded font-black uppercase">Soros</span>
                                </div>
                                <div className="w-1/2 bg-white"><input type="number" value={cycle2.s2} onChange={e => setCycle2({...cycle2, s2: Number(e.target.value)})} className="w-full h-full outline-none px-2 text-black font-black" /></div>
                            </div>
                            <div className="flex bg-orange-100">
                                <div className="w-1/2 p-2 border-r border-black uppercase text-[9px] font-black text-orange-900">Lucro / Prejuízo</div>
                                <div className={`w-1/2 text-center py-2 font-black ${cycle2Profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{currencySymbol} {formatMoney(cycle2Profit)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CICLOS WIN/LOSS */}
                <div className="col-span-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="bg-slate-800 text-white font-black text-center py-1.5 uppercase text-[9px] border border-black rounded-t-lg">Primeiro Ciclo</div>
                        <div className="grid grid-cols-2 border border-black text-[8px] font-black uppercase text-center bg-slate-200 text-black">
                            <div className="border-r border-black py-1">Win</div>
                            <div className="py-1">Loss</div>
                        </div>
                        <div className="max-h-[700px] overflow-y-auto border-b border-black custom-scrollbar">
                            {daysData.map((d: any) => (
                                <div key={d.id} className="grid grid-cols-2 border-x border-b border-black h-6">
                                    <div 
                                        onClick={() => updateDay(d.id, 'winCycle1', !d.winCycle1)}
                                        className={`border-r border-black cursor-pointer transition-all flex items-center justify-center ${d.winCycle1 ? 'bg-emerald-500' : 'bg-white hover:bg-emerald-50'}`}
                                    >
                                        {d.winCycle1 && <CheckIcon className="w-4 h-4 text-white" />}
                                    </div>
                                    <div 
                                        onClick={() => updateDay(d.id, 'lossCycle1', !d.lossCycle1)}
                                        className={`cursor-pointer transition-all flex items-center justify-center ${d.lossCycle1 ? 'bg-red-500' : 'bg-white hover:bg-red-50'}`}
                                    >
                                        {d.lossCycle1 && <div className="w-3 h-0.5 bg-white rounded-full" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="bg-slate-800 text-white font-black text-center py-1.5 uppercase text-[9px] border border-black rounded-t-lg">Segundo Ciclo</div>
                        <div className="grid grid-cols-2 border border-black text-[8px] font-black uppercase text-center bg-slate-200 text-black">
                            <div className="border-r border-black py-1">Win</div>
                            <div className="py-1">Loss</div>
                        </div>
                        <div className="max-h-[700px] overflow-y-auto border-b border-black custom-scrollbar">
                            {daysData.map((d: any) => (
                                <div key={d.id} className="grid grid-cols-2 border-x border-b border-black h-6">
                                    <div 
                                        onClick={() => updateDay(d.id, 'winCycle2', !d.winCycle2)}
                                        className={`border-r border-black cursor-pointer transition-all flex items-center justify-center ${d.winCycle2 ? 'bg-emerald-500' : 'bg-white hover:bg-emerald-50'}`}
                                    >
                                        {d.winCycle2 && <CheckIcon className="w-4 h-4 text-white" />}
                                    </div>
                                    <div 
                                        onClick={() => updateDay(d.id, 'lossCycle2', !d.lossCycle2)}
                                        className={`cursor-pointer transition-all flex items-center justify-center ${d.lossCycle2 ? 'bg-red-500' : 'bg-white hover:bg-red-50'}`}
                                    >
                                        {d.lossCycle2 && <div className="w-3 h-0.5 bg-white rounded-full" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-span-3 space-y-4">
                    {/* PLACAR MENSAL */}
                    <div className="space-y-1">
                        <div className="bg-slate-800 text-white font-black text-center py-1.5 uppercase text-[10px] border border-black rounded-t-lg">Gestão de Placar Mensal</div>
                        <div className="grid grid-cols-2 border border-black h-20 rounded-b-lg overflow-hidden shadow-sm">
                            <div className="bg-emerald-500 text-white flex flex-col items-center justify-center border-r border-black">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Win</span>
                                <span className="text-3xl font-black">{totalWins}</span>
                            </div>
                            <div className="bg-red-500 text-white flex flex-col items-center justify-center">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Loss</span>
                                <span className="text-3xl font-black">{totalLosses}</span>
                            </div>
                        </div>
                    </div>

                    {/* LUCRO MENSAL */}
                    <div className="space-y-1">
                        <div className="bg-slate-800 text-white font-black text-center py-1.5 uppercase text-[10px] border border-black rounded-t-lg">Lucro / Prejuízo Mensal</div>
                        <div className="bg-white border border-black h-20 flex items-center justify-center rounded-b-lg shadow-sm">
                            <span className={`text-3xl font-black ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {totalProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(totalProfit)}
                            </span>
                        </div>
                    </div>

                    {/* RELOGIO */}
                    <div className="space-y-1">
                        <div className="bg-blue-600 text-black font-black text-center py-1.5 uppercase text-[10px] border border-black rounded-t-lg">Relógio Operacional</div>
                        <div className="bg-blue-50 text-blue-800 border border-black h-20 flex items-center justify-center font-black text-2xl rounded-b-lg shadow-sm">
                            {new Date().toLocaleTimeString('pt-BR')}
                        </div>
                    </div>

                    {/* DEPOSITOS / SAQUES */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="bg-emerald-600 text-white font-black text-center py-1.5 uppercase text-[9px] border border-black rounded-t-lg">Depósitos</div>
                            <div className="grid grid-cols-2 border border-black text-[8px] font-black uppercase text-center bg-slate-200 text-black">
                                <div className="border-r border-black py-1">Data</div>
                                <div className="py-1">Valor</div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto border-b border-black custom-scrollbar">
                                {deposits.map((d: any, i: number) => (
                                    <div key={i} className="grid grid-cols-2 border-x border-b border-black text-[9px]">
                                        <input 
                                            type="text" 
                                            value={d.date} 
                                            onChange={e => {
                                                const newD = [...deposits];
                                                newD[i] = { ...newD[i], date: e.target.value };
                                                setDeposits(newD);
                                            }}
                                            className="w-full bg-white text-black outline-none border-r border-black px-1 py-1"
                                        />
                                        <input 
                                            type="number" 
                                            value={d.value || ''} 
                                            onChange={e => {
                                                const newD = [...deposits];
                                                newD[i] = { ...newD[i], value: Number(e.target.value) };
                                                setDeposits(newD);
                                            }}
                                            className="w-full bg-white text-black outline-none px-1 py-1 font-bold"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex bg-emerald-50 border border-black text-[9px] font-black p-2 rounded-b-lg">
                                <div className="flex-1 text-emerald-900">Total</div>
                                <div className="text-emerald-700">{currencySymbol} {formatMoney(totalDeposits)}</div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="bg-red-600 text-white font-black text-center py-1.5 uppercase text-[9px] border border-black rounded-t-lg">Saques</div>
                            <div className="grid grid-cols-2 border border-black text-[8px] font-black uppercase text-center bg-slate-200 text-black">
                                <div className="border-r border-black py-1">Data</div>
                                <div className="py-1">Valor</div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto border-b border-black custom-scrollbar">
                                {withdrawals.map((w: any, i: number) => (
                                    <div key={i} className="grid grid-cols-2 border-x border-b border-black text-[9px]">
                                        <input 
                                            type="text" 
                                            value={w.date} 
                                            onChange={e => {
                                                const newW = [...withdrawals];
                                                newW[i] = { ...newW[i], date: e.target.value };
                                                setWithdrawals(newW);
                                            }}
                                            className="w-full bg-white text-black outline-none border-r border-black px-1 py-1"
                                        />
                                        <input 
                                            type="number" 
                                            value={w.value || ''} 
                                            onChange={e => {
                                                const newW = [...withdrawals];
                                                newW[i] = { ...newW[i], value: Number(e.target.value) };
                                                setWithdrawals(newW);
                                            }}
                                            className="w-full bg-white text-black outline-none px-1 py-1 font-bold"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex bg-red-50 border border-black text-[9px] font-black p-2 rounded-b-lg">
                                <div className="flex-1 text-red-900">Total</div>
                                <div className="text-red-700">{currencySymbol} {formatMoney(totalWithdrawals)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
        </div>
    );
};

export default App;
