import { GoogleGenAI, Type } from "@google/genai";
import { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    if (!API_KEY) {
        console.error("ERRO CRÍTICO: GEMINI_API_KEY não configurada no servidor.");
        return res.status(500).json({ error: 'Serviço de IA não configurado no servidor.' });
    }

    const { imageData, prompt, systemInstruction } = req.body;

    if (!imageData) {
        return res.status(400).json({ error: 'Imagem não fornecida.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        // Remove data URL prefix if present
        const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;

        const config = {
            systemInstruction: systemInstruction || "Você é um especialista em escalpamento agressivo em M1.",
            temperature: 0.8,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    asset: { type: Type.STRING },
                    recommendation: { type: Type.STRING, enum: ['CALL', 'PUT'] },
                    confidence: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING },
                    expiration: { type: Type.STRING },
                    trend: { type: Type.STRING, enum: ['ALTA', 'BAIXA'] },
                    precision: { type: Type.STRING },
                    volume: { type: Type.STRING },
                    timeframe: { type: Type.STRING },
                    candleRemainingSeconds: { type: Type.NUMBER }
                },
                required: ['asset', 'recommendation', 'confidence', 'reasoning', 'expiration', 'trend', 'precision', 'volume', 'timeframe', 'candleRemainingSeconds']
            }
        };

        const result = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { 
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } }, 
                    { text: prompt || "Analise este gráfico." }
                ] 
            },
            config
        });

        const text = result.text;
        if (!text) {
            throw new Error("Resposta vazia da IA.");
        }

        try {
            const jsonResult = JSON.parse(text);
            return res.json(jsonResult);
        } catch (parseError) {
            console.error("Erro ao processar JSON da IA:", text);
            return res.status(500).json({ error: 'Erro ao processar resposta da IA.', raw: text });
        }

    } catch (error: any) {
        console.error("Erro na API Gemini:", error);
        
        if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
            console.warn("ALERTA: Cota da API Gemini atingida!");
            return res.status(429).json({ error: 'Cota de IA atingida. Tente novamente mais tarde.' });
        }

        return res.status(500).json({ error: 'Falha na análise de IA: ' + (error.message || 'Erro desconhecido') });
    }
}
