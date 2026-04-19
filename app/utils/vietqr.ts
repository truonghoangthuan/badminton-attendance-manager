const VIET_QR_BASE_URL = 'https://img.vietqr.io/image';

export const VIET_QR_PAYMENT_CONFIG = {
  bankId: 'momo',
  accountNumber: '0974667060',
  accountName: 'Truong Hoang Thuan',
} as const;

const getSessionPaymentLabel = (sessionDate?: string) => {
  if (!sessionDate) {
    return 'tien cau long';
  }

  const parsedDate = new Date(sessionDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return `tien cau long ${sessionDate}`;
  }

  return `tien cau long ngay ${parsedDate.getDate()} thang ${parsedDate.getMonth() + 1}`;
};

export const buildVietQrUrl = (amount: number, sessionDate?: string) => {
  const normalizedAmount = Math.max(0, Math.round(amount || 0));
  const params = new URLSearchParams({
    amount: normalizedAmount.toString(),
    addInfo: getSessionPaymentLabel(sessionDate),
    accountName: VIET_QR_PAYMENT_CONFIG.accountName,
  });

  return `${VIET_QR_BASE_URL}/${VIET_QR_PAYMENT_CONFIG.bankId}-${VIET_QR_PAYMENT_CONFIG.accountNumber}-compact2.png?${params.toString()}`;
};

export const getVietQrTransferNote = (sessionDate?: string) => getSessionPaymentLabel(sessionDate);
