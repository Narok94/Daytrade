import React, { useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { ChartBarIcon } from '../../components/icons';

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CompoundInterestPanel: React.FC<any> = ({ activeBrokerage, records }) => {
    const compoundData = useMemo(() => {
        if (!activeBrokerage) return [];
        const data = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let runningBalance = activeBrokerage.initialBalance;
        const dailyRecords = records.filter((r: any) => r.recordType === 'day' && r.brokerageId === activeBrokerage.id);
        
        // We project for 30 days starting from the first record or today
        const startDate = dailyRecords.length > 0 
            ? new Date(dailyRecords.sort((a: any, b: any) => a.date.localeCompare(b.date))[0].date + 'T12:00:00')
            : new Date();
        startDate.setHours(0,0,0,0);

        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            const dayRecord = dailyRecords.find((r: any) => r.date === dateStr);
            const isPast = currentDate < today;
            const isToday = currentDate.getTime() === today.getTime();
            
            let profit = 0;
            let type: 'real' | 'projected' | 'none' = 'none';

            if (dayRecord) {
                profit = dayRecord.netProfitUSD;
                type = 'real';
            } else if (!isPast) {
                // Only project for today and future
                profit = runningBalance * 0.03; // 3% daily target
                type = 'projected';
            } else {
                // Past day with no record
                profit = 0;
                type = 'none';
            }

            const startBalance = runningBalance;
            runningBalance += profit;
            
            data.push({
                date: currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                fullDate: dateStr,
                startBalance,
                profit,
                endBalance: runningBalance,
                type,
                isToday
            });
        }
        return data;
    }, [activeBrokerage, records]);

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Juros Compostos</h2>
                  <p className="text-slate-400 text-sm font-medium">Projeção de crescimento baseada em 3% ao dia.</p>
                </div>
            </div>

            <Card title="Simulação de 30 Dias" subtitle="Real vs Projetado" icon={<ChartBarIcon className="w-5 h-5 text-blue-500" />}>
                <div className="overflow-x-auto no-scrollbar -mx-6 px-6">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="pb-4 pl-4">Dia</th>
                                <th className="pb-4">Banca Inicial</th>
                                <th className="pb-4">Resultado</th>
                                <th className="pb-4">Banca Final</th>
                                <th className="pb-4 pr-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {compoundData.map((day: any, idx: number) => (
                                <tr key={idx} className={`group transition-all ${day.isToday ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                    <td className={`py-4 pl-4 rounded-l-2xl border-y border-l border-slate-100 font-bold text-xs ${day.type === 'none' ? 'opacity-30' : ''}`}>
                                        {day.date}
                                        {day.isToday && <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-[8px] rounded-full uppercase">Hoje</span>}
                                    </td>
                                    <td className={`py-4 border-y border-slate-100 text-xs font-medium text-slate-600 ${day.type === 'none' ? 'opacity-30' : ''}`}>
                                        $ {formatMoney(day.startBalance)}
                                    </td>
                                    <td className={`py-4 border-y border-slate-100 text-xs font-black ${day.profit > 0 ? 'text-emerald-600' : day.profit < 0 ? 'text-rose-600' : 'text-slate-400'} ${day.type === 'none' ? 'opacity-30' : ''}`}>
                                        {day.profit > 0 ? '+' : ''}$ {formatMoney(day.profit)}
                                    </td>
                                    <td className={`py-4 border-y border-slate-100 text-xs font-black text-slate-900 ${day.type === 'none' ? 'opacity-30' : ''}`}>
                                        $ {formatMoney(day.endBalance)}
                                    </td>
                                    <td className={`py-4 pr-4 rounded-r-2xl border-y border-r border-slate-100 text-right ${day.type === 'none' ? 'opacity-30' : ''}`}>
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                                            day.type === 'real' ? 'bg-emerald-50 text-emerald-600' : 
                                            day.type === 'projected' ? 'bg-blue-50 text-blue-600' : 
                                            'bg-slate-100 text-slate-400'
                                        }`}>
                                            {day.type === 'real' ? 'Realizado' : day.type === 'projected' ? 'Projetado' : 'Sem Operação'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
