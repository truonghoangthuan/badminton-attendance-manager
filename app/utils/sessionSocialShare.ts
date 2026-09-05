export const generateSessionInviteText = (
  session: any,
  attendancesOrUrl?: any[] | string,
  sessionUrl?: string,
): string => {
  if (!session) return '';
  const url = typeof attendancesOrUrl === 'string' ? attendancesOrUrl : (sessionUrl || '');

  let text = `🏸 KÈO CẦU LÔNG - GRAVITY BADMINTON\n`;
  text += `📅 Ngày: ${session.date}\n`;
  text += `⏰ Giờ: ${session.time}\n`;
  text += `📍 Địa điểm: ${session.location}\n`;
  if (session.courtNumber) text += `🏟️ Sân: ${session.courtNumber}\n`;
  if (session.shuttlecockType) text += `🏸 Cầu: ${session.shuttlecockType}\n`;
  if (session.level) text += `🎯 Trình độ: ${session.level}\n`;

  text += `\n👉 Bấm vào link để xác nhận tham gia:\n${url}`;
  return text;
};

export const generateSessionSettlementText = (
  session: any,
  attendancesOrFinancials?: any,
  financialsOrUrl?: any,
  sessionUrl?: string,
): string => {
  if (!session) return '';
  const isFourArgs = Array.isArray(attendancesOrFinancials);
  const financials = isFourArgs ? financialsOrUrl : attendancesOrFinancials;
  const url = isFourArgs ? (sessionUrl || '') : (financialsOrUrl || '');

  const courtCost = financials?.courtCost || 0;
  const shuttleCost = (financials?.shuttlecocksUsed || 0) * (financials?.shuttlecockPrice || 0);
  const totalCost = financials?.totalSessionCost || (courtCost + shuttleCost);
  const feePerPerson = financials?.calculatedFeePerPerson || 0;

  let text = `🏸 TỔNG KẾT TIỀN SÂN - GRAVITY BADMINTON\n`;
  text += `📅 Ngày: ${session.date} | 📍 ${session.location}\n`;
  if (session.courtNumber) text += `🏟️ Sân: ${session.courtNumber}\n`;
  text += `💰 Chi phí: Sân ${courtCost.toLocaleString('vi-VN')}đ + Cầu (${financials?.shuttlecocksUsed || 0} quả = ${shuttleCost.toLocaleString('vi-VN')}đ) = ${totalCost.toLocaleString('vi-VN')}đ\n`;
  text += `💵 Tiền sân/người: ${feePerPerson.toLocaleString('vi-VN')}đ / người\n`;

  if (session.bankInfo?.accountNumber) {
    text += `\n🏦 THÔNG TIN CHUYỂN KHOẢN:\n`;
    text += `  • STK: ${session.bankInfo.accountNumber} (${session.bankInfo.bankName || 'Ngân hàng'})\n`;
    if (session.bankInfo.accountName) text += `  • Chủ TK: ${session.bankInfo.accountName}\n`;
    text += `  • Nội dung: BDM ${session.date.replace(/-/g, '')} [Tên]\n`;
  }

  text += `\n👉 Chi tiết bảng kê và mã VietQR:\n${url}`;
  return text;
};

