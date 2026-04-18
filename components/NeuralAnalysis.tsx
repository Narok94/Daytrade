import React from 'react';
import { motion } from 'motion/react';
import { CpuChipIcon } from './icons';

interface NeuralAnalysisProps {
    progress: {
        upload: number;
        data: number;
        patterns: number;
        result: number;
    };
    theme: any;
}

const SectionTitle: React.FC<{ title: string; subtitle?: string; icon?: any; theme: any }> = ({ title, subtitle, icon: Icon, theme }) => (
    <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
            {Icon && <Icon className="w-5 h-5 text-[#00D1FF]" />}
            <h3 className={`text-sm font-black uppercase tracking-[0.2em] opacity-80 ${theme.text}`}>{title}</h3>
        </div>
        {subtitle && <p className={`text-[10px] font-medium ${theme.textMuted}`}>{subtitle}</p>}
    </div>
);

const GlassCard: React.FC<{ children: React.ReactNode; className?: string; theme: any }> = ({ children, className = '', theme }) => (
    <div className={`p-6 rounded-3xl ${theme.card} ${className}`}>
        {children}
    </div>
);

export const NeuralAnalysis: React.FC<NeuralAnalysisProps> = ({ progress, theme }) => {
    const steps = [
        { label: 'Sintonizando visão com o Reino de Midgard...', val: progress.upload },
        { label: 'Decodificando Runas de Preço e Volume...', val: progress.data },
        { label: 'Consultando memórias de eras passadas...', val: progress.patterns },
        { label: 'Tecendo o Destino da Próxima Vela...', val: progress.result }
    ];

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
            <GlassCard theme={theme} className="relative overflow-hidden min-h-[400px] flex flex-col justify-center">
                {/* Visual accents for Odin Elite Theme */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D1FF]/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#CDAD7D]/5 rounded-full blur-3xl -ml-16 -mb-16" />
                
                <SectionTitle 
                    title="Oráculo de Odin" 
                    subtitle="Motor de Análise Profética" 
                    icon={CpuChipIcon} 
                    theme={theme} 
                />
                
                <div className="space-y-8">
                    <div className="flex items-center justify-between p-5 rounded-3xl bg-[#00D1FF]/5 border border-[#00D1FF]/10 shadow-[0_0_20px_rgba(0,209,255,0.05)]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado do Oráculo</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#00D1FF] animate-ping" />
                            <span className="text-[10px] font-black text-[#00D1FF] uppercase tracking-widest">Tecendo o Destino...</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {steps.map((step, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                                    <span className={step.val > 0 ? 'text-[#CDAD7D]' : ''}>{step.label}</span>
                                    <span className="text-[#00D1FF]">{step.val}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${step.val}%` }}
                                        className="h-full bg-gradient-to-r from-[#00D1FF] via-[#00A3FF] to-[#00D1FF] bg-[length:200%_100%] rounded-full shadow-[0_0_15px_rgba(0,209,255,0.4)]"
                                        transition={{ duration: 0.5 }}
                                        style={{
                                            animation: 'shimmer 2s linear infinite'
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}} />
        </div>
    );
};
