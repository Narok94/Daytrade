export interface TradeSettings {
  initialBalance: number;
  entryMode: 'percentage' | 'fixed';
  entryValue: number;
  payoutPercentage: number;
  stopGainTrades: number;
  stopLossTrades: number;
}

export interface DailyRecord {
  recordType: 'day';
  id: string; // YYYY-MM-DD format
  date: string; // pt-BR format for display
  startBalanceUSD: number;
  winCount: number;
  lossCount: number;
  entrySizeUSD: number;
  netProfitUSD: number;
  endBalanceUSD: number;
}

export interface TransactionRecord {
    recordType: 'deposit' | 'withdrawal';
    id: string; // Unique ID, e.g., from Date.now()
    date: string; // YYYY-MM-DD, for sorting
    displayDate: string; // pt-BR format for display
    amountUSD: number;
    notes: string;
}

export type AppRecord = DailyRecord | TransactionRecord;