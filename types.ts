export interface Brokerage {
  id: string;
  name: string;
  initialBalance: number;
  entryMode: 'percentage' | 'fixed';
  entryValue: number;
  payoutPercentage: number;
  stopGainTrades: number;
  stopLossTrades: number;
  currency: 'BRL' | 'USD'; // New field
  apiToken?: string;
}

export interface Trade {
  id: string;
  timestamp?: number; // Added for specific time tracking
  result: 'win' | 'loss';
  entryValue: number;
  payoutPercentage: number;
}

export interface DailyRecord {
  recordType: 'day';
  brokerageId: string;
  id: string; // YYYY-MM-DD format
  date: string; // pt-BR format for display
  startBalanceUSD: number;
  trades: Trade[];
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
    timestamp?: number; // Added for specific time tracking
}

export type AppRecord = DailyRecord | TransactionRecord;

export interface User {
  username: string;
}