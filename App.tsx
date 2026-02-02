
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

// --- Radar Sniper Panel (CORREÇÃO E ANÁLISE PREDITIVA) ---
const AIAnalyzerPanel: React.FC<any> = ({ theme, isDarkMode, addRecord }) => {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const analyzeChart = async () => {
        if (!image) return;
        setAnalyzing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Extração robusta de dados base64 (Fix Erro de Conexão)
            const base64Data = image.split(',')[1];
            const mimeType = image.split(',')[0].split(':')[1].split(';')[0];
            
            const prompt = `VOCÊ É O HRK SNIPER - ESPECIALISTA EM PRICE ACTION E PADRÕES DE VELAS.
            Sua missão é dupla:
            1. DETECTAR RESULTADO PASSADO: Identifique se o último candle fechado/operação foi WIN ou LOSS.
            2. PREDIÇÃO TÁTICA: Analise a sequência de velas (cores, tamanhos e pavios) e sugira a operação para o PRÓXIMO CANDLE.
            
            Critérios para Predição:
            - Se houver padrão de reversão de alta ou força compradora: SINAL "CALL" (COMPRA).
            - Se houver padrão de reversão de baixa ou força vendedora: SINAL "PUT" (VENDA).
            
            EXTRAIA APENAS ESTE JSON:
            {
              "resultado_passado": "WIN" ou "LOSS",
              "valor": número da entrada detectado,
              "payout": número do payout detectado,
              "sinal_proxima": "CALL" ou "PUT",
              "confianca": "porcentagem de 0 a 100",
              "analise_curta": "uma frase técnica sobre o padrão detectado"
            }`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: prompt }
                    ]
                },
                config: {
                    systemInstruction: "Radar Sniper: Identificador de padrões de candlestick e preditor de sinais táticos.",
                    responseMimeType: "application/json",
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
                        required: ["resultado_passado", "valor", "sinal_proxima"]
                    }
                }
            });

            const responseText = response.text;
            if (!responseText) throw new Error("Vazio");
            
            const data = JSON.parse(responseText.trim());
            setResult(data);
        } catch (err: any) {
            console.error("AI Analysis Error:", err);
            setError("ERRO NO RADAR. VERIFIQUE SE O GRÁFICO ESTÁ LEGÍVEL E TENTE NOVAMENTE.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                <h2 className={`text-lg font-black tracking-tight ${theme.text}`}>Radar <span className="text-emerald-400 italic">Sniper</span></h2>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${analyzing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/60 uppercase">Escaner Inteligente</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 ${theme.roundedCard} border border-dashed ${theme.border} ${theme.card} flex flex-col items-center justify-center min-h-[320px]`}>
                    {image ? (
                        <div className="w-full space-y-4">
                            <img src={image} className="w-full h-52 object-contain rounded-lg bg-black/40 border border-white/5 shadow-2xl" />
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => {setImage(null); setResult(null);}} className="py-2.5 text-[9px] font-black uppercase bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all">Descartar</button>
                                <button onClick={analyzeChart} disabled={analyzing} className="py-2.5 text-[9px] font-black uppercase bg-emerald-500 text-slate-950 rounded-lg disabled:opacity-50 hover:bg-emerald-400 transition-all">
                                    {analyzing ? 'Escaneando...' : 'Analisar Padrões'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-4 py-16 w-full group">
                            <CpuChipIcon className="w-12 h-12 text-emerald-500/20 group-hover:text-emerald-500/50 transition-all" />
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Importar Captura Técnica</p>
                                <p className="text-[8px] font-bold text-slate-600 mt-1 uppercase">A IA Lerá as Velas e dará o sinal</p>
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
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest animate-in shake">
                            {error}
                        </div>
                    )}
                    
                    {result ? (
                        <div className={`p-6 ${theme.roundedCard} border border-emerald-500/20 ${theme.card} space-y-6 shadow-2xl animate-in zoom-in-95`}>
                            {/* Bloco de Sinal Preditivo */}
                            <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center ${result.sinal_proxima === 'CALL' ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-rose-500/5 border-rose-500/40'}`}>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] mb-1">Próxima Entrada (Sinal)</p>
                                <h3 className={`text-3xl font-black italic tracking-tighter ${result.sinal_proxima === 'CALL' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {result.sinal_proxima === 'CALL' ? '↑ COMPRA (CALL)' : '↓ VENDA (PUT)'}
                                </h3>
                                <div className="mt-2 px-3 py-1 bg-black/40 rounded-full border border-white/5">
                                    <span className="text-[10px] font-bold uppercase text-blue-400">Precisão: {result.confianca}</span>
                                </div>
                                <p className="mt-3 text-[9px] font-bold text-slate-500 italic leading-tight px-4">"{result.analise_curta}"</p>
                            </div>

                            {/* Detecção Histórica */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Status Anterior</p>
                                    <p className={`text-sm font-black italic ${result.resultado_passado === 'WIN' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                        {result.resultado_passado}
                                    </p>
                                </div>
                                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Última Entrada</p>
                                    <p className="text-sm font-black">R$ {result.valor}</p>
                                </div>
                            </div>

                            <button onClick={() => {
                                addRecord(result.resultado_passado === 'WIN' ? 1 : 0, result.resultado_passado === 'LOSS' ? 1 : 0, result.valor, result.payout || 80);
                                setResult(null); setImage(null);
                            }} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95">Sincronizar com Arsenal</button>
                        </div>
                    ) : !analyzing && (
                        <div className="p-12 border border-slate-800/20 rounded-2xl bg-slate-900/5 text-center opacity-30 flex flex-col items-center justify-center min-h-[240px]">
                            <TargetIcon className="w-10 h-10 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Aguardando Captura Técnica</p>
                        </div>
                    )}
                    
                    {analyzing && (
                        <div className="h-64 w-full bg-slate-900/40 rounded-2xl border border-emerald-500/10 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent animate-scan-line" />
                            <ArrowPathIcon className="w-10 h-10 text-emerald-500/40 animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500/60">Decodificando Price Action</p>
                            <style>{`
                                @keyframes scan-line {
                                    0% { transform: translateY(-100%); }
                                    100% { transform: translateY(100%); }
                                }
                                .animate-scan-line { animation: scan-line 2s linear infinite; }
                            `}</style>
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

// --- Escalada Panel (Compound Interest) ---
const CompoundInterestPanel = ({ isDarkMode, activeBrokerage }: any) => {
    const theme = useThemeClasses(isDarkMode);
    const tableData = useMemo(() => {
        let running = activeBrokerage.initialBalance;
        const res = [];
        for(let i=1; i<=30; i++) {
            const entry = running * 0.10; // 10% risk
            const profit = (entry * (activeBrokerage.payoutPercentage/100)); 
            res.push({ day: i, initial: running, entry, profit, final: running + profit });
            running += profit;
        }
        return res;
    }, [activeBrokerage]);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase tracking-tighter">Escalada <span className="text-emerald-400 italic">Exponencial</span></h2>
            <div className={`p-4 border ${theme.border} ${theme.card} rounded-2xl overflow-hidden shadow-sm`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center text-[10px] font-black uppercase tracking-tight">
                        <thead className="bg-black/20 text-slate-500 text-[8px]"><tr className="border-b border-white/5"><th className="p-4">Missão #</th><th>Arsenal</th><th>Disparo</th><th>Lucro (Meta)</th><th>Arsenal Final</th></tr></thead>
                        <tbody>
                            {tableData.map(d => (
                                <tr key={d.day} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                    <td className="p-3.5 opacity-40">Dia {d.day}</td>
                                    <td>R$ {formatMoney(d.initial)}</td>
                                    <td className="text-emerald-500/60 font-medium">R$ {formatMoney(d.entry)}</td>
                                    <td className="text-emerald-400 font-bold">+R$ {formatMoney(d.profit)}</td>
                                    <td className="text-emerald-400 font-black">R$ {formatMoney(d.final)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Soros Calculator Panel ---
const SorosCalculatorPanel = ({ theme, activeBrokerage }: any) => {
    const [entry, setEntry] = useState(10);
    const levels = useMemo(() => {
        let current = entry;
        const res = [];
        for(let i=1; i<=6; i++) {
            const profit = current * (activeBrokerage.payoutPercentage/100);
            res.push({ lvl: i, entry: current, profit, total: current + profit });
            current += profit;
        }
        return res;
    }, [entry, activeBrokerage]);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto animate-in zoom-in-95">
            <h2 className="text-xl font-black uppercase">Protocolo <span className="text-emerald-400 italic">Soros</span></h2>
            <div className={`p-8 border ${theme.border} ${theme.card} rounded-3xl space-y-6 shadow-2xl`}>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor Base do Ciclo</label><input type="number" value={entry} onChange={e=>setEntry(Number(e.target.value))} className={`w-full h-14 px-6 rounded-2xl border font-black text-sm outline-none ${theme.input}`} /></div>
                <div className="space-y-3">
                    {levels.map(l => (
                        <div key={l.lvl} className="flex justify-between items-center p-4 bg-black/30 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all">
                            <span className="text-[11px] font-black text-emerald-500 italic tracking-widest">NÍVEL {l.lvl}</span>
                            <span className="text-[13px] font-bold">R$ {formatMoney(l.entry)} <span className="text-slate-600 mx-2">➔</span> <span className="text-emerald-400 font-black">R$ {formatMoney(l.total)}</span></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel = ({ theme, goals, setGoals }: any) => {
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');

    const addGoal = () => {
        if(!name || !target) return;
        setGoals((prev:any) => [...prev, { id: crypto.randomUUID(), name, targetAmount: parseFloat(target), createdAt: Date.now() }]);
        setName(''); setTarget('');
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase">Gestão de <span className="text-emerald-400 italic">Objetivos</span></h2>
            <div className={`p-6 ${theme.card} border ${theme.border} rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm`}>
                <input type="text" placeholder="NOME DA META" value={name} onChange={e=>setName(e.target.value)} className={`h-12 px-5 rounded-xl border text-[10px] font-black uppercase ${theme.input}`} />
                <input type="number" placeholder="VALOR ALVO" value={target} onChange={e=>setTarget(e.target.value)} className={`h-12 px-5 rounded-xl border text-[10px] font-black uppercase ${theme.input}`} />
                <button onClick={addGoal} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg transition-all">Lançar Missão</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.length > 0 ? goals.map((g:any) => (
                    <div key={g.id} className={`p-6 ${theme.card} border ${theme.border} rounded-2xl relative group hover:border-emerald-500/20 transition-all`}>
                         <button onClick={() => setGoals((prev:any)=>prev.filter((i:any)=>i.id !== g.id))} className="absolute top-4 right-4 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-5 h-5" /></button>
                         <h4 className="text-[11px] font-black uppercase italic text-slate-500 mb-2 tracking-widest">{g.name}</h4>
                         <p className="text-2xl font-black text-emerald-400">R$ {formatMoney(g.targetAmount)}</p>
                    </div>
                )) : <div className="col-span-2 py-20 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.5em]">Nenhuma missão ativa</div>}
            </div>
        </div>
    );
};

// --- Report Panel ---
const ReportPanel = ({ isDarkMode, records }: any) => {
    const theme = useThemeClasses(isDarkMode);
    const stats = useMemo(() => {
        const allTrades = records.flatMap((r: any) => r.trades || []);
        const total = allTrades.length;
        const wins = allTrades.filter((t: any) => t.result === 'win').length;
        const losses = total - wins;
        const profit = records.reduce((acc: number, r: any) => acc + (r.netProfitUSD || 0), 0);
        return { total, wins, losses, profit, wr: total > 0 ? ((wins / total) * 100).toFixed(1) : '0' };
    }, [records]);

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in">
            <h2 className="text-xl font-black uppercase">Arquivo <span className="text-emerald-400 italic">Mestre</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-6 ${theme.card} border ${theme.border} rounded-2xl text-center`}><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Total Operações</p><p className="text-2xl font-black">{stats.total}</p></div>
                <div className={`p-6 ${theme.card} border ${theme.border} rounded-2xl text-center`}><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Vitórias</p><p className="text-2xl font-black text-emerald-400">{stats.wins}</p></div>
                <div className={`p-6 ${theme.card} border ${theme.border} rounded-2xl text-center`}><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Assertividade</p><p className="text-2xl font-black text-blue-400">{stats.wr}%</p></div>
                <div className={`p-6 ${theme.card} border ${theme.border} rounded-2xl text-center`}><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Lucro Global</p><p className="text-2xl font-black text-emerald-400">R$ {formatMoney(stats.profit)}</p></div>
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel = ({ theme, brokerage, setBrokerages, onReset }: any) => {
    const update = (field: keyof Brokerage, val: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: val } : b));
    };
    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Central <span className="text-emerald-400">HQ</span></h2>
            <div className={`p-8 border ${theme.border} ${theme.card} rounded-3xl space-y-6 shadow-xl`}>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Identidade</label><input type="text" value={brokerage.name} onChange={e => update('name', e.target.value)} className={`w-full h-12 px-4 rounded-xl border font-bold text-xs ${theme.input}`} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Câmbio</label><select value={brokerage.currency} onChange={e => update('currency', e.target.value as any)} className={`w-full h-12 px-4 rounded-xl border font-bold text-xs ${theme.input}`}><option value="USD">Dólar ($)</option><option value="BRL">Real (R$)</option></select></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Arsenal Base</label><input type="number" value={brokerage.initialBalance} onChange={e => update('initialBalance', parseFloat(e.target.value))} className={`w-full h-12 px-4 rounded-xl border font-bold text-xs ${theme.input}`} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Payout Médio %</label><input type="number" value={brokerage.payoutPercentage} onChange={e => update('payoutPercentage', parseInt(e.target.value))} className={`w-full h-12 px-4 rounded-xl border font-bold text-xs ${theme.input}`} /></div>
                </div>
                <button onClick={onReset} className="w-full py-4 mt-4 bg-rose-500/5 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all">Protocolo Reset Geral</button>
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
                        { id: 'compound', label: 'Escalada', icon: ChartBarIcon },
                        { id: 'soros', label: 'Ciclo Soros', icon: CalculatorIcon },
                        { id: 'goals', label: 'Missões', icon: TargetIcon },
                        { id: 'report', label: 'Arquivo', icon: DocumentTextIcon },
                        { id: 'settings', label: 'Comando HQ', icon: SettingsIcon }
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
                                {savingStatus === 'saving' ? 'Sincronizando Arsenal' : 'Status: Arsenal Seguro'}
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
                    {activeTab === 'compound' && <CompoundInterestPanel isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} activeBrokerage={activeBrokerage} />}
                    {activeTab === 'goals' && <GoalsPanel theme={theme} goals={goals} setGoals={setGoals} />}
                    {activeTab === 'report' && <ReportPanel isDarkMode={isDarkMode} records={records} />}
                    {activeTab === 'settings' && <SettingsPanel theme={theme} brokerage={activeBrokerage} setBrokerages={setBrokerages} onReset={() => { if(confirm("Deseja resetar todos os dados?")) { setRecords([]); debouncedSave(); } }} />}
                </div>
            </main>
        </div>
    );
};

export default App;
