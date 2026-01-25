// services/tradingDataService.ts

type Candle = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
};

let currentTime = new Date();
currentTime.setMinutes(currentTime.getMinutes() - 51); // Start 50 minutes ago

const generateCandle = (prevClose: number): Omit<Candle, 'time'> => {
    const open = prevClose + (Math.random() - 0.5) * 0.2; // slight gap
    const close = open + (Math.random() - 0.5) * 2;
    const high = Math.max(open, close) + Math.random() * 0.5;
    const low = Math.min(open, close) - Math.random() * 0.5;
    return { open, high, low, close };
};

export const generateInitialData = (count: number): Candle[] => {
    const data: Candle[] = [];
    let lastClose = 100;

    for (let i = 0; i < count; i++) {
        currentTime.setMinutes(currentTime.getMinutes() + 1);
        const { open, high, low, close } = generateCandle(lastClose);
        data.push({
            time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            open,
            high,
            low,
            close,
        });
        lastClose = close;
    }
    return data;
};

export const getNextCandle = (prevCandle: Candle): Candle => {
    currentTime.setMinutes(currentTime.getMinutes() + 1);
    const { open, high, low, close } = generateCandle(prevCandle.close);
    return {
        time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        open,
        high,
        low,
        close,
    };
};
