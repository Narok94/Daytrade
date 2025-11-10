export interface Brokerage {
  id: string;
  name: string;
  initialBalance: number;
  entryMode: 'percentage' | 'fixed';
  entryValue: number;
  payoutPercentage: number;
  stopGainTrades: number;
  stopLossTrades: number;
}

export interface TradeBatch {
  wins: number;
  losses: number;
  entryValue: number;
}

export interface DailyRecord {
  recordType: 'day';
  brokerageId: string;
  id: string; // YYYY-MM-DD format
  date: string; // pt-BR format for display
  startBalanceUSD: number;
  trades: TradeBatch[];
  winCount: number;
  lossCount: number;
  netProfitUSD: number;
  endBalanceUSD: number;
}

export interface TransactionRecord {
    recordType: 'deposit' | 'withdrawal';
    brokerageId: string;
    id: string; // Unique ID, e.g., from Date.now()
    date: string; // YYYY-MM-DD, for sorting
    displayDate: string; // pt-BR format for display
    amountUSD: number;
    notes: string;
}

export type AppRecord = DailyRecord | TransactionRecord;