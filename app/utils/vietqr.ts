export interface VietQRParams {
  bankId: string;           // Bank BIN or shortcode: e.g. "MB", "VCB", "ICB", "970422"
  accountNumber: string;
  accountName?: string;
  amount?: number;
  memo?: string;
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}

export interface BankItem {
  code: string;
  name: string;
  bin: string;
  aliases?: string[];
}

export const COMMON_VIETNAMESE_BANKS: BankItem[] = [
  { code: 'MB', name: 'MBBank (NHTM CP Quân Đội)', bin: '970422', aliases: ['mb', 'mbbank', 'mb bank', 'quan doi', 'ngan hang quan doi'] },
  { code: 'VCB', name: 'Vietcombank (Ngoại Thương Việt Nam)', bin: '970436', aliases: ['vcb', 'vietcombank', 'vietcom bank', 'ngoai thuong', 'vietcom'] },
  { code: 'ICB', name: 'VietinBank (Công Thương Việt Nam)', bin: '970415', aliases: ['icb', 'ctg', 'vietinbank', 'vietin bank', 'cong thuong', 'vietin'] },
  { code: 'TCB', name: 'Techcombank (Kỹ Thương Việt Nam)', bin: '970407', aliases: ['tcb', 'techcombank', 'techcom bank', 'ky thuong', 'techcom'] },
  { code: 'ACB', name: 'ACB (Á Châu)', bin: '970416', aliases: ['acb', 'a chau'] },
  { code: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)', bin: '970432', aliases: ['vpb', 'vpbank', 'vp bank', 'thinh vuong'] },
  { code: 'BIDV', name: 'BIDV (Đầu tư và Phát triển)', bin: '970418', aliases: ['bidv', 'dau tu va phat trien'] },
  { code: 'VBA', name: 'Agribank (Nông nghiệp và PTNT)', bin: '970405', aliases: ['vba', 'agribank', 'agri bank', 'nong nghiep', 'agri'] },
  { code: 'TPB', name: 'TPBank (Tiên Phong)', bin: '970423', aliases: ['tpb', 'tpbank', 'tp bank', 'tien phong'] },
  { code: 'OCB', name: 'OCB (Phương Đông)', bin: '970448', aliases: ['ocb', 'phuong dong'] },
  { code: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)', bin: '970403', aliases: ['stb', 'sacombank', 'sacom bank', 'sai gon thuong tin', 'sacom'] },
  { code: 'HDB', name: 'HDBank (Phát triển TP.HCM)', bin: '970437', aliases: ['hdb', 'hdbank', 'hd bank'] },
  { code: 'VIB', name: 'VIB (Quốc tế)', bin: '970441', aliases: ['vib', 'quoc te'] },
  { code: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)', bin: '970443', aliases: ['shb', 'sai gon ha noi'] },
  { code: 'MSB', name: 'MSB (Hàng Hải)', bin: '970426', aliases: ['msb', 'hang hai'] },
  { code: 'SEAB', name: 'SeABank (Đông Nam Á)', bin: '970440', aliases: ['seab', 'seabank', 'sea bank', 'dong nam a'] },
  { code: 'LPB', name: 'LPBank (Lộc Phát Việt Nam)', bin: '970449', aliases: ['lpb', 'lpbank', 'lp bank', 'loc phat', 'lien viet post'] },
  { code: 'VCCB', name: 'BVBank (Bản Việt)', bin: '970454', aliases: ['vccb', 'bvbank', 'ban viet'] },
  { code: 'SCB', name: 'SCB (Sài Gòn)', bin: '970429', aliases: ['scb'] },
  { code: 'NAB', name: 'Nam A Bank (Nam Á)', bin: '970428', aliases: ['nab', 'nam a bank', 'nam a'] },
  { code: 'BAB', name: 'Bac A Bank (Bắc Á)', bin: '970409', aliases: ['bab', 'bac a bank', 'bac a'] },
];

export const removeVietnameseDiacritics = (str?: string): string => {
  if (!str) return '';
  return str
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const normalizeBankLookupKey = (s: string): string => {
  return removeVietnameseDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

export const resolveBankCode = (input?: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const norm = normalizeBankLookupKey(trimmed);

  // 1. Exact BIN match
  const binMatch = COMMON_VIETNAMESE_BANKS.find((b) => b.bin === trimmed);
  if (binMatch) return binMatch.code;

  // 2. Exact code match (case-insensitive)
  const codeMatch = COMMON_VIETNAMESE_BANKS.find((b) => b.code.toLowerCase() === lower);
  if (codeMatch) return codeMatch.code;

  // 3. Exact alias match
  const aliasMatch = COMMON_VIETNAMESE_BANKS.find((b) =>
    b.aliases?.some((a) => a.toLowerCase() === lower || normalizeBankLookupKey(a) === norm)
  );
  if (aliasMatch) return aliasMatch.code;

  // 4. Normalized containment in bank name or aliases
  const containMatch = COMMON_VIETNAMESE_BANKS.find((b) => {
    const bankNorm = normalizeBankLookupKey(b.name);
    if (bankNorm.includes(norm) || norm.includes(bankNorm)) return true;
    return b.aliases?.some((a) => {
      const aNorm = normalizeBankLookupKey(a);
      return norm.includes(aNorm) || aNorm.includes(norm);
    });
  });
  if (containMatch) return containMatch.code;

  // 5. Fallback: sanitize string to remove spaces and non-alphanumeric chars
  return trimmed.replace(/[^a-zA-Z0-9]/g, '');
};

export const generateVietQRUrl = (params: VietQRParams): string => {
  const { bankId, accountNumber, accountName, amount, memo, template = 'qr_only' } = params;
  if (!bankId || !accountNumber) return '';
  const cleanAccount = accountNumber.replace(/[^a-zA-Z0-9]/g, '');
  const cleanBank = resolveBankCode(bankId);
  if (!cleanBank || !cleanAccount) return '';

  const url = `https://img.vietqr.io/image/${cleanBank}-${cleanAccount}-${template}.png`;
  const searchParams = new URLSearchParams();

  if (amount && amount > 0) {
    searchParams.append('amount', Math.round(amount).toString());
  }
  if (memo) {
    const cleanMemo = removeVietnameseDiacritics(memo)
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);
    if (cleanMemo) {
      searchParams.append('addInfo', cleanMemo);
    }
  }
  if (accountName) {
    const cleanName = removeVietnameseDiacritics(accountName)
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanName) {
      searchParams.append('accountName', cleanName);
    }
  }

  const queryString = searchParams.toString().replace(/\+/g, '%20');
  return queryString ? `${url}?${queryString}` : url;
};
