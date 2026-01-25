// services/indicatorService.ts

type Candle = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
};

// Simple Moving Average
const sma = (data: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
            result.push(sum / period);
        }
    }
    return result;
};

// Standard Deviation
const stdDev = (data: number[], period: number): (number | null)[] => {
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            const slice = data.slice(i - period + 1, i + 1);
            const mean = slice.reduce((acc, val) => acc + val, 0) / period;
            const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
            result.push(Math.sqrt(variance));
        }
    }
    return result;
};

export const calculateBollingerBands = (data: Candle[], period = 20, stdDevMultiplier = 2) => {
    const closes = data.map(d => d.close);
    const middleBand = sma(closes, period);
    const stdDevs = stdDev(closes, period);

    return data.map((d, i) => {
        if (middleBand[i] !== null && stdDevs[i] !== null) {
            return {
                ...d,
                bb: {
                    middle: middleBand[i]!,
                    upper: middleBand[i]! + stdDevs[i]! * stdDevMultiplier,
                    lower: middleBand[i]! - stdDevs[i]! * stdDevMultiplier,
                },
            };
        }
        return { ...d, bb: { middle: null, upper: null, lower: null } };
    });
};


export const calculateRSI = (data: Candle[], period = 14) => {
    let gains: number[] = [];
    let losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
        const diff = data[i].close - data[i - 1].close;
        gains.push(diff > 0 ? diff : 0);
        losses.push(diff < 0 ? -diff : 0);
    }
    
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    const rsiValues: (number | null)[] = [null]; // RSI starts from the second data point
    for(let i=0; i<period-1; i++) rsiValues.push(null);


    let rs = avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));

    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        rs = avgGain / avgLoss;
        rsiValues.push(100 - (100 / (1 + rs)));
    }

    return data.map((d, i) => ({ ...d, rsi: rsiValues[i] ?? null }));
};

export const findFractals = (data: Candle[]) => {
    return data.map((d, i) => {
        if (i < 2 || i > data.length - 3) {
            return { ...d, fractal: null };
        }
        
        const isBearish = 
            data[i].high > data[i-1].high &&
            data[i].high > data[i-2].high &&
            data[i].high > data[i+1].high &&
            data[i].high > data[i+2].high;

        const isBullish = 
            data[i].low < data[i-1].low &&
            data[i].low < data[i-2].low &&
            data[i].low < data[i+1].low &&
            data[i].low < data[i+2].low;
        
        const fractal = isBearish ? 'bearish' : isBullish ? 'bullish' : null;

        return { ...d, fractal };
    });
};