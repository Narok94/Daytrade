import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal, AIAnalysisResult } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
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
        navActive: isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- AI Analysis Panel (Sniper Assertivo v5) ---
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
                resolve(canvas.toDataURL('image/jpeg', 0.8));
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
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: `SISTEMA SNIPER V5 (M1): Analise o gatilho agressivo. Retorne JSON.` },
                    ],
                },
                config: {
                    systemInstruction: "Você é um trader profissional M1. Analise fluxo e Price Action. Responda apenas com o JSON.",
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
            if (!text) throw new Error("IA Inativa.");
            setAnalysisResult(JSON.parse(text));
        } catch (err: any) {
            console.error(err);
            setError("Erro na análise. Tente novamente.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20"><CpuChipIcon className="w-8 h-8 text-teal-400" /></div>
                    <div><h2 className={`text-2xl font-black ${theme.text}`}>Scanner Sniper v5</h2><p className={theme.textMuted}>Análise agressiva e assertiva focada em Price Action M1.</p></div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 rounded-3xl border ${theme.card} flex flex-col`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><TargetIcon className="w-5 h-5 text-teal-400" /> Captura do Gráfico</h3>
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-6 min-h-[350px] bg-slate-950/20">
                        {!selectedImage ? (
                            <label className="cursor-pointer flex flex-col items-center gap-4 text-center">
                                <div className="w-20 h-20 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20"><PlusIcon className="w-10 h-10" /></div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                <p className="font-black text-white uppercase text-[10px]">Analisar Imagem</p>
                            </label>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center gap-4">
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black">
                                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                                    {isAnalyzing && <div className="absolute inset-0 bg-teal-950/80 flex items-center justify-center"><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}
                                </div>
                                <div className="flex gap-4 w-full">
                                    <button onClick={() => setSelectedImage(null)} className="flex-1 py-4 text-[10px] font-black uppercase rounded-2xl border border-slate-800">Limpar</button>
                                    <button disabled={isAnalyzing} onClick={runAIAnalysis} className="flex-[2] py-4 text-[10px] font-black uppercase rounded-2xl bg-teal-500 text-slate-950">Analisar Gatilho</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className={`p-6 rounded-3xl border ${theme.card} flex flex-col`}>
                    <h3 className="font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60"><CpuChipIcon className="w-5 h-5 text-purple-400" /> Relatório Sniper</h3>
                    {analysisResult ? (
                        <div className="space-y-6">
                            <div className={`p-6 rounded-3xl border-2 flex items-center justify-between ${analysisResult.recommendation === 'CALL' ? 'bg-green-500/10 border-green-500/30' : analysisResult.recommendation === 'PUT' ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/20 border-slate-700'}`}>
                                <div><p className="text-[10px] font-black uppercase opacity-60 mb-1">Decisão</p><h4 className={`text-4xl font-black ${analysisResult.recommendation === 'CALL' ? 'text-green-500' : analysisResult.recommendation === 'PUT' ? 'text-red-500' : 'text-slate-400'}`}>{analysisResult.recommendation}</h4></div>
                                <div className="text-right"><p className="text-[10px] font-black uppercase opacity-60 mb-1">Confiança</p><p className="text-3xl font-black">{analysisResult.confidence}%</p></div>
                            </div>
                            <div className="p-6 rounded-3xl border border-teal-500/30 bg-slate-950/40"><p className="text-[10px] font-black uppercase text-teal-400 mb-1">Entrada</p><p className="text-3xl font-black text-white">{analysisResult.entryTime}</p></div>
                            <p className="text-xs font-medium text-slate-300 italic border-l-2 border-teal-500 pl-4">"{analysisResult.reasoning}"</p>
                        </div>
                    ) : <div className="h-full flex flex-col items-center justify-center py-20 opacity-20"><p className="text-xs font-black uppercase tracking-[0.2em]">Aguardando Scan</p></div>}
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
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedPreviousForDashboard = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.id < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedPreviousForDashboard.length > 0 ? sortedPreviousForDashboard[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthRecords = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.id.startsWith(currentMonthStr));
    const currentMonthProfit = monthRecords.reduce((acc, r) => acc + r.netProfitUSD, 0);
    const monthlyGoal = goals.find(g => g.type === 'monthly');
    let activeDailyGoal = monthlyGoal ? Math.max(0, monthlyGoal.targetAmount - currentMonthProfit) / Math.max(1, 22 - monthRecords.length) : (activeBrokerage?.initialBalance * 0.03 || 1);

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r transition-transform ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="h-20 flex items-center px-8 border-b border-slate-800/50 font-black italic text-teal-400 text-xl tracking-tighter">HRK</div>
                <nav className="flex-1 p-4 space-y-1">
                    <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-5 h-5" />Dashboard</button>
                    <button onClick={() => setActiveTab('ai-analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'ai-analysis' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-5 h-5" />Análise IA</button>
                    <button onClick={() => setActiveTab('compound')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-5 h-5" />Compostos</button>
                    <button onClick={() => setActiveTab('report')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-5 h-5" />Extrato</button>
                    <button onClick={() => setActiveTab('soros')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-5 h-5" />Soros</button>
                    <button onClick={() => setActiveTab('goals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-5 h-5" />Metas</button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-5 h-5" />Config</button>
                </nav>
                <div className="p-4 border-t border-slate-800/50"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl"><LogoutIcon className="w-5 h-5" />Sair</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className={`h-20 flex items-center justify-between px-6 md:px-8 border-b ${theme.header}`}>
                    <div className="flex items-center gap-4"><button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2"><MenuIcon className="w-6 h-6" /></button><SavingStatusIndicator status={savingStatus} /></div>
                    <div className="flex items-center gap-3"><button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button></div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
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

const SavingStatusIndicator: React.FC<{status: string}> = ({status}) => {
    if (status === 'saving') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><ArrowPathIcon className="w-3 h-3 animate-spin" /> Salvando...</div>;
    if (status === 'saved') return <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-500"><CheckIcon className="w-3 h-3" /> Sincronizado</div>;
    return null;
};

const DashboardPanel: React.FC<any> = ({ activeBrokerage, customEntryValue, setCustomEntryValue, customPayout, setCustomPayout, addRecord, deleteTrade, selectedDateString, setSelectedDate, dailyRecordForSelectedDay, startBalanceForSelectedDay, isDarkMode, dailyGoalTarget }) => {
    const theme = useThemeClasses(isDarkMode);
    const [quantity, setQuantity] = useState('1');
    const [isIgnoringStop, setIsIgnoringStop] = useState(false);
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const stopWinReached = activeBrokerage.stopGainTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades;
    const stopLossReached = activeBrokerage.stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades;

    // Reset ignore if date changes
    useEffect(() => {
        setIsIgnoringStop(false);
    }, [selectedDateString]);

    const handleQuickAdd = (type: 'win' | 'loss') => {
         // INTERCEPTAÇÃO DE STOP
         if ((stopWinReached || stopLossReached) && !isIgnoringStop) {
             const message = stopWinReached 
                ? "Você atingiu sua META DIÁRIA (Stop Win). Deseja realmente continuar operando?" 
                : "Você atingiu seu limite de PERDA (Stop Loss). Deseja realmente continuar operando?";
             
             if (confirm(message)) {
                 setIsIgnoringStop(true);
             } else {
                 return; // Aborta a adição do trade
             }
         }

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

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                <div><h2 className={`text-2xl font-black ${theme.text}`}>Dashboard de Gestão</h2></div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`border rounded-xl px-4 py-2.5 text-sm font-bold ${isDarkMode ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="Saldo" val={`${currencySymbol} ${formatMoney(currentBalance)}`} icon={PieChartIcon} />
                <StatBox label="Lucro" val={`${currencySymbol} ${formatMoney(currentProfit)}`} icon={TrendingUpIcon} color={currentProfit >= 0 ? 'text-green-500' : 'text-red-500'} />
                <StatBox label="Meta" val={`${currencySymbol}${formatMoney(dailyGoalTarget)}`} icon={TargetIcon} />
                <StatBox label="Win Rate" val={`${winRate}%`} icon={TrophyIcon} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl border ${theme.card}`}>
                    <h3 className="font-black mb-6 text-[10px] uppercase opacity-60">Operar</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="text-[10px] font-black opacity-50 uppercase">Valor</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} /></div>
                            <div><label className="text-[10px] font-black opacity-50 uppercase">Payout %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} /></div>
                            <div><label className="text-[10px] font-black opacity-50 uppercase">Qtd</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold ${theme.input}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleQuickAdd('win')} className="h-14 bg-green-500 text-slate-950 font-black rounded-2xl uppercase">WIN</button>
                            <button onClick={() => handleQuickAdd('loss')} className="h-14 bg-red-600 text-white font-black rounded-2xl uppercase">LOSS</button>
                        </div>
                        {(stopWinReached || stopLossReached) && (
                            <div className={`p-4 mt-4 rounded-2xl border text-center ${stopWinReached ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                <p className="text-[10px] font-black uppercase">{stopWinReached ? 'META ATINGIDA!' : 'STOP LOSS ATINGIDO!'}</p>
                                {isIgnoringStop && <p className="text-[8px] font-bold opacity-60 uppercase italic mt-1">Operando fora da gestão</p>}
                            </div>
                        )}
                    </div>
                </div>
                <div className={`p-6 rounded-3xl border ${theme.card} flex flex-col`}>
                    <h3 className="font-black mb-6 text-[10px] uppercase opacity-60">Histórico</h3>
                    <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2">
                        {dailyRecordForSelectedDay?.trades?.map((t: Trade) => (
                            <div key={t.id} className="flex justify-between p-3 rounded-xl border border-slate-800/30 bg-slate-950/20">
                                <span className={`font-bold ${t.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>{t.result.toUpperCase()}</span>
                                <span className="font-bold opacity-70">{currencySymbol} {formatMoney(t.result === 'win' ? t.entryValue * (t.payoutPercentage/100) : -t.entryValue)}</span>
                                <button onClick={() => deleteTrade(t.id, selectedDateString)} className="text-[9px] text-red-500/50 uppercase">Excluir</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatBox: React.FC<any> = ({ label, val, color }) => (
    <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
        <p className="text-[9px] uppercase font-black opacity-40 mb-1">{label}</p>
        <p className={`text-xl font-black truncate ${color || 'text-white'}`}>{val}</p>
    </div>
);

// Componentes secundários mantidos minimamente para preservar estrutura
const CompoundInterestPanel: React.FC<any> = ({ activeBrokerage, records }) => (<div className="p-8"><h2 className="text-2xl font-black">Em breve</h2></div>);
const ReportPanel: React.FC<any> = ({ activeBrokerage, records, deleteTrade }) => (<div className="p-8"><h2 className="text-2xl font-black">Em breve</h2></div>);
const SorosCalculatorPanel: React.FC<any> = ({ activeBrokerage }) => (<div className="p-8"><h2 className="text-2xl font-black">Em breve</h2></div>);
const GoalsPanel: React.FC<any> = ({ goals, records, activeBrokerage }) => (<div className="p-8"><h2 className="text-2xl font-black">Em breve</h2></div>);
const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset }) => (
    <div className="p-8 max-w-xl mx-auto space-y-8">
        <h2 className="text-2xl font-black">Configuração de Stop</h2>
        <div className={`p-8 rounded-3xl border ${theme.card} space-y-4`}>
            <div><label className="text-[10px] font-black uppercase">Stop Gain (Vitórias)</label><input type="number" value={brokerage.stopGainTrades} onChange={e => setBrokerages((prev: any) => [{...prev[0], stopGainTrades: parseInt(e.target.value)}])} className={`w-full h-12 px-4 rounded-xl border ${theme.input}`} /></div>
            <div><label className="text-[10px] font-black uppercase">Stop Loss (Derrotas)</label><input type="number" value={brokerage.stopLossTrades} onChange={e => setBrokerages((prev: any) => [{...prev[0], stopLossTrades: parseInt(e.target.value)}])} className={`w-full h-12 px-4 rounded-xl border ${theme.input}`} /></div>
            <button onClick={onReset} className="w-full h-12 bg-red-600 text-white font-black rounded-xl uppercase text-xs">Resetar Histórico</button>
        </div>
    </div>
);

export default App;