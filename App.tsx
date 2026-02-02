
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Brokerage, DailyRecord, AppRecord, Trade, User, Goal } from './types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { GoogleGenAI } from "@google/genai";
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
        card: isDarkMode ? 'bg-slate-900/40 border-slate-800/60 backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-md',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800/50' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800/50' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-emerald-50 text-emerald-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/60' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
        roundedCard: 'rounded-[3rem]',
    }), [isDarkMode]);
};

// --- AI Analyzer Panel ---
const AIAnalyzerPanel: React.FC<any> = ({ theme, isDarkMode }) => {
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
            const base64Data = image.split(',')[1];
            
            const prompt = `Aja como um trader profissional de Opções Binárias com 10 anos de experiência em M1.
            Analise esta imagem do gráfico de velas (Timeframe de 1 minuto).
            Procure por:
            1. Price Action: Padrões de velas (engolfo, martelo, doji, estrelas).
            2. Estrutura: Suporte, Resistência, LTA e LTB.
            3. Dinâmica: Pullbacks, Rompimentos e Reversões.
            4. Indicadores visuais: Médias Móveis e Estocástico (se visíveis).
            
            Retorne um JSON com:
            {
                "operacao": "CALL" | "PUT" | "AGUARDAR",
                "confianca": numero de 0 a 100,
                "motivo": "string curta explicando a técnica",
                "detalhes": ["array de 3 pontos técnicos observados"]
            }
            Importante: Responda APENAS o JSON, sem markdown ou explicações extras.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                        { text: prompt }
                    ]
                }
            });

            const text = response.text || '';
            const cleanJson = text.replace(/```json|```/g, '').trim();
            setResult(JSON.parse(cleanJson));
        } catch (err) {
            console.error(err);
            setError("Falha na varredura. Limpe a lente do gráfico e tente novamente.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-1000">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className={`text-4xl font-black tracking-tighter ${theme.text}`}>Visão <span className="text-emerald-400 italic">HRK Sniper</span></h2>
                    <p className={theme.textMuted}>Análise balística de M1 com inteligência artificial.</p>
                </div>
                <div className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-6 py-2 rounded-full tracking-[0.3em] shadow-[0_0_20px_rgba(16,185,129,0.3)]">SISTEMA ATIVO</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className={`p-10 ${theme.roundedCard} border ${theme.card} flex flex-col items-center justify-center min-h-[500px] border-dashed border-2 relative overflow-hidden group transition-all duration-500 hover:border-emerald-500/50`}>
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    {image ? (
                        <div className="relative w-full h-full animate-in zoom-in-95 duration-500">
                            <img src={image} alt="Target Chart" className="w-full h-full object-contain rounded-3xl shadow-2xl" />
                            <button onClick={() => setImage(null)} className="absolute -top-4 -right-4 p-4 bg-rose-600 text-white rounded-full hover:bg-rose-500 transition-all shadow-2xl hover:scale-110 active:scale-95 border-4 border-slate-950"><TrashIcon className="w-6 h-6" /></button>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-8 text-center group">
                            <div className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-700 border-2 border-emerald-500/20 group-hover:border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                <PlusIcon className="w-14 h-14 text-emerald-400" />
                            </div>
                            <div>
                                <p className="font-black text-xl uppercase tracking-[0.2em] text-emerald-400">Travar Alvo</p>
                                <p className="text-[11px] opacity-40 font-bold mt-3 uppercase tracking-[0.1em]">Clique para enviar o print do gráfico</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    )}
                </div>

                <div className="space-y-8 flex flex-col">
                    <button 
                        onClick={analyzeChart} 
                        disabled={!image || analyzing}
                        className={`w-full h-24 ${theme.roundedCard} font-black uppercase tracking-[0.4em] text-xl transition-all flex items-center justify-center gap-5 border-4 border-transparent
                        ${!image || analyzing ? 'bg-slate-800 text-slate-600 cursor-not-allowed border-slate-700/50' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_20px_50px_rgba(16,185,129,0.4)] hover:shadow-[0_25px_60px_rgba(16,185,129,0.6)] active:scale-95'}`}
                    >
                        {analyzing ? (
                            <>
                                <ArrowPathIcon className="w-8 h-8 animate-spin" />
                                ESCANEANDO...
                            </>
                        ) : (
                            <>
                                <CpuChipIcon className="w-8 h-8" />
                                DISPARAR AGORA
                            </>
                        )}
                    </button>

                    {error && (
                        <div className={`p-8 bg-rose-500/10 border border-rose-500/30 ${theme.roundedCard} flex items-center gap-5 text-rose-500 animate-in slide-in-from-top-4`}>
                            <InformationCircleIcon className="w-10 h-10 shrink-0" />
                            <p className="text-sm font-black uppercase tracking-widest">{error}</p>
                        </div>
                    )}

                    {result ? (
                        <div className={`p-12 ${theme.roundedCard} border ${theme.card} space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 shadow-2xl relative overflow-hidden flex-1`}>
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60" />
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-black uppercase opacity-50 tracking-[0.3em] mb-3">Veredito Sniper</p>
                                    <h3 className={`text-7xl font-black tracking-tighter ${result.operacao === 'CALL' ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' : result.operacao === 'PUT' ? 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'text-slate-500'}`}>
                                        {result.operacao}
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black uppercase opacity-50 tracking-[0.3em] mb-3">Letalidade</p>
                                    <p className="text-5xl font-black text-blue-400 font-mono tracking-tighter">{result.confianca}%</p>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-950/70 rounded-[2.5rem] border border-slate-800/80 shadow-inner">
                                <p className="text-base font-bold leading-relaxed text-slate-200 italic">"{result.motivo}"</p>
                            </div>

                            <div className="space-y-5">
                                <p className="text-[11px] font-black uppercase opacity-40 tracking-[0.4em]">Relatório Balístico</p>
                                <div className="grid gap-4">
                                    {result.detalhes?.map((detail: string, i: number) => (
                                        <div key={i} className="flex items-center gap-5 text-sm font-black text-slate-300 uppercase tracking-tighter">
                                            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,1)]" />
                                            {detail}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : !analyzing && (
                        <div className={`p-20 border border-slate-800/20 ${theme.roundedCard} flex flex-col items-center justify-center opacity-10 text-center space-y-8 grayscale flex-1`}>
                            <CpuChipIcon className="w-32 h-32 text-emerald-400" />
                            <p className="text-lg font-black uppercase tracking-[0.6em]">Aguardando Coordenadas</p>
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
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) : '0.0';
    
    const dailyGoalPercent = dailyGoalTarget > 0 ? (currentProfit / dailyGoalTarget) * 100 : 0;

    const stopWinTrades = activeBrokerage.stopGainTrades || 0;
    const stopLossTrades = activeBrokerage.stopLossTrades || 0;
    const stopWinReached = stopWinTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= stopWinTrades;
    const stopLossReached = stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= stopLossTrades;

    let stopMessage = '';
    if (stopWinReached) stopMessage = `Alvo de Lucro Conquistado!`;
    else if (stopLossReached) stopMessage = `Limite de Perda Sniper Atingido!`;

    const kpis = [
        { label: 'Arsenal Total', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: PieChartIcon, color: 'text-emerald-400' },
        { label: 'Lucro Sniper', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: TrendingUpIcon, color: currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-500' },
        { label: 'Objetivo Diário', val: `${Math.min(100, dailyGoalPercent).toFixed(0)}%`, subVal: `${currencySymbol}${formatMoney(currentProfit)} de ${formatMoney(dailyGoalTarget)}`, icon: TargetIcon, color: dailyGoalPercent >= 100 ? 'text-emerald-400' : 'text-blue-400' },
        { label: 'Precisão (Winrate)', val: `${winRate}%`, icon: TrophyIcon, color: 'text-fuchsia-400' },
    ];

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-col md:flex-row md:justify-between items-center gap-8">
                <div className="text-center md:text-left">
                    <h2 className={`text-4xl font-black tracking-tighter ${theme.text}`}>Painel <span className="text-emerald-400 italic">HRK Sniper</span></h2>
                    <p className={theme.textMuted}>Gestão tática e comando de arsenal em tempo real.</p>
                </div>
                <input type="date" value={selectedDateString} onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} className={`border rounded-full px-10 py-4 text-sm font-black focus:outline-none transition-all shadow-xl ${isDarkMode ? 'bg-slate-900 text-emerald-400 border-slate-800 focus:border-emerald-500/60' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {kpis.map((kpi, i) => (
                    <div key={i} className={`p-10 ${theme.roundedCard} border ${theme.card} flex flex-col justify-between hover:scale-[1.03] transition-all duration-500 shadow-xl border-b-4 border-b-transparent hover:border-b-emerald-500/30`}>
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[11px] uppercase font-black text-slate-500 tracking-[0.25em] leading-none">{kpi.label}</p>
                            <kpi.icon className={`w-6 h-6 ${kpi.color} opacity-90`} />
                        </div>
                        <p className={`text-2xl md:text-3xl font-black ${kpi.color} truncate tracking-tighter drop-shadow-sm`}>{kpi.val}</p>
                        {kpi.subVal && <p className="text-[10px] font-black mt-3 text-slate-500 truncate tracking-widest opacity-60 uppercase">{kpi.subVal}</p>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <div className={`p-12 ${theme.roundedCard} border ${theme.card} relative overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.4)]`}>
                    <div className="absolute top-0 right-0 p-10 opacity-[0.04] pointer-events-none">
                        <CalculatorIcon className="w-64 h-64" />
                    </div>
                    <h3 className="font-black mb-10 flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-emerald-400"><CalculatorIcon className="w-6 h-6" /> Ordem de Execução</h3>
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                            <div className="space-y-3"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Calibre (Valor)</label><input type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} placeholder="1.00" className={`w-full h-16 px-8 rounded-3xl border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-xl ${theme.input}`} /></div>
                            <div className="space-y-3"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Retorno %</label><input type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} placeholder="80" className={`w-full h-16 px-8 rounded-3xl border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-xl ${theme.input}`} /></div>
                            <div className="space-y-3 col-span-2 md:col-span-1"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Lotes</label><input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className={`w-full h-16 px-8 rounded-3xl border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-xl ${theme.input}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            <button onClick={() => handleQuickAdd('win')} disabled={stopWinReached || stopLossReached} className="h-24 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-[2.5rem] uppercase text-2xl tracking-[0.3em] transition-all shadow-[0_20px_40px_rgba(16,185,129,0.3)] active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none border-b-8 border-emerald-600 active:border-b-0">WIN</button>
                            <button onClick={() => handleQuickAdd('loss')} disabled={stopWinReached || stopLossReached} className="h-24 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-[2.5rem] uppercase text-2xl tracking-[0.3em] transition-all shadow-[0_20px_40px_rgba(244,63,94,0.3)] active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none border-b-8 border-rose-800 active:border-b-0">LOSS</button>
                        </div>
                         {stopMessage && (
                            <div className="mt-8 text-center text-[11px] font-black text-emerald-400 p-5 bg-emerald-400/10 rounded-[2rem] border border-emerald-400/30 animate-pulse tracking-[0.2em] uppercase">
                                {stopMessage} Gatilho desativado temporariamente.
                            </div>
                        )}
                    </div>
                </div>

                <div className={`p-12 ${theme.roundedCard} border flex flex-col ${theme.card} shadow-2xl`}>
                    <h3 className="font-black mb-10 flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-blue-400"><ListBulletIcon className="w-6 h-6" /> Registro de Operações</h3>
                    <div className="flex-1 overflow-y-auto max-h-[450px] pr-4 custom-scrollbar">
                        {dailyRecordForSelectedDay?.trades?.length ? (
                             <div className="space-y-4">
                                {[...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                    const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    return (
                                        <div key={trade.id} className={`flex items-center justify-between p-6 rounded-[2.5rem] border transition-all hover:bg-slate-800/40 ${isDarkMode ? 'bg-slate-950/50 border-slate-800/60 shadow-inner' : 'bg-slate-50 border-slate-200/50'}`}>
                                            <div className="flex items-center gap-6">
                                                <div className={`w-4 h-12 rounded-full ${trade.result === 'win' ? 'bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]'}`} />
                                                <div>
                                                    <p className="text-[11px] font-black uppercase text-slate-500 leading-none tracking-[0.15em] mb-2">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    <p className="text-lg font-black uppercase tracking-tighter">{trade.result === 'win' ? 'Target HIT' : 'Target MISSED'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xl font-black ${tradeProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{tradeProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}</p>
                                                <button onClick={() => deleteTrade(trade.id, selectedDateString)} className="text-[10px] font-black text-rose-500/40 hover:text-rose-500 uppercase tracking-[0.2em] mt-2 transition-colors">DELETAR</button>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-15 py-20 text-center">
                                <InformationCircleIcon className="w-20 h-20 mb-6" />
                                <p className="text-base font-black uppercase tracking-[0.5em]">Silêncio no Radar</p>
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
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';

    const tableData = useMemo(() => {
        const rows = [];
        const sortedRealRecords = records
            .filter((r: any): r is DailyRecord => r.recordType === 'day' && r.trades.length > 0)
            .sort((a, b) => a.id.localeCompare(b.id));
        
        let startDate: Date;
        if (sortedRealRecords.length > 0) {
            startDate = new Date(sortedRealRecords[0].id + 'T12:00:00');
        } else {
            startDate = new Date();
            startDate.setHours(12,0,0,0);
        }

        let runningBalance = activeBrokerage.initialBalance;

        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateId = currentDate.toISOString().split('T')[0];
            
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
                profit = (operationValue * (activeBrokerage.payoutPercentage / 100)) * 3;
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
    }, [records, activeBrokerage.initialBalance, activeBrokerage.payoutPercentage]);

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
            <div>
                <h2 className={`text-4xl font-black tracking-tighter ${theme.text}`}>Crescimento <span className="text-emerald-400 italic">Letal</span></h2>
                <p className={`${theme.textMuted} text-xs mt-3 font-black uppercase tracking-[0.3em] opacity-50`}>Escalagem tática de 30 dias sob sniper.</p>
            </div>
            <div className={`${theme.roundedCard} border overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] ${theme.card}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[12px] uppercase font-black tracking-[0.4em] ${isDarkMode ? 'bg-slate-900/90' : 'bg-slate-100/60'}`}>
                                <th className="py-8 px-5 border-b border-slate-800/40">Fase</th>
                                <th className="py-8 px-5 border-b border-slate-800/40">Cronos</th>
                                <th className="py-8 px-5 border-b border-slate-800/40">Banca Inicial</th>
                                <th className="py-8 px-5 border-b border-slate-800/40">Ataque (Entrada)</th>
                                <th className="py-8 px-5 border-b border-slate-800/40 text-emerald-400">Wins</th>
                                <th className="py-8 px-5 border-b border-slate-800/40 text-rose-500">Loss</th>
                                <th className="py-8 px-5 border-b border-slate-800/40">Lucro Acumulado</th>
                                <th className="py-8 px-5 border-b border-slate-800/40">Banca Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/20">
                            {tableData.map((row) => (
                                <tr key={row.diaTrade} className={`text-sm font-black hover:bg-emerald-500/10 transition-all ${row.isProjection ? 'opacity-25 grayscale' : ''}`}>
                                    <td className="py-6 px-5 font-mono text-xs text-slate-500 font-bold">SNIPER-#{row.diaTrade}</td>
                                    <td className="py-6 px-5 text-[12px] uppercase tracking-tighter">{row.dateDisplay}</td>
                                    <td className="py-6 px-5 opacity-80">{currencySymbol} {formatMoney(row.initial)}</td>
                                    <td className="py-6 px-5 font-mono text-sm text-emerald-400 font-black tracking-tight">{currencySymbol} {formatMoney(row.operationValue)}</td>
                                    <td className="py-6 px-5"><span className="bg-emerald-500/20 text-emerald-400 px-6 py-2 rounded-full border border-emerald-500/40 shadow-inner">{row.win}</span></td>
                                    <td className="py-6 px-5"><span className="bg-rose-500/20 text-rose-500 px-6 py-2 rounded-full border border-rose-500/40 shadow-inner">{row.loss}</span></td>
                                    <td className={`py-6 px-5 font-black text-xl ${row.profit > 0 ? 'text-emerald-400' : row.profit < 0 ? 'text-rose-500' : 'opacity-20'}`}>{row.profit > 0 ? '+' : ''}{currencySymbol} {formatMoney(row.profit)}</td>
                                    <td className="py-6 px-5 font-black text-emerald-400 text-xl drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{currencySymbol} {formatMoney(row.final)}</td>
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
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

    const reportData = useMemo(() => {
        const filteredDays = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.id.startsWith(selectedMonth));
        const allTrades = filteredDays.flatMap(day => day.trades.map(t => ({ ...t, date: day.date, dayId: day.id }))).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const dayRecordsBefore = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day' && r.id < `${selectedMonth}-01`).sort((a, b) => b.id.localeCompare(a.id));
        const initialMonthBalance = dayRecordsBefore.length > 0 ? dayRecordsBefore[0].endBalanceUSD : activeBrokerage.initialBalance;
        const finalMonthBalance = filteredDays.length > 0 ? filteredDays[filteredDays.length - 1].endBalanceUSD : initialMonthBalance;
        const totalProfit = filteredDays.reduce((acc, r) => acc + r.netProfitUSD, 0);
        return { totalProfit, finalMonthBalance, allTrades };
    }, [records, selectedMonth, activeBrokerage.initialBalance]);

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:justify-between items-center gap-8">
                <div className="text-center md:text-left">
                    <h2 className={`text-4xl font-black tracking-tighter ${theme.text}`}>Arquivos <span className="text-emerald-400 italic">Ocultos</span></h2>
                    <p className={theme.textMuted}>Relatório confidencial de inteligência financeira.</p>
                </div>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`border rounded-full px-10 py-4 text-sm font-black focus:outline-none transition-all shadow-xl ${isDarkMode ? 'bg-slate-900 text-emerald-400 border-slate-800 focus:border-emerald-500/60' : 'bg-white text-slate-700 border-slate-200'}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className={`p-10 ${theme.roundedCard} border ${theme.card} shadow-xl border-t-8 border-t-emerald-500/40`}><p className="text-[11px] uppercase font-black opacity-50 tracking-[0.3em] mb-4">Retorno Tático</p><p className={`text-4xl font-black ${reportData.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{reportData.totalProfit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(reportData.totalProfit)}</p></div>
                <div className={`p-10 ${theme.roundedCard} border ${theme.card} shadow-xl border-t-8 border-t-blue-500/40`}><p className="text-[11px] uppercase font-black opacity-50 tracking-[0.3em] mb-4">Estado da Banca</p><p className="text-4xl font-black text-blue-400">{currencySymbol} {formatMoney(reportData.finalMonthBalance)}</p></div>
                <div className={`p-10 ${theme.roundedCard} border ${theme.card} shadow-xl border-t-8 border-t-fuchsia-500/40`}><p className="text-[11px] uppercase font-black opacity-50 tracking-[0.3em] mb-4">Volume de Ataque</p><p className="text-4xl font-black text-emerald-400 font-mono tracking-tighter">{reportData.allTrades.length} DISPAROS</p></div>
            </div>
            <div className={`${theme.roundedCard} border overflow-hidden ${theme.card} shadow-2xl`}>
                <div className="p-10 border-b border-slate-800/40 font-black text-xs uppercase tracking-[0.5em] text-emerald-400/70 bg-slate-900/40 backdrop-blur-md">Logs de Combate</div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead><tr className={`text-[12px] uppercase font-black tracking-[0.3em] ${isDarkMode ? 'bg-slate-900/90' : 'bg-slate-100/60'}`}><th className="py-7 px-10">Cronos / Data</th><th className="py-7 px-10">Status de Missão</th><th className="py-7 px-10">Calibre</th><th className="py-7 px-10">Impacto</th><th className="py-7 px-10 text-right">Comando</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/15">
                            {reportData.allTrades.map((t) => {
                                const profit = t.result === 'win' ? (t.entryValue * (t.payoutPercentage / 100)) : -t.entryValue;
                                const tradeDate = t.timestamp ? new Date(t.timestamp) : new Date(t.dayId + 'T12:00:00');
                                return (
                                    <tr key={t.id} className="hover:bg-emerald-500/5 transition-all group">
                                        <td className="py-7 px-10 font-black text-base group-hover:text-emerald-400 transition-colors">
                                            {tradeDate.toLocaleDateString('pt-BR')}
                                            <span className="ml-4 text-[11px] opacity-40 font-mono tracking-widest uppercase">
                                                {tradeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="py-7 px-10"><span className={`text-[11px] font-black uppercase px-5 py-2 rounded-full border-2 ${t.result === 'win' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/10 text-rose-500 border-rose-500/40'}`}>{t.result === 'win' ? 'ELIMINADO' : 'EVADIDO'}</span></td>
                                        <td className="py-7 px-10 font-mono text-base opacity-60 font-black">{currencySymbol} {formatMoney(t.entryValue)}</td>
                                        <td className={`py-7 px-10 font-black text-xl ${profit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{profit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(profit)}</td>
                                        <td className="py-7 px-10 text-right"><button onClick={() => deleteTrade(t.id, t.dayId)} className="text-rose-500/40 hover:text-rose-500 transition-all hover:scale-125 hover:rotate-12"><TrashIcon className="w-6 h-6" /></button></td>
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
    const [payout, setPayout] = useState(activeBrokerage?.payoutPercentage || '80');
    const [levels, setLevels] = useState('4');

    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    const calculations = useMemo(() => {
        const entry = parseFloat(initialEntry) || 0;
        const p = (parseFloat(payout) || 0) / 100;
        const lvls = parseInt(levels) || 1;
        const results = [];
        let currentEntry = entry;

        for (let i = 1; i <= lvls; i++) {
            const profit = currentEntry * p;
            const total = currentEntry + profit;
            results.push({ level: i, entry: currentEntry, profit, total });
            currentEntry = total;
        }
        return results;
    }, [initialEntry, payout, levels]);

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto animate-in zoom-in-95 duration-700">
            <div>
                <h2 className="text-4xl font-black tracking-tighter">Ciclo de <span className="text-emerald-400 italic">Soros Sniper</span></h2>
                <p className={theme.textMuted}>Planejamento de ofensiva com reinvestimento de lucro.</p>
            </div>
            <div className={`p-12 ${theme.roundedCard} border ${theme.card} grid grid-cols-1 md:grid-cols-3 gap-10 shadow-2xl relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500/40" />
                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-3">Impacto Inicial ({currencySymbol})</label>
                    <input type="number" value={initialEntry} onChange={e => setInitialEntry(e.target.value)} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-2xl ${theme.input}`} />
                </div>
                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-3">Eficácia %</label>
                    <input type="number" value={payout} onChange={e => setPayout(e.target.value)} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-2xl ${theme.input}`} />
                </div>
                <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] ml-3">Etapas do Ciclo</label>
                    <input type="number" value={levels} onChange={e => setLevels(e.target.value)} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-2xl ${theme.input}`} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {calculations.map((res) => (
                    <div key={res.level} className={`p-10 ${theme.roundedCard} border ${theme.card} relative overflow-hidden group shadow-xl hover:border-emerald-500/60 transition-all duration-500 border-b-8 border-b-transparent hover:border-b-emerald-500/40`}>
                        <div className="absolute -top-4 -right-4 p-8 opacity-5 font-black text-7xl group-hover:scale-125 transition-transform group-hover:opacity-15 italic">L{res.level}</div>
                        <p className="text-[12px] font-black uppercase text-emerald-400 mb-6 tracking-[0.4em]">Fase {res.level}</p>
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Disparo: <span className="text-white font-black">{currencySymbol} {formatMoney(res.entry)}</span></p>
                            <p className="text-3xl font-black text-emerald-400">+{currencySymbol} {formatMoney(res.profit)}</p>
                            <div className="h-px bg-slate-800/60 my-6" />
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-50">Próximo Alvo: <span className="text-blue-400 font-mono text-base">{currencySymbol} {formatMoney(res.total)}</span></p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Goals Panel ---
const GoalsPanel: React.FC<any> = ({ theme, goals, setGoals, records, activeBrokerage }) => {
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [type, setType] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('monthly');

    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';

    const addGoal = () => {
        if (!name || !target) return;
        const newGoal: Goal = {
            id: crypto.randomUUID(),
            name,
            targetAmount: parseFloat(target),
            type,
            createdAt: Date.now()
        };
        setGoals((prev: Goal[]) => [...prev, newGoal]);
        setName(''); setTarget('');
    };

    const deleteGoal = (id: string) => {
        setGoals((prev: Goal[]) => prev.filter(g => g.id !== id));
    };

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter">Missões <span className="text-emerald-400 italic">Especiais</span></h2>
                    <p className={theme.textMuted}>Objetivos estratégicos e conquistas de elite.</p>
                </div>
            </div>

            <div className={`p-12 ${theme.roundedCard} border ${theme.card} shadow-2xl relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none rotate-12 scale-150">
                    <TargetIcon className="w-80 h-80 text-emerald-400" />
                </div>
                <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-emerald-400/50 mb-10">Briefing de Nova Missão</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Codinome</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Operação Sigma" className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-lg ${theme.input}`} /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Alvo (Valor)</label><input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="5000" className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-2xl ${theme.input}`} /></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Setor</label><select value={type} onChange={e => setType(e.target.value as any)} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black uppercase text-xs tracking-[0.3em] ${theme.input}`}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option><option value="annual">Anual</option></select></div>
                    <div className="flex items-end"><button onClick={addGoal} className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-[2rem] uppercase tracking-[0.3em] transition-all active:scale-95 flex items-center justify-center gap-4 shadow-xl border-b-4 border-emerald-600"><PlusIcon className="w-6 h-6" /> INICIAR</button></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {goals.map(goal => {
                    const currentProfit = records.filter((r: AppRecord): r is DailyRecord => r.recordType === 'day').reduce((acc, r) => acc + r.netProfitUSD, 0);
                    const progress = Math.min(100, (currentProfit / goal.targetAmount) * 100);
                    return (
                        <div key={goal.id} className={`p-10 ${theme.roundedCard} border ${theme.card} shadow-2xl relative group overflow-hidden border-l-8 ${progress >= 100 ? 'border-l-emerald-500' : 'border-l-slate-800'}`}>
                            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => deleteGoal(goal.id)} className="text-rose-500/30 hover:text-rose-500 transition-all hover:scale-150 hover:rotate-12"><TrashIcon className="w-7 h-7" /></button>
                            </div>
                            <div className="flex justify-between items-start mb-8">
                                <div><p className="text-[11px] font-black uppercase text-emerald-400 tracking-[0.4em] mb-2 opacity-80">{goal.type} SNIPER</p><h4 className="text-3xl font-black tracking-tighter uppercase italic">{goal.name}</h4></div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between text-[12px] font-black uppercase tracking-[0.3em]">
                                    <span className="opacity-40">Status de Captura</span>
                                    <span className="text-emerald-400 font-mono text-xl">{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-6 w-full bg-slate-900/60 rounded-full overflow-hidden border border-slate-800/60 shadow-inner p-1">
                                    <div className="h-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.7)]" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex justify-between items-end pt-4">
                                    <p className="text-4xl font-black text-emerald-400 tracking-tighter drop-shadow-md">{currencySymbol} {formatMoney(currentProfit)}</p>
                                    <p className="text-[11px] font-black opacity-30 uppercase tracking-[0.3em] mb-2">Objetivo: {currencySymbol} {formatMoney(goal.targetAmount)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Settings Panel ---
const SettingsPanel: React.FC<any> = ({ theme, brokerage, setBrokerages, onReset }) => {
    const updateBrokerage = (field: keyof Brokerage, value: any) => {
        setBrokerages((prev: Brokerage[]) => prev.map((b, i) => i === 0 ? { ...b, [field]: value } : b));
    };

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-4xl mx-auto animate-in fade-in duration-700">
            <div>
                <h2 className="text-4xl font-black tracking-tighter">Sala de <span className="text-emerald-400 italic">Comando</span></h2>
                <p className={theme.textMuted}>Configurações de hardware e calibração de armamento.</p>
            </div>

            <div className={`p-12 ${theme.roundedCard} border ${theme.card} space-y-12 shadow-2xl relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[80px]" />
                <section className="space-y-10">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-emerald-400/60 flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                        Hardware Central
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Identificação do QG</label>
                            <input type="text" value={brokerage.name} onChange={e => updateBrokerage('name', e.target.value)} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black ${theme.input}`} />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Câmbio Base</label>
                            <select value={brokerage.currency} onChange={e => updateBrokerage('currency', e.target.value as any)} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black uppercase text-xs tracking-[0.3em] ${theme.input}`}>
                                <option value="USD">Dólar Elite ($)</option>
                                <option value="BRL">Real Sniper (R$)</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Arsenal Inicial</label>
                            <input type="number" value={brokerage.initialBalance} onChange={e => updateBrokerage('initialBalance', parseFloat(e.target.value))} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-2xl ${theme.input}`} />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Retorno Padrão %</label>
                            <input type="number" value={brokerage.payoutPercentage} onChange={e => updateBrokerage('payoutPercentage', parseInt(e.target.value))} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-2xl ${theme.input}`} />
                        </div>
                    </div>
                </section>

                <section className="space-y-10 pt-12 border-t border-slate-800/50">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-emerald-400/60 flex items-center gap-4">Calibragem de Disparo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Modo de Calibre</label>
                            <div className="flex bg-slate-900/90 p-2 rounded-full border border-slate-800 shadow-inner">
                                <button onClick={() => updateBrokerage('entryMode', 'percentage')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-full transition-all ${brokerage.entryMode === 'percentage' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>Percentual %</button>
                                <button onClick={() => updateBrokerage('entryMode', 'fixed')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-full transition-all ${brokerage.entryMode === 'fixed' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>Fixo {brokerage.currency === 'USD' ? '$' : 'R$'}</button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Carga do Projétil</label>
                            <input type="number" value={brokerage.entryValue} onChange={e => updateBrokerage('entryValue', parseFloat(e.target.value))} className={`w-full h-16 px-10 rounded-[2rem] border focus:ring-4 focus:ring-emerald-500/20 outline-none font-black text-2xl ${theme.input}`} />
                        </div>
                    </div>
                </section>

                <section className="pt-14">
                    <div className={`p-10 rounded-[3rem] bg-rose-500/5 border border-rose-500/20 space-y-8 shadow-inner`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-rose-600/20 flex items-center justify-center border border-rose-600/40 animate-pulse"><TrashIcon className="w-6 h-6 text-rose-600" /></div>
                            <div>
                                <h4 className="text-base font-black text-rose-500 uppercase tracking-[0.3em] mb-1">PROTOCOLO DE DESTRUIÇÃO</h4>
                                <p className="text-[11px] font-bold text-rose-500/50 leading-relaxed uppercase tracking-widest">AVISO: A EXECUÇÃO DESTE COMANDO IRÁ DELETAR TODOS OS REGISTROS DO SERVIDOR PERMANENTEMENTE.</p>
                            </div>
                        </div>
                        <button onClick={onReset} className="w-full md:w-auto px-16 py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-full uppercase text-[12px] tracking-[0.4em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-rose-600/30 border-b-4 border-rose-800">EXECUTAR WIPE TOTAL</button>
                    </div>
                </section>
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
                const loadedBrokerages = data.brokerages?.length ? data.brokerages : [{ id: crypto.randomUUID(), name: 'Alpha HQ Sniper', initialBalance: 10, entryMode: 'percentage', entryValue: 10, payoutPercentage: 80, stopGainTrades: 3, stopLossTrades: 2, currency: 'USD' }];
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

            const suggestedEntryValue = brokerages[0].entryMode === 'fixed' 
                ? brokerages[0].entryValue 
                : currentBalance * (brokerages[0].entryValue / 100);

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
            const recalibrated = recalibrateHistory(updatedRecords, brokerages[0].initialBalance);
            debouncedSave();
            return recalibrated;
        });
    };

    const deleteTrade = (id: string, dateId: string) => {
        setRecords(prev => {
            const updated = prev.map(r => (r.id === dateId && r.recordType === 'day') ? { ...r, trades: r.trades.filter(t => t.id !== id) } : r);
            const recalibrated = recalibrateHistory(updated, brokerages[0].initialBalance);
            debouncedSave();
            return recalibrated;
        });
    };

    const handleReset = () => {
        if(confirm("Deseja realmente executar o protocolo de Wipe total? Todas as missões serão deletadas do arsenal.")) {
            setRecords([]);
            debouncedSave();
        }
    };

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dailyRecord = records.find((r): r is DailyRecord => r.id === dateStr && r.recordType === 'day');
    const sortedDays = records.filter((r): r is DailyRecord => r.recordType === 'day' && r.date < dateStr).sort((a,b) => b.id.localeCompare(a.id));
    const startBalDashboard = sortedDays.length > 0 ? sortedDays[0].endBalanceUSD : (activeBrokerage?.initialBalance || 0);

    const monthlyGoal = goals.find(g => g.type === 'monthly');
    const activeDailyGoal = monthlyGoal ? (monthlyGoal.targetAmount / 22) : (activeBrokerage?.initialBalance * 0.03 || 1);

    const theme = useThemeClasses(isDarkMode);
    if (isLoading) return <div className={`h-screen flex items-center justify-center ${theme.bg}`}><div className="w-16 h-16 border-8 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(16,185,129,0.5)]" /></div>;

    return (
        <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.text}`}>
            {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
            <aside className={`fixed inset-y-0 left-0 z-50 w-80 flex flex-col border-r transition-all duration-700 ease-out ${theme.sidebar} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-[0_0_50px_rgba(0,0,0,0.8)]`}>
                <div className="h-28 flex flex-col justify-center px-12 border-b border-slate-800/40 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative z-10">
                        <h1 className="text-3xl font-black italic text-emerald-400 tracking-tighter leading-none shadow-emerald-500/50">HRK SNIPER</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 mt-2">ELITE TRADING</p>
                    </div>
                </div>
                <nav className="flex-1 p-8 space-y-3 custom-scrollbar overflow-y-auto">
                    <button onClick={() => {setActiveTab('dashboard'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] text-[11px] uppercase tracking-[0.25em] font-black transition-all ${activeTab === 'dashboard' ? theme.navActive : theme.navInactive}`}><LayoutGridIcon className="w-6 h-6" />Dashboard</button>
                    <button onClick={() => {setActiveTab('ai'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] text-[11px] uppercase tracking-[0.25em] font-black transition-all ${activeTab === 'ai' ? theme.navActive : theme.navInactive}`}><CpuChipIcon className="w-6 h-6" />Visão Sniper</button>
                    <button onClick={() => {setActiveTab('compound'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] text-[11px] uppercase tracking-[0.25em] font-black transition-all ${activeTab === 'compound' ? theme.navActive : theme.navInactive}`}><ChartBarIcon className="w-6 h-6" />Escalada</button>
                    <button onClick={() => {setActiveTab('report'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] text-[11px] uppercase tracking-[0.25em] font-black transition-all ${activeTab === 'report' ? theme.navActive : theme.navInactive}`}><DocumentTextIcon className="w-6 h-6" />Arquivos</button>
                    <button onClick={() => {setActiveTab('soros'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] text-[11px] uppercase tracking-[0.25em] font-black transition-all ${activeTab === 'soros' ? theme.navActive : theme.navInactive}`}><CalculatorIcon className="w-6 h-6" />Calc Soros</button>
                    <button onClick={() => {setActiveTab('goals'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] text-[11px] uppercase tracking-[0.25em] font-black transition-all ${activeTab === 'goals' ? theme.navActive : theme.navInactive}`}><TargetIcon className="w-6 h-6" />Missões</button>
                    <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] text-[11px] uppercase tracking-[0.25em] font-black transition-all ${activeTab === 'settings' ? theme.navActive : theme.navInactive}`}><SettingsIcon className="w-6 h-6" />Comando</button>
                </nav>
                <div className="p-8 border-t border-slate-800/40"><button onClick={onLogout} className="w-full flex items-center gap-5 px-8 py-5 text-rose-500 font-black text-[11px] uppercase tracking-[0.3em] hover:bg-rose-500/10 rounded-[2.5rem] transition-all"><LogoutIcon className="w-6 h-6" />Desconectar</button></div>
            </aside>
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className={`h-28 flex items-center justify-between px-10 md:px-16 border-b ${theme.header} backdrop-blur-3xl z-10`}>
                    <div className="flex items-center gap-8"><button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-4 bg-slate-900 rounded-full border border-slate-800"><MenuIcon className="w-8 h-8" /></button><SavingStatusIndicator status={savingStatus} /></div>
                    <div className="flex items-center gap-8">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-4 bg-slate-900/60 rounded-full border border-slate-800 hover:border-emerald-500/60 transition-all shadow-inner">{isDarkMode ? <SunIcon className="w-6 h-6 text-amber-400" /> : <MoonIcon className="w-6 h-6 text-emerald-400" />}</button>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Sniper Ativo</p>
                                <p className="text-sm font-black uppercase text-emerald-400 tracking-tighter">{user.username}</p>
                            </div>
                            <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center text-slate-950 font-black text-lg border-2 border-slate-950">{user.username.slice(0, 2).toUpperCase()}</div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
                    {activeTab === 'dashboard' && <DashboardPanel activeBrokerage={activeBrokerage} customEntryValue={customEntryValue} setCustomEntryValue={setCustomEntryValue} customPayout={customPayout} setCustomPayout={setCustomPayout} addRecord={addRecord} deleteTrade={deleteTrade} selectedDateString={dateStr} setSelectedDate={setSelectedDate} dailyRecordForSelectedDay={dailyRecord} startBalanceForSelectedDay={startBalDashboard} isDarkMode={isDarkMode} dailyGoalTarget={activeDailyGoal} />}
                    {activeTab === 'ai' && <AIAnalyzerPanel theme={theme} isDarkMode={isDarkMode} />}
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
    if (status === 'saving') return <div className="flex items-center gap-4 text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Link Ativo...</div>;
    if (status === 'saved') return <div className="flex items-center gap-4 text-[11px] font-black uppercase text-emerald-400 tracking-[0.2em]"><CheckIcon className="w-4 h-4" /> HQ Sincronizado</div>;
    return null;
};

export default App;
