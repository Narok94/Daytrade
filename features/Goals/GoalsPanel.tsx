import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { TargetIcon, TrophyIcon, TrashIcon } from '../../components/icons';

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const GoalsPanel: React.FC<any> = ({ goals, setGoals, records, activeBrokerage }) => {
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalTarget, setNewGoalTarget] = useState('');
    const [newGoalDeadline, setNewGoalDeadline] = useState('');
    const [newGoalType, setNewGoalType] = useState<'monthly' | 'custom'>('monthly');

    const addGoal = () => {
        const target = parseFloat(newGoalTarget);
        if (!newGoalTitle || isNaN(target) || !activeBrokerage) return;
        
        const newGoal = {
            id: crypto.randomUUID(),
            title: newGoalTitle,
            targetAmount: target,
            type: newGoalType,
            deadline: newGoalType === 'custom' ? newGoalDeadline : undefined,
            createdAt: new Date().toISOString(),
            brokerageId: activeBrokerage.id
        };
        setGoals([...goals, newGoal]);
        setNewGoalTitle('');
        setNewGoalTarget('');
        setNewGoalDeadline('');
    };

    const deleteGoal = (id: string) => setGoals(goals.filter((g: any) => g.id !== id));

    const activeBrokerageGoals = goals.filter((g: any) => g.brokerageId === activeBrokerage?.id);

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Metas Financeiras</h2>
                  <p className="text-slate-400 text-sm font-medium">Defina e acompanhe seus objetivos para {activeBrokerage?.name}.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card title="Nova Meta" subtitle="Planejamento de Longo Prazo" icon={<TargetIcon className="w-5 h-5 text-blue-500" />}>
                    <div className="space-y-5">
                        <Input label="Título" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} placeholder="Ex: Viagem de Fim de Ano" />
                        <Input label="Valor Alvo ($)" type="number" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} placeholder="0.00" />
                        <Select label="Tipo de Meta" value={newGoalType} onChange={e => setNewGoalType(e.target.value as any)}>
                            <option value="monthly">Mensal (Automática)</option>
                            <option value="custom">Personalizada (Com Prazo)</option>
                        </Select>
                        {newGoalType === 'custom' && (
                            <Input label="Prazo Final" type="date" value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)} />
                        )}
                        <Button variant="primary" className="w-full" onClick={addGoal}>Adicionar Objetivo</Button>
                    </div>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    {activeBrokerageGoals.length === 0 ? (
                        <div className="py-32 text-center opacity-10">
                            <TrophyIcon className="w-20 h-20 mx-auto mb-6" />
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Nenhuma meta definida</p>
                        </div>
                    ) : (
                        activeBrokerageGoals.map((goal: any) => {
                            const dailyRecords = records.filter((r: any) => r.recordType === 'day' && r.brokerageId === activeBrokerage.id);
                            let currentProfit = 0;
                            if (goal.type === 'monthly') {
                                const currentMonth = new Date().toISOString().slice(0, 7);
                                currentProfit = dailyRecords.filter((r: any) => r.date.startsWith(currentMonth)).reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
                            } else {
                                const startStr = new Date(goal.createdAt).toISOString().split('T')[0];
                                currentProfit = dailyRecords.filter((r: any) => r.date >= startStr && (!goal.deadline || r.date <= goal.deadline)).reduce((acc: number, r: any) => acc + r.netProfitUSD, 0);
                            }
                            const progress = Math.min(100, (currentProfit / goal.targetAmount) * 100);
                            
                            return (
                                <Card key={goal.id} className="p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900">{goal.title}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {goal.type === 'monthly' ? 'Meta Mensal' : `Prazo: ${new Date(goal.deadline!).toLocaleDateString('pt-BR')}`}
                                            </p>
                                        </div>
                                        <button onClick={() => deleteGoal(goal.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Progresso</p>
                                                <p className="text-2xl font-black text-slate-900">$ {formatMoney(currentProfit)} <span className="text-slate-300 font-medium text-sm">/ $ {formatMoney(goal.targetAmount)}</span></p>
                                            </div>
                                            <p className={`text-xl font-black ${progress >= 100 ? 'text-emerald-500' : 'text-blue-600'}`}>{progress.toFixed(1)}%</p>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                                                style={{ width: `${progress}%` }} 
                                            />
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
