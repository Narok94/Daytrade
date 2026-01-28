import React, { useState, useEffect, useRef } from 'react';
import { UserIcon, LockClosedIcon, MenuIcon, InformationCircleIcon } from './icons';

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
             const formattedTime = date.toLocaleString('en-US', options).replace('GMT', 'UTC').replace(/,([^,]*)$/, '$1');
             setCurrentTime(formattedTime);
        }, 1000);

        return () => clearInterval(timerId);
    }, []);

    // Effect for generating scrolling candlestick chart
    useEffect(() => {
        const track = chartTrackRef.current;
        if (!track) return;

        const createCandles = () => {
            track.innerHTML = ''; // Clear previous
            const fragment = document.createDocumentFragment();
            // Generate enough candles to fill the track twice for a seamless loop
            const numCandles = Math.ceil(window.innerWidth / 18) * 2; 

            for (let i = 0; i < numCandles; i++) {
                const candle = document.createElement('div');
                const wick = document.createElement('div');
                const body = document.createElement('div');

                const isGreen = Math.random() > 0.5;
                candle.className = `chart-candle ${isGreen ? 'green' : 'red'}`;
                
                const totalHeight = Math.random() * 200 + 50; // 50px to 250px
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
            
            // Clone the entire set of candles for a perfect animation loop
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
                    ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        let particlesArray: Particle[] = [];
        const init = () => {
            particlesArray = [];
            const numberOfParticles = (canvas.width * canvas.height) / 12000;
            for (let i = 0; i < numberOfParticles; i++) {
                const size = Math.random() * 1.5 + 0.5;
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const speedX = (Math.random() * 0.4) - 0.2;
                const speedY = (Math.random() * 0.4) - 0.2;
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
        <div className="login-container min-h-screen w-full flex items-center justify-center p-4 font-sans">
            <canvas ref={canvasRef} className="particle-canvas"></canvas>
            <div className="cyber-grid"></div>
            
            <div className="scrolling-chart-container">
                <div ref={chartTrackRef} className="chart-track"></div>
            </div>

            <div className="binary-signals-container">
                <div className="signal call signal-1">↑ CALL</div>
                <div className="signal put signal-2">↓ PUT</div>
                <div className="signal call signal-3">↑ CALL</div>
                <div className="signal put signal-4">↓ PUT</div>
                <div className="signal call signal-5">↑ CALL</div>
            </div>


            <div className="glass-card w-full max-w-[340px] p-8 md:p-10 rounded-[2rem] relative">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase neon-glow-text">HRK</h1>
                    <p className="text-white/70 mt-1 text-[9px] font-bold tracking-[0.1em] uppercase opacity-80">Binary Operations Control</p>
                    <h2 className="text-4xl font-black text-emerald-400 mt-8 tracking-widest uppercase neon-glow-text">{isRegistering ? 'REGISTRO' : 'LOGIN'}</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <fieldset disabled={isLoading} className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <UserIcon className="w-5 h-5 text-white/50 group-focus-within:text-emerald-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="quantum-input w-full h-12 pl-12 pr-12 rounded-full text-[10px] font-black tracking-widest placeholder-white/40 focus:outline-none"
                                placeholder="USERNAME"
                                required
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <LockClosedIcon className="w-5 h-5 text-white/80" />
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <UserIcon className="w-5 h-5 text-white/50 group-focus-within:text-emerald-400 transition-colors" />
                            </div>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="quantum-input w-full h-12 pl-12 pr-12 rounded-full text-[10px] font-black tracking-widest placeholder-white/40 focus:outline-none"
                                placeholder="PASSWORD"
                                required
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <LockClosedIcon className="w-5 h-5 text-white/80" />
                            </div>
                        </div>
                        
                        {isRegistering && (
                             <div className="relative group">
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="quantum-input w-full h-12 px-6 rounded-full text-[10px] font-black tracking-widest placeholder-white/40 focus:outline-none"
                                    placeholder="CONFIRM PASSWORD"
                                    required
                                />
                            </div>
                        )}
                    </fieldset>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                             <p className="text-[9px] text-red-400 text-center font-black uppercase tracking-widest">{error}</p>
                        </div>
                    )}
                    
                    <div className="pt-4 flex justify-center">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="enter-button w-[160px] h-12 rounded-xl text-xs font-black uppercase tracking-[0.4em] text-white disabled:opacity-50"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                               'ENTER'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-8 flex items-center justify-between">
                    <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                        <button type="button" className="circle-btn text-white group-hover:scale-110 transition-transform">
                            <span className="text-xl font-bold">?</span>
                        </button>
                        <span className="text-[9px] font-black text-white/50 tracking-widest uppercase">HELP</span>
                    </div>
                    <button
                        type="button"
                        onClick={toggleView}
                        disabled={isLoading}
                        className="text-[9px] font-black text-emerald-400/70 hover:text-emerald-300 tracking-widest transition-all uppercase hover:scale-105"
                    >
                        {isRegistering ? 'LOGIN' : `SIGN UP`}
                    </button>
                    <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                        <button type="button" className="circle-btn text-white group-hover:scale-110 transition-transform">
                            <MenuIcon className="w-5 h-5" />
                        </button>
                        <span className="text-[9px] font-black text-white/50 tracking-widest uppercase">MENU</span>
                    </div>
                </div>
            </div>
            
            <div className="absolute bottom-6 text-center w-full z-10 px-4">
                <p className="text-white/40 text-[9px] font-mono tracking-widest font-bold">{currentTime}</p>
            </div>
            
            <div className="absolute bottom-10 right-10 opacity-30 animate-pulse">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="#4ade80"/>
                </svg>
            </div>
        </div>
    );
};

export default Login;