export interface VietQRParams {
  bankId: string;           // Bank BIN or shortcode: e.g. "MB", "VCB", "TCB", "970422"
  accountNumber: string;
  accountName?: string;
  amount?: number;
  memo?: string;
  template?: 'compact' | 'compact2' | 'qr_only';
}

export interface BankItem {
  code: string;
  name: string;
  bin: string;
}

export const COMMON_VIETNAMESE_BANKS: BankItem[] = [
  { code: 'MB', name: 'MBBank (NHTM CP Quân Đội)', bin: '970422' },
  { code: 'VCB', name: 'Vietcombank (Ngoại Thương Việt Nam)', bin: '970436' },
  { code: 'TCB', name: 'Techcombank (Kỹ Thương Việt Nam)', bin: '970407' },
  { code: 'ACB', name: 'ACB (Á Châu)', bin: '970416' },
  { code: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)', bin: '970432' },
  { code: 'BIDV', name: 'BIDV (Đầu tư và Phát triển)', bin: '970418' },
  { code: 'CTG', name: 'VietinBank (Công Thương Việt Nam)', bin: '970415' },
  { code: 'TPB', name: 'TPBank (Tiên Phong)', bin: '970423' },
  { code: 'OCB', name: 'OCB (Phương Đông)', bin: '970448' },
  { code: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)', bin: '970403' },
  { code: 'VIB', name: 'VIB (Quốc tế)', bin: '970441' },
];

export const resolveBankCode = (input?: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  const matched = COMMON_VIETNAMESE_BANKS.find(
    (b) =>
      b.code.toLowerCase() === trimmed.toLowerCase() ||
      b.bin === trimmed ||
      b.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  return matched ? matched.code : trimmed;
};

export const generateVietQRUrl = (params: VietQRParams): string => {
  const { bankId, accountNumber, accountName, amount, memo, template = 'compact2' } = params;
  if (!bankId || !accountNumber) return '';
  const cleanAccount = accountNumber.replace(/\s+/g, '');
  const cleanBank = resolveBankCode(bankId);
  
  const url = `https://img.vietqr.io/image/${cleanBank}-${cleanAccount}-${template}.png`;
  const searchParams = new URLSearchParams();
  
  if (amount && amount > 0) {
    searchParams.append('amount', Math.round(amount).toString());
  }
  if (memo) {
    searchParams.append('addInfo', memo.trim());
  }
  if (accountName) {
    searchParams.append('accountName', accountName.trim());
  }
  
  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
};
