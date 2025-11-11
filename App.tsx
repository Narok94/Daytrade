
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Brokerage, DailyRecord, TransactionRecord, AppRecord, Trade, User } from './types';
import { fetchUSDBRLRate } from './services/currencyService';
import { SettingsIcon, PlusIcon, DepositIcon, WithdrawalIcon, XMarkIcon, TrashIcon, HomeIcon, TrophyIcon, InformationCircleIcon, LogoutIcon, PencilIcon } from './components/icons';

interface GoalSettings {
    type: 'weekly' | 'monthly';
    amount: number | '';
}

const countTradingDays = (start: Date, end: Date): number => {
    let count = 0;
    const current = new Date(start.getTime()); // Use getTime to create a true copy
    const endDate = new Date(end.getTime());
    current.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    while (current <= endDate) {
        const day = current.getUTCDay();
        if (day >= 1 && day <= 5) { // Monday to Friday
            count++;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return count;
};

// --- Child Components ---

interface DashboardPanelProps {
    activeBrokerage: Brokerage;
    winsToAdd: string;
    setWinsToAdd: React.Dispatch<React.SetStateAction<string>>;
    lossesToAdd: string;
    setLossesToAdd: React.Dispatch<React.SetStateAction<string>>;
    customEntryValue: string;
    setCustomEntryValue: React.Dispatch<React.SetStateAction<string>>;
    customPayout: string;
    setCustomPayout: React.Dispatch<React.SetStateAction<string>>;
    addRecord: (winCount: number, lossCount: number, customEntryValueUSD?: number, customPayoutPercentage?: number) => void;
    isTestMessageVisible: boolean;
    setIsTestMessageVisible: React.Dispatch<React.SetStateAction<boolean>>;
    selectedDateString: string;
    setSelectedDate: (date: Date) => void;
    isTradingHalted: boolean;
    stopLossLimitReached: boolean;
    setStopLimitOverride: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    startBalanceForSelectedDay: number;
    dailyRecordForSelectedDay: DailyRecord | undefined;
    dynamicDailyGoal: number;
    weeklyStats: { profit: number; wins: number; losses: number; totalTrades: number; winRate: number; startBalance: number; currentBalance: number; };
    monthlyStats: { profit: number; wins: number; losses: number; totalTrades: number; winRate: number; startBalance: number; currentBalance: number; };
    sortedFilteredRecords: AppRecord[];
    handleDeleteRecord: (recordId: string) => void;
    handleEditRecord: (record: AppRecord) => void;
    setTransactionType: React.Dispatch<React.SetStateAction<'deposit' | 'withdrawal' | null>>;
    setIsTransactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
    activeBrokerage, winsToAdd, setWinsToAdd, lossesToAdd, setLossesToAdd, customEntryValue, setCustomEntryValue,
    customPayout, setCustomPayout, addRecord, isTestMessageVisible, setIsTestMessageVisible, selectedDateString,
    setSelectedDate, isTradingHalted, stopLossLimitReached, setStopLimitOverride, startBalanceForSelectedDay,
    dailyRecordForSelectedDay, dynamicDailyGoal, weeklyStats, monthlyStats, sortedFilteredRecords,
    handleDeleteRecord, handleEditRecord, setTransactionType, setIsTransactionModalOpen
}) => {
    const handleAddTrades = () => {
        const wins = parseInt(winsToAdd, 10) || 0;
        const losses = parseInt(lossesToAdd, 10) || 0;
        const entryValue = parseFloat(customEntryValue) || undefined;
        const payout = parseFloat(customPayout) || undefined;

        if (wins > 0 || losses > 0) {
            addRecord(wins, losses, entryValue, payout);
            setWinsToAdd('');
            setLossesToAdd('');
            setCustomEntryValue('');
            setCustomPayout('');
        }
    };

    return (
        <section>
            {isTestMessageVisible && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md shadow-md mb-6 flex items-start relative" role="alert">
                    <InformationCircleIcon className="w-6 h-6 mr-3 flex-shrink-0 mt-1" />
                    <div>
                        <p className="font-bold">Olá! Bem-vindo(a) à versão de testes.</p>
                        <p className="text-sm">Sinta-se à vontade para explorar. Lembre-se que o app está em desenvolvimento, então algumas coisas podem mudar ou não funcionar 100% ainda.</p>
                    </div>
                    <button onClick={() => setIsTestMessageVisible(false)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-blue-200 transition-colors" aria-label="Fechar aviso">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna de Controle */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-lg flex flex-col space-y-6 h-fit">
                    <h2 className="text-xl font-bold text-slate-900 border-b pb-2">Controle do Dia</h2>
                    <div>
                        <label htmlFor="trade-date" className="block text-sm font-medium text-slate-700 mb-1">Data da Operação</label>
                        <input
                            type="date"
                            id="trade-date"
                            value={selectedDateString}
                            onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00Z'))}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                    
                    {isTradingHalted && (
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-md" role="alert">
                            <p className="font-bold">Limite Atingido</p>
                            <p>Você atingiu seu limite de {stopLossLimitReached ? `perdas (Stop Loss: ${activeBrokerage.stopLossTrades})` : `ganhos (Stop Gain: ${activeBrokerage.stopGainTrades})`} para hoje.</p>
                            <button onClick={() => setStopLimitOverride(prev => ({ ...prev, [selectedDateString]: true }))} className="mt-2 text-sm text-blue-600 hover:underline">
                                Operar mesmo assim
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="custom-entry-value" className="block text-sm font-medium text-slate-700">Valor da Entrada (USD)</label>
                            <input
                                type="number"
                                id="custom-entry-value"
                                value={customEntryValue}
                                onChange={(e) => setCustomEntryValue(e.target.value)}
                                disabled={isTradingHalted}
                                className="mt-1 w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-200"
                                placeholder={`Padrão: ${activeBrokerage.entryMode === 'fixed' 
                                    ? `$${activeBrokerage.entryValue.toFixed(2)}` 
                                    : `${(startBalanceForSelectedDay * (activeBrokerage.entryValue / 100)).toFixed(2)} (${activeBrokerage.entryValue}%)`
                                }`}
                                min="0"
                            />
                        </div>
                        <div>
                            <label htmlFor="custom-payout" className="block text-sm font-medium text-slate-700">Valor do Payout (%)</label>
                            <input
                                type="number"
                                id="custom-payout"
                                value={customPayout}
                                onChange={(e) => setCustomPayout(e.target.value)}
                                disabled={isTradingHalted}
                                className="mt-1 w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-200"
                                placeholder={`Padrão: ${activeBrokerage.payoutPercentage}%`}
                                min="0"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="wins-to-add" className="block text-sm font-medium text-green-700">WINs</label>
                                <input
                                    type="number"
                                    id="wins-to-add"
                                    value={winsToAdd}
                                    onChange={(e) => setWinsToAdd(e.target.value)}
                                    disabled={isTradingHalted}
                                    className="mt-1 w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-200"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label htmlFor="losses-to-add" className="block text-sm font-medium text-red-700">LOSSes</label>
                                <input
                                    type="number"
                                    id="losses-to-add"
                                    value={lossesToAdd}
                                    onChange={(e) => setLossesToAdd(e.target.value)}
                                    disabled={isTradingHalted}
                                    className="mt-1 w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-200"
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddTrades}
                            disabled={isTradingHalted || (!winsToAdd && !lossesToAdd)}
                            className="w-full bg-slate-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                        >
                            Registrar Operações
                        </button>
                    </div>


                     <div className="flex flex-col space-y-2 pt-4 border-t">
                         <button
                            onClick={() => { setTransactionType('deposit'); setIsTransactionModalOpen(true); }}
                            className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                         >
                             <DepositIcon className="w-5 h-5" />
                             Adicionar Depósito
                         </button>
                          <button
                            onClick={() => { setTransactionType('withdrawal'); setIsTransactionModalOpen(true); }}
                            className="flex items-center justify-center gap-2 w-full bg-orange-500 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-orange-600 transition-colors"
                         >
                             <WithdrawalIcon className="w-5 h-5" />
                             Adicionar Saque
                         </button>
                     </div>
                </div>

                {/* Coluna de Histórico e Status */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-center">
                        <div className="bg-slate-100 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Banca Inicial (Dia)</p>
                            <p className="text-xl font-bold text-slate-800">${startBalanceForSelectedDay.toFixed(2)}</p>
                        </div>
                         <div className={`p-4 rounded-lg ${(dailyRecordForSelectedDay?.netProfitUSD ?? 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            <p className="text-sm text-slate-500">Lucro/Prejuízo (Dia)</p>
                            <p className={`text-xl font-bold ${(dailyRecordForSelectedDay?.netProfitUSD ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${dailyRecordForSelectedDay?.netProfitUSD.toFixed(2) ?? '0.00'}
                            </p>
                        </div>
                        <div className="bg-blue-100 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Meta Dinâmica do Dia</p>
                            <p className="text-xl font-bold text-blue-800">
                                ${dynamicDailyGoal.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-slate-100 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Banca Final (Dia)</p>
                            <p className="text-xl font-bold text-slate-800">
                                ${dailyRecordForSelectedDay?.endBalanceUSD.toFixed(2) ?? startBalanceForSelectedDay.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Resumo de Performance</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-100 p-4 rounded-lg">
                                <h4 className="font-bold text-slate-800 mb-2">Esta Semana</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Banca Inicial:</span>
                                    <span className="font-semibold text-slate-700">${weeklyStats.startBalance.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Lucro/Prejuízo:</span>
                                    <span className={`font-semibold ${weeklyStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${weeklyStats.profit.toFixed(2)}</span>
                                </div>
                                 <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Banca Atual:</span>
                                    <span className="font-semibold text-slate-700">${weeklyStats.currentBalance.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Operações:</span>
                                    <span className="font-semibold text-slate-700">{weeklyStats.totalTrades}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Assertividade:</span>
                                    <span className="font-semibold text-slate-700">{weeklyStats.winRate.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="bg-slate-100 p-4 rounded-lg">
                                <h4 className="font-bold text-slate-800 mb-2">Este Mês</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Banca Inicial:</span>
                                    <span className="font-semibold text-slate-700">${monthlyStats.startBalance.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Lucro/Prejuízo:</span>
                                    <span className={`font-semibold ${monthlyStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${monthlyStats.profit.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Banca Atual:</span>
                                    <span className="font-semibold text-slate-700">${monthlyStats.currentBalance.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Operações:</span>
                                    <span className="font-semibold text-slate-700">{monthlyStats.totalTrades}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Assertividade:</span>
                                    <span className="font-semibold text-slate-700">{monthlyStats.winRate.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-4">Histórico de Operações</h3>
                    <div className="overflow-auto max-h-[45vh] pr-2">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Data</th>
                                    <th scope="col" className="px-4 py-3">Tipo</th>
                                    <th scope="col" className="px-4 py-3 text-center">Detalhes / Valor</th>
                                    <th scope="col" className="px-4 py-3 text-right">Balanço Final</th>
                                    <th scope="col" className="px-2 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedFilteredRecords.length > 0 ? [...sortedFilteredRecords].reverse().map((record) => (
                                    <tr key={record.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                                            {record.recordType === 'day' ? record.date : record.displayDate}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.recordType === 'day' && <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">Trading</span>}
                                            {record.recordType === 'deposit' && <span className="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">Depósito</span>}
                                            {record.recordType === 'withdrawal' && <span className="bg-orange-100 text-orange-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">Saque</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {record.recordType === 'day' ? (
                                                record.trades && record.trades.length > 0 ? (
                                                    <div className="flex flex-col items-center font-mono text-xs">
                                                        {Object.entries(
                                                            record.trades.reduce((acc, trade) => {
                                                                const key = trade.entryValue.toFixed(2);
                                                                if (!acc[key]) acc[key] = { wins: 0, losses: 0 };
                                                                if (trade.result === 'win') acc[key].wins++;
                                                                else acc[key].losses++;
                                                                return acc;
                                                            }, {} as Record<string, { wins: number; losses: number }>)
                                                        ).map(([entryValue, counts], index) => {
                                                            {/* FIX: Explicitly cast 'counts' to the correct type to resolve TypeScript error where it was inferred as 'unknown'. */}
                                                            const typedCounts = counts as { wins: number; losses: number };
                                                            return (
                                                                <span key={index}>
                                                                    <span className="text-green-600 font-semibold">{typedCounts.wins}W</span>
                                                                    {' / '}
                                                                    <span className="text-red-600 font-semibold">{typedCounts.losses}L</span>
                                                                    <span className="text-slate-500"> @ ${entryValue}</span>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="font-mono">
                                                        <span className="text-green-600 font-semibold">0W</span> / <span className="text-red-600 font-semibold">0L</span>
                                                    </span>
                                                )
                                            ) : (
                                                <span className="font-semibold">${record.amountUSD.toFixed(2)}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold">
                                            {record.recordType === 'day' ? `$${record.endBalanceUSD.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button onClick={() => handleEditRecord(record)} className="text-slate-500 hover:text-blue-600" aria-label="Editar">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-500 hover:text-red-600" aria-label="Excluir">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-500">
                                            Nenhum registro encontrado. Comece a operar!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
};

interface GoalPanelProps {
    goal: Omit<GoalSettings, 'amount'> & { amount: number };
    setGoal: React.Dispatch<React.SetStateAction<Omit<GoalSettings, 'amount'> & { amount: number }>>;
    sortedFilteredRecords: AppRecord[];
    now: Date;
}

const GoalPanel: React.FC<GoalPanelProps> = ({ goal, setGoal, sortedFilteredRecords, now }) => {
    const [localGoal, setLocalGoal] = useState<GoalSettings>({
        type: goal.type,
        amount: goal.amount || '',
    });

    useEffect(() => {
        setLocalGoal({
            type: goal.type,
            amount: goal.amount || '',
        })
    }, [goal]);

    const handleSave = () => {
        const amountToSave = typeof localGoal.amount === 'number' ? localGoal.amount : 0;
        setGoal({ type: localGoal.type, amount: amountToSave });
        alert('Meta salva com sucesso!');
    };

    const currentMonthProfit = useMemo(() => {
        const today = new Date(now);
        const year = today.getUTCFullYear();
        const month = (today.getUTCMonth() + 1).toString().padStart(2, '0');
        const monthPrefix = `${year}-${month}`;

        return sortedFilteredRecords
            .filter(r => r.recordType === 'day' && r.id.startsWith(monthPrefix))
            .reduce((acc, r) => acc + (r as DailyRecord).netProfitUSD, 0);
    }, [sortedFilteredRecords, now]);

    const currentWeekProfit = useMemo(() => {
        const today = new Date(now);
        const startOfWeek = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const day = today.getUTCDay();
        const diff = startOfWeek.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        startOfWeek.setUTCDate(diff);
        startOfWeek.setUTCHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
        endOfWeek.setUTCHours(23, 59, 59, 999);

        return sortedFilteredRecords
            .filter(r => {
                if (r.recordType !== 'day') return false;
                const recordDate = new Date(r.id + 'T00:00:00Z');
                return recordDate >= startOfWeek && recordDate <= endOfWeek;
            })
            .reduce((acc, r) => acc + (r as DailyRecord).netProfitUSD, 0);
    }, [sortedFilteredRecords, now]);

    const monthlyGoalAmount = goal.type === 'monthly' ? goal.amount : 0;
    const weeklyGoalAmount = goal.type === 'weekly' ? goal.amount : (monthlyGoalAmount / 4.33);

    return (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg h-fit">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4">Definir Meta Principal</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="goalType" className="block text-sm font-medium text-slate-700">Período da Meta</label>
                        <select 
                            id="goalType"
                            value={localGoal.type}
                            onChange={(e) => setLocalGoal(g => ({ ...g, type: e.target.value as 'weekly' | 'monthly' }))}
                            className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="monthly">Mensal</option>
                            <option value="weekly">Semanal</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="goalAmount" className="block text-sm font-medium text-slate-700">Valor da Meta (USD)</label>
                        <input
                            type="number"
                            id="goalAmount"
                            value={localGoal.amount}
                            onChange={(e) => setLocalGoal(g => ({ ...g, amount: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                            className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ex: 500"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                        Salvar Meta
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-4">Análise de Metas</h2>
                <div className="space-y-8">
                    <GoalProgressBar
                        title="Meta Semanal"
                        currentValue={currentWeekProfit}
                        goalValue={weeklyGoalAmount}
                        description="Progresso de lucro na semana atual (Seg-Dom)"
                    />
                    <GoalProgressBar
                        title="Meta Mensal"
                        currentValue={currentMonthProfit}
                        goalValue={monthlyGoalAmount}
                        description={`Progresso de lucro em ${now.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' })}`}
                    />
                </div>
            </div>
        </div>
    )
};


const App: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const getStorageKey = useCallback((key: string) => `${user.username}_${key}`, [user.username]);

    const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
    const [activeBrokerageId, setActiveBrokerageId] = useState<string | null>(null);
    const [records, setRecords] = useState<AppRecord[]>([]);
    
    const [goal, setGoal] = useState<Omit<GoalSettings, 'amount'> & { amount: number }>(() => {
        const stored = localStorage.getItem(getStorageKey('tradeGoal'));
        if (stored) return JSON.parse(stored);
        return { type: 'monthly' as const, amount: 500 };
    });
    
    const [usdToBrlRate, setUsdToBrlRate] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBrokerageModalOpen, setIsBrokerageModalOpen] = useState(false);
    const [brokerageToEdit, setBrokerageToEdit] = useState<Brokerage | null>(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | null>(null);
    const [transactionToEdit, setTransactionToEdit] = useState<TransactionRecord | null>(null);
    const [isEditDayModalOpen, setIsEditDayModalOpen] = useState(false);
    const [dayToEdit, setDayToEdit] = useState<DailyRecord | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'goal'>('dashboard');
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        today.setUTCHours(0,0,0,0);
        return today;
    });
    const [stopLimitOverride, setStopLimitOverride] = useState<Record<string, boolean>>({});
    const [now, setNow] = useState(new Date());
    const [winsToAdd, setWinsToAdd] = useState('');
    const [lossesToAdd, setLossesToAdd] = useState('');
    const [customEntryValue, setCustomEntryValue] = useState('');
    const [customPayout, setCustomPayout] = useState('');
    const [isTestMessageVisible, setIsTestMessageVisible] = useState(true);

    // --- Effects ---
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            const rate = await fetchUSDBRLRate();
            setUsdToBrlRate(rate);
            
            // --- Data Migration for 'henrique' ---
            if (user.username === 'henrique') {
                const oldBrokeragesKey = 'brokerages_v2';
                const oldRecordsKey = 'tradeRecords_v2';
                const oldGoalKey = 'tradeGoal';

                const newBrokeragesKey = getStorageKey('brokerages_v2');
                
                if (localStorage.getItem(oldBrokeragesKey) && !localStorage.getItem(newBrokeragesKey)) {
                    console.log('Migrating data for user: henrique');
                    const oldBrokerages = localStorage.getItem(oldBrokeragesKey);
                    const oldRecords = localStorage.getItem(oldRecordsKey);
                    const oldGoal = localStorage.getItem(oldGoalKey);

                    if (oldBrokerages) localStorage.setItem(newBrokeragesKey, oldBrokerages);
                    if (oldRecords) localStorage.setItem(getStorageKey('tradeRecords_v2'), oldRecords);
                    if (oldGoal) localStorage.setItem(getStorageKey('tradeGoal'), oldGoal);

                    // Remove old keys after successful migration
                    localStorage.removeItem(oldBrokeragesKey);
                    localStorage.removeItem(oldRecordsKey);
                    localStorage.removeItem(oldGoalKey);
                }
            }
            // --- End Migration ---


            let loadedBrokerages: Brokerage[] = [];
            const storedBrokerages = localStorage.getItem(getStorageKey('brokerages_v2'));
            const storedRecords = localStorage.getItem(getStorageKey('tradeRecords_v2'));

            if (storedBrokerages) {
                const parsedBrokerages = JSON.parse(storedBrokerages);
                loadedBrokerages = parsedBrokerages;
                setBrokerages(parsedBrokerages);
                if (parsedBrokerages.length > 0) {
                    setActiveBrokerageId(parsedBrokerages[0].id);
                }
            } else if (user.username === 'henrique') {
                console.log("Seeding initial data for user: henrique");
                const defaultBrokerage: Brokerage = {
                    id: `brokerage_henrique_default`,
                    name: 'Corretora Principal',
                    initialBalance: 11.25,
                    entryMode: 'fixed',
                    entryValue: 1.00,
                    payoutPercentage: 85,
                    stopGainTrades: 5,
                    stopLossTrades: 3,
                };
                
                const defaultPayout = defaultBrokerage.payoutPercentage;
                const profitDay1 = 3.00 * (defaultPayout / 100);
                const endBalanceDay1 = defaultBrokerage.initialBalance + profitDay1;
                
                const tradesDay2: Trade[] = [
                  { id: 'seed_2_1', result: 'loss', entryValue: 1.00, payoutPercentage: defaultPayout },
                  { id: 'seed_2_2', result: 'loss', entryValue: 1.25, payoutPercentage: defaultPayout },
                  { id: 'seed_2_3', result: 'loss', entryValue: 5.00, payoutPercentage: defaultPayout },
                  { id: 'seed_2_4', result: 'win',  entryValue: 3.00, payoutPercentage: defaultPayout },
                  { id: 'seed_2_5', result: 'loss', entryValue: 3.00, payoutPercentage: defaultPayout },
                  { id: 'seed_2_6', result: 'loss', entryValue: 3.00, payoutPercentage: defaultPayout },
                  { id: 'seed_2_7', result: 'loss', entryValue: 3.00, payoutPercentage: defaultPayout },
                  { id: 'seed_2_8', result: 'win',  entryValue: 3.00, payoutPercentage: defaultPayout },
                  { id: 'seed_2_9', result: 'win',  entryValue: 1.00, payoutPercentage: defaultPayout },
                ];

                const profitDay2 = tradesDay2.reduce((acc, trade) => {
                  if (trade.result === 'win') {
                    return acc + (trade.entryValue * (trade.payoutPercentage / 100));
                  }
                  return acc - trade.entryValue;
                }, 0);

                const endBalanceDay2 = endBalanceDay1 + profitDay2;


                const recordsSeed: AppRecord[] = [
                    {
                        recordType: 'day',
                        brokerageId: defaultBrokerage.id,
                        id: '2025-11-09',
                        date: '09/11/2025',
                        startBalanceUSD: defaultBrokerage.initialBalance,
                        trades: [
                            { id: 'seed_1_1', result: 'win', entryValue: 3.00, payoutPercentage: defaultPayout },
                        ],
                        winCount: 1,
                        lossCount: 0,
                        netProfitUSD: profitDay1,
                        endBalanceUSD: endBalanceDay1,
                    },
                    {
                        recordType: 'day',
                        brokerageId: defaultBrokerage.id,
                        id: '2025-11-10',
                        date: '10/11/2025',
                        startBalanceUSD: endBalanceDay1,
                        trades: tradesDay2,
                        winCount: 3,
                        lossCount: 6,
                        netProfitUSD: profitDay2,
                        endBalanceUSD: endBalanceDay2,
                    }
                ];

                loadedBrokerages = [defaultBrokerage];
                setBrokerages(loadedBrokerages);
                setRecords(recordsSeed);
                setActiveBrokerageId(defaultBrokerage.id);
                
                localStorage.setItem(getStorageKey('brokerages_v2'), JSON.stringify(loadedBrokerages));
                localStorage.setItem(getStorageKey('tradeRecords_v2'), JSON.stringify(recordsSeed));

            } else {
                 // No data for this user, prompt for first brokerage
                setIsBrokerageModalOpen(true);
                setBrokerageToEdit(null);
            }

             if (storedRecords) {
                const parsedRecords = JSON.parse(storedRecords);
                const migrated = parsedRecords.map((r: any) => {
                    if (r.recordType === 'day') {
                        const brokerageForRecord = loadedBrokerages.find(b => b.id === r.brokerageId);
                        const payout = brokerageForRecord ? brokerageForRecord.payoutPercentage : 85;

                        let newTrades: Trade[] = [];
                        // Migration from old format without trades array
                        if (!r.trades) {
                            const entryValue = r.entrySizeUSD || 0;
                            for (let i = 0; i < (r.winCount || 0); i++) {
                                newTrades.push({ id: `trade_${Date.now()}_${i}_w`, result: 'win', entryValue, payoutPercentage: payout });
                            }
                            for (let i = 0; i < (r.lossCount || 0); i++) {
                                newTrades.push({ id: `trade_${Date.now()}_${i}_l`, result: 'loss', entryValue, payoutPercentage: payout });
                            }
                        } 
                        // Migration from TradeBatch[] format
                        else if (r.trades.length > 0 && r.trades[0].hasOwnProperty('wins')) {
                            r.trades.forEach((batch: any) => { // any for old TradeBatch type
                                for (let i = 0; i < batch.wins; i++) {
                                    newTrades.push({ id: `trade_${Date.now()}_${i}_w_${batch.entryValue}`, result: 'win', entryValue: batch.entryValue, payoutPercentage: payout });
                                }
                                for (let i = 0; i < batch.losses; i++) {
                                    newTrades.push({ id: `trade_${Date.now()}_${i}_l_${batch.entryValue}`, result: 'loss', entryValue: batch.entryValue, payoutPercentage: payout });
                                }
                            });
                        } else {
                            // Already in new format, ensure payoutPercentage exists
                            newTrades = r.trades.map((trade: any) => ({
                                ...trade,
                                payoutPercentage: trade.payoutPercentage ?? payout,
                            }));
                        }
                        const { entrySizeUSD, ...rest } = r;
                        return { ...rest, trades: newTrades };
                    }
                    return r;
                });
                setRecords(migrated);
            }

            setIsLoading(false);
        };

        initialize();
        const intervalId = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(intervalId);
    }, [user, getStorageKey]);

    useEffect(() => {
        if (brokerages.length > 0) {
             localStorage.setItem(getStorageKey('brokerages_v2'), JSON.stringify(brokerages));
        }
    }, [brokerages, getStorageKey]);

    useEffect(() => {
        if (!isLoading) { // Avoid saving empty initial state
            localStorage.setItem(getStorageKey('tradeRecords_v2'), JSON.stringify(records));
        }
    }, [records, isLoading, getStorageKey]);

    useEffect(() => {
        localStorage.setItem(getStorageKey('tradeGoal'), JSON.stringify(goal));
    }, [goal, getStorageKey]);

    // --- Derived State & Helpers ---
    const activeBrokerage = useMemo(() => brokerages.find(b => b.id === activeBrokerageId), [brokerages, activeBrokerageId]);
    
    const filteredRecords = useMemo(() => {
        if (!activeBrokerageId) return [];
        return records.filter(r => r.brokerageId === activeBrokerageId);
    }, [records, activeBrokerageId]);

    const formatDateISO = useCallback((date: Date): string => {
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);
    
    const formatDateBR = useCallback((date: Date): string => date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }), []);

    const selectedDateString = useMemo(() => formatDateISO(selectedDate), [selectedDate, formatDateISO]);

    const sortedFilteredRecords = useMemo(() => {
        return [...filteredRecords].sort((a, b) => {
            const dateA = a.recordType === 'day' ? a.id : a.date;
            const dateB = b.recordType === 'day' ? b.id : b.date;
            return dateA.localeCompare(dateB);
        });
    }, [filteredRecords]);

    const currentBalanceUSD = useMemo(() => {
        if (!activeBrokerage) return 0;
        
        let balance = activeBrokerage.initialBalance;
        for (const record of sortedFilteredRecords) {
            if (record.recordType === 'day') {
                balance += record.netProfitUSD;
            } else if (record.recordType === 'deposit') {
                balance += record.amountUSD;
            } else { // withdrawal
                balance -= record.amountUSD;
            }
        }
        return balance;
    }, [sortedFilteredRecords, activeBrokerage]);
    
    const getBalanceUpToDate = useCallback((dateISO: string, recordsForBrokerage: AppRecord[], initialBalance: number): number => {
        let balance = initialBalance;
        for (const record of recordsForBrokerage) {
            const recordDate = record.recordType === 'day' ? record.id : record.date;
            if (recordDate >= dateISO) {
                break;
            }
            if (record.recordType === 'day') {
                balance = record.endBalanceUSD;
            } else if (record.recordType === 'deposit') {
                balance += record.amountUSD;
            } else {
                balance -= record.amountUSD;
            }
        }
        return balance;
    }, []);

    const startBalanceForSelectedDay = useMemo(() => {
        if (!activeBrokerage) return 0;
        const recordForDay = sortedFilteredRecords.find(r => r.recordType === 'day' && r.id === selectedDateString);
        if (recordForDay) {
            return (recordForDay as DailyRecord).startBalanceUSD;
        }
        return getBalanceUpToDate(selectedDateString, sortedFilteredRecords, activeBrokerage.initialBalance);
    }, [sortedFilteredRecords, selectedDateString, getBalanceUpToDate, activeBrokerage]);

    const recalculateBalances = useCallback((recordsToProcess: AppRecord[], brokerage: Brokerage): AppRecord[] => {
        const sorted = [...recordsToProcess].sort((a, b) => {
            const dateA = a.recordType === 'day' ? a.id : a.date;
            const dateB = b.recordType === 'day' ? b.id : b.date;
            return dateA.localeCompare(dateB);
        });

        let currentBalance = brokerage.initialBalance;
        const recalculated: AppRecord[] = [];

        for (const record of sorted) {
            if (record.recordType === 'day') {
                const winCount = record.trades.filter(t => t.result === 'win').length;
                const lossCount = record.trades.filter(t => t.result === 'loss').length;
                
                let netProfitUSD = 0;
                if (record.trades && record.trades.length > 0) {
                    netProfitUSD = record.trades.reduce((totalProfit, trade) => {
                        if (trade.result === 'win') {
                            const payout = trade.payoutPercentage ?? brokerage.payoutPercentage;
                            return totalProfit + (trade.entryValue * (payout / 100));
                        } else { // loss
                            return totalProfit - trade.entryValue;
                        }
                    }, 0);
                }
                
                const endBalanceUSD = currentBalance + netProfitUSD;

                recalculated.push({
                    ...record,
                    startBalanceUSD: currentBalance,
                    winCount,
                    lossCount,
                    netProfitUSD,
                    endBalanceUSD,
                });
                currentBalance = endBalanceUSD;
            } else {
                recalculated.push(record);
                if (record.recordType === 'deposit') {
                    currentBalance += record.amountUSD;
                } else {
                    currentBalance -= record.amountUSD;
                }
            }
        }
        return recalculated;
    }, []);

    const updateRecordsForBrokerage = useCallback((updatedRecordsForBrokerage: AppRecord[]) => {
        if (!activeBrokerageId || !activeBrokerage) return;
        const otherRecords = records.filter(r => r.brokerageId !== activeBrokerageId);
        const recalculated = recalculateBalances(updatedRecordsForBrokerage, activeBrokerage);
        setRecords([...otherRecords, ...recalculated]);
    }, [records, activeBrokerageId, activeBrokerage, recalculateBalances]);


    const addRecord = useCallback((winCount: number, lossCount: number, customEntryValueUSD?: number, customPayoutPercentage?: number) => {
        if (!activeBrokerage) return;
        
        const startBalanceUSD = startBalanceForSelectedDay;

        const defaultEntrySizeUSD = activeBrokerage.entryMode === 'percentage'
            ? startBalanceUSD * (activeBrokerage.entryValue / 100)
            : activeBrokerage.entryValue;
        
        const entrySizeUSD = customEntryValueUSD ?? defaultEntrySizeUSD;
        const payoutPercentage = customPayoutPercentage ?? activeBrokerage.payoutPercentage;
        
        const newTrades: Trade[] = [];
        const entryValue = Math.max(1, entrySizeUSD);

        for (let i = 0; i < winCount; i++) {
            newTrades.push({ id: `trade_${Date.now()}_${i}_w`, result: 'win', entryValue, payoutPercentage });
        }
        for (let i = 0; i < lossCount; i++) {
            newTrades.push({ id: `trade_${Date.now()}_${i}_l`, result: 'loss', entryValue, payoutPercentage });
        }

        const existingRecord = filteredRecords.find(r => r.recordType === 'day' && r.id === selectedDateString) as DailyRecord | undefined;
        let updatedRecordsForBrokerage: AppRecord[];

        if (existingRecord) {
            const updatedRecord: DailyRecord = {
                ...existingRecord,
                trades: [...(existingRecord.trades || []), ...newTrades],
            };
            updatedRecordsForBrokerage = filteredRecords.map(r => (r.id === selectedDateString ? updatedRecord : r));
        } else {
            const newRecord: DailyRecord = {
                recordType: 'day',
                brokerageId: activeBrokerage.id,
                id: selectedDateString,
                date: formatDateBR(selectedDate),
                startBalanceUSD: 0, // Recalculated
                trades: newTrades,
                winCount: 0, // Recalculated
                lossCount: 0, // Recalculated
                netProfitUSD: 0, // Recalculated
                endBalanceUSD: 0, // Recalculated
            };
            updatedRecordsForBrokerage = [...filteredRecords, newRecord];
        }
        updateRecordsForBrokerage(updatedRecordsForBrokerage);

    }, [filteredRecords, activeBrokerage, selectedDateString, startBalanceForSelectedDay, selectedDate, formatDateBR, updateRecordsForBrokerage]);
    
    const handleSaveTransaction = useCallback((data: { type: 'deposit' | 'withdrawal'; date: Date; amount: number; notes: string }, id_to_update?: string) => {
        if (!activeBrokerageId) return;

        if (id_to_update) {
            // Find and update
            const updated = filteredRecords.map(r => {
                if (r.id === id_to_update) {
                    return {
                        ...r,
                        recordType: data.type,
                        date: formatDateISO(data.date),
                        displayDate: formatDateBR(data.date),
                        amountUSD: data.amount,
                        notes: data.notes,
                    } as TransactionRecord;
                }
                return r;
            });
            updateRecordsForBrokerage(updated);
        } else {
            // Create new
            const newTransaction: TransactionRecord = {
                recordType: data.type,
                brokerageId: activeBrokerageId,
                id: `trans_${Date.now()}`,
                date: formatDateISO(data.date),
                displayDate: formatDateBR(data.date),
                amountUSD: data.amount,
                notes: data.notes,
            };
            updateRecordsForBrokerage([...filteredRecords, newTransaction]);
        }
    }, [filteredRecords, activeBrokerageId, updateRecordsForBrokerage, formatDateISO, formatDateBR]);
    
    const handleDeleteRecord = useCallback((recordId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
            const updated = filteredRecords.filter(r => r.id !== recordId);
            updateRecordsForBrokerage(updated);
        }
    }, [filteredRecords, updateRecordsForBrokerage]);

    const handleEditRecord = useCallback((record: AppRecord) => {
        if (record.recordType === 'deposit' || record.recordType === 'withdrawal') {
            setTransactionToEdit(record);
            setTransactionType(record.recordType);
            setIsTransactionModalOpen(true);
        } else if (record.recordType === 'day') {
            setDayToEdit(record);
            setIsEditDayModalOpen(true);
        }
    }, []);

    const handleSaveDayRecord = (updatedRecord: DailyRecord) => {
        const updated = filteredRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r);
        updateRecordsForBrokerage(updated);
    };

    const handleSaveBrokerage = useCallback((brokerage: Brokerage) => {
        const index = brokerages.findIndex(b => b.id === brokerage.id);
        if (index > -1) {
            const updatedBrokerages = [...brokerages];
            updatedBrokerages[index] = brokerage;
            setBrokerages(updatedBrokerages);
            
            // Recalculate balances if initialBalance changed
            if (brokerages[index].initialBalance !== brokerage.initialBalance) {
                updateRecordsForBrokerage(filteredRecords);
            }
        } else {
            setBrokerages(prev => [...prev, brokerage]);
            setActiveBrokerageId(brokerage.id);
        }
        setIsBrokerageModalOpen(false);
    }, [brokerages, filteredRecords, updateRecordsForBrokerage]);
    
    const handleDeleteBrokerage = useCallback((brokerageId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta corretora e todos os seus registros? Esta ação não pode ser desfeita.')) {
            const newBrokerages = brokerages.filter(b => b.id !== brokerageId);
            const newRecords = records.filter(r => r.brokerageId !== brokerageId);
            setBrokerages(newBrokerages);
            setRecords(newRecords);
            setActiveBrokerageId(newBrokerages.length > 0 ? newBrokerages[0].id : null);
            setIsBrokerageModalOpen(false);
        }
    }, [brokerages, records]);


    const dailyRecordForSelectedDay = useMemo(() => {
        return sortedFilteredRecords.find(r => r.recordType === 'day' && r.id === selectedDateString) as DailyRecord | undefined;
    }, [sortedFilteredRecords, selectedDateString]);

    const stopLossLimitReached = useMemo(() => {
        if (!activeBrokerage?.stopLossTrades || activeBrokerage.stopLossTrades <= 0) return false;
        return dailyRecordForSelectedDay ? dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades : false;
    }, [dailyRecordForSelectedDay, activeBrokerage]);

    const stopGainLimitReached = useMemo(() => {
        if (!activeBrokerage?.stopGainTrades || activeBrokerage.stopGainTrades <= 0) return false;
        return dailyRecordForSelectedDay ? dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades : false;
    }, [dailyRecordForSelectedDay, activeBrokerage]);

    const isTradingHalted = useMemo(() => {
        if (stopLimitOverride[selectedDateString]) return false;
        return stopLossLimitReached || stopGainLimitReached;
    }, [stopLossLimitReached, stopGainLimitReached, stopLimitOverride, selectedDateString]);

    const dynamicDailyGoal = useMemo(() => {
        if (!goal || goal.amount <= 0) return 0;

        const calculationDay = new Date(selectedDate.getTime());
        calculationDay.setUTCHours(0, 0, 0, 0);

        let startDate, endDate;
        if (goal.type === 'monthly') {
            startDate = new Date(Date.UTC(calculationDay.getUTCFullYear(), calculationDay.getUTCMonth(), 1));
            endDate = new Date(Date.UTC(calculationDay.getUTCFullYear(), calculationDay.getUTCMonth() + 1, 0));
        } else { // weekly
            const dayOfWeek = calculationDay.getUTCDay();
            const diff = calculationDay.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
            startDate = new Date(Date.UTC(calculationDay.getUTCFullYear(), calculationDay.getUTCMonth(), diff));
            endDate = new Date(startDate);
            endDate.setUTCDate(startDate.getUTCDate() + 6);
        }

        const profitSoFar = sortedFilteredRecords
            .filter(r => {
                if (r.recordType !== 'day') return false;
                const recordDate = new Date(r.id + 'T00:00:00Z');
                return recordDate >= startDate && recordDate < calculationDay;
            })
            .reduce((acc, r) => acc + (r as DailyRecord).netProfitUSD, 0);
            
        const dailyRecordProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
        const totalProfitForGoal = profitSoFar + dailyRecordProfit;
        const remainingGoal = goal.amount - totalProfitForGoal;

        if (remainingGoal <= 0) return 0;
        
        const todayIncludedForRemaining = new Date(calculationDay.getTime());
        todayIncludedForRemaining.setUTCDate(todayIncludedForRemaining.getUTCDate());

        const remainingTradingDays = countTradingDays(todayIncludedForRemaining, endDate);
        
        if (remainingTradingDays <= 0) return remainingGoal > 0 ? remainingGoal : 0;
        
        return remainingGoal / remainingTradingDays;

    }, [goal, sortedFilteredRecords, selectedDate, dailyRecordForSelectedDay]);

    // --- Performance Summaries ---
    const getPerformanceStats = (startDate: Date, endDate: Date) => {
        const relevantRecords = sortedFilteredRecords.filter(r => {
            if (r.recordType !== 'day') return false;
            const recordDate = new Date(r.id + 'T00:00:00Z');
            return recordDate >= startDate && recordDate <= endDate;
        }) as DailyRecord[];

        const stats = relevantRecords.reduce((acc, r) => {
            acc.profit += r.netProfitUSD;
            acc.wins += r.winCount;
            acc.losses += r.lossCount;
            return acc;
        }, { profit: 0, wins: 0, losses: 0 });

        const totalTrades = stats.wins + stats.losses;
        const winRate = totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 0;

        return { ...stats, totalTrades, winRate };
    };

    const weeklyStats = useMemo(() => {
        const today = new Date(now);
        const dayOfWeek = today.getUTCDay();
        const diff = today.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), diff));
        startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + 6);
        endDate.setUTCHours(23, 59, 59, 999);
        const stats = getPerformanceStats(startDate, endDate);

        if (!activeBrokerage) return { ...stats, startBalance: 0, currentBalance: 0 };
    
        const startBalance = getBalanceUpToDate(formatDateISO(startDate), sortedFilteredRecords, activeBrokerage.initialBalance);
        const currentBalance = startBalance + stats.profit;

        return { ...stats, startBalance, currentBalance };
    }, [sortedFilteredRecords, now, activeBrokerage, getBalanceUpToDate, formatDateISO]);

    const monthlyStats = useMemo(() => {
        const today = new Date(now);
        const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
        endDate.setUTCHours(23, 59, 59, 999);
        const stats = getPerformanceStats(startDate, endDate);

        if (!activeBrokerage) return { ...stats, startBalance: 0, currentBalance: 0 };
    
        const startBalance = getBalanceUpToDate(formatDateISO(startDate), sortedFilteredRecords, activeBrokerage.initialBalance);
        const currentBalance = startBalance + stats.profit;
    
        return { ...stats, startBalance, currentBalance };
    }, [sortedFilteredRecords, now, activeBrokerage, getBalanceUpToDate, formatDateISO]);

    // --- RENDER ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
                <div className="text-xl font-semibold text-slate-700">Carregando dados...</div>
            </div>
        );
    }
    
    const TabButton: React.FC<{
      label: string;
      icon: React.ReactNode;
      tabName: typeof activeTab;
    }> = ({ label, icon, tabName }) => (
      <button
        onClick={() => setActiveTab(tabName)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
          activeTab === tabName
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-200'
        }`}
      >
        {icon}
        {label}
      </button>
    );

    const dashboardProps: DashboardPanelProps = {
        activeBrokerage: activeBrokerage!,
        winsToAdd, setWinsToAdd, lossesToAdd, setLossesToAdd, customEntryValue, setCustomEntryValue,
        customPayout, setCustomPayout, addRecord, isTestMessageVisible, setIsTestMessageVisible, selectedDateString,
        setSelectedDate, isTradingHalted, stopLossLimitReached, setStopLimitOverride, startBalanceForSelectedDay,
        dailyRecordForSelectedDay, dynamicDailyGoal, weeklyStats, monthlyStats, sortedFilteredRecords,
        handleDeleteRecord, handleEditRecord, setTransactionType, setIsTransactionModalOpen
    };

    const goalPanelProps: GoalPanelProps = {
        goal,
        setGoal,
        sortedFilteredRecords,
        now
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-300">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Controle de Performance</h1>
                        {brokerages.length > 0 && activeBrokerageId && (
                            <select
                                value={activeBrokerageId}
                                onChange={(e) => setActiveBrokerageId(e.target.value)}
                                className="mt-2 sm:mt-0 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Selecionar Corretora"
                            >
                                {brokerages.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4 mt-2 sm:mt-0">
                        {activeBrokerage && (
                            <span className="text-sm font-medium text-slate-600">
                                Banca: <span className="font-bold text-blue-600">${currentBalanceUSD.toFixed(2)}</span>
                            </span>
                        )}
                        <span className="text-sm font-medium text-slate-600">
                            Dólar: <span className="font-bold text-green-600">R$ {usdToBrlRate?.toFixed(2) || '...'}</span>
                        </span>
                        <button onClick={() => { setBrokerageToEdit(null); setIsBrokerageModalOpen(true); }} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Adicionar Nova Corretora">
                           <PlusIcon className="w-6 h-6 text-slate-600" />
                        </button>
                        <button onClick={() => { setBrokerageToEdit(activeBrokerage || null); setIsBrokerageModalOpen(true); }} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Abrir Configurações da Corretora" disabled={!activeBrokerage}>
                            <SettingsIcon className="w-6 h-6 text-slate-600" />
                        </button>
                         <button onClick={onLogout} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Sair">
                            <LogoutIcon className="w-6 h-6 text-slate-600" />
                        </button>
                    </div>
                </header>
                 
                 {activeBrokerage ? (
                    <>
                        <nav className="mb-6 flex justify-center bg-white p-2 rounded-xl shadow-sm">
                            <div className="flex space-x-2">
                                <TabButton label="Dashboard" icon={<HomeIcon className="w-5 h-5"/>} tabName="dashboard" />
                                <TabButton label="Metas e Análise" icon={<TrophyIcon className="w-5 h-5"/>} tabName="goal" />
                            </div>
                        </nav>
                        <main>
                            {activeTab === 'dashboard' && <DashboardPanel {...dashboardProps} />}
                            {activeTab === 'goal' && <GoalPanel {...goalPanelProps} />}
                        </main>
                    </>
                 ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-slate-800">Bem-vindo(a), {user.username}!</h2>
                        <p className="text-slate-600 mt-2">Para começar, adicione sua primeira corretora.</p>
                        <button onClick={() => { setBrokerageToEdit(null); setIsBrokerageModalOpen(true); }} className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                            Adicionar Corretora
                        </button>
                    </div>
                 )}
            </div>

            <BrokerageModal
                isOpen={isBrokerageModalOpen}
                onClose={() => setIsBrokerageModalOpen(false)}
                onSave={handleSaveBrokerage}
                onDelete={handleDeleteBrokerage}
                brokerageToEdit={brokerageToEdit}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => {
                    setIsTransactionModalOpen(false);
                    setTransactionToEdit(null);
                }}
                onSave={handleSaveTransaction}
                type={transactionType}
                transactionToEdit={transactionToEdit}
            />

            <EditDayModal
                isOpen={isEditDayModalOpen}
                onClose={() => {
                    setIsEditDayModalOpen(false);
                    setDayToEdit(null);
                }}
                dayRecord={dayToEdit}
                onSave={handleSaveDayRecord}
            />

            <footer className="text-center mt-8 text-sm text-slate-500">
                Criado por Henrique Costa
            </footer>
        </div>
    );
};

interface GoalProgressBarProps {
    title: string;
    currentValue: number;
    goalValue: number;
    description: string;
}

const GoalProgressBar: React.FC<GoalProgressBarProps> = ({ title, currentValue, goalValue, description }) => {
    const progress = goalValue > 0 ? Math.min((currentValue / goalValue) * 100, 100) : 0;
    const isGoalMet = goalValue > 0 && currentValue >= goalValue;
    const progressColor = isGoalMet ? 'bg-emerald-500' : 'bg-blue-500';
    
    if (goalValue <= 0) {
        return (
            <div>
                 <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                 <p className="text-sm text-slate-500 mt-1">
                    Meta não definida. Defina uma meta na aba <span className="font-semibold">Metas e Análise</span>.
                </p>
            </div>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-end mb-1">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                        {isGoalMet && <TrophyIcon className="w-5 h-5 text-amber-400" />}
                        {title}
                    </h3>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
                <div className="text-right">
                    <p className={`text-lg font-bold ${isGoalMet ? 'text-emerald-500' : 'text-slate-700'}`}>
                        ${currentValue.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-500">de ${goalValue.toFixed(2)}</p>
                </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 shadow-inner">
                <div
                    className={`h-4 rounded-full transition-all duration-500 ease-out ${progressColor}`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-right text-sm font-semibold text-slate-600 mt-1">{Math.round(progress)}%</p>
        </div>
    );
};


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface BrokerageModalProps extends ModalProps {
    brokerageToEdit: Brokerage | null;
    onSave: (brokerage: Brokerage) => void;
    onDelete: (brokerageId: string) => void;
}

const BrokerageModal: React.FC<BrokerageModalProps> = ({ isOpen, onClose, brokerageToEdit, onSave, onDelete }) => {
    const [localBrokerage, setLocalBrokerage] = useState({
        name: '',
        initialBalance: '',
        entryMode: 'percentage',
        entryValue: '',
        payoutPercentage: '',
        stopGainTrades: '',
        stopLossTrades: '',
    });

    const isEditMode = brokerageToEdit !== null;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && brokerageToEdit) {
                setLocalBrokerage({
                    name: brokerageToEdit.name,
                    initialBalance: String(brokerageToEdit.initialBalance || ''),
                    entryMode: brokerageToEdit.entryMode,
                    entryValue: String(brokerageToEdit.entryValue || ''),
                    payoutPercentage: String(brokerageToEdit.payoutPercentage || ''),
                    stopGainTrades: String(brokerageToEdit.stopGainTrades || ''),
                    stopLossTrades: String(brokerageToEdit.stopLossTrades || ''),
                });
            } else {
                 setLocalBrokerage({
                    name: '', initialBalance: '', entryMode: 'percentage',
                    entryValue: '', payoutPercentage: '', stopGainTrades: '', stopLossTrades: '',
                });
            }
        }
    }, [brokerageToEdit, isEditMode, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalBrokerage(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (!localBrokerage.name) {
            alert('O nome da corretora é obrigatório.');
            return;
        }

        const brokerageData: Brokerage = {
            id: isEditMode ? brokerageToEdit!.id : `brokerage_${Date.now()}`,
            name: localBrokerage.name,
            initialBalance: parseFloat(localBrokerage.initialBalance) || 0,
            entryMode: localBrokerage.entryMode as 'percentage' | 'fixed',
            entryValue: parseFloat(localBrokerage.entryValue) || 0,
            payoutPercentage: parseFloat(localBrokerage.payoutPercentage) || 0,
            stopGainTrades: parseInt(localBrokerage.stopGainTrades, 10) || 0,
            stopLossTrades: parseInt(localBrokerage.stopLossTrades, 10) || 0,
        };
        onSave(brokerageData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">
                        {isEditMode ? 'Configurações da Corretora' : 'Adicionar Nova Corretora'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition-colors" aria-label="Fechar">
                        <XMarkIcon className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome da Corretora</label>
                        <input type="text" name="name" id="name" value={localBrokerage.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="initialBalance" className="block text-sm font-medium text-slate-700">Banca Inicial (USD)</label>
                        <input type="number" name="initialBalance" id="initialBalance" value={localBrokerage.initialBalance} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="entryMode" className="block text-sm font-medium text-slate-700">Modo de Entrada</label>
                        <select name="entryMode" id="entryMode" value={localBrokerage.entryMode} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="percentage">Porcentagem da Banca</option>
                            <option value="fixed">Valor Fixo</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="entryValue" className="block text-sm font-medium text-slate-700">
                            Valor da Entrada ({localBrokerage.entryMode === 'percentage' ? '%' : 'USD'})
                        </label>
                        <input type="number" name="entryValue" id="entryValue" value={localBrokerage.entryValue} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="payoutPercentage" className="block text-sm font-medium text-slate-700">Payout (%)</label>
                        <input type="number" name="payoutPercentage" id="payoutPercentage" value={localBrokerage.payoutPercentage} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <hr/>
                    <h3 className="text-lg font-semibold text-slate-800 pt-2">Gerenciamento de Risco</h3>
                    <div>
                        <label htmlFor="stopGainTrades" className="block text-sm font-medium text-slate-700">Stop Gain (nº de vitórias)</label>
                        <input type="number" name="stopGainTrades" id="stopGainTrades" value={localBrokerage.stopGainTrades} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="stopLossTrades" className="block text-sm font-medium text-slate-700">Stop Loss (nº de derrotas)</label>
                        <input type="number" name="stopLossTrades" id="stopLossTrades" value={localBrokerage.stopLossTrades} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div className="mt-6 flex justify-between items-center">
                    <div>
                        {isEditMode && (
                            <button onClick={() => onDelete(brokerageToEdit!.id)} className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2">
                                <TrashIcon className="w-4 h-4" />
                                Excluir
                            </button>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TransactionModalProps extends ModalProps {
    onSave: (data: { type: 'deposit' | 'withdrawal'; date: Date; amount: number; notes: string }, id?: string) => void;
    type: 'deposit' | 'withdrawal' | null;
    transactionToEdit?: TransactionRecord | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, type, transactionToEdit }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    const isEditMode = !!transactionToEdit;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && transactionToEdit) {
                setAmount(String(transactionToEdit.amountUSD));
                setDate(transactionToEdit.date);
                setNotes(transactionToEdit.notes);
            } else {
                setAmount('');
                setDate(new Date().toISOString().split('T')[0]);
                setNotes('');
            }
        }
    }, [isOpen, isEditMode, transactionToEdit]);

    const handleSave = () => {
        if (!type || !amount || parseFloat(amount) <= 0) return;
        onSave({
            type,
            amount: parseFloat(amount),
            date: new Date(date + 'T00:00:00Z'),
            notes
        }, isEditMode ? transactionToEdit.id : undefined);
        onClose();
    };

    if (!isOpen || !type) return null;

    const isDeposit = type === 'deposit';
    const title = `${isEditMode ? 'Editar' : 'Adicionar'} ${isDeposit ? 'Depósito' : 'Saque'}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition-colors" aria-label="Fechar">
                        <XMarkIcon className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="transAmount" className="block text-sm font-medium text-slate-700">Valor (USD)</label>
                        <input type="number" id="transAmount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="0.00"/>
                    </div>
                    <div>
                        <label htmlFor="transDate" className="block text-sm font-medium text-slate-700">Data</label>
                        <input type="date" id="transDate" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                        <label htmlFor="transNotes" className="block text-sm font-medium text-slate-700">Notas (Opcional)</label>
                        <input type="text" id="transNotes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: Bônus da corretora"/>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className={`px-4 py-2 text-white rounded-lg transition-colors ${isDeposit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};


interface EditDayModalProps extends ModalProps {
    dayRecord: DailyRecord | null;
    onSave: (dayRecordWithUpdatedTrades: DailyRecord) => void;
}

const EditDayModal: React.FC<EditDayModalProps> = ({ isOpen, onClose, dayRecord, onSave }) => {
    const [localTrades, setLocalTrades] = useState<Trade[]>([]);

    useEffect(() => {
        if (dayRecord) {
            setLocalTrades(dayRecord.trades);
        } else {
            setLocalTrades([]);
        }
    }, [dayRecord]);

    const handleDeleteTrade = (tradeId: string) => {
        setLocalTrades(prev => prev.filter(trade => trade.id !== tradeId));
    };

    const handleSave = () => {
        if (!dayRecord) return;
        onSave({ ...dayRecord, trades: localTrades });
        onClose();
    };

    if (!isOpen || !dayRecord) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-xl font-bold text-slate-900">
                        Editar Operações do Dia: {dayRecord.date}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition-colors" aria-label="Fechar">
                        <XMarkIcon className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                    {localTrades.length > 0 ? localTrades.map((trade, index) => (
                        <div key={trade.id || index} className="flex items-center justify-between p-2 bg-slate-100 rounded-md">
                            <div className="flex items-center gap-4">
                                <span className={`font-bold w-12 text-center px-2 py-1 rounded-md text-sm ${trade.result === 'win' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                    {trade.result === 'win' ? 'WIN' : 'LOSS'}
                                </span>
                                <span className="text-slate-700">
                                    Valor: <span className="font-semibold">${trade.entryValue.toFixed(2)}</span>
                                </span>
                            </div>
                            <button onClick={() => handleDeleteTrade(trade.id)} className="text-slate-500 hover:text-red-600 p-1 rounded-full hover:bg-red-100" aria-label="Excluir operação">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )) : (
                        <p className="text-slate-500 text-center py-4">Nenhuma operação registrada para este dia.</p>
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
