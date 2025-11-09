
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TradeSettings, DailyRecord, TransactionRecord, AppRecord } from './types';
import { fetchUSDBRLRate } from './services/currencyService';
import { SettingsIcon, PlusIcon, TrendingUpIcon, TrendingDownIcon, DepositIcon, WithdrawalIcon, XMarkIcon } from './components/icons';

interface GoalSettings {
    type: 'weekly' | 'monthly';
    amount: number;
}

// --- Helper Functions for Date Calculations ---
const getRemainingCalendarDaysInMonth = (date: Date): number => {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const remainingDays = lastDayOfMonth - today.getDate() + 1;
    // Return at least 1 to avoid division by zero, even if it's the last day.
    return Math.max(1, remainingDays);
};

const getRemainingWeekdaysInWeek = (date: Date): number => {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // If it's a weekday (Mon-Fri)
        return 6 - dayOfWeek; // 5 for Mon, 4 for Tue, ..., 1 for Fri
    }
    return 0; // For Saturday (6) and Sunday (0), no weekdays remain in the current Mon-Fri week.
};


const App: React.FC = () => {
    const [settings, setSettings] = useState<TradeSettings>(() => {
        const stored = localStorage.getItem('tradeSettings');
        if (stored) return JSON.parse(stored);
        return {
            initialBalance: 0,
            entryMode: 'percentage' as const,
            entryValue: 0,
            payoutPercentage: 0,
            dailyGoalPercentage: 0,
            stopLossPercentage: 0,
            stopGainPercentage: 0,
        };
    });
    const [records, setRecords] = useState<AppRecord[]>(() => {
        const stored = localStorage.getItem('tradeRecords');
        if (stored) return JSON.parse(stored);
        return [];
    });
    const [goal, setGoal] = useState<GoalSettings>(() => {
        const stored = localStorage.getItem('tradeGoal');
        if (stored) return JSON.parse(stored);
        return { type: 'monthly' as const, amount: 500 };
    });
    const [usdToBrlRate, setUsdToBrlRate] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(() => !localStorage.getItem('tradeSettings'));
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'goal'>('dashboard');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [stopLimitOverride, setStopLimitOverride] = useState<Record<string, boolean>>({});
    const [now, setNow] = useState(new Date());

    // --- Effects ---
    useEffect(() => {
        const getRate = async () => {
            setIsLoading(true);
            const rate = await fetchUSDBRLRate();
            setUsdToBrlRate(rate);
            setIsLoading(false);
        };
        getRate();

        const intervalId = setInterval(() => setNow(new Date()), 60000); // Update time every minute
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
                break; // Stop before the target date
            }
            if (record.recordType === 'day') {
                balance = record.endBalanceUSD;
            } else if (record.recordType === 'deposit') {
                balance += record.amountUSD;
            } else { // withdrawal
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
            setRecords(prevRecords => prevRecords.map(r => (r.id === selectedDateString ? updatedRecord : r)));
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
            setRecords(prevRecords => [...prevRecords, newRecord]);
        }
    }, [records, settings, selectedDateString, startBalanceForSelectedDay, selectedDate, formatDateBR]);
    
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

    const { summaryData, balanceChartData } = useMemo(() => {
        let balance = settings.initialBalance;
        let totalDeposits = 0;
        let totalWithdrawals = 0;
        const chartData: { date: string, Saldo: number }[] = [{ date: 'Inicial', Saldo: settings.initialBalance }];

        for (const record of sortedRecords) {
            if (record.recordType === 'day') {
                balance = record.endBalanceUSD;
                chartData.push({ date: record.date, Saldo: parseFloat(balance.toFixed(2)) });
            } else {
                if (record.recordType === 'deposit') {
                    balance += record.amountUSD;
                    totalDeposits += record.amountUSD;
                } else {
                    balance -= record.amountUSD;
                    totalWithdrawals += record.amountUSD;
                }
                chartData.push({ date: record.displayDate, Saldo: parseFloat(balance.toFixed(2)) });
            }
        }
        
        const totalProfitUSD = balance - settings.initialBalance - totalDeposits + totalWithdrawals;
        const totalWins = sortedRecords.filter(r => r.recordType === 'day').reduce((sum, r) => sum + (r as DailyRecord).winCount, 0);
        const totalLosses = sortedRecords.filter(r => r.recordType === 'day').reduce((sum, r) => sum + (r as DailyRecord).lossCount, 0);
        const totalTrades = totalWins + totalLosses;
        const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
        
        const tradeDayRecords = sortedRecords.filter(r => r.recordType === 'day') as DailyRecord[];
        
        const todayRecord = tradeDayRecords.find(r => r.id === formatDateISO(now));
        const todayNetProfitUSD = todayRecord?.netProfitUSD ?? 0;

        return {
            summaryData: {
                currentBalanceUSD: balance,
                totalProfitUSD,
                winRate,
                todayNetProfitUSD,
                tradeDayRecords
            },
            balanceChartData: chartData
        };
    }, [sortedRecords, settings.initialBalance, formatDateISO, now]);

    const { achievedAmount, remainingDays, remainingGoal, dailyGoalAmountUSD } = useMemo(() => {
        const currentDate = new Date(now);
        currentDate.setHours(0,0,0,0);
        let startDate: Date;
        let daysCalculator: (date: Date) => number;

        if (goal.type === 'weekly') {
            const dayOfWeek = currentDate.getDay();
            const firstDayOfWeek = new Date(currentDate);
            firstDayOfWeek.setDate(currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); 
            startDate = firstDayOfWeek;
            daysCalculator = getRemainingWeekdaysInWeek;
        } else { // monthly
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            daysCalculator = getRemainingCalendarDaysInMonth;
        }

        const relevantRecords = summaryData.tradeDayRecords.filter(record => new Date(record.id + 'T00:00:00') >= startDate);
        const currentAchieved = relevantRecords.reduce((sum, record) => sum + record.netProfitUSD, 0);
        const remaining = daysCalculator(currentDate);
        const goalRemaining = goal.amount - currentAchieved;

        const dailyGoal = remaining > 0 && goalRemaining > 0 ? goalRemaining / remaining : 0;

        return { achievedAmount: currentAchieved, remainingDays: remaining, remainingGoal: goalRemaining, dailyGoalAmountUSD: dailyGoal };
    }, [goal.type, goal.amount, summaryData.tradeDayRecords, now]);

    const selectedDayRecord = useMemo(() => sortedRecords.find(r => r.recordType ==='day' && r.id === selectedDateString) as DailyRecord | undefined, [sortedRecords, selectedDateString]);

    const stopStatus = useMemo(() => {
        if (!selectedDayRecord) return { breached: false };
        const { netProfitUSD } = selectedDayRecord;
        const stopLossLimit = startBalanceForSelectedDay * (settings.stopLossPercentage / 100);
        const stopGainLimit = startBalanceForSelectedDay * (settings.stopGainPercentage / 100);
        if (netProfitUSD <= -stopLossLimit) return { breached: true, type: 'loss' as const, limit: stopLossLimit };
        if (netProfitUSD >= stopGainLimit) return { breached: true, type: 'gain' as const, limit: stopGainLimit };
        return { breached: false };
    }, [selectedDayRecord, startBalanceForSelectedDay, settings]);

    const formatCurrency = (value: number, currency: 'USD' | 'BRL' = 'USD') => new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', { style: 'currency', currency }).format(value);
    const convertToBRL = (usdValue: number) => usdValue * (usdToBrlRate || 0);
    
    const handleSettingsSave = (newSettings: TradeSettings) => {
        setSettings(newSettings);
        setRecords(recalculateBalances(records)); // Recalculate if settings change
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
    }

    const isToday = selectedDateString === formatDateISO(now);

    return (
        <div className="flex flex-col min-h-screen font-sans relative overflow-hidden">
            {/* Watermark */}
            <div
                className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none"
                aria-hidden="true"
            >
                <span className="text-[20vw] font-bold text-slate-200 transform -rotate-12 select-none">
                    Teste
                </span>
            </div>
            
            <div className="flex-grow p-4 sm:p-6 lg:p-8">
                <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Desempenho Daytrade</h1>
                        <p className="text-sm text-slate-500">Aplicativo em teste</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setTransactionType('deposit'); setIsTransactionModalOpen(true); }} className="px-3 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors">Depositar</button>
                        <button onClick={() => { setTransactionType('withdrawal'); setIsTransactionModalOpen(true); }} className="px-3 py-2 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-md transition-colors">Retirar</button>
                        <input 
                            type="date"
                            value={selectedDateString}
                            onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                            className="bg-white border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                            <SettingsIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </header>

                <nav className="mb-8">
                    <div className="flex border-b border-slate-200">
                        <TabButton name="Painel" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                        <TabButton name="Análise" active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
                        <TabButton name="Meta" active={activeTab === 'goal'} onClick={() => setActiveTab('goal')} />
                    </div>
                </nav>

                <main>
                    {activeTab === 'dashboard' && (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm">
                                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Registro de {isToday ? 'Hoje' : selectedDayRecord?.date || formatDateBR(selectedDate)}</h2>
                                    <EntryForm 
                                        onAddRecord={addRecord} 
                                        disabled={!isToday}
                                        isToday={isToday}
                                        stopStatus={stopStatus}
                                        isOverridden={stopLimitOverride[selectedDateString] || false}
                                        onOverride={() => setStopLimitOverride(prev => ({...prev, [selectedDateString]: true}))}
                                        existingRecord={selectedDayRecord}
                                    />
                                </div>
                                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm h-96">
                                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Crescimento do Saldo</h2>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={balanceChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                                            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} domain={['dataMin', 'dataMax']}/>
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
                                            <Legend />
                                            <Line type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 8, stroke: '#4f46e5' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold mb-4 text-slate-800">Histórico Geral</h2>
                                <HistoryList records={sortedRecords} formatCurrency={formatCurrency} convertToBRL={convertToBRL} />
                            </div>
                        </>
                    )}
                    {activeTab === 'analysis' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <SummaryCard title="Saldo Atual (USD)" value={formatCurrency(summaryData.currentBalanceUSD, 'USD')} trend={summaryData.currentBalanceUSD >= settings.initialBalance ? 'up' : 'down'} />
                            <SummaryCard title="Saldo Atual (BRL)" value={formatCurrency(convertToBRL(summaryData.currentBalanceUSD), 'BRL')} />
                            <SummaryCard title="Lucro Total (USD)" value={formatCurrency(summaryData.totalProfitUSD, 'USD')} trend={summaryData.totalProfitUSD >= 0 ? 'up' : 'down'} />
                            <SummaryCard title="Taxa de Acerto" value={`${summaryData.winRate.toFixed(1)}%`} />
                            <SummaryCard title="Cotação USD/BRL" value={usdToBrlRate?.toFixed(3) || 'N/A'} />
                            <SummaryCard title="Meta do Dia" value={`${formatCurrency(summaryData.todayNetProfitUSD)} / ${formatCurrency(dailyGoalAmountUSD)}`} trend={summaryData.todayNetProfitUSD >= dailyGoalAmountUSD && dailyGoalAmountUSD > 0 ? 'up' : undefined} />
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <DailyPerformanceChart records={summaryData.tradeDayRecords} />
                                <WinLossRatioChart records={summaryData.tradeDayRecords} />
                            </div>
                        </div>
                    )}
                    {activeTab === 'goal' && (
                        <GoalTracker 
                            goal={goal}
                            onSave={setGoal}
                            achievedAmount={achievedAmount}
                            formatCurrency={(val) => formatCurrency(val, 'USD')}
                        />
                    )}
                </main>
            </div>
            
            <footer className="text-center text-sm text-slate-500 py-4">
                Criado por Henrique Costa 2025
            </footer>

            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onSave={handleSettingsSave}
            />
             <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSave={handleSaveTransaction}
                type={transactionType}
                now={now}
            />
        </div>
    );
};

