
export interface Brokerage {
  id: string;
  name: string;
  initialBalance: number;
  entryMode: 'percentage' | 'fixed';
  entryValue: number;
  payoutPercentage: number;
  stopGainTrades: number;
  stopLossTrades: number;
  currency: 'BRL' | 'USD';
  dailyGoalMode: 'percentage' | 'fixed';
  dailyGoalValue: number;
}

export interface Trade {
  id: string;
  timestamp?: number;
  result: 'win' | 'loss';
  entryValue: number;
  payoutPercentage: number;
  isSoros?: boolean;
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
    id: string;
    date: string;
    displayDate: string;
    amountUSD: number;
    notes: string;
    timestamp?: number;
    runningBalanceUSD?: number;
}

export interface Goal {
  id: string;
  brokerageId: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';
  targetAmount: number;
  deadline?: string; // YYYY-MM-DD
  createdAt: number;
}

export interface AIAnalysisResult {
    asset: string;
    recommendation: 'CALL' | 'PUT' | 'AGUARDAR';
    confidence: number;
    reasoning: string;
    expiration: string;
    trend: string;
    precision: string;
    volume: string;
    timeframe: string;
    entryTime: string;
    candleRemainingSeconds: number;
}

export type AppRecord = DailyRecord | TransactionRecord;

export interface User {
  id: number;
  username: string;
  isAdmin?: boolean;
  isPaused?: boolean;
  lastLoginAt?: string;
}
