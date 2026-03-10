import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { SettingsIcon, TrashIcon, PlusIcon } from '../../components/icons';

export const SettingsPanel: React.FC<any> = ({ brokerage, setBrokerages, onReset }) => {
    const [name, setName] = useState(brokerage?.name || '');
    const [initialBalance, setInitialBalance] = useState(brokerage?.initialBalance?.toString() || '');
    const [entryMode, setEntryMode] = useState<'fixed' | 'percentage'>(brokerage?.entryMode || 'percentage');
    const [entryValue, setEntryValue] = useState(brokerage?.entryValue?.toString() || '');
    const [payout, setPayout] = useState(brokerage?.payoutPercentage?.toString() || '');
    const [stopGain, setStopGain] = useState(brokerage?.stopGainTrades?.toString() || '');
    const [stopLoss, setStopLoss] = useState(brokerage?.stopLossTrades?.toString() || '');
    const [currency, setCurrency] = useState(brokerage?.currency || 'USD');

    const handleSave = () => {
        setBrokerages((prev: any[]) => prev.map(b => b.id === brokerage.id ? {
            ...b,
            name,
            initialBalance: parseFloat(initialBalance) || 0,
            entryMode,
            entryValue: parseFloat(entryValue) || 0,
            payoutPercentage: parseFloat(payout) || 0,
            stopGainTrades: parseInt(stopGain) || 0,
            stopLossTrades: parseInt(stopLoss) || 0,
            currency
        } : b));
        alert("Configurações salvas com sucesso!");
    };

    const addNewBrokerage = () => {
        const newB = {
            id: crypto.randomUUID(),
            name: 'Nova Corretora',
            initialBalance: 10,
            entryMode: 'percentage',
            entryValue: 10,
            payoutPercentage: 80,
            stopGainTrades: 3,
            stopLossTrades: 2,
            currency: 'USD'
        };
        setBrokerages((prev: any[]) => [...prev, newB]);
    };

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configurações</h2>
                  <p className="text-slate-400 text-sm font-medium">Gerencie suas corretoras e parâmetros operacionais.</p>
                </div>
                <Button variant="secondary" onClick={addNewBrokerage} className="gap-2">
                    <PlusIcon className="w-5 h-5" /> Adicionar Corretora
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="Parâmetros da Corretora" subtitle="Configuração de Gestão" icon={<SettingsIcon className="w-5 h-5 text-blue-500" />}>
                    <div className="space-y-5">
                        <Input label="Nome da Corretora" value={name} onChange={e => setName(e.target.value)} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Banca Inicial ($)" type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} />
                            <Select label="Moeda" value={currency} onChange={e => setCurrency(e.target.value as any)}>
                                <option value="USD">Dólar ($)</option>
                                <option value="BRL">Real (R$)</option>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Modo de Entrada" value={entryMode} onChange={e => setEntryMode(e.target.value as any)}>
                                <option value="fixed">Valor Fixo ($)</option>
                                <option value="percentage">Porcentagem (%)</option>
                            </Select>
                            <Input label={entryMode === 'fixed' ? 'Valor ($)' : 'Porcentagem (%)'} type="number" value={entryValue} onChange={e => setEntryValue(e.target.value)} />
                        </div>
                        <Input label="Payout Padrão (%)" type="number" value={payout} onChange={e => setPayout(e.target.value)} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Stop Gain (Wins)" type="number" value={stopGain} onChange={e => setStopGain(e.target.value)} />
                            <Input label="Stop Loss (Losses)" type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
                        </div>
                        <Button variant="primary" className="w-full" onClick={handleSave}>Salvar Alterações</Button>
                    </div>
                </Card>

                <Card title="Zona de Perigo" subtitle="Ações Irreversíveis" icon={<TrashIcon className="w-5 h-5 text-rose-500" />}>
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100">
                            <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-2">Resetar Histórico</h4>
                            <p className="text-xs text-rose-500/70 mb-6">Isso apagará permanentemente todos os seus trades e transações desta corretora. Esta ação não pode ser desfeita.</p>
                            <Button variant="danger" className="w-full" onClick={onReset}>Apagar Tudo</Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
