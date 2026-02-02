
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
    PlusIcon, TrashIcon, CpuChipIcon, LockClosedIcon
} from './components/icons';

// --- Helper Functions ---
const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useThemeClasses = (isDarkMode: boolean) => {
    return useMemo(() => ({
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-50' : 'text-slate-900',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900/60 border-slate-800/40 backdrop-blur-md' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800/50' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800/50' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-emerald-50 text-emerald-600',
        navInactive: isDarkMode ? 'text-slate-500 hover:text-emerald-400 hover:bg-slate-900/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
        roundedCard: 'rounded-xl', 
    }), [isDarkMode]);
};

// --- Radar Sniper Panel (VISÃO PRO ATIVADA) ---
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
            // Cria instância sempre antes da chamada para pegar a chave atual
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const base64Parts = image.split(',');
            if (base64Parts.length < 2) throw new Error("Imagem corrompida.");
            const base64Data = base64Parts[1];
            const mimeType = base64Parts[0].split(':')[1].split(';')[0];
            
            const prompt = `MISSÃO DE RECONHECIMENTO VISUAL (GAME ENGINE):
            Você é o processador central do HRK Sniper.
            1. FOCO NO GRÁFICO: Ignore barra de tarefas, logos e marcas d'água.
            2. PADRÕES DETECTADOS: Identifique a cor da última vela fechada.
            3. ANÁLISE PREDITIVA: Com base na ação do preço (Price Action), determine se a próxima vela será CALL (Verde) ou PUT (Vermelha).
            
            SAÍDA JSON PURA:
            {
              "resultado_passado": "WIN" (se última foi verde) ou "LOSS" (se última foi vermelha),
              "valor": 10,
              "payout": 80,
              "sinal_proxima": "CALL" ou "PUT",
              "confianca": "porcentagem de acerto",
              "analise_curta": "Explicação técnica do padrão de candlestick"
            }`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview', // Modelo Pro para Visão
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: prompt }
                    ]
                },
                config: {
                    systemInstruction: "Você é um interpretador de dados para um simulador de trading. Sua tarefa é converter padrões visuais de candles em decisões lógicas de CALL/PUT. Foque exclusivamente no gráfico de preços.",
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingBudget: 4000 },
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            resultado_passado: { type: Type.STRING, enum: ["WIN", "LOSS"] },
                            valor: { type: Type.NUMBER },
                            payout: { type: Type.NUMBER },
                            sinal_proxima: { type: Type.STRING, enum: ["CALL", "PUT"] },
                            confianca: { type: Type.STRING },
                            analise_curta: { type: Type.STRING }
                        },
                        required: ["resultado_passado", "sinal_proxima"]
                    }
                }
            });

            if (!response.text) throw new Error("A IA não retornou dados.");
            const data = JSON.parse(response.text.trim());
            setResult(data);
        } catch (err: any) {
            console.error("Critical AI Error:", err);
            if (err.message?.includes("Requested entity was not found")) {
                setError("CHAVE API INVÁLIDA OU NÃO ENCONTRADA. POR FAVOR, SELECIONE NOVAMENTE.");
                setHasKey(false);
            } else {
                setError("FALHA NA ANÁLISE TÁTICA. O GRÁFICO PODE ESTAR MUITO POLUÍDO OU O MODELO BLOQUEOU POR SEGURANÇA.");
            }
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500">
            {!hasKey && (
                <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <LockClosedIcon className="w-6 h-6 text-amber-500" />
                        <div>
                            <p className="text-[11px] font-black uppercase text-amber-500 tracking-widest">Radar Desativado</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">É necessário selecionar uma chave API de faturamento para usar o motor Pro.</p>
                        </div>
                    </div>
                    <button onClick={handleSelectKey} className="px-6 py-2.5 bg-amber-500 text-slate-950 font-black rounded-full text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all">Configurar Chave</button>
                </div>
            )}

            <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                <h2 className={`text-lg font-black tracking-tight ${theme.text}`}>Radar <span className="text-emerald-400 italic">Sniper Pro</span></h2>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${analyzing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/60 uppercase">Motor Multimodal Online</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 ${theme.roundedCard} border border-dashed ${theme.border} ${theme.card} flex flex-col items-center justify-center min-h-[360px]`}>
                    {image ? (
                        <div className="w-full space-y-4">
                            <img src={image} className="w-full h-60 object-contain rounded-lg bg-black/40 border border-white/5 shadow-2xl" />
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => {setImage(null); setResult(null);}} className="py-2.5 text-[9px] font-black uppercase bg-rose-500/10 text-rose-500 rounded-lg">Descartar</button>
                                <button onClick={analyzeChart} disabled={analyzing || !hasKey} className="py-2.5 text-[9px] font-black uppercase bg-emerald-500 text-slate-950 rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-30">
                                    {analyzing ? 'Processando Visão...' : 'Escanear Gráfico'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-4 py-24 w-full group">
                            <CpuChipIcon className="w-16 h-16 text-emerald-500/20 group-hover:text-emerald-500/50 transition-all" />
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Carregar Print da Corretora</p>
                                <p className="text-[8px] font-bold text-slate-600 mt-2 uppercase">A IA Pro vai ignorar a interface e ler as velas</p>
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
                </div>

                <div className="space-y-4">
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest leading-tight animate-in shake">
                            {error}
                        </div>
                    )}
                    {result ? (
                        <div className={`p-6 ${theme.roundedCard} border border-emerald-500/20 ${theme.card} space-y-6 shadow-2xl animate-in zoom-in-95`}>
                            <div className={`p-6 rounded-xl border-2 flex flex-col items-center text-center ${result.sinal_proxima === 'CALL' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.3)]' : 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.3)]'}`}>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.5em] mb-2">Estratégia Recomendada</p>
                                <h3 className={`text-5xl font-black italic tracking-tighter ${result.sinal_proxima === 'CALL' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {result.sinal_proxima === 'CALL' ? '↑ COMPRA' : '↓ VENDA'}
                                </h3>
                                <div className="mt-4 px-5 py-2 bg-black/60 rounded-full border border-white/10">
                                    <span className="text-[12px] font-black text-blue-400 tracking-widest uppercase">Assertividade: {result.confianca}</span>
                                </div>
                                <p className="mt-5 text-[11px] font-bold text-slate-400 italic px-4 leading-tight">"{result.analise_curta}"</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                    <p className="text-[8px] text-slate-500 font-black uppercase">Último Fechamento</p>
                                    <p className={`text-sm font-black italic ${result.resultado_passado === 'WIN' ? 'text-emerald-400' : 'text-rose-500'}`}>{result.resultado_passado}</p>
                                </div>
                                <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                    <p className="text-[8px] text-slate-500 font-black uppercase">Capital Base</p>
                                    <p className="text-sm font-black">R$ {result.valor}</p>
                                </div>
                            </div>
                            <button onClick={() => {
                                addRecord(result.resultado_passado === 'WIN' ? 1 : 0, result.resultado_passado === 'LOSS' ? 1 : 0, result.valor, result.payout || 80);
                                setResult(null); setImage(null);
                            }} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95">Sincronizar Dados</button>
                        </div>
                    ) : !analyzing && <div className="p-20 border border-slate-800/20 rounded-2xl bg-slate-900/5 text-center opacity-30 flex flex-col items-center justify-center min-h-[280px]"><TargetIcon className="w-14 h-14 mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.5em]">Aguardando Captura</p></div>}
                    {analyzing && <div className="h-80 w-full bg-slate-900/60 rounded-2xl border border-emerald-500/20 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent animate-scan" />
                        <ArrowPathIcon className="w-14 h-14 text-emerald-500/40 animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.7em] text-emerald-500/60">Análise Multimodal Pro</p>
                        <style>{`
                            @keyframes scan { 0% { top: -100%; } 100% { top: 100%; } }
                            .animate-scan { position: absolute; height: 100%; width: 100%; animation: scan 2s linear infinite; }
                        `}</style>
                    </div>}
                </div>
            </div>
        </div>
    );
};

// --- Dashboard Panel (Mantido com melhorias) ---
const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = dailyRecordForSelectedDay?.endBalanceUSD ?? startBalanceForSelectedDay;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(0) : '0';
    
    const kpis = [
        { label: 'Arsenal', val: `${currencySymbol}${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-400' },
        { label: 'Hoje', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol}${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-500' },
        { label: 'Meta', val: `${((currentProfit / (dailyGoalTarget || 1)) * 100).toFixed(0)}%`, icon: TargetIcon, color: 'text-blue-400' },
        { label: 'Precisão', val: `${winRate}%`, icon: TrophyIcon, color: 'text-fuchsia-400' },
    ];

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter">Painel <span className="text-emerald-400 italic">Geral</span></h2>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`text-[10px] font-black px-4 py-2 rounded-xl border outline-none ${theme.input}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-5 ${theme.roundedCard} border ${theme.card} shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-all`}>
                        <div className="flex justify-between items-start mb-2"><p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{kpi.label}</p><kpi.icon className={`w-4 h-4 ${kpi.color}`} /></div>
                        <p className={`text-lg font-black ${kpi.color} tracking-tight`}>{kpi.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-6 ${theme.roundedCard} border ${theme.card}`}>
                    <h3 className="text-[10px] font-black uppercase text-emerald-400/80 mb-5 tracking-[0.2em]">Disparo de Precisão</h3>
                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <div className="space-y-1.5"><label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Valor</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-11 px-4 rounded-xl border text-[12px] font-black outline-none ${theme.input}`} /></div>
                        <div className="space-y-1.5"><label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-11 px-4 rounded-xl border text-[12px] font-black outline-none ${theme.input}`} /></div>
                        <div className="space-y-1.5"><label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Qtde</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-11 px-4 rounded-xl border text-[12px] font-black outline-none ${theme.input}`} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => addRecord(parseInt(quantity), 0, parseFloat(customEntryValue), parseFloat(customPayout))} className="py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">HIT (WIN)</button>
                        <button onClick={() => addRecord(0, parseInt(quantity), parseFloat(customEntryValue), parseFloat(customPayout))} className="py-3.5 bg-rose-600 text-white font-black rounded-xl text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">MISS (LOSS)</button>
                    </div>
                </div>

                <div className={`p-6 ${theme.roundedCard} border ${theme.card} flex flex-col h-[280px]`}>
                    <h3 className="text-[10px] font-black uppercase text-blue-400/80 mb-5 tracking-[0.2em]">Registro Tático</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             [...dailyRecordForSelectedDay.trades].reverse().map((trade) => (
                                <div key={trade.id} className={`flex items-center justify-between p-3 rounded-xl border bg-black/10 ${theme.border}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-6 rounded-full ${trade.result === 'win' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} />
                                        <div>
                                            <p className="text-[8px] font-bold text-slate-500">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            <p className="text-[10px] font-black uppercase italic">{trade.result === 'win' ? 'Hit' : 'Miss'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[12px] font-black ${trade.result === 'win' ? 'text-emerald-400' : 'text-rose-500'}`}>{trade.result === 'win' ? '+' : '-'}{currencySymbol}{formatMoney(trade.entryValue * (trade.result === 'win' ? (trade.payoutPercentage/100) : 1))}</span>
                                        <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="p-2 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                             ))
                        ) : <div className="text-center py-16 opacity-20 text-[10px] font-black uppercase tracking-[0.4em] italic">Vazio tático</div>}
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
        return [...allRecords].sort((a, b) => a.id.localeCompare(b.id)).map(r => {
            if (r.recordType !== 'day') return r;
            const daily = r as DailyRecord;
            const winCount = daily.trades.filter(t => t.result === 'win').length;
            const lossCount = daily.trades.filter(t => t.result === 'loss').length;
            const netProfitUSD = daily.trades.reduce((acc, t) => acc + (t.result === 'win' ? t.entryValue * (t.payoutPercentage / 100) : -t.entryValue), 0);
            const endBalanceUSD = runningBalance + netProfitUSD;
            const updated = { ...daily, startBalanceUSD: runningBalance, winCount, lossCount, netProfitUSD, endBalanceUSD };
            runningBalance = endBalanceUSD; return updated;
        });
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Alpha Sniper HQ', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
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
            
            const entryValue = customEntry !== undefined ? customEntry : (brokerages[0].entryMode === 'fixed' ? brokerages[0].entryValue : currentBalance * (brokerages[0].entryValue / 100));
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
        if(!confirm("Deseja deletar este registro tático?")) return;
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, brokerages[0].initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.3)]" /></div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/95 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            
            <aside className={`fixed inset-y-0 left-0 z-50 w-48 flex flex-col border-r transition-all duration-300 ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-16 flex items-center px-8 border-b border-slate-800/40 font-black italic text-emerald-400 text-sm tracking-tighter uppercase">HRK Sniper</div>
                <nav className="flex-1 p-3 space-y-1">
                    {[
                        { id: 'dashboard', label: 'Painel', icon: LayoutGridIcon },
                        { id: 'ai', label: 'Radar Sniper', icon: CpuChipIcon },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => {setActiveTab(tab.id); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-wide transition-all ${activeTab === tab.id ? theme.navActive : theme.navInactive}`}>
                            <tab.icon className="w-4.5 h-4.5" />{tab.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800/40">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-500 font-black text-[10px] uppercase tracking-wide hover:bg-rose-500/10 rounded-xl transition-all"><LogoutIcon className="w-4.5 h-4.5" />Sair</button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-16 flex items-center justify-between px-8 border-b ${theme.header} backdrop-blur-xl`}>
                    <div className="flex items-center gap-5">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 bg-slate-900/50 rounded-xl border border-slate-800/50"><MenuIcon className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${savingStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                             <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                {savingStatus === 'saving' ? 'Sincronizando...' : 'Arsenal Seguro'}
                             </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/50 hover:border-emerald-500/30 transition-all">{isDarkMode ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4 text-emerald-400" />}</button>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-[11px] shadow-[0_0_15px_rgba(16,185,129,0.2)]">{user.username.slice(0, 2).toUpperCase()}</div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5 pb-10">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={100} />}
                    {activeTab === 'ai' && <AIAnalyzerPanel theme={theme} isDarkMode={isDarkMode} addRecord={addRecord} />}
                </div>
            </main>
        </div>
    );
};

export default App;