// --- Sub-components ---

const TabButton: React.FC<{name: string, active: boolean, onClick: () => void}> = ({ name, active, onClick }) => (
    <button onClick={onClick} className={`py-3 px-4 text-sm font-medium transition-colors focus:outline-none ${active ? 'border-b-2 border-indigo-500 text-indigo-600' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'}`}>
        {name}
    </button>
);

const SummaryCard: React.FC<{ title: string; value: string; trend?: 'up' | 'down' }> = ({ title, value, trend }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <div className="flex items-center justify-between mt-2">
            <p className="text-xl md:text-2xl font-semibold text-slate-900">{value}</p>
            {trend === 'up' && <TrendingUpIcon className="w-5 h-5 text-emerald-500" />}
            {trend === 'down' && <TrendingDownIcon className="w-5 h-5 text-rose-500" />}
        </div>
    </div>
);

const EntryForm: React.FC<{ onAddRecord: (win: number, loss: number) => void; disabled: boolean; stopStatus: { breached: boolean; type?: any }; isOverridden: boolean; onOverride: () => void; existingRecord?: DailyRecord; isToday: boolean; }> = ({ onAddRecord, disabled, stopStatus, isOverridden, onOverride, existingRecord, isToday }) => {
    const [wins, setWins] = useState('');
    const [losses, setLosses] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const winCount = parseInt(wins, 10) || 0;
        const lossCount = parseInt(losses, 10) || 0;
        if (winCount > 0 || lossCount > 0) {
            onAddRecord(winCount, lossCount);
            setWins('');
            setLosses('');
        }
    };
    if (!isToday) {
        if (existingRecord) {
            return (
                <div className="space-y-4">
                    <div><p className="text-sm text-slate-500">Ganhos</p><p className="text-lg font-semibold">{existingRecord.winCount}</p></div>
                    <div><p className="text-sm text-slate-500">Perdas</p><p className="text-lg font-semibold">{existingRecord.lossCount}</p></div>
                    <div><p className="text-sm text-slate-500">Resultado do Dia</p><p className={`text-lg font-semibold ${existingRecord.netProfitUSD >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(existingRecord.netProfitUSD)}</p></div>
                    <p className="text-xs text-slate-400 mt-2 text-center">Os registros de dias anteriores não podem ser editados.</p>
                </div>
            );
        }
        return <div className="text-center py-8"><p className="text-slate-500">Não há registros para esta data.</p></div>
    }
    return (
        <div className="space-y-6">
            {existingRecord && (
                <div className="space-y-2 pb-4 border-b border-slate-200">
                     <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-xs text-slate-500">Ganhos Hoje</p><p className="text-lg font-semibold text-emerald-600">{existingRecord.winCount}</p></div>
                        <div><p className="text-xs text-slate-500">Perdas Hoje</p><p className="text-lg font-semibold text-rose-600">{existingRecord.lossCount}</p></div>
                        <div><p className="text-xs text-slate-500">Resultado</p><p className={`text-lg font-semibold ${existingRecord.netProfitUSD >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(existingRecord.netProfitUSD)}</p></div>
                    </div>
                </div>
            )}
            {stopStatus.breached && !isOverridden ? (
                <div className="text-center p-4 rounded-lg bg-rose-50 border border-rose-200">
                    <h3 className="font-semibold text-lg mb-2 text-rose-800">{stopStatus.type === 'gain' ? 'Stop Gain Atingido!' : 'Stop Loss Atingido!'}</h3>
                    <p className="text-sm text-rose-700 mb-4">{stopStatus.type === 'gain' ? 'Você atingiu sua meta de ganhos do dia. Parabéns!' : 'Você atingiu seu limite de perdas do dia. É hora de parar.'}</p>
                    <button onClick={onOverride} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm">Continuar (Não Recomendado)</button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label htmlFor="wins" className="block text-sm font-medium text-slate-600 mb-1">Adicionar Ganhos (Wins)</label><input id="wins" type="number" value={wins} onChange={(e) => setWins(e.target.value)} onFocus={(e) => e.target.select()} min="0" className="w-full bg-white border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" disabled={disabled}/></div>
                    <div><label htmlFor="losses" className="block text-sm font-medium text-slate-600 mb-1">Adicionar Perdas (Losses)</label><input id="losses" type="number" value={losses} onChange={(e) => setLosses(e.target.value)} onFocus={(e) => e.target.select()} min="0" className="w-full bg-white border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" disabled={disabled}/></div>
                    <button type="submit" disabled={disabled} className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors"><PlusIcon className="w-5 h-5"/>Adicionar Operação</button>
                    {disabled && <p className="text-xs text-slate-400 mt-2 text-center">Você só pode adicionar registros para o dia de hoje.</p>}
                </form>
            )}
        </div>
    );
};

