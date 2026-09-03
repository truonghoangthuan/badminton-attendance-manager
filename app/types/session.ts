export interface SessionMetadata {
  courtNumber?: string;       // e.g. "Sân 3 & 4"
  shuttlecockType?: string;   // e.g. "Victor Lark 5"
  level?: string;             // e.g. "Giao lưu vui vẻ" | "Trung bình" | "Trung bình - Khá" | "Khá - Nâng cao"
}

export interface BankInfo {
  bankName?: string;
  bankCode?: string;          // e.g. "MB", "VCB", "TCB"
  accountNumber?: string;
  accountName?: string;
}

export interface SessionFinancials {
  courtCost: number;
  shuttlecocksUsed: number;
  shuttlecockPrice: number;
  calculatedFeePerPerson: number;
}

export interface Session {
  id: string;
  date: string;
  time: string;
  location: string;
  maxPlayers?: number;
  status: 'open' | 'locked' | 'completed';
  courtNumber?: string;
  shuttlecockType?: string;
  level?: string;
  bankInfo?: BankInfo;
  paymentQR?: string;
  financials?: SessionFinancials;
  createdBy?: string;
  createdAt?: string;
}

export const SKILL_LEVEL_OPTIONS = [
  'Giao lưu vui vẻ',
  'Trung bình',
  'Trung bình - Khá',
  'Khá - Nâng cao',
] as const;
