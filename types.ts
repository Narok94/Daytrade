
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
}

export interface Trade {
  id: string;
  timestamp?: number;
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
    id: string;
    date: string;
    displayDate: string;
    amountUSD: number;
    notes: string;
    timestamp?: number;
}

export interface Goal {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'annual';
  targetAmount: number;
  createdAt: number;
}

export interface AISignalFeedback {
    id: string;
    recommendation: string;
    result: 'win' | 'loss' | 'pending';
    patterns: string[];
    timestamp: number;
}

export interface AIAnalysisResult {
    id: string;
    recommendation: 'CALL' | 'PUT' | 'WAIT';
    confidence: number;
    patterns: string[];
    indicatorAnalysis: string;
    reasoning: string;
    supportLevel: string;
    resistanceLevel: string;
    entryTime: string;
}

export interface UserPermissions {
    ai_access: boolean;
    compound_access: boolean;
    goals_access: boolean;
    reports_access: boolean;
}

export interface RegisteredUser {
    id: number;
    username: string;
    is_admin: boolean;
    permissions: UserPermissions;
    created_at: string;
}

export type AppRecord = DailyRecord | TransactionRecord;

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  permissions: UserPermissions;
}
