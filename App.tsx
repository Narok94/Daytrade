
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    SettingsIcon, 
    LogoutIcon, LayoutGridIcon, PieChartIcon, 
    TrendingUpIcon, TargetIcon, 
    CalculatorIcon, SunIcon, MoonIcon, MenuIcon, ArrowPathIcon, 
    TrophyIcon, 
    ChartBarIcon, DocumentTextIcon,
    TrashIcon, CpuChipIcon, LockClosedIcon, CheckIcon,
    ListBulletIcon
} from './components/icons';

// --- Constantes de Estilo ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-[#020617]' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-100' : 'text-slate-900',
        card: isDarkMode ? 'bg-[#0f172a]/80 border-slate-800/60 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-[#020617] border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500/50' : 'bg-white border-slate-200 text-slate-900',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        navActive: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600',
        navInactive: isDarkMode ? 'text-slate-500 hover:text-emerald-400 hover:bg-slate-900/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
    }), [isDarkMode]);
};

// --- Radar Sniper Pro (O Cérebro da IA) ---
const AIAnalyzerPanel: React.FC<any> = ({ theme, isDarkMode, addRecord }) => {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio) {
                const status = await window.aistudio.hasSelectedApiKey();
                setHasKey(status);
            }
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setHasKey(true);
        }
    };

    const analyzeChart = async () => {
        if (!image) return;
        setAnalyzing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const base64Parts = image.split(',');
            const base64Data = base64Parts[1];
            const mimeType = base64Parts[0].split(':')[1].split(';')[0];
            
            const prompt = `INSTRUÇÃO DE EXTRAÇÃO DE DADOS TÁTICOS:
            Analise este print de uma corretora de opções binárias/daytrade.
            1. RECONHECIMENTO DE VALORES (OCR): Procure pelo valor da banca atual, valor da última entrada e o Payout (%).
            2. ANÁLISE DE VELAS: Identifique o padrão das últimas 5 velas.
            3. RESULTADO: Determine se a última vela fechou em WIN (Verde) ou LOSS (Vermelha).
            4. PREDICÇÃO: Baseado em Price Action Puro, qual a probabilidade do próximo candle?
            
            RETORNE APENAS JSON:
            {
              "resultado_passado": "WIN" | "LOSS",
              "valor_extraido": número,
              "payout_extraido": número,
              "sinal": "CALL" | "PUT",
              "confianca": "0-100%",
              "justificativa": "Padrão técnico detectado (ex: Engolfo de Alta, Martelo na Suporte)",
              "banca_detectada": número
            }`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: prompt }
                    ]
                },
                config: {
                    systemInstruction: "Você é um Analista Quantitativo Pro para simuladores de trading. Sua missão é ler dados financeiros de prints de tela com precisão de 99% e prever tendências de curto prazo.",
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingBudget: 4000 },
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            resultado_passado: { type: Type.STRING, enum: ["WIN", "LOSS"] },
                            valor_extraido: { type: Type.NUMBER },
                            payout_extraido: { type: Type.NUMBER },
                            sinal: { type: Type.STRING, enum: ["CALL", "PUT"] },
                            confianca: { type: Type.STRING },
                            justificativa: { type: Type.STRING },
                            banca_detectada: { type: Type.NUMBER }
                        },
                        required: ["resultado_passado", "sinal", "confianca"]
                    }
                }
            });

            const data = JSON.parse(response.text.trim());
            setResult(data);
        } catch (err: any) {
            console.error(err);
            setError("ERRO DE LEITURA. CERTIFIQUE-SE QUE O GRÁFICO E OS VALORES ESTÃO LEGÍVEIS NO PRINT.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            {!hasKey && (
                <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <LockClosedIcon className="w-8 h-8 text-amber-500" />
                        <div>
                            <p className="text-sm font-black text-amber-500 uppercase tracking-widest">Radar Sniper Desativado</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">É necessário configurar sua chave do Google AI Studio para usar a Visão Pro.</p>
                        </div>
                    </div>
                    <button onClick={handleSelectKey} className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-full text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-amber-500/20">Ativar Chave HQ</button>
                </div>
            )}

            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter text-white">RADAR <span className="text-emerald-400">SNIPER PRO</span></h2>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 mt-1">Análise Multimodal de Alta Precisão</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${analyzing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] font-black uppercase text-emerald-500/60">Sistemas Online</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Upload e Preview */}
                <div className="lg:col-span-7 space-y-4">
                    <div className={`relative min-h-[400px] rounded-3xl border-2 border-dashed ${theme.border} ${theme.card} overflow-hidden group transition-all hover:border-emerald-500/30`}>
                        {image ? (
                            <>
                                <img src={image} className="w-full h-full object-contain absolute inset-0 bg-black/40" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                <div className="absolute bottom-6 left-6 right-6 grid grid-cols-2 gap-4">
                                    <button onClick={() => {setImage(null); setResult(null);}} className="py-4 bg-rose-500/20 border border-rose-500/30 text-rose-500 text-[10px] font-black uppercase rounded-2xl backdrop-blur-md">Descartar</button>
                                    <button onClick={analyzeChart} disabled={analyzing || !hasKey} className="py-4 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-400 disabled:opacity-20 transition-all">
                                        {analyzing ? 'Escaneando...' : 'Iniciar Sniper'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center gap-6 group">
                                <div className="w-20 h-20 rounded-full bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 group-hover:scale-110 transition-all">
                                    <CpuChipIcon className="w-10 h-10 text-emerald-500/40" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">Carregar Print Técnico</p>
                                    <p className="text-[9px] text-slate-600 font-bold uppercase mt-2">A IA Pro vai ler banca e velas automaticamente</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const r = new FileReader();
                                        r.onloadend = () => { setImage(r.result as string); setResult(null); setError(null); };
                                        r.readAsDataURL(file);
                                    }
                                }} />
                            </label>
                        )}
                        {analyzing && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.8em] animate-pulse">Análise Multimodal</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-2">Identificando Padrões de Price Action</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resultados */}
                <div className="lg:col-span-5 space-y-6">
                    {error && (
                        <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500 text-[10px] font-black uppercase leading-relaxed animate-in shake">
                            {error}
                        </div>
                    )}

                    {result ? (
                        <div className={`p-8 rounded-3xl border ${theme.border} ${theme.card} space-y-8 animate-in zoom-in-95`}>
                            <div className={`p-6 rounded-2xl border-2 text-center space-y-3 ${result.sinal === 'CALL' ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.2)]'}`}>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Predição Sniper</p>
                                <h3 className={`text-5xl font-black italic ${result.sinal === 'CALL' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {result.sinal === 'CALL' ? '↑ CALL' : '↓ PUT'}
                                </h3>
                                <div className="inline-block px-4 py-1.5 bg-black/40 rounded-full border border-white/5">
                                    <span className="text-[11px] font-black text-blue-400 tracking-widest uppercase">Confiança: {result.confianca}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Resultado Lido</p>
                                    <p className={`text-sm font-black ${result.resultado_passado === 'WIN' ? 'text-emerald-400' : 'text-rose-500'}`}>{result.resultado_passado}</p>
                                </div>
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Valor Extraído</p>
                                    <p className="text-sm font-black text-white">R$ {result.valor_extraido || '10.00'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Justificativa Técnica</p>
                                <p className="text-xs font-bold text-slate-400 leading-relaxed italic bg-black/20 p-4 rounded-xl border border-white/5">"{result.justificativa}"</p>
                            </div>

                            <button onClick={() => {
                                addRecord(result.resultado_passado === 'WIN' ? 1 : 0, result.resultado_passado === 'LOSS' ? 1 : 0, result.valor_extraido || 10, result.payout_extraido || 80);
                                setResult(null); setImage(null);
                            }} className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95">Sincronizar com Arsenal</button>
                        </div>
                    ) : !analyzing && (
                        <div className="flex flex-col items-center justify-center p-20 text-center opacity-20 border-2 border-dashed border-white/10 rounded-3xl min-h-[300px]">
                            <TargetIcon className="w-16 h-16 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Aguardando Captura Técnica</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Painel de Controle (Dashboard) ---
const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(0) : '0';
    
    const kpis = [
        { label: 'Capital', val: `${currencySymbol}${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-400' },
        { label: 'Lucro Líquido', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol}${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-500' },
        { label: 'Meta Diária', val: `${((currentProfit / (dailyGoalTarget || 1)) * 100).toFixed(1)}%`, icon: TargetIcon, color: 'text-blue-400' },
        { label: 'Precisão Sniper', val: `${winRate}%`, icon: TrophyIcon, color: 'text-fuchsia-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Painel de <span className="text-emerald-400">Comando</span></h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-1">Status Geral do Arsenal</p>
                </div>
                <div className="flex items-center gap-4">
                    <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`px-5 py-2.5 rounded-2xl border text-[10px] font-black uppercase outline-none transition-all ${theme.input}`} />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-6 rounded-3xl border ${theme.card} flex flex-col justify-between hover:border-emerald-500/20 transition-all group`}>
                        <div className="flex justify-between items-start">
                            <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{kpi.label}</p>
                            <kpi.icon className={`w-5 h-5 ${kpi.color} opacity-30 group-hover:opacity-100 transition-all`} />
                        </div>
                        <p className={`text-2xl font-black ${kpi.color} tracking-tighter mt-4`}>{kpi.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className={`lg:col-span-7 p-8 rounded-3xl border ${theme.card} space-y-8 shadow-2xl`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-emerald-400 tracking-[0.3em]">Operação Manual</h3>
                        <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase">Input Direto</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Valor</label>
                            <input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border text-sm font-black outline-none ${theme.input}`} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Payout %</label>
                            <input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border text-sm font-black outline-none ${theme.input}`} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Ciclos</label>
                            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-14 px-6 rounded-2xl border text-sm font-black outline-none ${theme.input}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <button onClick={() => addRecord(parseInt(quantity), 0, parseFloat(customEntryValue), parseFloat(customPayout))} className="py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95">HIT (VITÓRIA)</button>
                        <button onClick={() => addRecord(0, parseInt(quantity), parseFloat(customEntryValue), parseFloat(customPayout))} className="py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-rose-600/20 transition-all active:scale-95">MISS (DERROTA)</button>
                    </div>
                </div>

                <div className={`lg:col-span-5 p-8 rounded-3xl border ${theme.card} flex flex-col h-[400px]`}>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-black uppercase text-blue-400 tracking-[0.3em]">Diário Tático</h3>
                        <ListBulletIcon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             [...dailyRecordForSelectedDay.trades].reverse().map((trade) => (
                                <div key={trade.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 group hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-1 h-8 rounded-full ${trade.result === 'win' ? 'bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`} />
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            <p className="text-[11px] font-black uppercase italic text-white">{trade.result === 'win' ? 'Execução Perfeita' : 'Zona de Perda'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[13px] font-black ${trade.result === 'win' ? 'text-emerald-400' : 'text-rose-500'}`}>{trade.result === 'win' ? '+' : '-'}{currencySymbol}{formatMoney(trade.entryValue * (trade.result === 'win' ? (trade.payoutPercentage/100) : 1))}</span>
                                        <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="p-2 text-rose-500/20 hover:text-rose-500 transition-all"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                             ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-10">
                                <DocumentTextIcon className="w-12 h-12 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sem Registros</p>
                            </div>
                        )}
                    </div>
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
    const [isLoading, setIsLoading] = useState(true);
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const latestDataRef = useRef({ userId: user.id, brokerages, records });
    useEffect(() => { latestDataRef.current = { userId: user.id, brokerages, records }; }, [user.id, brokerages, records]);
    
    const activeBrokerage = brokerages[0];

    useEffect(() => {
        if (!activeBrokerage) return;
        const dateKey = selectedDate.toISOString().split('T')[0];
        const dailyRecordForSelectedDay = records.find((r): r is DailyRecord => r.id === dateKey && r.recordType === 'day');
        const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateKey).sort((a,b) => b.id.localeCompare(a.id));
        const startBal = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);
        const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBal;
        const suggestedValue = activeBrokerage.entryMode === 'fixed' ? activeBrokerage.entryValue : currentBalance * (activeBrokerage.entryValue / 100);
        setCustomEntryValue(String(suggestedValue.toFixed(2)));
        setCustomPayout(String(activeBrokerage.payoutPercentage));
    }, [activeBrokerage, records, selectedDate]);

    const recalibrateHistory = useCallback((allRecords: AppRecord[], initialBal: number) => {
        let runningBalance = initialBal;
        return [...allRecords].sort((a, b) => a.id.localeCompare(b.id)).map(r => {
            if (r.recordType !== 'day') return r;
            const daily = r as DailyRecord;
            const netProfitUSD = daily.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
            const endBalanceUSD = runningBalance + netProfitUSD;
            const updated = { ...daily, startBalanceUSD: runningBalance, winCount: daily.trades.filter(t => t.result === 'win').length, lossCount: daily.trades.filter(t => t.result === 'loss').length, netProfitUSD, endBalanceUSD };
            runningBalance = endBalanceUSD; return updated;
        });
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                setBrokerages(data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'HQ Alpha', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }]);
                setRecords(data.records || []);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [user.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveData = useCallback(async () => {
        setSavingStatus('saving');
        try {
            const payload = { userId: latestDataRef.current.userId, brokerages: latestDataRef.current.brokerages, records: latestDataRef.current.records, goals: [] };
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
            
            const entryValue = customEntry !== undefined ? customEntry : (brokerages[0].entryValue);
            const payout = customPayout !== undefined ? customPayout : brokerages[0].payoutPercentage;
            
            const newTrades: Trade[] = [];
            for(let i=0; i<win; i++) newTrades.push({ id: crypto.randomUUID(), result: 'win', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            for(let i=0; i<loss; i++) newTrades.push({ id: crypto.randomUUID(), result: 'loss', entryValue, payoutPercentage: payout, timestamp: Date.now() });
            const existingIdx = prev.findIndex(r => r.id === dateKey && r.recordType === 'day');
            let updatedRecords = [...prev];
            if (existingIdx >= 0) { const rec = updatedRecords[existingIdx] as DailyRecord; updatedRecords[existingIdx] = { ...rec, trades: [...rec.trades, ...newTrades] }; }
            else { updatedRecords.push({ recordType: 'day', brokerageId: brokerages[0].id, id: dateKey, date: dateKey, trades: newTrades, startBalanceUSD: 0, winCount: 0, lossCount: 0, netProfitUSD: 0, endBalanceUSD: 0 }); }
            const recalibrated = recalibrateHistory(updatedRecords, brokerages[0].initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        if(!confirm("Deletar este registro tático?")) return;
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, brokerages[0].initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.3)]" /></div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/90 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-all duration-500 ${isDarkMode ? 'bg-[#020617] border-white/5' : 'bg-white border-slate-200'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 border-b border-white/5">
                    <h1 className="text-xl font-black italic tracking-tighter uppercase"><span className="text-emerald-500">HRK</span> Sniper</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {[
                        { id: 'dashboard', label: 'Painel HQ', icon: LayoutGridIcon },
                        { id: 'ai', label: 'Radar Sniper', icon: CpuChipIcon },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => {setActiveTab(tab.id); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] uppercase font-black tracking-[0.2em] transition-all ${activeTab === tab.id ? theme.navActive : theme.navInactive}`}>
                            <tab.icon className="w-5 h-5" />{tab.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-white/5">
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-5 py-3.5 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500/10 rounded-2xl transition-all"><LogoutIcon className="w-5 h-5" />Encerrar Sessão</button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex items-center justify-between px-8 border-b border-white/5 backdrop-blur-2xl z-30`}>
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-3 bg-white/5 rounded-2xl"><MenuIcon className="w-6 h-6" /></button>
                        <div className="flex items-center gap-3">
                             <div className={`w-2 h-2 rounded-full ${savingStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                             <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                {savingStatus === 'saving' ? 'Salvando Nuvem' : 'Sincronizado'}
                             </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">{isDarkMode ? <SunIcon className="w-5 h-5 text-amber-400" /> : <MoonIcon className="w-5 h-5 text-emerald-400" />}</button>
                        <div className="flex items-center gap-3 pl-6 border-l border-white/5">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-black text-white uppercase">{user.username}</p>
                                <p className="text-[8px] font-black text-emerald-500 uppercase">Status: Sniper Elite</p>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20">{user.username.slice(0, 2).toUpperCase()}</div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 pb-20">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={100} />}
                    {activeTab === 'ai' && <AIAnalyzerPanel theme={theme} isDarkMode={isDarkMode} addRecord={addRecord} />}
                </div>
            </main>
        </div>
    );
};

export default App;
