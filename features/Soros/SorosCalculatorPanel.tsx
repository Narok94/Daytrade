import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { CalculatorIcon } from '../../components/icons';

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const SorosCalculatorPanel: React.FC<any> = ({ activeBrokerage }) => {
    const [initialEntry, setInitialEntry] = useState('10');
    const [payout, setPayout] = useState(activeBrokerage?.payoutPercentage?.toString() || '80');
    const [levels, setLevels] = useState('4');

    const sorosLevels = useMemo(() => {
        const entry = parseFloat(initialEntry) || 0;
        const pay = parseFloat(payout) || 0;
        const count = parseInt(levels) || 1;
        
        const data = [];
        let currentEntry = entry;
        
        for (let i = 1; i <= count; i++) {
            const profit = currentEntry * (pay / 100);
            const total = currentEntry + profit;
            data.push({
                level: i,
                entry: currentEntry,
                profit,
                total
            });
            currentEntry = total;
        }
        return data;
    }, [initialEntry, payout, levels]);

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Calculadora Soros</h2>
                  <p className="text-slate-400 text-sm font-medium">Planeje suas alavancagens com segurança.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card title="Configuração" subtitle="Parâmetros de Alavancagem" icon={<CalculatorIcon className="w-5 h-5 text-blue-500" />}>
                    <div className="space-y-5">
                        <Input label="Entrada Inicial ($)" type="number" value={initialEntry} onChange={e => setInitialEntry(e.target.value)} />
                        <Input label="Payout Médio (%)" type="number" value={payout} onChange={e => setPayout(e.target.value)} />
                        <Input label="Níveis de Soros" type="number" value={levels} onChange={e => setLevels(e.target.value)} />
                    </div>
                </Card>

                <div className="lg:col-span-2">
                    <Card title="Tabela de Níveis" subtitle="Projeção de Retorno" icon={<CalculatorIcon className="w-5 h-5 text-slate-400" />}>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="pb-4 pl-4">Nível</th>
                                        <th className="pb-4">Entrada</th>
                                        <th className="pb-4">Lucro</th>
                                        <th className="pb-4 pr-4 text-right">Total Acumulado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorosLevels.map((lvl) => (
                                        <tr key={lvl.level} className="group hover:bg-slate-50 transition-all">
                                            <td className="py-4 pl-4 rounded-l-2xl border-y border-l border-slate-100 font-black text-blue-600">
                                                Nível {lvl.level}
                                            </td>
                                            <td className="py-4 border-y border-slate-100 text-xs font-bold text-slate-900">
                                                $ {formatMoney(lvl.entry)}
                                            </td>
                                            <td className="py-4 border-y border-slate-100 text-xs font-bold text-emerald-600">
                                                + $ {formatMoney(lvl.profit)}
                                            </td>
                                            <td className="py-4 pr-4 rounded-r-2xl border-y border-r border-slate-100 text-right text-sm font-black text-slate-900">
                                                $ {formatMoney(lvl.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

