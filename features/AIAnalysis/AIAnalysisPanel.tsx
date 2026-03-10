import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { CpuChipIcon, TargetIcon, PlusIcon, InformationCircleIcon } from '../../components/icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AIAnalysisResult } from '../../types';

export const AIAnalysisPanel: React.FC<any> = ({ theme, isDarkMode }) => {
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
            const timeString = now.toLocaleTimeString('pt-BR');

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: `SISTEMA: ${timeString}. 
                        PROTOCOLO SNIPER V5 (M1):
                        1. ANALISE: Tendência majoritária vs micro-tendência (últimas 10 velas).
                        2. GATILHOS: Procure por exaustão de preço, rompimento de suporte/resistência ou reversão em SNR.
                        3. AGRESSIVIDADE: Se houver um padrão claro de Price Action (Martelo, Engolfo, Pinbar), emita CALL ou PUT imediatamente. Não fique apenas no WAIT se o movimento for provável (> 65%).
                        4. TEMPO: Determine o início da próxima vela M1. Se agora são ${now.getSeconds()} segundos, a entrada deve ser no minuto ${now.getMinutes() + 1}:00.
                        Retorne JSON puro.` },
                    ],
                },
                config: {
                    systemInstruction: "Você é um trader profissional de opções binárias especializado em M1. Analise o fluxo das velas. Foque em rejeições de preço (pavios) e impulsão. Seu objetivo é encontrar a maior probabilidade para a PRÓXIMA VELA. Responda apenas com o JSON conforme o schema, sendo técnico e direto na justificativa.",
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
            if (!text) throw new Error("Motor inativo.");
            setAnalysisResult(JSON.parse(text));
        } catch (err: any) {
            console.error(err);
            setError("Ocorreu um erro na análise sniper. Tente novamente com uma imagem mais nítida.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                        <CpuChipIcon className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className={`text-4xl font-black tracking-tight ${theme.text}`}>Scanner Sniper v5</h2>
                        <p className={`${theme.textMuted} text-sm font-medium mt-1`}>Análise de Price Action M1 via Inteligência Artificial.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-widest">IA Operacional</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card title="Captura do Gráfico" subtitle="M1 recomendado" icon={<TargetIcon className="w-5 h-5 text-blue-500" />}>
                    <div className="flex flex-col h-full">
                        <div className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] p-10 min-h-[450px] relative overflow-hidden transition-all ${isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50/50'}`}>
                            {!selectedImage ? (
                                <label className="cursor-pointer flex flex-col items-center gap-8 text-center group">
                                    <div className="w-28 h-28 rounded-full bg-white shadow-2xl flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-500 border border-slate-100">
                                      <PlusIcon className="w-14 h-14" />
                                    </div>
                                    <div className="space-y-3">
                                        <p className={`font-black uppercase tracking-tight text-xl ${theme.text}`}>Upload do Print</p>
                                        <p className="text-xs font-medium text-slate-400 max-w-[220px]">Arraste ou clique para enviar o gráfico da corretora</p>
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center gap-8">
                                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
                                        <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                                        {isAnalyzing && (
                                            <div className="absolute inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
                                                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                <div className="text-center">
                                                    <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">Processando Candles...</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-3">Mapeando regiões de valor</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-6 w-full">
                                        <Button variant="secondary" className="flex-1 h-14" onClick={() => setSelectedImage(null)}>Limpar</Button>
                                        <Button variant="primary" className="flex-[2] h-14 shadow-xl shadow-blue-500/20" isLoading={isAnalyzing} onClick={runAIAnalysis}>
                                          {isAnalyzing ? 'Analisando...' : 'Iniciar Scan Sniper'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card title="Relatório de Análise" subtitle="Gatilhos e Confluências" icon={<CpuChipIcon className="w-5 h-5 text-blue-500" />}>
                    {analysisResult ? (
                        <div className="space-y-10">
                            <div className={`p-8 rounded-[2.5rem] border-2 flex items-center justify-between shadow-lg ${analysisResult.recommendation === 'CALL' ? 'bg-emerald-50 border-emerald-200 shadow-emerald-500/5' : analysisResult.recommendation === 'PUT' ? 'bg-rose-50 border-rose-200 shadow-rose-500/5' : 'bg-slate-50 border-slate-200'}`}>
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-slate-400 mb-3 tracking-widest">Recomendação</p>
                                    <h4 className={`text-6xl font-black tracking-tighter ${analysisResult.recommendation === 'CALL' ? 'text-emerald-600' : analysisResult.recommendation === 'PUT' ? 'text-rose-600' : 'text-slate-400'}`}>
                                        {analysisResult.recommendation === 'CALL' ? 'CALL ↑' : analysisResult.recommendation === 'PUT' ? 'PUT ↓' : 'WAIT ∅'}
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold uppercase text-slate-400 mb-3 tracking-widest">Confiança</p>
                                    <p className={`text-5xl font-black ${theme.text}`}>{analysisResult.confidence}%</p>
                                </div>
                            </div>

                            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/20 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-slate-400 mb-3 tracking-widest">Horário de Entrada</p>
                                    <p className="text-6xl font-black tracking-tighter tabular-nums">{analysisResult.entryTime}</p>
                                </div>
                                <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center">
                                  <TargetIcon className="w-12 h-12 text-blue-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className={`p-6 rounded-3xl border shadow-sm ${theme.card}`}>
                                    <p className="text-[11px] font-bold uppercase text-slate-400 mb-3 tracking-widest">Suporte</p>
                                    <p className="text-base font-black text-emerald-600">{analysisResult.supportLevel}</p>
                                </div>
                                <div className={`p-6 rounded-3xl border shadow-sm ${theme.card}`}>
                                    <p className="text-[11px] font-bold uppercase text-slate-400 mb-3 tracking-widest">Resistência</p>
                                    <p className="text-base font-black text-rose-600">{analysisResult.resistanceLevel}</p>
                                </div>
                            </div>

                            <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[11px] font-bold uppercase text-slate-400 mb-5 tracking-widest">Justificativa Técnica</p>
                                <div className="flex flex-wrap gap-3 mb-8">
                                    {analysisResult.patterns.map((p, i) => (
                                        <span key={i} className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-widest shadow-sm">{p}</span>
                                    ))}
                                </div>
                                <p className={`text-base font-medium leading-relaxed italic border-l-4 border-blue-500 pl-8 py-2 ${theme.text}`}>
                                    "{analysisResult.reasoning}"
                                </p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center py-32 text-center">
                            <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-8 shadow-lg shadow-rose-500/10">
                              <InformationCircleIcon className="w-12 h-12" />
                            </div>
                            <p className="text-base font-bold text-rose-500 max-w-[320px]">{error}</p>
                            <Button variant="secondary" className="mt-8 h-12" onClick={() => setError(null)}>Tentar Novamente</Button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-40 opacity-10 text-center">
                            <CpuChipIcon className="w-32 h-32 mb-10" />
                            <p className="text-sm font-black uppercase tracking-[0.4em]">Aguardando Scan do Gráfico</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
