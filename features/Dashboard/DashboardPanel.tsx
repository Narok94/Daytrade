import React, { useState } from 'react';
import { 
  PieChartIcon, TrendingUpIcon, TargetIcon, TrophyIcon, 
  CalculatorIcon, ArrowPathIcon, ListBulletIcon 
} from '../../components/icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { TradingChart } from './TradingChart';

const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const DashboardPanel: React.FC<any> = ({ 
  activeBrokerage, 
  customEntryValue, 
  setCustomEntryValue, 
  customPayout, 
  setCustomPayout, 
  addRecord, 
  deleteTrade, 
  addTransaction, 
  deleteTransaction, 
  selectedDateString, 
  setSelectedDate, 
  dailyRecordForSelectedDay, 
  transactionsForSelectedDay, 
  startBalanceForSelectedDay, 
  currentBalanceForDashboard, 
  theme,
  isDarkMode, 
  dailyGoalTarget 
}) => {
    const [quantity, setQuantity] = useState('1');
    const [transAmount, setTransAmount] = useState('');
    const [transType, setTransType] = useState<'deposit' | 'withdrawal'>('deposit');
    const currencySymbol = activeBrokerage.currency === 'USD' ? '$' : 'R$';
    
    const handleQuickAdd = (type: 'win' | 'loss') => {
         const entryValue = parseFloat(customEntryValue) || 0;
         const payout = parseFloat(customPayout) || 0;
         const qty = parseInt(quantity) || 1;
         if (type === 'win') addRecord(qty, 0, entryValue, payout);
         else addRecord(0, qty, entryValue, payout);
         setQuantity('1');
    };

    const handleTransaction = () => {
        const amount = parseFloat(transAmount) || 0;
        if (amount > 0) {
            addTransaction(transType, amount);
            setTransAmount('');
        }
    };

    const currentProfit = dailyRecordForSelectedDay?.netProfitUSD ?? 0;
    const currentBalance = currentBalanceForDashboard;
    const winRate = ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0)) > 0 
        ? (((dailyRecordForSelectedDay?.winCount || 0) / ((dailyRecordForSelectedDay?.winCount || 0) + (dailyRecordForSelectedDay?.lossCount || 0))) * 100).toFixed(1) : '0.0';
    
    const dailyGoalPercent = dailyGoalTarget > 0 ? (currentProfit / dailyGoalTarget) * 100 : 0;

    const entryValueNum = parseFloat(customEntryValue) || 0;
    const payoutNum = parseFloat(customPayout) || 0;
    const qtyNum = parseInt(quantity) || 1;
    const estimatedProfit = entryValueNum * (payoutNum / 100) * qtyNum;
    const estimatedLoss = entryValueNum * qtyNum;

    const stopWinReached = activeBrokerage.stopGainTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.winCount >= activeBrokerage.stopGainTrades;
    const stopLossReached = activeBrokerage.stopLossTrades > 0 && dailyRecordForSelectedDay && dailyRecordForSelectedDay.lossCount >= activeBrokerage.stopLossTrades;

    const kpis = [
        { label: 'Banca Atual', val: `${currencySymbol} ${formatMoney(currentBalance)}`, icon: <PieChartIcon className="w-5 h-5 text-blue-500" />, color: theme.accent },
        { label: 'Lucro Diário', val: `${currentProfit >= 0 ? '+' : ''}${currencySymbol} ${formatMoney(currentProfit)}`, icon: <TrendingUpIcon className="w-5 h-5 text-emerald-500" />, color: currentProfit >= 0 ? theme.success : theme.danger },
        { label: 'Meta Diária', val: `${currencySymbol}${formatMoney(dailyGoalTarget)}`, subVal: `${Math.min(100, dailyGoalPercent).toFixed(0)}% Alcançado`, icon: <TargetIcon className="w-5 h-5 text-blue-500" />, color: dailyGoalPercent >= 100 ? theme.success : theme.accent },
        { label: 'Win Rate', val: `${winRate}%`, icon: <TrophyIcon className="w-5 h-5 text-amber-500" />, color: theme.text },
    ];

    return (
        <div className="p-6 md:p-12 space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                <div>
                  <h2 className={`text-4xl font-black tracking-tight ${theme.text}`}>Dashboard</h2>
                  <p className={`${theme.textMuted} text-sm font-medium mt-1`}>Gestão operacional em tempo real.</p>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="date" 
                    value={selectedDateString} 
                    onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))} 
                    className={`h-12 px-6 rounded-xl border font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all ${theme.input} ${theme.card}`} 
                  />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <Card key={i} className="flex flex-col justify-between p-8">
                        <div className="flex justify-between items-start mb-6">
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{kpi.label}</p>
                          <div className="p-2.5 rounded-xl bg-slate-100/50">
                            {kpi.icon}
                          </div>
                        </div>
                        <p className={`text-2xl md:text-3xl font-black ${kpi.color} truncate`}>{kpi.val}</p>
                        {kpi.subVal && (
                          <div className="mt-4">
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${dailyGoalPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                style={{ width: `${Math.min(100, dailyGoalPercent)}%` }} 
                              />
                            </div>
                            <p className="text-[10px] font-bold mt-3 text-slate-400 uppercase tracking-wider">{kpi.subVal}</p>
                          </div>
                        )}
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <div className="space-y-10">
                    <TradingChart isDarkMode={isDarkMode} theme={theme} />
                    <Card title="Nova Operação" subtitle="Calculadora de Risco" icon={<CalculatorIcon className="w-5 h-5 text-blue-500" />}>
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <Input label="Valor" type="number" value={customEntryValue} onChange={e => setCustomEntryValue(e.target.value)} />
                                <Input label="Payout %" type="number" value={customPayout} onChange={e => setCustomPayout(e.target.value)} />
                                <Input label="Qtd" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" />
                            </div>
                            
                            <div className={`flex justify-between items-center px-6 py-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="text-center flex-1 border-r border-slate-200/60">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Risco Total</p>
                                  <p className={`text-lg font-black ${theme.danger}`}>{currencySymbol} {formatMoney(estimatedLoss)}</p>
                                </div>
                                <div className="text-center flex-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Retorno Est.</p>
                                  <p className={`text-lg font-black ${theme.success}`}>{currencySymbol} {formatMoney(estimatedProfit)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-2">
                                <Button 
                                  variant="success" 
                                  size="lg" 
                                  onClick={() => handleQuickAdd('win')} 
                                  disabled={stopWinReached || stopLossReached}
                                  className="h-20 text-xl shadow-xl shadow-emerald-500/20"
                                >
                                  CALL ↑
                                </Button>
                                <Button 
                                  variant="danger" 
                                  size="lg" 
                                  onClick={() => handleQuickAdd('loss')} 
                                  disabled={stopWinReached || stopLossReached}
                                  className="h-20 text-xl shadow-xl shadow-rose-500/20"
                                >
                                  PUT ↓
                                </Button>
                            </div>
                            
                            {(stopWinReached || stopLossReached) && (
                              <div className={`p-6 rounded-2xl border text-center animate-pulse ${stopWinReached ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                <p className="text-[11px] font-bold uppercase tracking-widest">
                                  {stopWinReached ? 'Meta Batida! Stop Gain atingido.' : 'Stop Loss atingido! Preserve seu capital.'}
                                </p>
                              </div>
                            )}
                        </div>
                    </Card>

                    <Card title="Movimentação" subtitle="Depósitos e Saques" icon={<ArrowPathIcon className="w-5 h-5 text-blue-500" />}>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <Select label="Tipo" value={transType} onChange={e => setTransType(e.target.value as any)}>
                                    <option value="deposit">Depósito</option>
                                    <option value="withdrawal">Saque</option>
                                </Select>
                                <Input label="Valor" type="number" value={transAmount} onChange={e => setTransAmount(e.target.value)} placeholder="0.00" />
                            </div>
                            <Button variant="primary" className="w-full h-14 shadow-lg shadow-blue-500/20" onClick={handleTransaction}>Confirmar Lançamento</Button>
                        </div>
                    </Card>
                </div>

                <Card title="Histórico do Dia" subtitle="Operações recentes" icon={<ListBulletIcon className="w-5 h-5 text-slate-400" />} className="flex flex-col">
                    <div className="flex-1 overflow-y-auto max-h-[800px] pr-2 no-scrollbar">
                        <div className="space-y-4">
                            {transactionsForSelectedDay.length === 0 && (!dailyRecordForSelectedDay || dailyRecordForSelectedDay.trades.length === 0) && (
                              <div className="py-32 text-center opacity-20">
                                <ListBulletIcon className="w-16 h-16 mx-auto mb-6" />
                                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma atividade hoje</p>
                              </div>
                            )}

                            {/* Transactions */}
                            {transactionsForSelectedDay.map((trans: any) => (
                                <div key={trans.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.02] ${theme.card}`}>
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${trans.recordType === 'deposit' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                          {trans.recordType === 'deposit' ? '↓' : '↑'}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-slate-400 leading-none mb-1.5">{new Date(trans.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            <p className={`text-base font-bold ${theme.text}`}>{trans.recordType === 'deposit' ? 'Depósito' : 'Saque'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-base font-black ${trans.recordType === 'deposit' ? 'text-blue-600' : 'text-orange-600'}`}>
                                            {trans.recordType === 'deposit' ? '+' : '-'}{currencySymbol} {formatMoney(trans.amountUSD)}
                                        </p>
                                        <button onClick={() => deleteTransaction(trans.id)} className="text-[10px] font-bold text-rose-500/40 hover:text-rose-500 uppercase tracking-widest mt-1.5 transition-colors">Excluir</button>
                                    </div>
                                </div>
                            ))}

                            {/* Trades */}
                            {dailyRecordForSelectedDay?.trades?.length ? (
                                [...dailyRecordForSelectedDay.trades].reverse().map((trade) => {
                                    const tradeProfit = trade.result === 'win' ? (trade.entryValue * (trade.payoutPercentage / 100)) : -trade.entryValue;
                                    return (
                                        <div key={trade.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all hover:scale-[1.02] ${theme.card}`}>
                                            <div className="flex items-center gap-5">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${trade.result === 'win' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                  {trade.result === 'win' ? 'W' : 'L'}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase text-slate-400 leading-none mb-1.5">{new Date(trade.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    <p className={`text-base font-bold ${theme.text}`}>{currencySymbol} {formatMoney(trade.entryValue)} • {trade.payoutPercentage}%</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-base font-black ${trade.result === 'win' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {trade.result === 'win' ? '+' : ''}{currencySymbol} {formatMoney(tradeProfit)}
                                                </p>
                                                <button onClick={() => deleteTrade(trade.id, dailyRecordForSelectedDay.id)} className="text-[10px] font-bold text-rose-500/40 hover:text-rose-500 uppercase tracking-widest mt-1.5 transition-colors">Excluir</button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : null}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
