
import React, { useState, useEffect, useRef } from 'react';
import { UserIcon, LockClosedIcon } from './icons';

interface LoginProps {
    onLogin: (username: string, password: string) => Promise<boolean>;
    onRegister: (username: string, password: string) => Promise<void>;
    error: string;
    setError: (error: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, error, setError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartTrackRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const timerId = setInterval(() => {
             const date = new Date();
             const options: Intl.DateTimeFormatOptions = {
                 weekday: 'long',
                 year: 'numeric',
                 month: 'long',
                 day: 'numeric',
                 hour: '2-digit',
                 minute: '2-digit',
                 second: '2-digit',
                 timeZoneName: 'shortOffset',
             };
             const formattedTime = date.toLocaleString('pt-BR', options).replace('GMT', 'UTC').replace(/,([^,]*)$/, '$1');
             setCurrentTime(formattedTime);
        }, 1000);

        return () => clearInterval(timerId);
    }, []);

    // Effect for generating scrolling candlestick chart
    useEffect(() => {
        const track = chartTrackRef.current;
        if (!track) return;

        const createCandles = () => {
            track.innerHTML = '';
            const fragment = document.createDocumentFragment();
            const numCandles = Math.ceil(window.innerWidth / 18) * 2; 

            for (let i = 0; i < numCandles; i++) {
                const candle = document.createElement('div');
                const wick = document.createElement('div');
                const body = document.createElement('div');

                const isGreen = Math.random() > 0.5;
                candle.className = `chart-candle ${isGreen ? 'green' : 'red'}`;
                
                const totalHeight = Math.random() * 250 + 70;
                const bodyHeight = Math.random() * (totalHeight * 0.8) + (totalHeight * 0.1);
                const bodyTop = Math.random() * (totalHeight - bodyHeight);

                candle.style.height = `${totalHeight}px`;
                wick.className = 'wick';
                wick.style.height = `${totalHeight}px`;
                body.className = 'body';
                body.style.height = `${bodyHeight}px`;
                body.style.top = `${bodyTop}px`;

                candle.appendChild(wick);
                candle.appendChild(body);
                fragment.appendChild(candle);
            }
            
            const clonedFragment = fragment.cloneNode(true);
            track.appendChild(fragment);
            track.appendChild(clonedFragment);
            track.style.width = `${(numCandles * 18) * 2}px`;
        };
        createCandles();
    }, []);

    // Effect for particle canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        class Particle {
            x: number; y: number; size: number; speedX: number; speedY: number;
            constructor(x: number, y: number, size: number, speedX: number, speedY: number) {
                this.x = x; this.y = y; this.size = size; this.speedX = speedX; this.speedY = speedY;
            }
            update() {
                if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
                if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
                this.x += this.speedX;
                this.y += this.speedY;
            }
            draw() {
                if (ctx) {
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        let particlesArray: Particle[] = [];
        const init = () => {
            particlesArray = [];
            const numberOfParticles = (canvas.width * canvas.height) / 8000;
            for (let i = 0; i < numberOfParticles; i++) {
                const size = Math.random() * 3 + 1;
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const speedX = (Math.random() * 0.8) - 0.4;
                const speedY = (Math.random() * 0.8) - 0.4;
                particlesArray.push(new Particle(x, y, size, speedX, speedY));
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                init();
            }
        };

        init();
        animate();
        window.addEventListener('resize', handleResize);
        return () => {
            window.cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isRegistering) {
                if (password !== confirmPassword) {
                    setError('As senhas não coincidem.');
                    setIsLoading(false);
                    return;
                }
                await onRegister(username, password);
            } else {
                await onLogin(username, password);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleView = () => {
        setIsRegistering(!isRegistering);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setError('');
    };

    return (
        <div className="login-container min-h-screen w-full flex items-center justify-center p-6 font-sans">
            <canvas ref={canvasRef} className="particle-canvas"></canvas>
            <div className="cyber-grid"></div>
            
            <div className="scrolling-chart-container">
                <div ref={chartTrackRef} className="chart-track"></div>
            </div>

            <div className="binary-signals-container">
                <div className="signal call signal-1">↑ ARSENAL CARREGADO</div>
                <div className="signal put signal-2">↓ ZONA DE RISCO</div>
                <div className="signal call signal-3">↑ ALVO LOCALIZADO</div>
                <div className="signal put signal-4">↓ PRESSÃO VENDEDORA</div>
                <div className="signal call signal-5">↑ HRK SNIPER ONLINE</div>
            </div>

            <div className="glass-card w-full max-w-[420px] p-12 md:p-16 relative overflow-hidden transition-all duration-700 hover:shadow-emerald-500/10 hover:border-emerald-500/50">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                <div className="text-center mb-14">
                    <h1 className="text-5xl font-black text-white tracking-[0.4em] uppercase sniper-glow-text leading-none italic">HRK</h1>
                    <p className="text-emerald-400 font-black mt-3 text-[12px] tracking-[0.6em] uppercase">SNIPER ELITE</p>
                    <h2 className="text-2xl font-black text-white mt-16 tracking-[0.3em] uppercase opacity-80">{isRegistering ? 'ALISTAMENTO' : 'AUTENTICAÇÃO'}</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <fieldset disabled={isLoading} className="space-y-6">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <UserIcon className="w-6 h-6 text-emerald-400/30 group-focus-within:text-emerald-400 transition-all" />
                            </div>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="quantum-input w-full h-16 pl-16 pr-8 rounded-full text-xs font-black tracking-[0.3em] uppercase placeholder-white/10 focus:outline-none bg-black/40 border-2 border-emerald-500/20"
                                placeholder="CODINOME AGENTE"
                                required
                            />
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <LockClosedIcon className="w-6 h-6 text-emerald-400/30 group-focus-within:text-emerald-400 transition-all" />
                            </div>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="quantum-input w-full h-16 pl-16 pr-8 rounded-full text-xs font-black tracking-[0.3em] uppercase placeholder-white/10 focus:outline-none bg-black/40 border-2 border-emerald-500/20"
                                placeholder="CHAVE DE ACESSO"
                                required
                            />
                        </div>
                        
                        {isRegistering && (
                             <div className="relative group animate-in slide-in-from-top-4">
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="quantum-input w-full h-16 px-10 rounded-full text-xs font-black tracking-[0.3em] uppercase placeholder-white/10 focus:outline-none bg-black/40 border-2 border-emerald-500/20"
                                    placeholder="REPETIR CHAVE"
                                    required
                                />
                            </div>
                        )}
                    </fieldset>

                    {error && (
                        <div className="p-5 bg-rose-500/20 border-2 border-rose-500/40 rounded-full animate-in shake duration-500">
                             <p className="text-[10px] text-rose-400 text-center font-black uppercase tracking-[0.2em]">{error}</p>
                        </div>
                    )}
                    
                    <div className="pt-8 flex justify-center">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="enter-button w-full h-20 rounded-full text-sm font-black uppercase tracking-[0.6em] text-slate-950 disabled:opacity-50 active:scale-95 transition-all border-b-8 border-emerald-700 active:border-b-0"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-8 w-8 text-slate-950 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                               'ATIVAR SESSÃO'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-12 flex items-center justify-center">
                    <button
                        type="button"
                        onClick={toggleView}
                        disabled={isLoading}
                        className="text-[10px] font-black text-emerald-400/40 hover:text-emerald-400 tracking-[0.4em] transition-all uppercase hover:scale-110"
                    >
                        {isRegistering ? 'VOLTAR PARA LOGIN' : `NOVO ALISTAMENTO`}
                    </button>
                </div>
            </div>
            
            <div className="absolute bottom-10 text-center w-full z-10 px-6">
                <p className="text-white/10 text-[11px] font-mono tracking-[0.4em] font-black uppercase">{currentTime}</p>
            </div>
            
            <div className="absolute top-12 right-12 opacity-5 animate-pulse pointer-events-none scale-150">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="#10b981"/>
                </svg>
            </div>
        </div>
    );
};

export default Login;
