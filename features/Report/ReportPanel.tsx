import React, { useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { DocumentTextIcon, TrashIcon } from '../../components/icons';

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ReportPanel: React.FC<any> = ({ activeBrokerage, records, deleteTrade }) => {
    const allTrades = useMemo(() => {
        const trades: any[] = [];
        records.filter((r: any) => r.recordType === 'day' && r.brokerageId === activeBrokerage?.id).forEach((day: any) => {
            day.trades.forEach((t: any) => {
                trades.push({ ...t, date: day.id });
            });
        });
        return trades.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
    }, [activeBrokerage, records]);

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Extrato Detalhado</h2>
                  <p className="text-slate-400 text-sm font-medium">Lista cronológica de todas as entradas individuais.</p>
                </div>
            </div>

            <Card title="Relatório de Entradas" subtitle="Gestão de Risco Individual" icon={<DocumentTextIcon className="w-5 h-5 text-slate-400" />}>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="pb-4 pl-4">Data / Hora</th>
                                <th className="pb-4">Resultado</th>
                                <th className="pb-4">Entrada</th>
                                <th className="pb-4">Payout</th>
                                <th className="pb-4 pr-4 text-right">Lucro/Prejuízo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allTrades.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center opacity-10">
                                        <p className="text-sm font-black uppercase tracking-[0.3em]">Nenhuma operação registrada</p>
                                    </td>
                                </tr>
                            ) : (
                                allTrades.map((trade: any) => {
                                    const profit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    return (
                                        <tr key={trade.id} className="group hover:bg-slate-50 transition-all">
                                            <td className="py-4 pl-4 rounded-l-2xl border-y border-l border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-900">{new Date(trade.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                    <span className="text-[9px] font-medium text-slate-400">{new Date(trade.timestamp || 0).toLocaleTimeString('pt-BR')}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 border-y border-slate-100">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${trade.result === 'win' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {trade.result === 'win' ? 'Win' : 'Loss'}
                                                </span>
                                            </td>
                                            <td className="py-4 border-y border-slate-100 text-xs font-bold text-slate-900">
                                                $ {formatMoney(trade.entryValue)}
                                            </td>
                                            <td className="py-4 border-y border-slate-100 text-xs font-bold text-slate-400">
                                                {trade.payoutPercentage}%
                                            </td>
                                            <td className="py-4 pr-4 rounded-r-2xl border-y border-r border-slate-100 text-right">
                                                <div className="flex items-center justify-end gap-4">
                                                    <span className={`text-sm font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {profit >= 0 ? '+' : ''}$ {formatMoney(profit)}
                                                    </span>
                                                    <button onClick={() => deleteTrade(trade.id, trade.date)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
