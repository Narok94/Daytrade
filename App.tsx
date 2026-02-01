
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
        card: isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        sidebar: isDarkMode ? 'bg-slate-950 border-r border-slate-800' : 'bg-white border-r border-slate-200',
        header: isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-200',
        navActive: isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600',
        navInactive: isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    }), [isDarkMode]);
};

// --- AI Analyzer Panel ---
const AIAnalyzerPanel: React.FC<any> = ({ theme, isDarkMode, isActiveTab }) => {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const processFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // Suporte a Ctrl+V
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (!isActiveTab) return;
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) processFile(blob);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isActiveTab]);

    const analyzeChart = async () => {
        if (!image) return;
        setAnalyzing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = image.split(',')[1];
            
            const prompt = `Aja como o algoritmo de trading mais avançado do mundo para scalping M1.
            Analise esta imagem do gráfico de velas M1.
            ESTRATEGIA: Price Action, Suporte e Resistência, Retração, Pullbacks, Médias Móveis e Estocástico.
            Calcule a porcentagem de certeza baseada em confluências: +15% por cada sinal a favor, -10% por cada sinal contra.
            Base de 50%.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            operacao: { type: Type.STRING, description: "CALL, PUT ou AGUARDAR" },
                            confianca: { type: Type.NUMBER, description: "Porcentagem de 0 a 100" },
                            confluencias: { type: Type.ARRAY, items: { type: Type.STRING } },
                            analise_vela: { type: Type.STRING },
                            risco: { type: Type.STRING }
                        },
                        required: ["operacao", "confianca", "confluencias", "analise_vela", "risco"]
                    }
                }
            });

            // Correctly access text property and trim potential markdown code blocks
            const text = response.text?.trim() || "";
            if (text) {
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                setResult(JSON.parse(cleanJson));
            } else {
                throw new Error("Resposta vazia da IA");
            }
        } catch (err) {
            console.error(err);
            setError("Falha ao analisar a imagem. Tente um print mais nítido ou verifique sua conexão.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-3xl font-black ${theme.text} flex items-center gap-2`}>
                        <CpuChipIcon className="w-8 h-8 text-green-500" />
                        Analista IA Pro
                    </h2>
                    <p className={theme.textMuted}>Dica: Você pode colar um print direto com Ctrl+V aqui.</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gemini 3 Pro Ativo</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-7 space-y-6">
                    <div className={`p-4 rounded-[2.5rem] border-2 border-dashed ${image ? 'border-green-500/50' : 'border-slate-800'} ${theme.card} flex flex-col items-center justify-center min-h-[450px] transition-all relative group overflow-hidden`}>
                        {image ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={image} alt="Chart" className="max-h-[420px] w-full object-contain rounded-3xl" />
                                <button onClick={() => setImage(null)} className="absolute top-4 right-4 p-3 bg-red-600/90 text-white rounded-2xl hover:scale-110 transition-all shadow-2xl backdrop-blur-md"><TrashIcon className="w-5 h-5" /></button>
                                <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-950/20 rounded-[2.2rem]"></div>
                            </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-6 text-center group py-20 w-full">
                                <div className="w-24 h-24 bg-green-500/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-all border border-green-500/20 shadow-inner">
                                    <PlusIcon className="w-10 h-10 text-green-500" />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-black text-lg uppercase tracking-[0.3em] text-white">Upload ou Ctrl+V</p>
                                    <p className="text-xs opacity-40 font-bold max-w-xs mx-auto">Tire um print da tela e cole aqui para análise imediata em M1.</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>

                    <button 
                        onClick={analyzeChart} 
                        disabled={!image || analyzing}
                        className={`w-full h-20 rounded-3xl font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 text-lg
                        ${!image || analyzing ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800' : 'bg-green-500 hover:bg-green-400 text-slate-950 shadow-2xl shadow-green-500/30 active:scale-95'}`}
                    >
                        {analyzing ? (
                            <>
                                <ArrowPathIcon className="w-7 h-7 animate-spin" />
                                Analisando Padrões...
                            </>
                        ) : (
                            <>
                                <CpuChipIcon className="w-7 h-7" />
                                Processar Análise Pro
                            </>
                        )}
                    </button>
                </div>

                <div className="xl:col-span-5 space-y-6">
                    {result ? (
                        <div className={`p-8 rounded-[2.5rem] border ${theme.card} space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 shadow-2xl relative overflow-hidden`}>
                            <div className={`absolute -top-20 -right-20 w-40 h-40 blur-[100px] rounded-full opacity-20 ${result.operacao === 'CALL' ? 'bg-green-500' : result.operacao === 'PUT' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            
                            <div className="flex justify-between items-start relative">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Sinal de Entrada</p>
                                    <h3 className={`text-6xl font-black tracking-tighter italic ${result.operacao === 'CALL' ? 'text-green-500' : result.operacao === 'PUT' ? 'text-red-500' : 'text-slate-400'}`}>
                                        {result.operacao}
                                    </h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Certeza</p>
                                    <p className={`text-4xl font-black ${result.confianca > 75 ? 'text-blue-400' : 'text-yellow-500'}`}>{result.confianca}%</p>
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full transition-all duration-1000 ${result.confianca > 75 ? 'bg-blue-400' : 'bg-yellow-500'}`} style={{ width: `${result.confianca}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                                    <p className="text-[9px] font-black uppercase opacity-40 mb-1">Nível de Risco</p>
                                    <p className={`text-sm font-black ${result.risco === 'Baixo' ? 'text-green-500' : result.risco === 'Médio' ? 'text-yellow-500' : 'text-red-500'}`}>{result.risco}</p>
                                </div>
                                <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                                    <p className="text-[9px] font-black uppercase opacity-40 mb-1">Timeframe</p>
                                    <p className="text-sm font-black text-white">M1 (Vela Seg.)</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-green-500 tracking-[0.2em] border-b border-green-500/20 pb-2">Confluências</p>
                                <div className="space-y-3">
                                    {result.confluencias?.map((item: string, i: number) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0 shadow-[0_0_10px_#22c55e]" />
                                            <p className="text-xs font-bold leading-relaxed opacity-90">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <p className="text-[10px] font-black uppercase opacity-40 mb-2">Análise Técnica</p>
                                <p className="text-xs font-medium text-slate-300 italic bg-slate-800/20 p-4 rounded-2xl border border-slate-800/30 leading-relaxed">
                                    "{result.analise_vela}"
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className={`p-12 rounded-[2.5rem] border border-slate-800/30 bg-slate-900/10 flex flex-col items-center justify-center text-center space-y-6 min-h-[500px]`}>
                            <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center rotate-12">
                                <LayoutGridIcon className="w-10 h-10 text-slate-700" />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-xl font-black opacity-30 uppercase tracking-widest">Aguardando Gráfico</h4>
                                <p className="text-xs text-slate-600 font-bold max-w-[250px]">Cole ou suba um print para ver as confluências aqui.</p>
                            </div>
                        </div>
                    )}
                    
                    {error && (
                        <div className="p-5 bg-red-600/10 border border-red-500/20 rounded-3xl flex items-center gap-4 text-red-500 shadow-xl">
                            <InformationCircleIcon className="w-8 h-8" />
                            <p className="text-xs font-black uppercase tracking-tight leading-tight">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Dashboard Panel ---
const DashboardPanel: React.FC<{ theme: any }> = ({ theme }) => (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
        <h2 className={`text-4xl font-black ${theme.text} uppercase tracking-tighter italic`}>Dashboard Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-6 rounded-[2rem] border ${theme.card}`}>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Banca Atual</p>
                <p className="text-3xl font-black text-green-500">R$ 2.450,00</p>
            </div>
            <div className={`p-6 rounded-[2rem] border ${theme.card}`}>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Operações do Dia</p>
                <div className="flex items-center gap-2">
                    <span className="text-3xl font-black">12</span>
                    <span className="text-xs font-bold text-green-500">(8W - 4L)</span>
                </div>
            </div>
            <div className={`p-6 rounded-[2rem] border ${theme.card}`}>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Win Rate</p>
                <p className="text-3xl font-black text-blue-400">66.7%</p>
            </div>
            <div className={`p-6 rounded-[2rem] border ${theme.card}`}>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Lucro/Prejuízo</p>
                <p className="text-3xl font-black text-green-500">+ R$ 124,00</p>
            </div>
        </div>
        <div className={`p-8 rounded-[2.5rem] border ${theme.card} min-h-[300px] flex items-center justify-center text-center`}>
            <div>
                <ChartBarIcon className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-sm font-bold opacity-30">Gráfico de desempenho será carregado após mais operações.</p>
            </div>
        </div>
    </div>
);

// --- Compound Interest Panel ---
const CompoundInterestPanel: React.FC<{ theme: any }> = ({ theme }) => (
    <div className="p-8 max-w-4xl mx-auto">
        <h2 className={`text-4xl font-black ${theme.text} uppercase tracking-tighter italic mb-8`}>Juros Compostos</h2>
        <div className={`p-8 rounded-[2.5rem] border ${theme.card} space-y-6`}>
            <p className="text-sm font-medium opacity-60">Projete o crescimento da sua banca operando com gerenciamento rigoroso.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Capital Inicial</label>
                    <input type="number" className={`w-full h-12 px-6 rounded-2xl ${theme.input}`} placeholder="Ex: 100" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dias Operados</label>
                    <input type="number" className={`w-full h-12 px-6 rounded-2xl ${theme.input}`} placeholder="Ex: 30" />
                </div>
            </div>
            <button className="w-full h-14 bg-green-500 text-slate-950 font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-green-400 transition-all">Calcular Projeção</button>
        </div>
    </div>
);

// --- Report Panel ---
const ReportPanel: React.FC<{ theme: any }> = ({ theme }) => (
    <div className="p-8 max-w-6xl mx-auto">
        <h2 className={`text-4xl font-black ${theme.text} uppercase tracking-tighter italic mb-8`}>Relatório de Operações</h2>
        <div className={`rounded-[2.5rem] border ${theme.card} overflow-hidden`}>
            <table className="w-full text-left">
                <thead className="bg-slate-900/50 border-b border-slate-800">
                    <tr>
                        <th className="px-8 py-4 text-[10px] font-black uppercase opacity-40 tracking-widest">Data/Hora</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase opacity-40 tracking-widest">Ativo</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase opacity-40 tracking-widest">Direção</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase opacity-40 tracking-widest">Valor</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase opacity-40 tracking-widest">Resultado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                    {[1,2,3,4,5].map(i => (
                        <tr key={i} className="hover:bg-slate-800/10 transition-colors">
                            <td className="px-8 py-6 font-bold text-xs">24/05 14:3{i}</td>
                            <td className="px-8 py-6 font-black text-xs">EUR/USD</td>
                            <td className={`px-8 py-6 font-black text-xs ${i % 2 === 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {i % 2 === 0 ? 'CALL' : 'PUT'}
                            </td>
                            <td className="px-8 py-6 font-bold text-xs">R$ 10,00</td>
                            <td className="px-8 py-6">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${i % 3 === 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                    {i % 3 === 0 ? 'Loss' : 'Win'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// --- Soros Calculator Panel ---
const SorosCalculatorPanel: React.FC<{ theme: any }> = ({ theme }) => (
    <div className="p-8 max-w-4xl mx-auto">
        <h2 className={`text-4xl font-black ${theme.text} uppercase tracking-tighter italic mb-8`}>Gerenciamento Soros</h2>
        <div className={`p-8 rounded-[2.5rem] border ${theme.card} space-y-8`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mão Inicial</label>
                    <input type="number" className={`w-full h-12 px-6 rounded-2xl ${theme.input}`} placeholder="R$ 2.00" />
                    
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-4">Nível Desejado</label>
                    <div className="flex gap-2">
                        {[2,3,4,5].map(n => (
                            <button key={n} className="flex-1 h-10 rounded-xl border border-slate-800 font-black text-xs hover:bg-green-500 hover:text-slate-950 transition-all">{n}</button>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-950/40 rounded-3xl p-6 border border-slate-800/50 flex flex-col justify-center text-center">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-2">Potencial de Lucro Acumulado</p>
                    <p className="text-4xl font-black text-green-500">R$ 0,00</p>
                </div>
            </div>
        </div>
    </div>
);

// --- Goals Panel ---
const GoalsPanel: React.FC<{ theme: any }> = ({ theme }) => (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
        <h2 className={`text-4xl font-black ${theme.text} uppercase tracking-tighter italic`}>Suas Metas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-8 rounded-[2.5rem] border ${theme.card} relative overflow-hidden`}>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 blur-3xl rounded-full" />
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-40 mb-1">Meta Diária</p>
                        <h4 className="text-2xl font-black">R$ 50,00</h4>
                    </div>
                    <CheckIcon className="w-6 h-6 text-green-500" />
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full mb-2">
                    <div className="h-full w-[65%] bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]" />
                </div>
                <p className="text-[9px] font-black uppercase opacity-40">65% Concluído</p>
            </div>
            <div className={`p-8 rounded-[2.5rem] border ${theme.card} relative overflow-hidden`}>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-40 mb-1">Meta Mensal</p>
                        <h4 className="text-2xl font-black">R$ 1.200,00</h4>
                    </div>
                    <TargetIcon className="w-6 h-6 text-blue-500" />
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full mb-2">
                    <div className="h-full w-[30%] bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                </div>
                <p className="text-[9px] font-black uppercase opacity-40">30% Concluído</p>
            </div>
        </div>
    </div>
);

// --- Settings Panel ---
const SettingsPanel: React.FC<{ theme: any; isDarkMode: boolean; onLogout: () => void }> = ({ theme, isDarkMode, onLogout }) => (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
        <h2 className={`text-4xl font-black ${theme.text} uppercase tracking-tighter italic`}>Ajustes</h2>
        <div className={`p-8 rounded-[2.5rem] border ${theme.card} space-y-8`}>
            <div className="space-y-6">
                <div className="flex items-center justify-between group">
                    <div>
                        <p className="font-black text-sm uppercase">Interface de Alta Performance</p>
                        <p className="text-[10px] opacity-40 font-bold uppercase">Habilitar tema escuro futurista</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${isDarkMode ? 'bg-green-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                </div>
                <div className="flex items-center justify-between group">
                    <div>
                        <p className="font-black text-sm uppercase">Notificações de Sinal</p>
                        <p className="text-[10px] opacity-40 font-bold uppercase">Receber alertas de confluência da IA</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500 rounded-full relative p-1 cursor-pointer">
                        <div className="w-4 h-4 bg-white rounded-full translate-x-6" />
                    </div>
                </div>
            </div>
            <div className="pt-8 border-t border-slate-800/50">
                <button onClick={onLogout} className="w-full h-14 border border-red-500/20 text-red-500 font-black uppercase tracking-[0.4em] rounded-2xl hover:bg-red-500 hover:text-white transition-all">Sair do Terminal</button>
            </div>
        </div>
    </div>
);

// --- App Root Logic ---
const App: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const theme = useThemeClasses(isDarkMode);

    const menuItems = [
        { id: 'dashboard', label: 'Início', icon: LayoutGridIcon },
        { id: 'ai', label: 'Analista IA', icon: CpuChipIcon },
        { id: 'compound', label: 'Juros Comp.', icon: TrendingUpIcon },
        { id: 'report', label: 'Histórico', icon: DocumentTextIcon },
        { id: 'soros', label: 'Soros', icon: CalculatorIcon },
        { id: 'goals', label: 'Metas', icon: TargetIcon },
        { id: 'settings', label: 'Config', icon: SettingsIcon },
    ];

    return (
        <div className={`min-h-screen flex flex-col md:flex-row ${theme.bg} ${theme.text} transition-colors duration-500`}>
            {/* Sidebar Desktop */}
            <div className={`w-full md:w-64 flex flex-col ${theme.sidebar} p-6 h-screen sticky top-0`}>
                <div className="mb-12">
                    <h1 className="text-3xl font-black tracking-[0.3em] text-emerald-400 italic">HRK</h1>
                    <p className="text-[9px] font-black uppercase opacity-40 mt-1 tracking-widest leading-none">Binary Ops Control</p>
                </div>

                <nav className="flex-1 space-y-1.5">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.15em]
                            ${activeTab === item.id ? theme.navActive + ' shadow-lg scale-[1.02]' : theme.navInactive}`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-800/30">
                    <div className="flex items-center gap-3 mb-6 p-2 rounded-2xl bg-slate-900/30 border border-slate-800/50">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-slate-950 text-lg">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-tight">{user.username}</p>
                            <p className="text-[8px] opacity-40 font-bold uppercase">Terminal Ativo</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-red-500/10 text-red-500 font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all">
                        <LogoutIcon className="w-4 h-4" /> Logoff
                    </button>
                </div>
            </div>

            {/* Mobile Header (Only on small screens) */}
            <div className={`md:hidden p-4 flex justify-between items-center ${theme.header} sticky top-0 z-50 backdrop-blur-md`}>
                <h1 className="font-black tracking-widest text-emerald-400 italic">HRK</h1>
                <MenuIcon className="w-6 h-6" />
            </div>

            {/* Main Viewport */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'dashboard' && <DashboardPanel theme={theme} />}
                {activeTab === 'compound' && <CompoundInterestPanel theme={theme} />}
                {activeTab === 'report' && <ReportPanel theme={theme} />}
                {activeTab === 'ai' && <AIAnalyzerPanel theme={theme} isDarkMode={isDarkMode} isActiveTab={activeTab === 'ai'} />}
                {activeTab === 'soros' && <SorosCalculatorPanel theme={theme} />}
                {activeTab === 'goals' && <GoalsPanel theme={theme} />}
                {activeTab === 'settings' && <SettingsPanel theme={theme} isDarkMode={isDarkMode} onLogout={onLogout} />}
            </div>
        </div>
    );
};

export default App;
