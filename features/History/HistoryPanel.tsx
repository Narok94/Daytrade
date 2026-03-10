import React, { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { 
    ListBulletIcon, TrendingUpIcon, TrendingDownIcon, 
    InformationCircleIcon 
} from '../../components/icons';
import { CalendarHistory } from './CalendarHistory';

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const HistoryPanel: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const currencySymbol = activeBrokerage?.currency === 'USD' ? '$' : 'R$';
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'calendar'>('calendar');

    const stats = useMemo(() => {
        const dayRecords = records.filter((r: any) => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id && r.trades.length > 0);
        
        if (viewMode === 'daily') {
            return dayRecords.sort((a: any, b: any) => b.id.localeCompare(a.id)).map((r: any) => ({
                id: r.id,
                label: new Date(r.id + 'T12:00:00').toLocaleDateString('pt-BR'),
                profit: r.netProfitUSD,
                wins: r.winCount,
                losses: r.lossCount,
                total: r.winCount + r.lossCount,
                winRate: (r.winCount + r.lossCount) > 0 ? (r.winCount / (r.winCount + r.lossCount)) * 100 : 0
            }));
        }

        if (viewMode === 'weekly') {
            const weeks: Record<string, any> = {};
            dayRecords.forEach((r: any) => {
                const date = new Date(r.id + 'T12:00:00');
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                const monday = new Date(date.setDate(diff));
                const weekId = monday.toISOString().split('T')[0];
                
                if (!weeks[weekId]) {
                    weeks[weekId] = { id: weekId, label: `Semana de ${monday.toLocaleDateString('pt-BR')}`, profit: 0, wins: 0, losses: 0, total: 0 };
                }
                weeks[weekId].profit += r.netProfitUSD;
                weeks[weekId].wins += r.winCount;
                weeks[weekId].losses += r.lossCount;
                weeks[weekId].total += (r.winCount + r.lossCount);
            });
            return Object.values(weeks).sort((a: any, b: any) => b.id.localeCompare(a.id)).map((w: any) => ({
                ...w,
                winRate: w.total > 0 ? (w.wins / w.total) * 100 : 0
            }));
        }

        if (viewMode === 'monthly') {
            const months: Record<string, any> = {};
            dayRecords.forEach((r: any) => {
                const monthId = r.id.slice(0, 7); // YYYY-MM
                if (!months[monthId]) {
                    const [year, month] = monthId.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    months[monthId] = { id: monthId, label: label.charAt(0).toUpperCase() + label.slice(1), profit: 0, wins: 0, losses: 0, total: 0 };
                }
                months[monthId].profit += r.netProfitUSD;
                months[monthId].wins += r.winCount;
                months[monthId].losses += r.lossCount;
                months[monthId].total += (r.winCount + r.lossCount);
            });
            return Object.values(months).sort((a: any, b: any) => b.id.localeCompare(a.id)).map((m: any) => ({
                ...m,
                winRate: m.total > 0 ? (m.wins / m.total) * 100 : 0
            }));
        }

        return [];
    }, [records, viewMode, activeBrokerage]);

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Histórico</h2>
                    <p className="text-slate-400 text-sm font-medium">Análise detalhada por períodos.</p>
                </div>
                <div className="flex p-1.5 rounded-2xl bg-white border border-slate-100 soft-shadow overflow-x-auto no-scrollbar">
                    {(['calendar', 'daily', 'weekly', 'monthly'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === mode ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-900'}`}
                        >
                            {mode === 'calendar' ? 'Calendário' : mode === 'daily' ? 'Diário' : mode === 'weekly' ? 'Semanal' : 'Mensal'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {viewMode === 'calendar' ? (
                    <CalendarHistory isDarkMode={isDarkMode} activeBrokerage={activeBrokerage} records={records} />
                ) : stats.length > 0 ? stats.map((item: any) => (
                    <Card key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-8 p-8">
                        <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {item.profit >= 0 ? <TrendingUpIcon className="w-8 h-8" /> : <TrendingDownIcon className="w-8 h-8" />}
                            </div>
                            <div>
                                <h4 className="font-black text-xl text-slate-900 leading-none mb-2">{item.label}</h4>
                                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{item.total} Operações</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Resultado</p>
                                <p className={`text-xl font-black ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {item.profit >= 0 ? '+' : ''}{currencySymbol} {formatMoney(item.profit)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Win Rate</p>
                                <p className="text-xl font-black text-slate-900">
                                    {item.winRate.toFixed(1)}%
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">W / L</p>
                                <p className="text-xl font-black text-slate-900">
                                    <span className="text-emerald-600">{item.wins}</span>
                                    <span className="mx-1 opacity-20">/</span>
                                    <span className="text-rose-600">{item.losses}</span>
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-3 tracking-widest">Performance</p>
                                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${item.winRate}%` }} />
                                </div>
                            </div>
                        </div>
                    </Card>
                )) : (
                    <div className="py-32 text-center opacity-10">
                        <InformationCircleIcon className="w-20 h-20 mx-auto mb-6" />
                        <p className="text-sm font-black uppercase tracking-[0.3em]">Nenhum dado encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
};
