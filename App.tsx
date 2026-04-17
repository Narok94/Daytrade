
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    ChevronDownIcon, UsersIcon, PauseIcon, KeyIcon, FunnelIcon, ArrowDownTrayIcon,
    EyeIcon, EyeSlashIcon, CalendarIcon, ShieldCheckIcon
} from './components/icons';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import CountUp from 'react-countup';
import { Header } from './components/Header';
import { NeuralAnalysis } from './components/NeuralAnalysis';
import toast, { Toaster } from 'react-hot-toast';

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
        bg: isDarkMode ? 'bg-[#0b0e14]' : 'bg-zinc-100',
        text: isDarkMode ? 'text-slate-50' : 'text-zinc-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-zinc-500',
        card: isDarkMode ? 'bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl' : 'bg-white border-zinc-200 shadow-sm',
        input: isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-[#6366f1]/50 focus:ring-1 focus:ring-[#6366f1]/50' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400',
        border: isDarkMode ? 'border-white/10' : 'border-zinc-200',
        sidebar: isDarkMode ? 'bg-[#0b0e14] border-r border-white/10' : 'bg-zinc-50 border-r border-zinc-200',
        header: isDarkMode ? 'bg-[#0b0e14]/80 backdrop-blur-md' : 'bg-zinc-50/80 backdrop-blur-md',
        navActive: isDarkMode ? 'bg-[#6366f1]/20 text-[#6366f1] shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-indigo-50 text-indigo-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-[#6366f1] hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50',
        accentSuccess: 'text-[#22c55e] drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]',
        accentError: 'text-[#ef4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]',
        accentAction: 'bg-[#6366f1] hover:bg-[#4f46e5] shadow-[0_0_20px_rgba(99,102,241,0.3)]',
    }), [isDarkMode]);
};

