
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TradeSettings, DailyRecord, TransactionRecord, AppRecord } from './types';
import { fetchUSDBRLRate } from './services/currencyService';
import { SettingsIcon, PlusIcon, TrendingUpIcon, TrendingDownIcon, DepositIcon, WithdrawalIcon, XMarkIcon, TrashIcon, PencilIcon, HomeIcon, ChartBarIcon, TrophyIcon, InformationCircleIcon } from './components/icons';

interface GoalSettings {
    type: 'weekly' | 'monthly';
    amount: number | '';
}

const countTradingDays = (start: Date, end: Date): number => {
    let count = 0;
    const current = new Date(start);
    current.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    while (current <= end) {
        const day = current.getUTCDay();
        if (day >= 1 && day <= 5) { // Monday to Friday
            count++;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return count;
};


const App: React.FC = () => {
    const [settings, setSettings] = useState<TradeSettings>(() => {
        const stored = localStorage.getItem('tradeSettings');
        const defaults = {
            initialBalance: 0,
            entryMode: 'percentage' as const,
            entryValue: 0,
            payoutPercentage: 0,
            stopGainTrades: 0,
            stopLossTrades: 0,
        };
        if (stored) {
            const parsed = JSON.parse(stored);
            delete parsed.stopGainPercentage;
            delete parsed.stopLossPercentage;
            delete parsed.dailyGoalPercentage;
            return { ...defaults, ...parsed };
        }
        return defaults;
    });
    const [records, setRecords] = useState<AppRecord[]>(() => {
        const stored = localStorage.getItem('tradeRecords');
        if (stored) return JSON.parse(stored);
        return [];
    });
    const [goal, setGoal] = useState<Omit<GoalSettings, 'amount'> & { amount: number }>(() => {
        const stored = localStorage.getItem('tradeGoal');
        if (stored) return JSON.parse(stored);
        return { type: 'monthly' as const, amount: 500 };
    });
    const [usdToBrlRate, setUsdToBrlRate] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(() => !localStorage.getItem('tradeSettings'));
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState<DailyRecord | null>(null);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'goal'>('dashboard');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [stopLimitOverride, setStopLimitOverride] = useState<Record<string, boolean>>({});
    const [now, setNow] = useState(new Date());
    const [winsToAdd, setWinsToAdd] = useState('');
    const [lossesToAdd, setLossesToAdd] = useState('');
    const [isTestMessageVisible, setIsTestMessageVisible] = useState(true);

    // --- Effects ---
    useEffect(() => {
        const getRate = async () => {
            setIsLoading(true);
            const rate = await fetchUSDBRLRate();
            setUsdToBrlRate(rate);
            setIsLoading(false);
        };
        getRate();

        const intervalId = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        localStorage.setItem('tradeSettings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('tradeRecords', JSON.stringify(records));
    }, [records]);

    useEffect(() => {
        localStorage.setItem('tradeGoal', JSON.stringify(goal));
    }, [goal]);

    // --- Memoized Values & Helpers ---
    const formatDateISO = useCallback((date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);
    
    const formatDateBR = useCallback((date: Date): string => date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }), []);

    const selectedDateString = useMemo(() => formatDateISO(selectedDate), [selectedDate, formatDateISO]);

    const sortedRecords = useMemo(() => {
        return [...records].sort((a, b) => {
            const dateA = a.recordType === 'day' ? a.id : a.date;
            const dateB = b.recordType === 'day' ? b.id : b.date;
            if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
            }
            return 0;
        });
    }, [records]);
    
    const getBalanceUpToDate = useCallback((dateISO: string): number => {
        let balance = settings.initialBalance;
        for (const record of sortedRecords) {
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
    }, [sortedRecords, settings.initialBalance]);

    const startBalanceForSelectedDay = useMemo(() => {
        const recordForDay = sortedRecords.find(r => r.recordType === 'day' && r.id === selectedDateString);
        if (recordForDay) {
            return (recordForDay as DailyRecord).startBalanceUSD;
        }
        return getBalanceUpToDate(selectedDateString);
    }, [sortedRecords, selectedDateString, getBalanceUpToDate]);

    const recalculateBalances = useCallback((recordsToProcess: AppRecord[]): AppRecord[] => {
        const sorted = [...recordsToProcess].sort((a, b) => {
            const dateA = a.recordType === 'day' ? a.id : a.date;
            const dateB = b.recordType === 'day' ? b.id : b.date;
            return dateA.localeCompare(dateB);
        });

        let currentBalance = settings.initialBalance;
        const recalculated: AppRecord[] = [];

        for (const record of sorted) {
            if (record.recordType === 'day') {
                const calculatedEntrySizeUSD = settings.entryMode === 'percentage'
                    ? currentBalance * (settings.entryValue / 100)
                    : settings.entryValue;
                const entrySizeUSD = Math.max(1, calculatedEntrySizeUSD);
                const profitPerWinUSD = entrySizeUSD * (settings.payoutPercentage / 100);
                
                const netProfitUSD = (record.winCount * profitPerWinUSD) - (record.lossCount * entrySizeUSD);
                const endBalanceUSD = currentBalance + netProfitUSD;

                recalculated.push({
                    ...record,
                    startBalanceUSD: currentBalance,
                    entrySizeUSD,
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
    }, [settings]);

    const addRecord = useCallback((winCount: number, lossCount: number) => {
        const existingRecord = records.find(r => r.recordType === 'day' && r.id === selectedDateString) as DailyRecord | undefined;
        const startBalanceUSD = startBalanceForSelectedDay;

        const calculatedEntrySizeUSD = settings.entryMode === 'percentage'
            ? startBalanceUSD * (settings.entryValue / 100)
            : settings.entryValue;
        
        const entrySizeUSD = Math.max(1, calculatedEntrySizeUSD);
        const profitPerWinUSD = entrySizeUSD * (settings.payoutPercentage / 100);
        const lossPerTradeUSD = entrySizeUSD;

        if (existingRecord) {
            const newWinCount = existingRecord.winCount + winCount;
            const newLossCount = existingRecord.lossCount + lossCount;
            const newNetProfitUSD = (newWinCount * profitPerWinUSD) - (newLossCount * lossPerTradeUSD);
            const newEndBalanceUSD = existingRecord.startBalanceUSD + newNetProfitUSD;

            const updatedRecord: DailyRecord = {
                ...existingRecord,
                winCount: newWinCount,
                lossCount: newLossCount,
                entrySizeUSD,
                netProfitUSD: newNetProfitUSD,
                endBalanceUSD: newEndBalanceUSD,
            };
            const updatedRecords = records.map(r => (r.id === selectedDateString ? updatedRecord : r));
            setRecords(recalculateBalances(updatedRecords));

        } else {
            const netProfitUSD = (winCount * profitPerWinUSD) - (lossCount * lossPerTradeUSD);
            const endBalanceUSD = startBalanceUSD + netProfitUSD;

            const newRecord: DailyRecord = {
                recordType: 'day',
                id: selectedDateString,
                date: formatDateBR(selectedDate),
                startBalanceUSD,
                winCount,
                lossCount,
                entrySizeUSD,
                netProfitUSD,
                endBalanceUSD,
            };
            const updatedRecords = [...records, newRecord];
            setRecords(recalculateBalances(updatedRecords));
        }
    }, [records, settings, selectedDateString, startBalanceForSelectedDay, selectedDate, formatDateBR, recalculateBalances]);
    
    const handleSaveTransaction = useCallback((data: { type: 'deposit' | 'withdrawal'; date: Date; amount: number; notes: string }) => {
        const newTransaction: TransactionRecord = {
            recordType: data.type,
            id: `trans_${Date.now()}`,
            date: formatDateISO(data.date),
            displayDate: formatDateBR(data.date),
            amountUSD: data.amount,
            notes: data.notes,
        };
        const updatedRecords = [...records, newTransaction];
        setRecords(recalculateBalances(updatedRecords));
    }, [records, recalculateBalances, formatDateISO, formatDateBR]);
    
    const handleDeleteRecord = useCallback((recordId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
            const updatedRecords = records.filter(r => r.id !== recordId);
            setRecords(recalculateBalances(updatedRecords));
        }
    }, [records, recalculateBalances]);

    const handleEditRequest = useCallback((record: AppRecord) => {
        if (record.recordType === 'day') {
            setRecordToEdit(record);
            setIsEditModalOpen(true);
        }
    }, []);
    
    const handleSaveEdit = useCallback((editedRecordData: { winCount: number, lossCount: number }) => {
        if (!recordToEdit) return;

        const updatedRecords = records.map(r => {
            if (r.id === recordToEdit.id && r.recordType === 'day') {
                return {
                    ...r,
                    winCount: editedRecordData.winCount,
                    lossCount: editedRecordData.lossCount,
                };
            }
            return r;
        });

        setRecords(recalculateBalances(updatedRecords));
        setIsEditModalOpen(false);
        setRecordToEdit(null);
    }, [records, recordToEdit, recalculateBalances]);

    const dailyRecordForSelectedDay = useMemo(() => {
        return sortedRecords.find(r => r.recordType === 'day' && r.id === selectedDateString) as DailyRecord | undefined;
    }, [sortedRecords, selectedDateString]);

    const stopLossLimitReached = useMemo(() => {
        if (!settings.stopLossTrades || settings.stopLossTrades <= 0) return false;
        return dailyRecordForSelectedDay ? dailyRecordForSelectedDay.lossCount >= settings.stopLossTrades : false;
    }, [dailyRecordForSelectedDay, settings.stopLossTrades]);

    const stopGainLimitReached = useMemo(() => {
        if (!settings.stopGainTrades || settings.stopGainTrades <= 0) return false;
        return dailyRecordForSelectedDay ? dailyRecordForSelectedDay.winCount >= settings.stopGainTrades : false;
    }, [dailyRecordForSelectedDay, settings.stopGainTrades]);

    const isTradingHalted = useMemo(() => {
        if (stopLimitOverride[selectedDateString]) return false;
        return stopLossLimitReached || stopGainLimitReached;
    }, [stopLossLimitReached, stopGainLimitReached, stopLimitOverride, selectedDateString]);

    const dynamicDailyGoal = useMemo(() => {
        if (!goal || goal.amount <= 0) return 0;

        const today = new Date(now);
        today.setUTCHours(0, 0, 0, 0);

        let startDate, endDate;
        if (goal.type === 'monthly') {
            startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
            endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
        } else { // weekly
            const dayOfWeek = today.getUTCDay();
            const diff = today.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
            startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), diff));
            endDate = new Date(startDate);
            endDate.setUTCDate(startDate.getUTCDate() + 6);
        }

        const profitSoFar = sortedRecords
            .filter(r => {
                if (r.recordType !== 'day') return false;
                const recordDate = new Date(r.id.replace(/-/g, '/'));
                recordDate.setUTCHours(0, 0, 0, 0);
                return recordDate >= startDate && recordDate < today;
            })
            .reduce((acc, r) => acc + (r as DailyRecord).netProfitUSD, 0);

        const remainingGoal = goal.amount - profitSoFar;
        if (remainingGoal <= 0) return 0;
        
        const remainingTradingDays = countTradingDays(today, endDate);
        if (remainingTradingDays <= 0) return remainingGoal;

        return remainingGoal / remainingTradingDays;

    }, [goal, sortedRecords, now]);

    // --- Performance Summaries ---
    const getPerformanceStats = (startDate: Date, endDate: Date) => {
        const relevantRecords = sortedRecords.filter(r => {
            if (r.recordType !== 'day') return false;
            const recordDate = new Date(r.id.replace(/-/g, '/'));
            recordDate.setUTCHours(0, 0, 0, 0);
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
        return getPerformanceStats(startDate, endDate);
    }, [sortedRecords, now]);

    const monthlyStats = useMemo(() => {
        const today = new Date(now);
        const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
        endDate.setUTCHours(23, 59, 59, 999);
        return getPerformanceStats(startDate, endDate);
    }, [sortedRecords, now]);

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

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-300">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Controle de Performance</h1>
                    <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                        <span className="text-sm font-medium text-slate-600">
                            Dólar: <span className="font-bold text-green-600">R$ {usdToBrlRate?.toFixed(2) || '...'}</span>
                        </span>
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Abrir Configurações">
                            <SettingsIcon className="w-6 h-6 text-slate-600" />
                        </button>
                    </div>
                </header>

                 <nav className="mb-6 flex justify-center bg-white p-2 rounded-xl shadow-sm">
                    <div className="flex space-x-2">
                        <TabButton label="Dashboard" icon={<HomeIcon className="w-5 h-5"/>} tabName="dashboard" />
                        <TabButton label="Metas e Análise" icon={<TrophyIcon className="w-5 h-5"/>} tabName="goal" />
                    </div>
                </nav>

                <main>
                    {activeTab === 'dashboard' && <DashboardPanel />}
                    {activeTab === 'goal' && <GoalPanel />}
                </main>
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onSave={setSettings}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSave={handleSaveTransaction}
                type={transactionType}
            />

            {recordToEdit && (
              <EditRecordModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveEdit}
                record={recordToEdit}
              />
            )}
            <footer className="text-center mt-8 text-sm text-slate-500">
                Criado por Henrique Costa
            </footer>
        </div>
    );

    function DashboardPanel() {
        const handleAddTrades = () => {
            const wins = parseInt(winsToAdd, 10) || 0;
            const losses = parseInt(lossesToAdd, 10) || 0;

            if (wins > 0 || losses > 0) {
                addRecord(wins, losses);
                setWinsToAdd('');
                setLossesToAdd('');
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
                                onChange={(e) => setSelectedDate(new Date(e.target.value.replace(/-/g, '/')))}
                                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                        </div>
                        
                        {isTradingHalted && (
                            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-md" role="alert">
                                <p className="font-bold">Limite Atingido</p>
                                <p>Você atingiu seu limite de {stopLossLimitReached ? `perdas (Stop Loss: ${settings.stopLossTrades})` : `ganhos (Stop Gain: ${settings.stopGainTrades})`} para hoje.</p>
                                <button onClick={() => setStopLimitOverride(prev => ({ ...prev, [selectedDateString]: true }))} className="mt-2 text-sm text-blue-600 hover:underline">
                                    Operar mesmo assim
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
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
                             <div className={`p-4 rounded-lg ${dailyRecordForSelectedDay?.netProfitUSD ?? 0 >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                <p className="text-sm text-slate-500">Lucro/Prejuízo (Dia)</p>
                                <p className={`text-xl font-bold ${dailyRecordForSelectedDay?.netProfitUSD ?? 0 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                                        <span className="text-slate-600">Lucro Total:</span>
                                        <span className={`font-semibold ${weeklyStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${weeklyStats.profit.toFixed(2)}</span>
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
                                        <span className="text-slate-600">Lucro Total:</span>
                                        <span className={`font-semibold ${monthlyStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${monthlyStats.profit.toFixed(2)}</span>
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
                                    {sortedRecords.length > 0 ? sortedRecords.map((record) => (
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
                                                    <span className="font-mono">
                                                        <span className="text-green-600 font-semibold">{record.winCount}W</span> / <span className="text-red-600 font-semibold">{record.lossCount}L</span>
                                                    </span>
                                                ) : (
                                                    <span className="font-semibold">${record.amountUSD.toFixed(2)}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-semibold">
                                                {record.recordType === 'day' ? `$${record.endBalanceUSD.toFixed(2)}` : '-'}
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    {record.recordType === 'day' && (
                                                      <button onClick={() => handleEditRequest(record)} className="text-slate-500 hover:text-blue-600" aria-label="Editar">
                                                        <PencilIcon className="w-4 h-4" />
                                                      </button>
                                                    )}
                                                    <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-500 hover:text-red-600" aria-label="Excluir">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )).reverse() : (
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
    }
    
    function GoalPanel() {
        const [localGoal, setLocalGoal] = useState<GoalSettings>(() => ({
            type: goal.type,
            amount: goal.amount || '',
        }));

        const handleSave = () => {
            const amountToSave = typeof localGoal.amount === 'number' ? localGoal.amount : 0;
            setGoal({ type: localGoal.type, amount: amountToSave });
            alert('Meta salva com sucesso!');
        };

        const currentMonthProfit = useMemo(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const monthPrefix = `${year}-${month}`;

            return sortedRecords
                .filter(r => r.recordType === 'day' && r.id.startsWith(monthPrefix))
                .reduce((acc, r) => acc + (r as DailyRecord).netProfitUSD, 0);
        }, [sortedRecords]);

        const currentWeekProfit = useMemo(() => {
            const now = new Date();
            const startOfWeek = new Date(now);
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            return sortedRecords
                .filter(r => {
                    if (r.recordType !== 'day') return false;
                    const recordDate = new Date(r.id.replace(/-/g, '/'));
                    return recordDate >= startOfWeek && recordDate <= endOfWeek;
                })
                .reduce((acc, r) => acc + (r as DailyRecord).netProfitUSD, 0);
        }, [sortedRecords]);

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
                            description={`Progresso de lucro em ${now.toLocaleString('pt-BR', { month: 'long' })}`}
                        />
                    </div>
                </div>
            </div>
        )
    }
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

interface SettingsModalProps extends ModalProps {
    settings: TradeSettings;
    onSave: (settings: TradeSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState({
        initialBalance: '',
        entryMode: 'percentage',
        entryValue: '',
        payoutPercentage: '',
        stopGainTrades: '',
        stopLossTrades: '',
    });

    useEffect(() => {
        if (isOpen) {
            setLocalSettings({
                initialBalance: String(settings.initialBalance || ''),
                entryMode: settings.entryMode,
                entryValue: String(settings.entryValue || ''),
                payoutPercentage: String(settings.payoutPercentage || ''),
                stopGainTrades: String(settings.stopGainTrades || ''),
                stopLossTrades: String(settings.stopLossTrades || ''),
            });
        }
    }, [settings, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        const settingsToSave: TradeSettings = {
            initialBalance: parseFloat(localSettings.initialBalance) || 0,
            entryMode: localSettings.entryMode as 'percentage' | 'fixed',
            entryValue: parseFloat(localSettings.entryValue) || 0,
            payoutPercentage: parseFloat(localSettings.payoutPercentage) || 0,
            stopGainTrades: parseInt(localSettings.stopGainTrades, 10) || 0,
            stopLossTrades: parseInt(localSettings.stopLossTrades, 10) || 0,
        };
        onSave(settingsToSave);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Configurações de Trading</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition-colors" aria-label="Fechar">
                        <XMarkIcon className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="initialBalance" className="block text-sm font-medium text-slate-700">Banca Inicial (USD)</label>
                        <input type="number" name="initialBalance" id="initialBalance" value={localSettings.initialBalance} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="entryMode" className="block text-sm font-medium text-slate-700">Modo de Entrada</label>
                        <select name="entryMode" id="entryMode" value={localSettings.entryMode} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            <option value="percentage">Porcentagem da Banca</option>
                            <option value="fixed">Valor Fixo</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="entryValue" className="block text-sm font-medium text-slate-700">
                            Valor da Entrada ({localSettings.entryMode === 'percentage' ? '%' : 'USD'})
                        </label>
                        <input type="number" name="entryValue" id="entryValue" value={localSettings.entryValue} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="payoutPercentage" className="block text-sm font-medium text-slate-700">Payout (%)</label>
                        <input type="number" name="payoutPercentage" id="payoutPercentage" value={localSettings.payoutPercentage} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <hr/>
                    <h3 className="text-lg font-semibold text-slate-800 pt-2">Gerenciamento de Risco</h3>
                    <div>
                        <label htmlFor="stopGainTrades" className="block text-sm font-medium text-slate-700">Stop Gain (nº de vitórias)</label>
                        <input type="number" name="stopGainTrades" id="stopGainTrades" value={localSettings.stopGainTrades} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="stopLossTrades" className="block text-sm font-medium text-slate-700">Stop Loss (nº de derrotas)</label>
                        <input type="number" name="stopLossTrades" id="stopLossTrades" value={localSettings.stopLossTrades} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

interface TransactionModalProps extends ModalProps {
    onSave: (data: { type: 'deposit' | 'withdrawal'; date: Date; amount: number; notes: string }) => void;
    type: 'deposit' | 'withdrawal' | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, type }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setNotes('');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!type || !amount || parseFloat(amount) <= 0) return;
        onSave({
            type,
            amount: parseFloat(amount),
            date: new Date(date.replace(/-/g, '/')),
            notes
        });
        onClose();
    };

    if (!isOpen || !type) return null;

    const isDeposit = type === 'deposit';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">{isDeposit ? 'Adicionar Depósito' : 'Adicionar Saque'}</h2>
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


interface EditRecordModalProps extends ModalProps {
  onSave: (data: { winCount: number, lossCount: number }) => void;
  record: DailyRecord;
}

const EditRecordModal: React.FC<EditRecordModalProps> = ({ isOpen, onClose, onSave, record }) => {
    const [winCount, setWinCount] = useState('');
    const [lossCount, setLossCount] = useState('');

    useEffect(() => {
        if(isOpen) {
            setWinCount(String(record.winCount || ''));
            setLossCount(String(record.lossCount || ''));
        }
    }, [isOpen, record]);
    
    const handleSave = () => {
        onSave({ winCount: parseInt(winCount, 10) || 0, lossCount: parseInt(lossCount, 10) || 0 });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Editar Registro ({record.date})</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition-colors" aria-label="Fechar">
                        <XMarkIcon className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="winCount" className="block text-sm font-medium text-slate-700">Vitórias (WIN)</label>
                        <input type="number" id="winCount" value={winCount} onChange={(e) => setWinCount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                     <div>
                        <label htmlFor="lossCount" className="block text-sm font-medium text-slate-700">Derrotas (LOSS)</label>
                        <input type="number" id="lossCount" value={lossCount} onChange={(e) => setLossCount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
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