const HistoryList: React.FC<{ records: AppRecord[], formatCurrency: (v: number, c?: 'USD' | 'BRL') => string, convertToBRL: (usd: number) => number }> = ({ records, formatCurrency, convertToBRL }) => {
    const sorted = [...records].sort((a, b) => (b.recordType === 'day' ? b.id : b.date).localeCompare(a.recordType === 'day' ? a.id : a.date));
    if (sorted.length === 0) return <p className="text-center text-slate-500 py-4">Nenhum registro encontrado.</p>;

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm text-left text-slate-700">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-4 py-3">Data</th>
                            <th scope="col" className="px-4 py-3">Tipo</th>
                            <th scope="col" className="px-4 py-3">Detalhes</th>
                            <th scope="col" className="px-4 py-3">Valor (USD)</th>
                            <th scope="col" className="px-4 py-3">Valor (BRL)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((record) => (
                          <tr key={record.id} className="bg-white border-b hover:bg-slate-50">
                            <td className="px-4 py-2 font-medium">
                                {record.recordType === 'day' ? record.date : record.displayDate}
                            </td>
                            <td className="px-4 py-2">
                                {record.recordType === 'day' && <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">Dia de Trade</span>}
                                {record.recordType === 'deposit' && <span className="flex items-center text-xs font-medium mr-2 px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800"><DepositIcon className="w-3 h-3 mr-1"/>Depósito</span>}
                                {record.recordType === 'withdrawal' && <span className="flex items-center text-xs font-medium mr-2 px-2.5 py-0.5 rounded bg-rose-100 text-rose-800"><WithdrawalIcon className="w-3 h-3 mr-1"/>Retirada</span>}
                            </td>
                            <td className="px-4 py-2">
                                {record.recordType === 'day' ? (
                                    <span>
                                        <span className="text-emerald-600">{(record as DailyRecord).winCount} W</span> / <span className="text-rose-600">{(record as DailyRecord).lossCount} L</span>
                                    </span>
                                ) : (
                                    <span className="text-slate-500 italic">{(record as TransactionRecord).notes || 'Sem notas'}</span>
                                )}
                            </td>
                            <td className={`px-4 py-2 font-semibold ${record.recordType === 'day' ? ((record as DailyRecord).netProfitUSD >= 0 ? 'text-emerald-600' : 'text-rose-600') : (record.recordType === 'deposit' ? 'text-emerald-600' : 'text-rose-600')}`}>
                                {record.recordType === 'day' ? formatCurrency((record as DailyRecord).netProfitUSD) : (record.recordType === 'deposit' ? `+${formatCurrency(record.amountUSD)}` : `-${formatCurrency(record.amountUSD)}`)}
                            </td>
                            <td className={`px-4 py-2 ${record.recordType === 'day' ? ((record as DailyRecord).netProfitUSD >= 0 ? 'text-emerald-500' : 'text-rose-500') : (record.recordType === 'deposit' ? 'text-emerald-500' : 'text-rose-500')}`}>
                                {record.recordType === 'day' ? formatCurrency(convertToBRL((record as DailyRecord).netProfitUSD), 'BRL') : (record.recordType === 'deposit' ? `+${formatCurrency(convertToBRL(record.amountUSD), 'BRL')}` : `-${formatCurrency(convertToBRL(record.amountUSD), 'BRL')}`)}
                            </td>
                           </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="md:hidden space-y-3">
                 {sorted.map((record) => (
                    <div key={record.id} className="bg-white p-4 rounded-lg shadow-sm border">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold">{record.recordType === 'day' ? record.date : record.displayDate}</p>
                                <div className="mt-1">
                                {record.recordType === 'day' && <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">Dia de Trade</span>}
                                {record.recordType === 'deposit' && <span className="flex items-center text-xs font-medium mr-2 px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800"><DepositIcon className="w-3 h-3 mr-1"/>Depósito</span>}
                                {record.recordType === 'withdrawal' && <span className="flex items-center text-xs font-medium mr-2 px-2.5 py-0.5 rounded bg-rose-100 text-rose-800"><WithdrawalIcon className="w-3 h-3 mr-1"/>Retirada</span>}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-semibold ${record.recordType === 'day' ? ((record as DailyRecord).netProfitUSD >= 0 ? 'text-emerald-600' : 'text-rose-600') : (record.recordType === 'deposit' ? 'text-emerald-600' : 'text-rose-600')}`}>
                                    {record.recordType === 'day' ? formatCurrency((record as DailyRecord).netProfitUSD) : (record.recordType === 'deposit' ? `+${formatCurrency(record.amountUSD)}` : `-${formatCurrency(record.amountUSD)}`)}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {record.recordType === 'day' ? formatCurrency(convertToBRL((record as DailyRecord).netProfitUSD), 'BRL') : (record.recordType === 'deposit' ? `+${formatCurrency(convertToBRL(record.amountUSD), 'BRL')}` : `-${formatCurrency(convertToBRL(record.amountUSD), 'BRL')}`)}
                                </p>
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                             {record.recordType === 'day' ? (
                                <span>
                                    <span className="text-emerald-600">{(record as DailyRecord).winCount} W</span> / <span className="text-rose-600">{(record as DailyRecord).lossCount} L</span>
                                </span>
                            ) : (
                                <span className="italic">{(record as TransactionRecord).notes || 'Sem notas'}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DailyPerformanceChart: React.FC<{ records: DailyRecord[] }> = ({ records }) => {
    const data = records.map(r => ({ date: r.date, Lucro: parseFloat(r.netProfitUSD.toFixed(2)) }));
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm h-80">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Lucro Diário (USD)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(value) => `$${value}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="Lucro">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.Lucro >= 0 ? '#10b981' : '#f43f5e'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const WinLossRatioChart: React.FC<{ records: DailyRecord[] }> = ({ records }) => {
    const totalWins = records.reduce((sum, r) => sum + r.winCount, 0);
    const totalLosses = records.reduce((sum, r) => sum + r.lossCount, 0);
    const data = [
        { name: 'Ganhos', value: totalWins },
        { name: 'Perdas', value: totalLosses },
    ];
    const COLORS = ['#10b981', '#f43f5e'];
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm h-80">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Proporção Ganhos/Perdas</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

const GoalTracker: React.FC<{
    goal: GoalSettings;
    onSave: (goal: GoalSettings) => void;
    achievedAmount: number;
    formatCurrency: (val: number) => string;
}> = ({ goal, onSave, achievedAmount, formatCurrency }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formState, setFormState] = useState(goal);

    useEffect(() => {
        setFormState(goal);
    }, [goal]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formState);
        setIsEditing(false);
    };

    const percentage = goal.amount > 0 ? (achievedAmount / goal.amount) * 100 : 0;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Meta de Lucro {goal.type === 'weekly' ? 'Semanal' : 'Mensal'}</h2>
            <div className="space-y-4">
                <div className="w-full bg-slate-200 rounded-full h-4">
                    <div className="bg-emerald-500 h-4 rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-sm font-medium">
                    <span>{formatCurrency(achievedAmount)}</span>
                    <span>{formatCurrency(goal.amount)}</span>
                </div>
                <p className="text-center text-slate-600">{percentage.toFixed(1)}% da meta atingida.</p>
            </div>
            {isEditing ? (
                <form onSubmit={handleSave} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="goalType" className="block text-sm font-medium text-slate-700">Tipo de Meta</label>
                        <select
                            id="goalType"
                            value={formState.type}
                            onChange={(e) => setFormState({ ...formState, type: e.target.value as 'weekly' | 'monthly' })}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="goalAmount" className="block text-sm font-medium text-slate-700">Valor da Meta (USD)</label>
                        <input
                            type="number"
                            id="goalAmount"
                            value={formState.amount}
                            min="0"
                            onChange={(e) => setFormState({ ...formState, amount: Number(e.target.value) })}
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm bg-white border-slate-300 rounded-md"
                            placeholder="200"
                        />
                    </div>
                    <div className="flex gap-4">
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors">Salvar</button>
                        <button type="button" onClick={() => setIsEditing(false)} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded transition-colors">Cancelar</button>
                    </div>
                </form>
            ) : (
                <button onClick={() => setIsEditing(true)} className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded transition-colors">
                    Editar Meta
                </button>
            )}
        </div>
    );
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; settings: TradeSettings; onSave: (s: TradeSettings) => void; }> = ({ isOpen, onClose, settings, onSave }) => {
    const [formState, setFormState] = useState(settings);

    useEffect(() => {
        setFormState(settings);
    }, [settings, isOpen]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formState);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Configurações</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Saldo Inicial (USD)</label>
                        <input type="number" value={formState.initialBalance} onChange={e => setFormState({...formState, initialBalance: Number(e.target.value)})} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Modo de Entrada</label>
                        <select 
                            value={formState.entryMode} 
                            onChange={e => setFormState({...formState, entryMode: e.target.value as 'percentage' | 'fixed'})}
                            className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        >
                            <option value="percentage">Porcentagem da banca</option>
                            <option value="fixed">Valor fixo</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Valor da Entrada ({formState.entryMode === 'percentage' ? '%' : 'USD'})
                        </label>
                        <input 
                            type="number" 
                            value={formState.entryValue} 
                            onChange={e => setFormState({...formState, entryValue: Number(e.target.value)})} 
                            className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Stop Gain Diário (%)</label>
                        <input type="number" value={formState.stopGainPercentage} onChange={e => setFormState({...formState, stopGainPercentage: Number(e.target.value)})} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Stop Loss Diário (%)</label>
                        <input type="number" value={formState.stopLossPercentage} onChange={e => setFormState({...formState, stopLossPercentage: Number(e.target.value)})} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Payout (%)</label>
                        <input type="number" value={formState.payoutPercentage} onChange={e => setFormState({...formState, payoutPercentage: Number(e.target.value)})} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm"/>
                    </div>
                    <div className="flex gap-4 pt-4">
                         <button type="button" onClick={onClose} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded transition-colors">Cancelar</button>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TransactionModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (d: { type: 'deposit' | 'withdrawal'; date: Date; amount: number; notes: string; }) => void; type: 'deposit' | 'withdrawal' | null; now: Date; }> = ({ isOpen, onClose, onSave, type, now }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(now.toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!type) return;
        onSave({ type, amount: Number(amount), date: new Date(date + 'T00:00:00'), notes });
        onClose();
        setAmount('');
        setNotes('');
    };

    useEffect(() => {
        if (isOpen) {
            setDate(now.toISOString().split('T')[0]);
            setAmount('');
            setNotes('');
        }
    }, [isOpen, now]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{type === 'deposit' ? 'Novo Depósito' : 'Nova Retirada'}</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Valor (USD)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" step="0.01" required className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Data</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Notas (Opcional)</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm"/>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded transition-colors">Cancelar</button>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default App;