// --- Components ---
const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-white/5 rounded-2xl ${className}`} />
);

const GlassCard: React.FC<{ children: React.ReactNode; className?: string; theme: any }> = ({ children, className = '', theme }) => (
    <div className={`p-6 rounded-3xl ${theme.card} ${className}`}>
        {children}
    </div>
);

const SectionTitle: React.FC<{ title: string; subtitle?: string; icon?: any; theme: any }> = ({ title, subtitle, icon: Icon, theme }) => (
    <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
            {Icon && <Icon className="w-5 h-5 text-[#6366f1]" />}
            <h3 className={`text-sm font-black uppercase tracking-[0.2em] opacity-80 ${theme.text}`}>{title}</h3>
        </div>
        {subtitle && <p className={`text-[10px] font-medium ${theme.textMuted}`}>{subtitle}</p>}
    </div>
);

const ActionButton: React.FC<{ 
    children: React.ReactNode; 
    onClick?: () => void; 
    className?: string; 
    variant?: 'primary' | 'success' | 'danger' | 'ghost';
    disabled?: boolean;
    icon?: any;
}> = ({ children, onClick, className = '', variant = 'primary', disabled, icon: Icon }) => {
    const variants = {
        primary: 'bg-[#6366f1] text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-[#4f46e5]',
        success: 'bg-[#22c55e] text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-[#16a34a]',
        danger: 'bg-[#ef4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-[#dc2626]',
        ghost: 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
    };

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`
                flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest
                transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]} ${className}
            `}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {children}
        </button>
    );
};

// --- AI Analysis Panel (Advanced Analysis v4 - Pro Edition) ---
const AIAnalysisPanel: React.FC<any> = ({ theme, isDarkMode, records, selectedDate, activeBrokerage }) => {
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

    const dateStr = getLocalDateString(selectedDate);
    const dailyRecord = records.find((r: any) => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id && r.id === dateStr);
    const trades = dailyRecord?.trades || [];
    const netProfit = dailyRecord?.netProfitUSD || 0;

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
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const compressed = await compressImage(selectedImage, 1000);
            
            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const prompt = `HORÁRIO ATUAL: ${timeString}. 
            VOCÊ É UM ROBÔ AGRESSIVO DE SINAIS (M1).
            Sua tarefa é encontrar uma entrada de COMPRA (CALL) ou VENDA (PUT) AGORA.
            
            Analise o gráfico:
            1. TENDÊNCIA: Identifique a direção imediata.
            2. VELAS: Procure por força (velas grandes) ou exaustão (pavios longos).
            3. SUPORTE/RESISTÊNCIA: Onde o preço vai bater e voltar ou romper?

            REGRA DE OURO: Você DEVE fornecer um sinal de CALL ou PUT. 
            Não hesite. Se houver o mínimo de tendência ou padrão, escolha CALL ou PUT.

            Retorne um JSON com:
            1. asset: Par de moedas.
            2. recommendation: CALL ou PUT.
            3. confidence: 0-100.
            4. reasoning: Justificativa técnica rápida.
            5. expiration: M1.
            6. trend: ALTA ou BAIXA.
            7. precision: ALTA ou MEDIA.
            8. volume: ALTO ou MEDIO.
            9. timeframe: M1.
            10. candleRemainingSeconds: Segundos para fechar a vela atual.`;

            const config = {};

            const result = await withRetry(async () => {
                const res = await fetch('/api/ai-analysis', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        imageData: compressed,
                        prompt,
                        systemInstruction: "Você é um especialista em escalpamento agressivo em M1. Retorne APENAS JSON."
                    })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Erro na análise de IA.");
                }

                return await res.json();
            });
            
            const entryDate = new Date(now);
            // Se faltar menos de 15 segundos, pegamos a vela seguinte à próxima para dar tempo do usuário agir
            // Caso contrário, pegamos a próxima vela imediata
            if (result.candleRemainingSeconds < 15) {
                entryDate.setMinutes(now.getMinutes() + 2);
            } else {
                entryDate.setMinutes(now.getMinutes() + 1);
            }
            entryDate.setSeconds(0, 0);
            result.entryTime = entryDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            setProgress(p => ({ ...p, result: 100 }));
            await new Promise(r => setTimeout(r, 500));
            setAnalysisResult(result);
            toast.success("Análise concluída com sucesso!");
        } catch (err: any) {
            console.error("AI Analysis Error:", err);
            setError(err.message || "Erro na análise de IA. Verifique sua conexão.");
            toast.error(err.message || "Falha na análise de IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const [countdown, setCountdown] = useState<number | null>(null);

    useEffect(() => {
        let timer: any;
        if (analysisResult && analysisResult.recommendation !== 'AGUARDAR') {
            timer = setInterval(() => {
                const now = new Date();
                const [hour, minute] = analysisResult.entryTime.split(':').map(Number);
                const target = new Date();
                target.setHours(hour, minute, 0, 0);
                if (target.getTime() < now.getTime() - 30000) target.setDate(target.getDate() + 1);
                const diff = Math.floor((target.getTime() - now.getTime()) / 1000);
                if (diff > 0) setCountdown(diff);
                else setCountdown(null);
            }, 1000);
        } else {
            setCountdown(null);
        }
        return () => clearInterval(timer);
    }, [analysisResult]);

    if (isAnalyzing) {
        return <NeuralAnalysis progress={progress} theme={theme} />;
    }

    if (analysisResult) {
        return (
            <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
                <GlassCard theme={theme} className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <SectionTitle title="Resultado da Análise" subtitle="Recomendações técnicas" icon={CheckCircleIcon} theme={theme} />
                        <button onClick={() => setAnalysisResult(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div className="p-8 rounded-[2.5rem] bg-[#00D1FF]/10 border border-[#00D1FF]/20 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00D1FF]/40 to-transparent animate-pulse" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Recomendação</p>
                            <h3 className={`text-7xl font-black tracking-tighter mb-2 ${
                                analysisResult.recommendation === 'CALL' ? 'text-[#00D1FF] drop-shadow-[0_0_15px_rgba(0,209,255,0.5)]' : 
                                analysisResult.recommendation === 'PUT' ? 'text-[#ef4444] drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-slate-400'
                            }`}>
                                {analysisResult.recommendation === 'CALL' ? 'COMPRA' : analysisResult.recommendation === 'PUT' ? 'VENDA' : 'AGUARDAR'}
                            </h3>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-xs font-black uppercase text-white tracking-widest">{analysisResult.asset}</span>
                                <div className="w-1.5 h-1.5 bg-[#00D1FF] rounded-full animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{analysisResult.timeframe}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Horário de Entrada</p>
                                <p className="text-4xl font-black text-white tracking-widest">{analysisResult.entryTime}</p>
                                {countdown !== null && (
                                    <p className="text-[10px] font-black text-[#00D1FF] animate-pulse mt-2 uppercase tracking-widest">Entre em: {countdown}s</p>
                                )}
                            </div>
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Confiança</p>
                                <p className="text-4xl font-black text-[#22c55e]">{analysisResult.confidence}%</p>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-3">
                                    <div className="h-full bg-[#22c55e]" style={{ width: `${analysisResult.confidence}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button 
                                onClick={() => setShowDetailed(!showDetailed)}
                                className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all active:scale-[0.98]"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logs Técnicos</span>
                                <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${showDetailed ? 'rotate-180' : ''}`} />
                            </button>
                            {showDetailed && (
                                <div className="p-6 bg-white/5 rounded-2xl text-xs text-slate-400 leading-relaxed font-medium border border-white/5 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex gap-2 mb-3">
                                        <span className="text-[#00D1FF] font-black tracking-widest">[IA_CORE]</span>
                                        <span className="text-slate-300">Analisando padrões de price action...</span>
                                    </div>
                                    <p className="italic opacity-80">{analysisResult.reasoning}</p>
                                </div>
                            )}
                        </div>

                        <ActionButton variant="primary" className="w-full h-16" onClick={() => { setAnalysisResult(null); setSelectedImage(null); }} icon={ArrowPathIcon}>
                            Nova Análise
                        </ActionButton>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
            <GlassCard theme={theme} className="animate-in fade-in duration-500">
                <SectionTitle title="Análise IA" subtitle="Envie um print do seu gráfico" icon={SparklesIcon} theme={theme} />
                
                {!selectedImage ? (
                    <div className="space-y-8">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[3rem] p-12 bg-white/5 backdrop-blur-md space-y-10 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00D1FF]/40 to-transparent animate-pulse" />
                            
                            <div className="w-28 h-28 rounded-[2rem] bg-[#00D1FF]/10 border border-[#00D1FF]/20 flex items-center justify-center text-[#00D1FF] shadow-[0_0_50px_rgba(0,209,255,0.1)] group-hover:scale-110 transition-transform duration-500">
                                <PhotoIcon className="w-14 h-14" />
                            </div>
                            
                            <div className="text-center space-y-4">
                                <h3 className="text-3xl font-black uppercase tracking-tight text-white">Análise IA</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Envie um print do seu gráfico para análise</p>
                            </div>
                            
                            <div className="w-full grid grid-cols-2 gap-4">
                                <label className="py-6 bg-gradient-to-br from-[#00D1FF] to-[#00A3FF] hover:brightness-110 text-[#050a1f] rounded-2xl flex flex-col items-center justify-center gap-3 font-black text-[10px] uppercase cursor-pointer transition-all shadow-[0_0_20px_rgba(0,209,255,0.3)] active:scale-95">
                                    <CameraIcon className="w-7 h-7" /> Câmera
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                                </label>
                                <label className="py-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex flex-col items-center justify-center gap-3 font-black text-[10px] uppercase cursor-pointer transition-all border border-white/10 active:scale-95">
                                    <PhotoIcon className="w-7 h-7" /> Galeria
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#00D1FF]/10 flex items-center justify-center text-[#00D1FF] shrink-0">
                                <InformationCircleIcon className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest font-black">
                                Para melhores resultados, certifique-se de que o gráfico mostre claramente o preço, o timer da vela e pelo menos 30-50 períodos de histórico.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-[#00D1FF]/30 bg-white/5 shadow-2xl group">
                            <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14]/80 to-transparent pointer-events-none" />
                            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-3 bg-black/50 backdrop-blur-md rounded-2xl text-white hover:bg-red-500 transition-all active:scale-90">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <ActionButton variant="primary" className="w-full h-16 bg-[#00D1FF] text-[#050a1f] shadow-[0_0_30px_rgba(0,209,255,0.4)] hover:bg-[#00A3FF]" onClick={runAIAnalysis} icon={SparklesIcon}>
                                Iniciar Análise Neural
                            </ActionButton>
                            <ActionButton variant="ghost" className="w-full h-16" onClick={() => setSelectedImage(null)} icon={ArrowPathIcon}>
                                Trocar Imagem
                            </ActionButton>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};


// --- App Root Logic ---
const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('hrk_isDarkMode');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
        const saved = localStorage.getItem('hrk_isPrivacyMode');
        return saved !== null ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('hrk_isDarkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    useEffect(() => {
        localStorage.setItem('hrk_isPrivacyMode', JSON.stringify(isPrivacyMode));
    }, [isPrivacyMode]);

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
        const suggestedValue = activeBrokerage.entryValue;
        setCustomEntryValue(String(suggestedValue));
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
                const netProfitUSD = Number(r.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0).toFixed(2));
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

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/health-check');
                if (res.ok) setServerStatus('online');
                else setServerStatus('offline');
            } catch (e) {
                setServerStatus('offline');
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const response = await fetch(`/api/get-data?_=${Date.now()}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Gestão Profissional', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD', dailyGoalMode: 'percentage', dailyGoalValue: 3 }];
                const recalibratedRecords = recalibrateAll(data.records || [], loadedBrokerages);
                setBrokerages(loadedBrokerages); 
                setRecords(recalibratedRecords); 
                setGoals(data.goals || []);
                
                // Load trash from localStorage as a local safety net
                const localTrash = localStorage.getItem(`trash_${user.id}`);
                if (localTrash) {
                    try { setTrash(JSON.parse(localTrash)); } catch(e) {}
                }
            } else if (response.status === 401 || response.status === 403) {
                onLogout(); 
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [user.id, recalibrateAll, onLogout]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveData = useCallback(async () => {
        setSavingStatus('saving');
        try {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const payload = { 
                brokerages: latestDataRef.current.brokerages, 
                records: latestDataRef.current.records, 
                goals: latestDataRef.current.goals 
            };
            const response = await fetch('/api/save-data', { 
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }, 
                body: JSON.stringify(payload) 
            });
            if (response.ok) { setSavingStatus('saved'); setTimeout(() => setSavingStatus('idle'), 2000); }
            else if (response.status === 401 || response.status === 403) {
                onLogout();
            }
        } catch (error: any) { setSavingStatus('error'); }
    }, [onLogout]);

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
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" /></div>;

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

    if (activeBrokerage?.dailyGoalValue && activeBrokerage.dailyGoalValue > 0) {
        if (activeBrokerage.dailyGoalMode === 'percentage') {
            activeDailyGoal = (startBalDashboard * (activeBrokerage.dailyGoalValue / 100));
        } else {
            activeDailyGoal = activeBrokerage.dailyGoalValue;
        }
    } else if (customGoal && customGoal.deadline) {
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
        activeDailyGoal = (startBalDashboard * 0.03 || 1);
    }

    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    return (
        <div className={`flex h-screen overflow-hidden overflow-x-hidden ${theme.bg} ${theme.text}`}>
            <Toaster position="top-right" toastOptions={{ 
                style: { 
                    background: isDarkMode ? '#1e293b' : '#ffffff', 
                    color: isDarkMode ? '#f8fafc' : '#0f172a',
                    borderRadius: '16px',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                    fontSize: '12px',
                    fontWeight: 'bold'
                } 
            }} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    user={user}
                    serverStatus={serverStatus}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onLogout={onLogout}
                    brokerages={brokerages}
                    activeBrokerageId={activeBrokerageId}
                    setActiveBrokerageId={setActiveBrokerageId}
                    brokerageBalances={brokerageBalances}
                    formatMoney={formatMoney}
                    theme={theme}
                    savingStatus={savingStatus}
                    isDarkMode={isDarkMode}
                />
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
                            isPrivacyMode={isPrivacyMode}
                            setIsPrivacyMode={setIsPrivacyMode}
                            dailyGoalTarget={activeDailyGoal} 
                            isLoading={isLoading}
                            records={records}
                        />
                    )}
                    {activeTab === 'ai-analysis' && (
                        <AIAnalysisPanel 
                            theme={theme} 
                            isDarkMode={isDarkMode} 
                            records={records}
                            selectedDate={selectedDate}
                            activeBrokerage={activeBrokerage}
                        />
                    )}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'history' && <HistoryPanel isDarkMode={isDarkMode} isPrivacyMode={isPrivacyMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} records={records} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'management-sheet' && <ManagementSheetPanel theme={theme} activeBrokerage={activeBrokerage} isDarkMode={isDarkMode} records={records} selectedDate={selectedDate} setSelectedDate={setSelectedDate} isPrivacyMode={isPrivacyMode} />}
                    {activeTab === 'admin' && user.isAdmin && <AdminPanel theme={theme} adminId={user.id} />}
                {activeTab === 'settings' && (
                    <SettingsPanel 
                        theme={theme} 
                        brokerage={activeBrokerage} 
                        setBrokerages={setBrokerages} 
                        onReset={handleReset} 
                        trashCount={trash.length}
                        onRestore={restoreTrash}
                        onSave={saveData}
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
                        addTransaction={addTransaction}
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

const AdminPanel: React.FC<{ theme: any, adminId: number }> = ({ theme, adminId }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [registrationKeyword, setRegistrationKeyword] = useState('');
    const [isUpdatingKeyword, setIsUpdatingKeyword] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const fetchSystemSettings = async () => {
        try {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const res = await fetch(`/api/admin/get-system-settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.registration_keyword) setRegistrationKeyword(data.registration_keyword);
        } catch (error) {
            console.error('Error fetching system settings:', error);
        }
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const res = await fetch(`/api/admin/get-users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.users) setUsers(data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchSystemSettings();
    }, [adminId]);

    const updateRegistrationKeyword = async () => {
        if (!registrationKeyword) {
            setMessage({ text: 'A palavra-chave não pode ser vazia', type: 'error' });
            return;
        }
        setIsUpdatingKeyword(true);
        try {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const res = await fetch('/api/admin/update-system-settings', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ key: 'registration_keyword', value: registrationKeyword })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: 'Palavra-chave atualizada com sucesso', type: 'success' });
            } else {
                setMessage({ text: data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Erro ao atualizar palavra-chave', type: 'error' });
        } finally {
            setIsUpdatingKeyword(false);
        }
    };

    const togglePause = async (targetUserId: number, currentPaused: boolean) => {
        try {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const res = await fetch('/api/admin/toggle-pause', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId, isPaused: !currentPaused })
            });
            const data = await res.json();
            if (res.ok) {
                setUsers(users.map(u => u.id === targetUserId ? { ...u, isPaused: !currentPaused } : u));
                setMessage({ text: data.message, type: 'success' });
            } else {
                setMessage({ text: data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Erro ao alterar status', type: 'error' });
        }
    };

    const handleResetPassword = async (targetUserId: number) => {
        if (!newPassword || newPassword.length < 4) {
            setMessage({ text: 'Senha deve ter pelo menos 4 caracteres', type: 'error' });
            return;
        }
        try {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const res = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: data.message, type: 'success' });
                setResettingUserId(null);
                setNewPassword('');
            } else {
                setMessage({ text: data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Erro ao resetar senha', type: 'error' });
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black italic tracking-tight text-white">Painel Admin</h2>
                    <p className="text-xs md:text-sm text-slate-400 font-medium">Gerenciamento de usuários e sistema</p>
                </div>
                <button onClick={fetchUsers} className="p-3 rounded-2xl bg-white/5 text-[#6366f1] hover:bg-white/10 transition-all active:scale-90 border border-white/5">
                    <ArrowPathIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20' : 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'}`}>
                    {message.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
                    <span className="text-sm font-bold">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100"><XMarkIcon className="w-4 h-4" /></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <GlassCard theme={theme} className="lg:col-span-1">
                    <SectionTitle title="Convite de Novos Membros" icon={KeyIcon} theme={theme} />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
                        Defina a palavra-chave obrigatória para o registro de novos usuários.
                    </p>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Palavra-chave</label>
                            <input
                                type="text"
                                value={registrationKeyword}
                                onChange={(e) => setRegistrationKeyword(e.target.value)}
                                placeholder="Ex: CONVITE2024"
                                className={`w-full h-14 px-5 rounded-2xl border outline-none font-bold text-sm transition-all ${theme.input}`}
                            />
                        </div>
                        <ActionButton
                            variant="primary"
                            onClick={updateRegistrationKeyword}
                            disabled={isUpdatingKeyword}
                            className="w-full h-14"
                            icon={CheckCircleIcon}
                        >
                            {isUpdatingKeyword ? 'Atualizando...' : 'Atualizar Chave'}
                        </ActionButton>
                    </div>
                </GlassCard>

                <GlassCard theme={theme} className="lg:col-span-2 !p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <SectionTitle title="Usuários Registrados" icon={UsersIcon} theme={theme} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Criado em</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Último Acesso</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#6366f1]/10 flex items-center justify-center text-[#6366f1] font-black text-xs border border-[#6366f1]/20">
                                                    {u.username.slice(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-slate-200">{u.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.isPaused ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20' : 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'}`}>
                                                {u.isPaused ? 'Pausado' : 'Ativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.isAdmin ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border border-white/5'}`}>
                                                {u.isAdmin ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-slate-500 font-bold">
                                            {new Date((u as any).createdAt || Date.now()).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-[#a5b4fc] font-bold">
                                            {u.lastLoginAt ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(u.lastLoginAt).toLocaleDateString('pt-BR')}</span>
                                                    <span className="text-[9px] opacity-70">{new Date(u.lastLoginAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            ) : (
                                                <span className="opacity-30">---</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => togglePause(u.id, !!u.isPaused)}
                                                    title={u.isPaused ? 'Despausar' : 'Pausar'}
                                                    className={`p-2.5 rounded-xl transition-all active:scale-90 ${u.isPaused ? 'bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20' : 'bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20'}`}
                                                >
                                                    {u.isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                                                </button>
                                                <button 
                                                    onClick={() => setResettingUserId(u.id)}
                                                    title="Resetar Senha"
                                                    className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all active:scale-90"
                                                >
                                                    <KeyIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </div>

            {resettingUserId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <GlassCard theme={theme} className="w-full max-w-md !p-8 border-[#6366f1]/30 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                <KeyIcon className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic text-white">Resetar Senha</h3>
                                <p className="text-xs text-slate-400 font-medium">Defina uma nova senha para o usuário</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nova Senha</label>
                                <input 
                                    type="password" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 4 caracteres"
                                    className={`w-full h-14 px-5 rounded-2xl border outline-none font-bold text-sm transition-all ${theme.input}`}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => {setResettingUserId(null); setNewPassword('');}}
                                    className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-white transition-all"
                                >
                                    Cancelar
                                </button>
                                <ActionButton 
                                    variant="primary"
                                    onClick={() => handleResetPassword(resettingUserId)}
                                    className="flex-1 h-14"
                                    icon={CheckCircleIcon}
                                >
                                    Confirmar
                                </ActionButton>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

// Sub-components like DashboardPanel, CompoundInterestPanel, etc., should be defined correctly here if not in separate files.
// For brevity, assuming they are within this file but omitted in the update to focus on the change.
// (I will keep the logic from the previous provided file structure)

const DashboardPanel: React.FC<any> = ({ activeBrokerage, updateBrokerageSetting, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, addTransaction, deleteTransaction, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, transactionsForSelectedDay, startBalanceForSelectedDay, currentBalanceForDashboard, isDarkMode, isPrivacyMode, setIsPrivacyMode, dailyGoalTarget, isLoading, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const [isNextTradeSoros, setIsNextTradeSoros] = useState(false);
    const [entryMode, setEntryMode] = useState<'fixed' | 'percentage'>(activeBrokerage?.entryMode || 'percentage');

    useEffect(() => {
        if (activeBrokerage?.entryMode) {
            setEntryMode(activeBrokerage.entryMode);
        }
    }, [activeBrokerage?.entryMode]);

    if (!activeBrokerage) return <div className="p-8 text-center opacity-50">Carregando dados da corretora...</div>;

    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = currentBalanceForDashboard;

    const entryValueNum = entryMode === 'fixed' 
        ? (parseFloat(customEntryValue) || 0)
        : (currentBalance * ((parseFloat(customEntryValue) || 0) / 100));

    const handlePayoutChange = (val: string) => {
        setCustomPayout(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            updateBrokerageSetting(activeBrokerage.id, 'payoutPercentage', num);
        }
    };

    const handleQuickAdd = (type: 'win' | 'loss') => {
         const payout = parseFloat(customPayout) || 0;
         const qty = parseInt(quantity) || 1;
         
         if (entryValueNum <= 0) {
             toast.error("O valor da entrada deve ser maior que zero.");
             return;
         }
         if (payout < 0 || payout > 100) {
             toast.error("O payout deve estar entre 0 e 100%.");
             return;
         }

         if (type === 'win') addRecord(qty, 0, entryValueNum, payout, isNextTradeSoros);
         else addRecord(0, qty, entryValueNum, payout, isNextTradeSoros);
         
         setQuantity('1');
         setIsNextTradeSoros(false);
         toast.success(`Operação ${type.toUpperCase()} adicionada!`);
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

    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) : '0.0';
    
    const dailyGoalPercent = dailyGoalTarget > 0 ? (currentProfit / dailyGoalTarget) * 100 : 0;

    const payoutNum = parseFloat(customPayout) || 0;
    const qtyNum = parseInt(quantity) || 1;
    const estimatedProfit = entryValueNum * (payoutNum / 100) * qtyNum;
    const estimatedLoss = entryValueNum * qtyNum;

    const stopWinReached = activeBrokerage.stopGainTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades;
    const stopLossReached = activeBrokerage.stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades;

    const kpis = [
        { label: 'Banca Atual', val: currentBalance, isCurrency: true, icon: PieChartIcon, color: 'text-white' },
        { label: 'Lucro Diário', val: currentProfit, isCurrency: true, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]' },
        { label: 'Meta Diária', val: dailyGoalTarget, isCurrency: true, subVal: `${Math.min(100, dailyGoalPercent).toFixed(0)}% Alcançado`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-[#22c55e]' : 'text-[#6366f1]' },
        { label: 'Win Rate', val: parseFloat(winRate), isPercent: true, icon: TrophyIcon, color: 'text-purple-400' },
    ];

    // Chart Data
    const chartData = useMemo(() => {
        const brokerageRecords = records.filter((r: any) => r.brokerageId === activeBrokerage?.id);
        const sorted = [...brokerageRecords].sort((a, b) => {
            const dateA = a.recordType === 'day' ? a.id : a.date;
            const dateB = b.recordType === 'day' ? b.id : b.date;
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            return (a.timestamp || 0) - (b.timestamp || 0);
        });

        return sorted.slice(-15).map(r => {
            const balance = r.recordType === 'day' ? r.endBalanceUSD : (r as TransactionRecord).runningBalanceUSD || 0;
            return {
                date: r.recordType === 'day' ? r.id.slice(5) : r.date.slice(5),
                balance: balance
            };
        });
    }, [records, activeBrokerage]);

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.text}`}>Dashboard</h2>
                        <p className={`text-xs font-medium ${theme.textMuted}`}>Operações e gestão em tempo real.</p>
                    </div>
                    <button 
                        onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                        className={`p-2 rounded-xl border transition-all ${isPrivacyMode ? 'bg-[#6366f1] text-white border-[#6366f1]' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}
                        title={isPrivacyMode ? "Mostrar Saldo" : "Ocultar Saldo"}
                    >
                        {isPrivacyMode ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                </div>
                <input 
                    type="date" 
                    value={selectedDateString} 
                    onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} 
                    className={`w-full md:w-auto border rounded-2xl px-6 py-3 text-sm font-bold focus:outline-none ${theme.input}`} 
                />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)
                ) : (
                    kpis.map((kpi, i) => (
                        <GlassCard key={i} theme={theme} className="flex flex-col justify-between group hover:border-[#6366f1]/30 transition-all duration-300 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{kpi.label}</p>
                                <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                            </div>
                            
                            <div className={`text-xl md:text-2xl font-black ${kpi.color} truncate tracking-tight transition-all duration-500 ${isPrivacyMode && kpi.label === 'Banca Atual' ? 'blur-md select-none opacity-50' : ''}`}>
                                {kpi.isCurrency && (
                                    <span className="mr-1">{kpi.val >= 0 ? '' : '-'}{currencySymbol}</span>
                                )}
                                <CountUp 
                                    end={Math.abs(kpi.val)} 
                                    decimals={2} 
                                    duration={2} 
                                    separator="." 
                                    decimal="," 
                                />
                                {kpi.isPercent && '%'}
                            </div>

                            {kpi.label === 'Meta Diária' && (
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
                                        <span>Progresso</span>
                                        <span className={dailyGoalPercent >= 100 ? 'text-[#22c55e]' : 'text-[#6366f1]'}>{dailyGoalPercent.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, dailyGoalPercent)}%` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className={`h-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.3)] ${dailyGoalPercent >= 100 ? 'bg-[#22c55e]' : 'bg-[#6366f1]'}`}
                                        />
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    ))
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <GlassCard theme={theme} className="flex flex-col h-full">
                    <SectionTitle title="Nova Operação" subtitle="Registre seu resultado" icon={CalculatorIcon} theme={theme} />
                    
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mb-6">
                        <button 
                            onClick={() => setEntryMode('fixed')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${entryMode === 'fixed' ? 'bg-[#6366f1] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Fixo
                        </button>
                        <button 
                            onClick={() => setEntryMode('percentage')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${entryMode === 'percentage' ? 'bg-[#6366f1] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            % Banca
                        </button>
                    </div>

                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Entrada ({entryMode === 'fixed' ? currencySymbol : '%'})</label>
                                    <input 
                                        type="number" 
                                        value={customEntryValue}
                                        onChange={(e) => setCustomEntryValue(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-2xl font-bold text-sm ${theme.input}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Payout %</label>
                                    <input 
                                        type="number" 
                                        value={customPayout}
                                        onChange={(e) => handlePayoutChange(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-2xl font-bold text-sm ${theme.input}`}
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Estimativa</span>
                                    <span className="text-[10px] font-black uppercase text-[#6366f1]">Soros Ativo: {isNextTradeSoros ? 'Sim' : 'Não'}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Se Win</p>
                                        <p className="text-lg font-black text-[#22c55e]">+{currencySymbol} {formatMoney(estimatedProfit)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Se Loss</p>
                                        <p className="text-lg font-black text-[#ef4444]">-{currencySymbol} {formatMoney(estimatedLoss)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="flex gap-4">
                                <ActionButton 
                                    variant="success" 
                                    className="flex-1" 
                                    onClick={() => handleQuickAdd('win')}
                                    disabled={stopWinReached || stopLossReached}
                                >
                                    WIN
                                </ActionButton>
                                <ActionButton 
                                    variant="danger" 
                                    className="flex-1" 
                                    onClick={() => handleQuickAdd('loss')}
                                    disabled={stopWinReached || stopLossReached}
                                >
                                    LOSS
                                </ActionButton>
                            </div>

                            <ActionButton 
                                variant="ghost" 
                                className="w-full" 
                                onClick={handleSoros}
                                icon={BoltIcon}
                            >
                                Calcular Soros
                            </ActionButton>

                            {(stopWinReached || stopLossReached) && (
                                <div className={`p-4 rounded-2xl border ${stopWinReached ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} text-center`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest">
                                        {stopWinReached ? 'Meta Batida! Pare por hoje.' : 'Stop Loss Atingido! Volte amanhã.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>

                <GlassCard theme={theme} className="flex flex-col h-full">
                    <SectionTitle title="Histórico do Dia" subtitle="Operações realizadas hoje" icon={ListBulletIcon} theme={theme} />
                    <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Hora</th>
                                    <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Res</th>
                                    <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Valor</th>
                                    <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {dailyRecordForSelectedDay?.trades?.map((trade: Trade, i: number) => (
                                    <tr key={i} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 text-[10px] font-bold text-slate-400">
                                            {new Date(trade.timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                                trade.result === 'win' 
                                                    ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20' 
                                                    : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
                                            }`}>
                                                {trade.result === 'win' ? 'WIN' : 'LOSS'}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <span className={`text-[10px] font-black ${trade.result === 'win' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                                                {trade.result === 'win' ? '+' : '-'}{currencySymbol}{trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)).toFixed(2) : trade.entryValue.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <button 
                                                onClick={() => deleteTrade(trade.id, selectedDateString)}
                                                className="p-1 text-slate-600 hover:text-red-500 transition-colors"
                                            >
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!dailyRecordForSelectedDay?.trades || dailyRecordForSelectedDay.trades.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-[10px] font-medium text-slate-500 italic">
                                            Vazio
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

// ... Omitted other panels as they remain the same as previous logic ...
const CompoundInterestPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    
    const [projMetaPercent, setProjMetaPercent] = useState(10);
    const [projStopPercent, setProjStopPercent] = useState(3);
    const [projEntryPercent, setProjEntryPercent] = useState(1);

    const tableData = useMemo(() => {
        if (!activeBrokerage) return [];
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
    }, [records, activeBrokerage?.id, activeBrokerage?.initialBalance, projMetaPercent, projStopPercent, projEntryPercent]);

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div>
                    <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.text}`}>Juros Compostos</h2>
                    <p className={`text-xs font-medium ${theme.textMuted}`}>Projeção baseada no histórico real e metas futuras.</p>
                </div>
            </div>

            <GlassCard theme={theme}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Data</th>
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Capital</th>
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <div className="flex flex-col items-start gap-1">
                                        <span>Meta</span>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={projMetaPercent} onChange={e => setProjMetaPercent(parseFloat(e.target.value) || 0)} className={`w-12 h-6 px-1 rounded border text-[10px] text-center font-black outline-none ${theme.input}`} />
                                            <span className="opacity-30">%</span>
                                        </div>
                                    </div>
                                </th>
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Lucro</th>
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <div className="flex flex-col items-start gap-1">
                                        <span>Stop</span>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={projStopPercent} onChange={e => setProjStopPercent(parseFloat(e.target.value) || 0)} className={`w-12 h-6 px-1 rounded border text-[10px] text-center font-black outline-none ${theme.input}`} />
                                            <span className="opacity-30">%</span>
                                        </div>
                                    </div>
                                </th>
                                <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <div className="flex flex-col items-end gap-1">
                                        <span>Entrada</span>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={projEntryPercent} onChange={e => setProjEntryPercent(parseFloat(e.target.value) || 0)} className={`w-12 h-6 px-1 rounded border text-[10px] text-center font-black outline-none ${theme.input}`} />
                                            <span className="opacity-30">%</span>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {tableData.map((row) => (
                                <tr key={row.dateId} className={`group transition-colors hover:bg-white/5 ${row.isProjection ? 'opacity-40 grayscale-[0.5]' : row.status === 'STOP-LOSS' ? 'bg-[#ef4444]/5' : ''}`}>
                                    <td className="py-4 text-xs font-bold text-slate-400">
                                        {row.hasOperation ? row.dateDisplay : ''}
                                    </td>
                                    <td className="py-4 text-xs font-bold text-slate-300">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-4 text-xs font-bold text-slate-500">{row.metaPercent}%</td>
                                    <td className="py-4 text-sm font-black text-[#6366f1]">{currencySymbol} {formatMoney(row.targetProfit)}</td>
                                    <td className="py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${row.status === 'META BATIDA' ? 'bg-[#22c55e]/20 text-[#22c55e]' : row.status === 'STOP-LOSS' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-slate-500/20 text-slate-500'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="py-4 text-xs font-bold text-[#ef4444]/80">{currencySymbol} {formatMoney(row.stopValue)}</td>
                                    <td className="py-4 text-right text-xs font-bold text-slate-400">{currencySymbol} {formatMoney(row.entryValue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
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
        <GlassCard theme={theme} className="w-full max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-xl transition-colors active:scale-90"><ChevronLeftIcon className="w-5 h-5" /></button>
                <h3 className="text-sm md:text-base font-black uppercase tracking-[0.2em] text-[#6366f1]">{monthName}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl transition-colors active:scale-90"><ChevronRightIcon className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {dayNames.map(day => (
                    <div key={day} className="text-center text-[10px] font-black uppercase text-slate-500 py-2">{day}</div>
                ))}
                {calendarDays.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;
                    
                    const dateId = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const profit = dailyProfits[dateId];
                    const isToday = getLocalDateString() === dateId;

                    return (
                        <div key={dateId} className={`aspect-square rounded-xl border ${isDarkMode ? 'border-white/5' : 'border-zinc-200'} flex flex-col items-center justify-center p-1 relative transition-all hover:scale-105 cursor-default ${isToday ? 'ring-2 ring-[#6366f1]/50' : ''} ${profit !== undefined ? (profit >= 0 ? 'bg-[#22c55e]/10' : 'bg-[#ef4444]/10') : 'bg-white/5'}`}>
                            <span className="text-[10px] font-black opacity-30 mb-1">{day}</span>
                            {profit !== undefined && (
                                <span className={`text-[8px] md:text-[10px] font-black ${profit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                                    {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest opacity-40">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#22c55e]" /> Lucro</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ef4444]" /> Prejuízo</div>
            </div>
        </GlassCard>
    );
};

const HistoryPanel: React.FC<any> = ({ isDarkMode, isPrivacyMode, activeBrokerage, records }) => {
    const theme = useThemeClasses(isDarkMode);
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'calendar'>('calendar');
    
    // Chart Data logic moved from Dashboard
    const chartData = useMemo(() => {
        const brokerageRecords = records.filter((r: any) => r.brokerageId === activeBrokerage?.id);
        const sorted = [...brokerageRecords].sort((a, b) => {
            const dateA = a.recordType === 'day' ? a.id : a.date;
            const dateB = b.recordType === 'day' ? b.id : b.date;
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            return (a.timestamp || 0) - (b.timestamp || 0);
        });

        return sorted.slice(-30).map(r => {
            const balance = r.recordType === 'day' ? r.endBalanceUSD : (r as TransactionRecord).runningBalanceUSD || 0;
            return {
                date: r.recordType === 'day' ? r.id.slice(5) : r.date.slice(5),
                balance: balance
            };
        });
    }, [records, activeBrokerage]);

    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterMinProfit, setFilterMinProfit] = useState('');
    const [filterMaxProfit, setFilterMaxProfit] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const handleExport = (format: 'json' | 'csv') => {
        const dataToExport = stats.map((s: any) => ({
            Data: s.label,
            Lucro: s.profit.toFixed(2),
            Wins: s.wins,
            Losses: s.losses,
            Total: s.total,
            WinRate: s.winRate.toFixed(2) + '%'
        }));

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `historico_${viewMode}_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        } else {
            const headers = Object.keys(dataToExport[0]).join(',');
            const rows = dataToExport.map((obj: any) => Object.values(obj).join(',')).join('\n');
            const csvContent = `${headers}\n${rows}`;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `historico_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
        }
    };

    const stats = useMemo(() => {
        let dayRecords = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id && r.trades.length > 0);
        
        // Apply Filters
        if (filterStartDate) dayRecords = dayRecords.filter((r: DailyRecord) => r.id >= filterStartDate);
        if (filterEndDate) dayRecords = dayRecords.filter((r: DailyRecord) => r.id <= filterEndDate);
        if (filterMinProfit) dayRecords = dayRecords.filter((r: DailyRecord) => r.netProfitUSD >= parseFloat(filterMinProfit));
        if (filterMaxProfit) dayRecords = dayRecords.filter((r: DailyRecord) => r.netProfitUSD <= parseFloat(filterMaxProfit));

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
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div>
                    <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.text}`}>Histórico</h2>
                    <p className={`text-xs font-medium ${theme.textMuted}`}>Análise detalhada de performance.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <ActionButton variant="ghost" onClick={() => setShowFilters(!showFilters)} icon={FunnelIcon}>
                        Filtros
                    </ActionButton>
                </div>
            </div>

            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 max-w-md mx-auto">
                {(['calendar', 'daily', 'weekly', 'monthly'] as const).map((mode) => (
                    <button 
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === mode ? 'bg-[#6366f1] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {mode === 'calendar' ? 'Cal' : mode === 'daily' ? 'Dia' : mode === 'weekly' ? 'Sem' : 'Mês'}
                    </button>
                ))}
            </div>

            {showFilters && (
                <GlassCard theme={theme} className="animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Início</label>
                            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className={`w-full h-10 px-4 rounded-xl border focus:ring-1 focus:ring-[#6366f1] outline-none font-bold text-xs ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Fim</label>
                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className={`w-full h-10 px-4 rounded-xl border focus:ring-1 focus:ring-[#6366f1] outline-none font-bold text-xs ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Lucro Mín</label>
                            <input type="number" value={filterMinProfit} onChange={e => setFilterMinProfit(e.target.value)} placeholder="0.00" className={`w-full h-10 px-4 rounded-xl border focus:ring-1 focus:ring-[#6366f1] outline-none font-bold text-xs ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Lucro Máx</label>
                            <input type="number" value={filterMaxProfit} onChange={e => setFilterMaxProfit(e.target.value)} placeholder="0.00" className={`w-full h-10 px-4 rounded-xl border focus:ring-1 focus:ring-[#6366f1] outline-none font-bold text-xs ${theme.input}`} />
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Relatório e Gráfico */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <GlassCard theme={theme} className="h-full">
                        <div className="flex items-center justify-between mb-6">
                            <SectionTitle title={`Relatório ${viewMode === 'daily' ? 'Diário' : viewMode === 'weekly' ? 'Semanal' : 'Mensal'}`} subtitle="Performance consolidada" icon={ChartBarIcon} theme={theme} />
                            <div className="flex gap-2">
                                <button onClick={() => handleExport('json')} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white" title="Exportar JSON"><DocumentTextIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleExport('csv')} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white" title="Exportar CSV"><ListBulletIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Período</th>
                                        <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Lucro Líquido</th>
                                        <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">W / L</th>
                                        <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Win Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stats.map((s: any, i: number) => {
                                        const isToday = s.id === getLocalDateString();
                                        const yesterday = new Date();
                                        yesterday.setDate(yesterday.getDate() - 1);
                                        const isYesterday = s.id === getLocalDateString(yesterday);
                                        
                                        const showSeparator = viewMode === 'daily' && (isToday || isYesterday);
                                        
                                        return (
                                            <React.Fragment key={i}>
                                                {showSeparator && (i === 0 || stats[i-1].id !== s.id) && (
                                                    <tr className="bg-white/5">
                                                        <td colSpan={4} className="py-2 px-4 text-[8px] font-black uppercase tracking-[0.2em] text-[#6366f1]">
                                                            {isToday ? 'Hoje' : 'Ontem'}
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr className="group hover:bg-white/5 transition-colors">
                                                    <td className="py-4 text-xs font-bold text-slate-400">{s.label}</td>
                                                    <td className={`py-4 text-sm font-black ${s.profit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'} ${isPrivacyMode ? 'blur-sm select-none opacity-50' : ''}`}>
                                                        {s.profit >= 0 ? '+' : '-'}{currencySymbol}
                                                        <CountUp end={Math.abs(s.profit)} decimals={2} duration={1} separator="." decimal="," />
                                                    </td>
                                                    <td className="py-4 text-right text-xs font-bold">
                                                        <span className="text-[#22c55e]">{s.wins}</span>
                                                        <span className="mx-1 opacity-20">/</span>
                                                        <span className="text-[#ef4444]">{s.losses}</span>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <span className="text-xs font-black text-white">{s.winRate.toFixed(1)}%</span>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                    {stats.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-xs font-medium text-slate-500 italic">
                                                Nenhum dado encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>

                <div className="lg:col-span-1">
                    <GlassCard theme={theme} className="h-full flex flex-col">
                        <SectionTitle title="Evolução" subtitle="Últimas 30 movimentações" icon={TrendingUpIcon} theme={theme} />
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorBalHistory" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#ffffff20" 
                                        fontSize={8} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tick={{ fill: '#64748b' }}
                                    />
                                    <YAxis 
                                        stroke="#ffffff20" 
                                        fontSize={8} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tick={{ fill: '#64748b' }}
                                        tickFormatter={(val) => `${currencySymbol}${val}`}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                                        itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="balance" 
                                        stroke="#6366f1" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorBalHistory)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </div>
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
            <div><h2 className="text-xl lg:text-2xl font-black">Calculadora de Soros</h2><p className={`text-[10px] lg:text-xs ${theme.textMuted}`}>Planejamento de alavancagem progressiva.</p></div>
            <div className={`p-4 lg:p-8 rounded-3xl border ${theme.card} space-y-6`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
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
                <div className="space-y-2 lg:space-y-3">
                    {results.map(r => (
                        <div key={r.level} className="flex items-center justify-between p-3 lg:p-4 rounded-2xl bg-slate-950/20 border border-slate-800/50">
                            <div><p className="text-[8px] lg:text-[10px] font-black uppercase text-slate-500">Nível {r.level}</p><p className="text-xs lg:text-sm font-bold">Entrada: {currencySymbol} {formatMoney(r.entry)}</p></div>
                            <div className="text-right"><p className="text-[8px] lg:text-[10px] font-black uppercase text-green-500">Lucro Estimado</p><p className="text-xs lg:text-sm font-black text-green-500">+{currencySymbol} {formatMoney(r.profit)}</p></div>
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
            const startStr = getLocalDateString(new Date(goal.createdAt || Date.now()));
            relevantProfit = brokerageRecords
                .filter((r: any) => r.id >= startStr && r.id <= goal.deadline!)
                .reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
            label = `Até ${new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}`;
        }

        const percentage = goal.targetAmount > 0 ? (relevantProfit / goal.targetAmount) * 100 : 0;
        return { percentage, label, current: relevantProfit };
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div>
                    <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.text}`}>Metas</h2>
                    <p className={`text-xs font-medium ${theme.textMuted}`}>Acompanhamento de objetivos a longo prazo.</p>
                </div>
            </div>

            <GlassCard theme={theme}>
                <SectionTitle title="Nova Meta" subtitle="Defina um novo objetivo financeiro" icon={TargetIcon} theme={theme} />
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome da Meta</label>
                            <input type="text" placeholder="Ex: Viagem, Carro..." value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tipo</label>
                            <select value={newGoalType} onChange={e => setNewGoalType(e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`}>
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensal</option>
                                <option value="custom">Até certa data</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor Alvo ({currencySymbol})</label>
                            <input type="number" placeholder="0.00" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                        </div>
                        {newGoalType === 'custom' && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Data Limite</label>
                                <input type="date" value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                            </div>
                        )}
                    </div>
                    <ActionButton variant="primary" className="w-full h-14" onClick={addGoal} icon={PlusIcon}>
                        Adicionar Meta
                    </ActionButton>
                </div>
            </GlassCard>

            <div className="space-y-4">
                {goals.filter((g: Goal) => g.brokerageId === activeBrokerage?.id).map((goal: Goal) => {
                    const { percentage, label, current } = calculateProgress(goal);
                    const isCompleted = percentage >= 100;
                    return (
                        <GlassCard key={goal.id} theme={theme} className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">{goal.name}</p>
                                    <h4 className="text-2xl font-black text-white">{currencySymbol} {formatMoney(goal.targetAmount)}</h4>
                                    <p className="text-xs font-bold text-slate-400 mt-1">Atual: <span className={isCompleted ? 'text-[#22c55e]' : 'text-[#6366f1]'}>{currencySymbol} {formatMoney(current)}</span></p>
                                </div>
                                <button onClick={() => deleteGoal(goal.id)} className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-red-500/50 hover:text-red-500 active:scale-90"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500">{label}</span>
                                    <span className={isCompleted ? 'text-[#22c55e]' : 'text-[#6366f1]'}>{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-[#6366f1] shadow-[0_0_15px_rgba(99,102,241,0.3)]'}`} style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-white/5">
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Meta Diária</p>
                                    <p className="text-xs font-black text-[#6366f1]">{currencySymbol} {formatMoney(goal.targetAmount / (goal.type === 'monthly' ? 22 : goal.type === 'weekly' ? 5 : 30))}</p>
                                </div>
                                <div className="text-center border-x border-white/5">
                                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Meta Semanal</p>
                                    <p className="text-xs font-black text-[#6366f1]">{currencySymbol} {formatMoney(goal.type === 'weekly' ? goal.targetAmount : goal.targetAmount / (goal.type === 'monthly' ? 4 : 4))}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Meta Mensal</p>
                                    <p className="text-xs font-black text-[#6366f1]">{currencySymbol} {formatMoney(goal.type === 'monthly' ? goal.targetAmount : goal.targetAmount * (goal.type === 'weekly' ? 4 : 1))}</p>
                                </div>
                            </div>
                        </GlassCard>
                    );
                })}
                {goals.filter((g: Goal) => g.brokerageId === activeBrokerage?.id).length === 0 && (
                    <div className="py-20 text-center opacity-20">
                        <TargetIcon className="w-16 h-16 mx-auto mb-4" />
                        <p className="text-sm font-black uppercase tracking-[0.2em]">Nenhuma meta definida</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset, trashCount, onRestore, onSave, isDarkMode, setIsDarkMode, addTransaction }) => {
    const [newBrokerageName, setNewBrokerageName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [transAmount, setTransAmount] = useState('');
    const [transType, setTransType] = useState<'deposit' | 'withdrawal'>('deposit');
    
    const updateBrokerage = (field: keyof Brokerage, value: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b) => b.id === brokerage.id ? { ...b, [field]: value } : b));
    };

    const handleManualSave = async () => {
        setIsSaving(true);
        try {
            await onSave();
            toast.success("Configurações salvas com sucesso!");
        } catch (err) {
            toast.error("Erro ao salvar configurações.");
        } finally {
            setTimeout(() => setIsSaving(false), 1000);
        }
    };

    const handleTransaction = () => {
        const amount = parseFloat(transAmount) || 0;
        if (amount <= 0) {
            toast.error("O valor da movimentação deve ser maior que zero.");
            return;
        }
        addTransaction(transType, amount);
        setTransAmount('');
        toast.success(`${transType === 'deposit' ? 'Depósito' : 'Saque'} realizado com sucesso!`);
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
            currency: 'USD',
            dailyGoalMode: 'percentage',
            dailyGoalValue: 3
        };
        setBrokerages((prev: Brokerage[]) => [...prev, newB]);
        setNewBrokerageName('');
    };

    const deleteBrokerage = (id: string) => {
        setBrokerages((prev: Brokerage[]) => prev.filter(b => b.id !== id));
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.text}`}>Configurações</h2>
                    <p className={`text-xs font-medium ${theme.textMuted}`}>Gestão de capital e limites de risco.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                        type="text" 
                        placeholder="Nova Corretora" 
                        value={newBrokerageName}
                        onChange={e => setNewBrokerageName(e.target.value)}
                        className={`flex-1 h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-xs ${theme.input}`}
                    />
                    <ActionButton variant="primary" onClick={addNewBrokerage} icon={PlusIcon}>
                        Nova
                    </ActionButton>
                </div>
            </div>
            
            <GlassCard theme={theme} className="space-y-12">
                <section className="space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <SectionTitle title={`Parâmetros de ${brokerage.name}`} subtitle="Configurações básicas" icon={LayoutGridIcon} theme={theme} />
                        <button onClick={() => deleteBrokerage(brokerage.id)} className="text-[#ef4444] text-[10px] font-black uppercase tracking-widest hover:underline active:scale-95 transition-all">Excluir Corretora</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome da Corretora</label>
                            <input type="text" value={brokerage.name} onChange={e => updateBrokerage('name', e.target.value)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Moeda</label>
                            <select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`}>
                                <option value="USD">Dólar ($)</option>
                                <option value="BRL">Real (R$)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Saldo Inicial</label>
                            <input type="number" value={brokerage.initialBalance} onChange={e => updateBrokerage('initialBalance', parseFloat(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Payout Padrão</label>
                            <div className="relative">
                                <input type="number" value={brokerage.payoutPercentage} onChange={e => updateBrokerage('payoutPercentage', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 pr-10 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 font-black">%</span>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="space-y-8 pt-8 border-t border-white/5">
                    <SectionTitle title="Meta Diária" subtitle="Objetivo de lucro por dia" icon={TargetIcon} theme={theme} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Modo da Meta</label>
                            <select 
                                value={brokerage.dailyGoalMode || 'percentage'} 
                                onChange={e => updateBrokerage('dailyGoalMode', e.target.value as any)} 
                                className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`}
                            >
                                <option value="percentage">Porcentagem (%)</option>
                                <option value="fixed">Valor Fixo ({brokerage.currency === 'USD' ? '$' : 'R$'})</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor da Meta</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={brokerage.dailyGoalValue || 0} 
                                    onChange={e => updateBrokerage('dailyGoalValue', parseFloat(e.target.value) || 0)} 
                                    className={`w-full h-12 px-4 pr-10 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 font-black">
                                    {brokerage.dailyGoalMode === 'fixed' ? (brokerage.currency === 'USD' ? '$' : 'R$') : '%'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-8 pt-8 border-t border-white/5">
                    <SectionTitle title="Gerenciamento de Risco" subtitle="Limites de operações e entradas" icon={CheckCircleIcon} theme={theme} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Modo de Entrada</label>
                            <select value={brokerage.entryMode} onChange={e => updateBrokerage('entryMode', e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`}>
                                <option value="percentage">Porcentagem (%)</option>
                                <option value="fixed">Valor Fixo ({brokerage.currency === 'USD' ? '$' : 'R$'})</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor da Entrada</label>
                            <div className="relative">
                                <input type="number" value={brokerage.entryValue} onChange={e => updateBrokerage('entryValue', parseFloat(e.target.value) || 0)} className={`w-full h-12 px-4 pr-10 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 font-black">{brokerage.entryMode === 'fixed' ? (brokerage.currency === 'USD' ? '$' : 'R$') : '%'}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Stop Gain (Operações)</label>
                            <input type="number" value={brokerage.stopGainTrades} onChange={e => updateBrokerage('stopGainTrades', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Stop Loss (Operações)</label>
                            <input type="number" value={brokerage.stopLossTrades} onChange={e => updateBrokerage('stopLossTrades', parseInt(e.target.value) || 0)} className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`} />
                        </div>
                    </div>
                </section>

                <section className="space-y-8 pt-8 border-t border-white/5">
                    <SectionTitle title="Parâmetros de VEX" subtitle="Movimentação de capital" icon={ArrowPathIcon} theme={theme} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                                <button 
                                    onClick={() => setTransType('deposit')}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${transType === 'deposit' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Depósito
                                </button>
                                <button 
                                    onClick={() => setTransType('withdrawal')}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${transType === 'withdrawal' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Saque
                                </button>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor ({brokerage.currency === 'USD' ? '$' : 'R$'})</label>
                                <input 
                                    type="number" 
                                    value={transAmount}
                                    onChange={(e) => setTransAmount(e.target.value)}
                                    className={`w-full h-12 px-4 rounded-xl border focus:ring-2 focus:ring-[#6366f1]/50 outline-none font-bold text-sm ${theme.input}`}
                                    placeholder="0,00"
                                />
                            </div>
                            <ActionButton 
                                variant="primary" 
                                className="w-full h-12" 
                                onClick={handleTransaction}
                                icon={ArrowPathIcon}
                            >
                                Confirmar {transType === 'deposit' ? 'Depósito' : 'Saque'}
                            </ActionButton>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col justify-center items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1] mb-4">
                                <ShieldCheckIcon className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-widest mb-2">Segurança VEX</h4>
                            <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                                Todas as movimentações são registradas no histórico para auditoria e controle de banca.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="flex flex-col md:flex-row gap-4 pt-8 border-t border-white/5">
                    <ActionButton variant="primary" className="flex-1 h-14" onClick={handleManualSave} disabled={isSaving} icon={ArrowPathIcon}>
                        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </ActionButton>
                    <ActionButton variant="ghost" className="flex-1 h-14 text-[#ef4444] hover:bg-[#ef4444]/10" onClick={onReset} icon={TrashIcon}>
                        Resetar Todos os Dados
                    </ActionButton>
                </div>
            </GlassCard>

            <GlassCard theme={theme}>
                <SectionTitle title="Aparência" subtitle="Personalize sua interface" icon={SparklesIcon} theme={theme} />
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                        {isDarkMode ? <MoonIcon className="w-5 h-5 text-[#6366f1]" /> : <SunIcon className="w-5 h-5 text-amber-500" />}
                        <span className="text-sm font-bold">Modo Escuro</span>
                    </div>
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-[#6366f1]' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDarkMode ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>
            </GlassCard>

            {trashCount > 0 && (
                <GlassCard theme={theme} className="border-[#6366f1]/20 bg-[#6366f1]/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1]">
                                <TrashIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest">Lixeira</h4>
                                <p className="text-xs font-medium text-slate-500">{trashCount} itens excluídos recentemente.</p>
                            </div>
                        </div>
                        <ActionButton variant="primary" onClick={onRestore} icon={ArrowPathIcon}>
                            Restaurar Tudo
                        </ActionButton>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};

const ManagementSheetPanel: React.FC<any> = ({ theme, activeBrokerage, isDarkMode, records, selectedDate, setSelectedDate, isPrivacyMode }) => {
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const [selectedMonth, setSelectedMonth] = useState(() => getLocalMonthString(selectedDate));
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
    
    // Sync selectedMonth with selectedDate
    useEffect(() => {
        const dateMonth = getLocalMonthString(selectedDate);
        if (dateMonth !== selectedMonth) {
            setSelectedMonth(dateMonth);
        }
    }, [selectedDate]);

    // Storage keys based on brokerage and month
    const getStorageKey = (suffix: string) => `ms_${activeBrokerage?.id || 'default'}_${selectedMonth}_${suffix}`;

    const [daysData, setDaysData] = useState<any[]>([]);
    const [bank, setBank] = useState(1000);
    const [stopPercent, setStopPercent] = useState(10);
    const [exchangeRate, setExchangeRate] = useState(5.0);
    const [sessionEntries, setSessionEntries] = useState<number[]>([0]);
    const [deposits, setDeposits] = useState<any[]>(Array(10).fill({ date: '', value: 0 }));
    const [withdrawals, setWithdrawals] = useState<any[]>(Array(10).fill({ date: '', value: 0 }));

    // Track the last synced initial balance to detect changes even when component remounts
    const lastSyncedKey = `ms_${activeBrokerage?.id || 'default'}_last_synced_bal`;

    // Load data when brokerage or month changes
    useEffect(() => {
        const savedDays = localStorage.getItem(getStorageKey('days'));
        const savedBank = localStorage.getItem(getStorageKey('bank'));
        const savedStop = localStorage.getItem(getStorageKey('stop'));
        const savedExchange = localStorage.getItem(getStorageKey('exchange'));
        const savedCycle1 = localStorage.getItem(getStorageKey('cycle1'));
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
            tradeCount: 0,
            result: 0,
            winCycle1: false,
            lossCycle1: false
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
                    tradeCount: 0,
                    result: 0,
                    winCycle1: false,
                    lossCycle1: false
                };
            });
            setDaysData(adjustedDays);
        } else {
            setDaysData(initialDays);
        }

        const currentInitialBalance = activeBrokerage?.initialBalance || 1000;
        const lastSyncedBal = localStorage.getItem(lastSyncedKey);

        // Sync with brokerage initial balance if it changed in settings or if no bank is saved for this month
        if (lastSyncedBal !== String(currentInitialBalance) || !savedBank) {
            setBank(currentInitialBalance);
            localStorage.setItem(getStorageKey('bank'), String(currentInitialBalance));
            localStorage.setItem(lastSyncedKey, String(currentInitialBalance));
        } else {
            setBank(Number(savedBank));
        }

        setStopPercent(savedStop ? Number(savedStop) : 10);
        setExchangeRate(savedExchange ? Number(savedExchange) : 5.0);
        
        if (savedCycle1) {
            const parsed = JSON.parse(savedCycle1);
            if (Array.isArray(parsed)) {
                setSessionEntries(parsed);
            } else {
                setSessionEntries([parsed.e1 || 0, parsed.e2 || 0, parsed.s1 || 0, parsed.s2 || 0]);
            }
        } else {
            setSessionEntries([0]);
        }

        setDeposits(savedDeposits ? JSON.parse(savedDeposits) : Array(10).fill({ date: '', value: 0 }));
        setWithdrawals(savedWithdrawals ? JSON.parse(savedWithdrawals) : Array(10).fill({ date: '', value: 0 }));
    }, [activeBrokerage?.id, activeBrokerage?.initialBalance, selectedMonth]);

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
    }, [records, activeBrokerage?.id, activeBrokerage?.initialBalance]);

    const balanceBeforeSelectedDay = useMemo(() => {
        if (!records || !activeBrokerage) return activeBrokerage?.initialBalance || 0;
        const selectedDateStr = getLocalDateString(selectedDate);
        const pastRecords = records.filter((r: any) => 
            r.brokerageId === activeBrokerage.id && 
            r.id < selectedDateStr
        );
        const profit = pastRecords.reduce((sum: number, r: any) => {
            if (r.recordType === 'day') return sum + (r.netProfitUSD || 0);
            if (r.recordType === 'deposit') return sum + (r.amountUSD || 0);
            if (r.recordType === 'withdrawal') return sum - (r.amountUSD || 0);
            return sum;
        }, 0);
        return (activeBrokerage?.initialBalance || 0) + profit;
    }, [records, activeBrokerage?.id, activeBrokerage?.initialBalance, selectedDate]);

    const balanceAtStartOfMonth = useMemo(() => {
        if (!records || !activeBrokerage) return activeBrokerage?.initialBalance || 0;
        const firstDayOfMonth = `${selectedMonth}-01`;
        const pastRecords = records.filter((r: any) => 
            r.brokerageId === activeBrokerage.id && 
            r.id < firstDayOfMonth
        );
        const profit = pastRecords.reduce((sum: number, r: any) => {
            if (r.recordType === 'day') return sum + (r.netProfitUSD || 0);
            if (r.recordType === 'deposit') return sum + (r.amountUSD || 0);
            if (r.recordType === 'withdrawal') return sum - (r.amountUSD || 0);
            return sum;
        }, 0);
        return (activeBrokerage?.initialBalance || 0) + profit;
    }, [records, activeBrokerage?.id, activeBrokerage?.initialBalance, selectedMonth]);

    // Sync with App Records
    useEffect(() => {
        if (!records || !activeBrokerage) return;

        const dateKey = getLocalDateString(selectedDate);
        const dayRecord = records.find((r: any) => r.recordType === 'day' && r.id === dateKey && r.brokerageId === activeBrokerage.id);
        
        // If it's a new day (no trades yet), reset the bank to the balance before this day
        if (!dayRecord) {
            setBank(balanceBeforeSelectedDay);
            setSessionEntries([0]);
        }

        const trades = dayRecord?.trades || [];
        setSessionEntries(prev => {
            const next = trades.map((t: any) => t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue);
            if (next.length === 0) return [0];
            if (next[next.length - 1] !== 0) return [...next, 0];
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
                    tradeCount: trades.length,
                    payout: firstTrade?.payoutPercentage || (dateStr === dateKey ? activeBrokerage.payoutPercentage : day.payout),
                    result: record.netProfitUSD,
                    winCycle1: trades.some((t: any) => t.result === 'win'),
                    lossCycle1: trades.some((t: any) => t.result === 'loss'),
                    hasSoros: trades.some((t: any) => t.isSoros),
                };
            }
            
            // If record not found, reset values for this day in the sheet to stay in sync with dashboard
            return {
                ...day,
                tradeCount: 0,
                result: 0,
                winCycle1: false,
                lossCycle1: false,
                hasSoros: false,
                payout: dateStr === dateKey ? activeBrokerage.payoutPercentage : day.payout
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

    }, [records, activeBrokerage?.id, selectedMonth, selectedDate]);

    // Save data
    useEffect(() => {
        if (daysData.length === 0) return;
        localStorage.setItem(getStorageKey('days'), JSON.stringify(daysData));
        localStorage.setItem(getStorageKey('bank'), bank.toString());
        localStorage.setItem(getStorageKey('stop'), stopPercent.toString());
        localStorage.setItem(getStorageKey('exchange'), exchangeRate.toString());
        localStorage.setItem(getStorageKey('cycle1'), JSON.stringify(sessionEntries));
        localStorage.setItem(getStorageKey('deposits'), JSON.stringify(deposits));
        localStorage.setItem(getStorageKey('withdrawals'), JSON.stringify(withdrawals));
    }, [daysData, bank, stopPercent, exchangeRate, sessionEntries, deposits, withdrawals]);

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

    const selectedDateKey = getLocalDateString(selectedDate);
    const selectedDayNum = selectedDate.getDate();

    const totalProfit = daysData.reduce((acc: number, d: any) => acc + (Number(d.result) || 0), 0);
    const totalWins = monthRecords.reduce((acc: number, r: any) => acc + (r.winCount || 0), 0);
    const totalLosses = monthRecords.reduce((acc: number, r: any) => acc + (r.lossCount || 0), 0);

    // Profit up to the selected day (inclusive)
    const profitUntilSelectedDay = daysData
        .filter((d: any) => d.id <= selectedDayNum)
        .reduce((acc: number, d: any) => acc + (Number(d.result) || 0), 0);

    const selectedDayRecords = monthRecords.filter((r: any) => r.id === selectedDateKey);
    
    const displayProfit = viewMode === 'daily' 
        ? (daysData.find((d: any) => d.id === selectedDayNum)?.result || 0)
        : totalProfit;

    const displayWins = viewMode === 'daily'
        ? selectedDayRecords.reduce((acc: number, r: any) => acc + (r.winCount || 0), 0)
        : totalWins;

    const displayLosses = viewMode === 'daily'
        ? selectedDayRecords.reduce((acc: number, r: any) => acc + (r.lossCount || 0), 0)
        : totalLosses;

    const displayInitialBank = viewMode === 'daily' ? balanceBeforeSelectedDay : balanceAtStartOfMonth;
    const displayCurrentBank = viewMode === 'daily' ? balanceBeforeSelectedDay + displayProfit : balanceAtStartOfMonth + totalProfit;

    const sessionProfit = sessionEntries.reduce((acc: number, val: number) => acc + (Number(val) || 0), 0);

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
        <div className={`p-4 md:p-8 space-y-8 max-w-7xl mx-auto ${theme.text} text-[11px]`}>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#6366f1]/20 flex items-center justify-center text-[#6366f1]">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${theme.text}`}>Planilha de Gerenciamento</h2>
                        <p className={`text-xs font-medium ${theme.textMuted}`}>{activeBrokerage?.name} • {selectedMonth}</p>
                    </div>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 w-full">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col min-w-[140px]">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 tracking-widest">Dia Selecionado</label>
                            <input 
                                type="date" 
                                value={getLocalDateString(selectedDate)} 
                                onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
                                className={`w-full px-4 py-2 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#6366f1]/50 ${theme.input}`}
                            />
                        </div>
                        <div className="flex flex-col min-w-[140px]">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 tracking-widest">Mês Referência</label>
                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className={`w-full px-4 py-2 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#6366f1]/50 ${theme.input}`}
                            >
                                {months.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 mb-1 tracking-widest">Visualização</label>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                <button 
                                    onClick={() => setViewMode('daily')}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'daily' ? 'bg-[#6366f1] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Diária
                                </button>
                                <button 
                                    onClick={() => setViewMode('monthly')}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'monthly' ? 'bg-[#6366f1] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Mensal
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-end">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex flex-col items-center border-r border-white/10 pr-3">
                                <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Placar</span>
                                <span className="text-[10px] font-black"><span className="text-green-500">{displayWins}</span>/<span className="text-red-500">{displayLosses}</span></span>
                            </div>
                            <div className="flex flex-col items-center border-r border-white/10 px-3">
                                <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Resultado</span>
                                <span className={`text-[10px] font-black ${displayProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{displayProfit >= 0 ? '+' : '-'}{currencySymbol}{formatMoney(Math.abs(displayProfit))}</span>
                            </div>
                            <div className="flex flex-col items-center pl-3">
                                <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Assert.</span>
                                <span className="text-[10px] font-black text-[#6366f1]">{((displayWins / (displayWins + displayLosses || 1)) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* GESTÃO TABLE */}
                <div className="w-full space-y-6">
                    <GlassCard theme={theme} className="flex flex-col h-full">
                        <SectionTitle 
                            title={viewMode === 'daily' ? 'Gestão Diária' : 'Gestão Mensal'} 
                            subtitle="Acompanhamento detalhado" 
                            icon={viewMode === 'daily' ? ListBulletIcon : CalendarIcon} 
                            theme={theme} 
                        />
                        
                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            {viewMode === 'monthly' ? (
                                <table className="w-full min-w-[500px]">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">RF</th>
                                            <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Data</th>
                                            <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Entradas</th>
                                            <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Lucro/Prej</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {daysData.map((d: any, idx: number) => {
                                            const isSelected = getLocalDateString(selectedDate).endsWith(String(d.id).padStart(2, '0'));
                                            return (
                                                <tr 
                                                    key={d.id} 
                                                    className={`group hover:bg-white/5 transition-colors cursor-pointer ${isSelected ? 'bg-[#6366f1]/10' : ''}`}
                                                    onClick={() => {
                                                        const [year, month] = selectedMonth.split('-');
                                                        const newDate = new Date(Number(year), Number(month) - 1, d.id, 12, 0, 0);
                                                        setSelectedDate(newDate);
                                                    }}
                                                >
                                                    <td className="py-4">
                                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${isSelected ? 'bg-[#6366f1] text-white' : 'bg-white/5 text-slate-400'}`}>
                                                            {d.id}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-xs font-bold text-slate-400">{d.date}</td>
                                                    <td className="py-4 text-center text-xs font-black text-slate-300">{d.tradeCount || 0}</td>
                                                    <td className={`py-4 text-right text-sm font-black ${d.result > 0 ? 'text-[#22c55e]' : d.result < 0 ? 'text-[#ef4444]' : 'text-slate-500'}`}>
                                                        {d.result !== 0 ? (d.result > 0 ? '+' : '-') : ''}{currencySymbol} {formatMoney(Math.abs(d.result))}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full min-w-[500px]">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Entrada</th>
                                            <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Hora</th>
                                            <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Payout</th>
                                            <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Resultado</th>
                                            <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Lucro/Prej</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(() => {
                                            const dateKey = getLocalDateString(selectedDate);
                                            const dayRecord = records.find((r: any) => r.recordType === 'day' && r.id === dateKey && r.brokerageId === activeBrokerage.id);
                                            const trades = dayRecord?.trades || [];
                                            
                                            if (trades.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan={5} className="py-20 text-center text-xs font-medium text-slate-500 italic">
                                                            Nenhuma operação registrada para este dia.
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return trades.map((t: any, idx: number) => {
                                                const profit = t.result === 'win' ? (t.entryValue * (t.payoutPercentage / 100)) : -t.entryValue;
                                                return (
                                                    <tr key={t.id || idx} className="group hover:bg-white/5 transition-colors">
                                                        <td className="py-4">
                                                            <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-400">
                                                                {idx + 1}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-xs font-bold text-slate-400">
                                                            {t.timestamp ? new Date(t.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        </td>
                                                        <td className="py-4 text-center text-xs font-black text-slate-300">
                                                            {t.payoutPercentage}%
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                                                t.result === 'win' 
                                                                    ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20' 
                                                                    : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
                                                            }`}>
                                                                {t.result}
                                                            </span>
                                                        </td>
                                                        <td className={`py-4 text-right text-sm font-black ${profit > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                                                            {profit > 0 ? '+' : '-'}{currencySymbol} {formatMoney(Math.abs(profit))}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default App;
