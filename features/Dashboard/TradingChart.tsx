import React, { useEffect, useRef, useState } from 'react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const TradingChart: React.FC<{ isDarkMode: boolean; theme: any }> = ({ isDarkMode, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(1.08542);

  // Initialize candles
  useEffect(() => {
    const initialCandles: Candle[] = [];
    let lastClose = 1.08500;
    const now = Date.now();
    for (let i = 0; i < 40; i++) {
      const open = lastClose;
      const close = open + (Math.random() - 0.5) * 0.00050;
      const high = Math.max(open, close) + Math.random() * 0.00020;
      const low = Math.min(open, close) - Math.random() * 0.00020;
      initialCandles.push({ time: now - (40 - i) * 60000, open, high, low, close });
      lastClose = close;
    }
    setCandles(initialCandles);
    setCurrentPrice(lastClose);
  }, []);

  // Simulate real-time price movement
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(prev => {
        const change = (Math.random() - 0.5) * 0.00005;
        return prev + change;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update current candle or add new one
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const lastCandle = prev[prev.length - 1];
        const newCandles = [...prev];
        
        // Every 60 seconds, start a new candle
        const now = Date.now();
        if (now - lastCandle.time >= 60000) {
          const open = lastCandle.close;
          const close = currentPrice;
          newCandles.push({ time: now, open, high: Math.max(open, close), low: Math.min(open, close), close });
          if (newCandles.length > 50) newCandles.shift();
        } else {
          // Update last candle
          newCandles[newCandles.length - 1] = {
            ...lastCandle,
            close: currentPrice,
            high: Math.max(lastCandle.high, currentPrice),
            low: Math.min(lastCandle.low, currentPrice)
          };
        }
        return newCandles;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentPrice]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    if (candles.length < 2) return;

    const minPrice = Math.min(...candles.map(c => c.low)) * 0.9999;
    const maxPrice = Math.max(...candles.map(c => c.high)) * 1.0001;
    const priceRange = maxPrice - minPrice;

    const getY = (price: number) => height - ((price - minPrice) / priceRange) * height;
    const candleWidth = (width / candles.length) * 0.8;
    const spacing = (width / candles.length);

    // Draw grid
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw candles
    candles.forEach((candle, i) => {
      const x = i * spacing + spacing / 2;
      const openY = getY(candle.open);
      const closeY = getY(candle.close);
      const highY = getY(candle.high);
      const lowY = getY(candle.low);

      const color = candle.close >= candle.open ? '#10b981' : '#f43f5e';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Wick
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, Math.min(openY, closeY), candleWidth, bodyHeight);
    });

    // Draw current price line
    const currentY = getY(currentPrice);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(width, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price tag
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(width - 70, currentY - 12, 70, 24, 6);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(currentPrice.toFixed(5), width - 35, currentY + 5);

  }, [candles, currentPrice, isDarkMode]);

  return (
    <div className={`relative w-full h-80 rounded-3xl border overflow-hidden soft-shadow ${theme.card}`}>
      <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
        <div className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-black rounded-lg uppercase tracking-widest shadow-lg">EUR/USD</div>
        <div className={`text-lg font-black ${candles[candles.length-1]?.close >= candles[candles.length-1]?.open ? 'text-emerald-500' : 'text-rose-500'}`}>
          {currentPrice.toFixed(5)}
        </div>
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
