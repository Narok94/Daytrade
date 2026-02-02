
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

// --- AI Analyzer Panel ---
const AIAnalyzerPanel: React.FC<any> = ({ theme, isDarkMode, addRecord }) => {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeChart = async () => {
        if (!image) return;
        setAnalyzing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const parts = image.split(',');
            const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
            const base64Data = parts[1];
            
            const prompt = `ANALISE VISUAL DE CANDLESTICKS (VELAS):
            Localize as velas no gráfico. Determine o resultado da operação focando apenas na ação do preço e cores das velas (Verde/Vermelha).
            Ignore menus, botões de compra/venda e marcas d'água da corretora.
            Extraia em JSON:
            1. "resultado_detectado": "WIN" (vela verde/preço acima) ou "LOSS" (vela vermelha/preço abaixo).
            2. "valor_detectado": Valor numérico da aposta/entrada.
            3. "payout_detectado": Porcentagem de lucro exibida.
            4. "par_moedas": Nome do par ativo.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: prompt }
                    ]
                },
                config: {
                    systemInstruction: "Você é um especialista em leitura de padrões de velas (candlesticks). Sua tarefa é ignorar ruídos de interface e focar 100% no gráfico de preços e nas cores das velas para determinar o resultado do trade.",
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingBudget: 0 },
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            resultado_detectado: { type: Type.STRING, enum: ["WIN", "LOSS"] },
                            valor_detectado: { type: Type.NUMBER },
                            payout_detectado: { type: Type.NUMBER },
                            par_moedas: { type: Type.STRING }
                        },
                        required: ["resultado_detectado", "valor_detectado", "payout_detectado"]
                    }
                }
            });

            if (!response.text) throw new Error("A IA não retornou conteúdo.");
            
            const data = JSON.parse(response.text.trim());
            setResult(data);
        } catch (err: any) {
            console.error("Radar critical error:", err);
            setError("ERRO DE CONEXÃO RADAR. VERIFIQUE SE O PRINT MOSTRA AS VELAS COM CLAREZA E TENTE NOVAMENTE.");
        } finally {
            setAnalyzing(false);
        }
    };

    const syncWithLedger = () => {
        if (!result) return;
        const res = result.resultado_detectado?.toUpperCase();
        addRecord(
            res === 'WIN' ? 1 : 0, 
            res === 'LOSS' ? 1 : 0, 
            result.valor_detectado || 10, 
            result.payout_detectado || 80
        );
        alert("Arsenal Sincronizado com Sucesso!");
        setResult(null);
        setImage(null);
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                <h2 className={`text-lg font-black tracking-tight ${theme.text}`}>Radar <span className="text-emerald-400 italic">Sniper</span></h2>
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${analyzing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/60">
                        {analyzing ? 'Escaneando Velas' : 'Radar Pronto'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 ${theme.roundedCard} border border-dashed ${theme.border} ${theme.card} flex flex-col items-center justify-center min-h-[280px]`}>
                    {image ? (
                        <div className="w-full flex flex-col gap-3">
                            <img src={image} className="w-full h-40 object-contain rounded-lg bg-black/20" />
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setImage(null)} className="py-2 text-[9px] font-black uppercase bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all">Descartar</button>
                                <button onClick={analyzeChart} disabled={analyzing} className="py-2 text-[9px] font-black uppercase bg-emerald-500 text-slate-950 rounded-lg disabled:opacity-50 hover:bg-emerald-400 transition-all">
                                    {analyzing ? 'Lendo Gráfico...' : 'Iniciar Scan'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-3 py-10 w-full group">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <PlusIcon className="w-6 h-6 text-emerald-500/40" />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Subir Print do Gráfico</p>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    )}
                </div>

                <div className="space-y-3">
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-[9px] font-black uppercase leading-tight tracking-widest animate-in shake">
                            {error}
                        </div>
                    )}

                    {result ? (
                        <div className={`p-5 ${theme.roundedCard} border border-emerald-500/20 ${theme.card} space-y-4 shadow-2xl animate-in zoom-in-95`}>
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className={`text-xl font-black italic tracking-tighter ${result.resultado_detectado === 'WIN' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {result.resultado_detectado === 'WIN' ? 'ALVO ATINGIDO' : 'MISSÃO FALHA'}
                                </span>
                                <span className="text-[10px] font-black text-blue-400 px-2 py-1 bg-blue-500/5 rounded border border-blue-500/10">{result.par_moedas || 'ATIVO'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                                    <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Entrada</p>
                                    <p className="text-base font-black">R$ {result.valor_detectado || '0'}</p>
                                </div>
                                <div className="p-3 bg-black/40 rounded-lg border border-white/5">
                                    <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Payout</p>
                                    <p className="text-base font-black text-emerald-400">{result.payout_detectado || '0'}%</p>
                                </div>
                            </div>
                            <button onClick={syncWithLedger} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">Sincronizar Arsenal</button>
                        </div>
                    ) : !analyzing && (
                        <div className="p-10 border border-slate-800/30 rounded-xl bg-slate-900/10 text-center opacity-30 flex flex-col items-center min-h-[180px] justify-center">
                            <CpuChipIcon className="w-8 h-8 mb-2" />
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]">Aguardando Captura</p>
                        </div>
                    )}
                    {analyzing && (
                         <div className="h-44 w-full bg-slate-900/20 rounded-xl border border-emerald-500/10 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent animate-pulse" />
                            <ArrowPathIcon className="w-8 h-8 text-emerald-500/30 animate-spin mb-3" />
                            <p className="text-[8px] font-black uppercase tracking-[0.5em] text-emerald-500/40">Analisando Candlesticks</p>
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
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(0) : '0';
    
    const kpis = [
        { label: 'Arsenal', val: `${currencySymbol}${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-400' },
        { label: 'Hoje', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol}${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-500' },
        { label: 'Meta', val: `${((currentProfit / (dailyGoalTarget || 1)) * 100).toFixed(0)}%`, icon: TargetIcon, color: 'text-blue-400' },
        { label: 'Assertividade', val: `${winRate}%`, icon: TrophyIcon, color: 'text-fuchsia-400' },
    ];

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className={`text-lg font-black tracking-tight ${theme.text} uppercase`}>Painel <span className="text-emerald-400">Geral</span></h2>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`text-[10px] font-black px-3 py-1.5 rounded-lg border focus:outline-none ${theme.input}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-4 ${theme.roundedCard} border ${theme.card} shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all`}>
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-[8px] uppercase font-black text-slate-500 tracking-widest">{kpi.label}</p>
                            <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                        </div>
                        <p className={`text-base font-black ${kpi.color} tracking-tight`}>{kpi.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`p-5 ${theme.roundedCard} border ${theme.card}`}>
                    <h3 className="text-[9px] font-black uppercase text-emerald-400/80 mb-4 tracking-widest">Registrar Disparo</h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="space-y-1"><label className="text-[7px] font-bold text-slate-500 uppercase ml-1">Valor</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-9 px-3 rounded-lg border text-[11px] font-black outline-none ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[7px] font-bold text-slate-500 uppercase ml-1">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-9 px-3 rounded-lg border text-[11px] font-black outline-none ${theme.input}`} /></div>
                        <div className="space-y-1"><label className="text-[7px] font-bold text-slate-500 uppercase ml-1">Qtde</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-9 px-3 rounded-lg border text-[11px] font-black outline-none ${theme.input}`} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleQuickAdd('win')} className="py-2.5 bg-emerald-500 text-slate-950 font-black rounded-lg text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">HIT (WIN)</button>
                        <button onClick={() => handleQuickAdd('loss')} className="py-2.5 bg-rose-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">MISS (LOSS)</button>
                    </div>
                </div>

                <div className={`p-5 ${theme.roundedCard} border ${theme.card} flex flex-col h-full`}>
                    <h3 className="text-[9px] font-black uppercase text-blue-400/80 mb-4 tracking-widest">Logs Diários</h3>
                    <div className="flex-1 overflow-y-auto max-h-[200px] space-y-2 pr-2 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             [...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                const profit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                return (
                                    <div key={trade.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1 h-5 rounded-full ${trade.result === 'win' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                                            <div>
                                                <p className="text-[7px] font-bold text-slate-500">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                <p className="text-[10px] font-black uppercase italic">{trade.result === 'win' ? 'Hit' : 'Miss'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[11px] font-black ${profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{profit >= 0 ? '+' : ''}{currencySymbol}{formatMoney(profit)}</span>
                                            <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                );
                             })
                        ) : (
                            <div className="text-center py-8 opacity-40">
                                <p className="text-[9px] font-black uppercase tracking-widest italic">Sem dados hoje.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Painéis Compactos Stubs ---
const CompoundInterestPanel = ({ isDarkMode, activeBrokerage, records }: any) => {
    const theme = useThemeClasses(isDarkMode);
    return <div className="p-6 max-w-5xl mx-auto text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Módulo de Escalada em Manutenção Sniper</div>;
};
const ReportPanel = ({ isDarkMode, activeBrokerage, records }: any) => {
    const theme = useThemeClasses(isDarkMode);
    return <div className="p-6 max-w-5xl mx-auto text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Arquivos Operacionais em Manutenção Sniper</div>;
};
const SorosCalculatorPanel = ({ theme }: any) => {
    return <div className="p-6 max-w-5xl mx-auto text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Calculadora Soros Elite em Manutenção Sniper</div>;
};
const GoalsPanel = ({ theme }: any) => {
    return <div className="p-6 max-w-5xl mx-auto text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Gestão de Missões em Manutenção Sniper</div>;
};

const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset }) => {
    const updateBrokerage = (field: keyof Brokerage, value: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: value } : b));
    };
    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
            <h2 className="text-lg font-black uppercase tracking-tight">Comando <span className="text-emerald-400">HQ</span></h2>
            <div className={`p-6 border ${theme.border} ${theme.roundedCard} ${theme.card} space-y-5 shadow-sm`}>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Identidade</label><input type="text" value={brokerage.name} onChange={e => updateBrokerage('name', e.target.value)} className={`w-full h-10 px-4 rounded-lg border text-xs font-bold ${theme.input}`} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Câmbio</label><select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-10 px-4 rounded-lg border text-xs font-bold ${theme.input}`}><option value="USD">Dólar ($)</option><option value="BRL">Real (R$)</option></select></div>
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Arsenal Base</label><input type="number" value={brokerage.initialBalance} onChange={e => updateBrokerage('initialBalance', parseFloat(e.target.value))} className={`w-full h-10 px-4 rounded-lg border text-xs font-bold ${theme.input}`} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Payout Médio</label><input type="number" value={brokerage.payoutPercentage} onChange={e => updateBrokerage('payoutPercentage', parseInt(e.target.value))} className={`w-full h-10 px-4 rounded-lg border text-xs font-bold ${theme.input}`} /></div>
                </div>
                <button onClick={onReset} className="w-full py-3 bg-rose-500/5 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all">Protocolo Wipe Total</button>
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
            runningBalance = endBalanceUSD; return updated;
        });
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-data?userId=${user.id}&_=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Alpha Sniper', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
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
        if(!confirm("Deletar registro?")) return;
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, brokerages[0].initialBalance);
            debouncedSave(); return recalibrated;
        });
    };

    const handleReset = () => {
        if(confirm("Deseja resetar tudo?")) { setRecords([]); debouncedSave(); }
    };

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            
            <aside className={`fixed inset-y-0 left-0 z-50 w-48 flex flex-col border-r transition-all duration-300 ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-14 flex items-center px-6 border-b border-slate-800/40">
                    <h1 className="text-xs font-black italic text-emerald-400 tracking-tighter">HRK SNIPER</h1>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {[
                        { id: 'dashboard', label: 'Painel', icon: LayoutGridIcon },
                        { id: 'ai', label: 'Radar', icon: CpuChipIcon },
                        { id: 'compound', label: 'Escalada', icon: ChartBarIcon },
                        { id: 'report', label: 'Arquivos', icon: DocumentTextIcon },
                        { id: 'soros', label: 'Soros', icon: CalculatorIcon },
                        { id: 'goals', label: 'Missões', icon: TargetIcon },
                        { id: 'settings', label: 'HQ', icon: SettingsIcon }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => {setActiveTab(tab.id); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[9px] uppercase font-black transition-all ${activeTab === tab.id ? theme.navActive : theme.navInactive}`}>
                            <tab.icon className="w-3.5 h-3.5" />{tab.label}
                        </button>
                    ))}
                </nav>
                <div className="p-3 border-t border-slate-800/40">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-rose-500 font-black text-[9px] uppercase hover:bg-rose-500/10 rounded-lg transition-all"><LogoutIcon className="w-3.5 h-3.5" />Sair</button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-14 flex items-center justify-between px-6 border-b ${theme.header}`}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-1.5 bg-slate-900 rounded-lg border border-slate-800"><MenuIcon className="w-4 h-4" /></button>
                        <SavingStatusIndicator status={savingStatus} />
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-emerald-500/40 transition-colors">{isDarkMode ? <SunIcon className="w-3.5 h-3.5 text-amber-400" /> : <MoonIcon className="w-3.5 h-3.5 text-emerald-400" />}</button>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-[11px] shadow-[0_0_15px_rgba(16,185,129,0.3)]">{user.username.slice(0, 1).toUpperCase()}</div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={100} />}
                    {activeTab === 'ai' && <AIAnalyzerPanel theme={theme} isDarkMode={isDarkMode} addRecord={addRecord} />}
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'report' && <ReportPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} />}
                    {activeTab === 'goals' && <GoalsPanel theme={theme} />}
                    {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onReset={handleReset} />}
                </div>
            </main>
        </div>
    );
};

const SavingStatusIndicator: React.FC<{status: string}> = ({status}) => {
    if (status === 'saving') return <div className="text-[8px] font-black uppercase text-slate-500 animate-pulse tracking-widest">Sincronizando...</div>;
    if (status === 'saved') return <div className="text-[8px] font-black uppercase text-emerald-500/60 tracking-widest">Seguro</div>;
    return null;
};

export default App;
