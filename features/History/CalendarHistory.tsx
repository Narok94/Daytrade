import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons';

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CalendarHistory: React.FC<any> = ({ isDarkMode, activeBrokerage, records }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = startDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const dailyProfits = useMemo(() => {
        const profits: Record<string, number> = {};
        records.filter((r: any) => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id)
            .forEach((r: any) => {
                profits[r.id] = r.netProfitUSD;
            });
        return profits;
    }, [records, activeBrokerage]);

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) calendarDays.push(null);
    for (let d = 1; d <= totalDays; d++) calendarDays.push(d);

    return (
        <div className={`p-4 md:p-6 rounded-3xl border bg-white border-slate-100 shadow-sm w-full max-w-2xl mx-auto`}>
            <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-900"><ChevronLeftIcon className="w-5 h-5" /></button>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{monthName}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-900"><ChevronRightIcon className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {dayNames.map(day => (
                    <div key={day} className="text-center text-[10px] font-black uppercase text-slate-400 py-2">{day}</div>
                ))}
                {calendarDays.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;
                    
                    const dateId = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const profit = dailyProfits[dateId];
                    const isToday = new Date().toISOString().split('T')[0] === dateId;

                    return (
                        <div key={dateId} className={`aspect-square rounded-xl border border-slate-100 flex flex-col items-center justify-center p-1 relative transition-all hover:scale-105 cursor-default ${isToday ? 'ring-2 ring-blue-500/20 border-blue-200' : ''} ${profit !== undefined ? (profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100') : 'bg-white'}`}>
                            <span className="text-[10px] font-bold opacity-40 mb-0.5">{day}</span>
                            {profit !== undefined && (
                                <span className={`text-[8px] font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {profit >= 0 ? '+' : ''}{profit.toFixed(0)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest opacity-40">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Lucro</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /> Prejuízo</div>
            </div>
        </div>
    );
};
