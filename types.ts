export interface Brokerage {
  id: string;
  name: string;
  initialBalance: number;
  currency: 'BRL' | 'USD'; // New field
  entryMode: 'percentage' | 'fixed';
  entryValue: number;
  payoutPercentage: number;
  stopGainTrades: number;
  stopLossTrades: number;
}

export interface Trade {
  id: string;
  result: 'win' | 'loss';
  entryValue: number;
  payoutPercentage: number;
}

export interface DailyRecord {
  recordType: 'day';
  brokerageId: string;
  id: string; // YYYY-MM-DD format
  date: string; // pt-BR format for display
  startBalanceUSD: number; // Keeps the name for compatibility, but holds value in brokerage currency
  trades: Trade[];
  winCount: number;
  lossCount: number;
  netProfitUSD: number; // Value in brokerage currency
  endBalanceUSD: number; // Value in brokerage currency
}

export interface TransactionRecord {
    recordType: 'deposit' | 'withdrawal';
    brokerageId: string;
    id: string; // Unique ID, e.g., from Date.now()
    date: string; // YYYY-MM-DD, for sorting
    displayDate: string; // pt-BR format for display
    amountUSD: number; // Value in brokerage currency
    notes: string;
}

export type AppRecord = DailyRecord | TransactionRecord;

export interface User {
  username: string;
}