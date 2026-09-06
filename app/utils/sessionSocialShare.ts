export const normalizeInviteUrl = (rawUrl?: string): string => {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}/`;
  } catch {
    if (rawUrl.startsWith('/')) {
      return '/';
    }
    const clean = rawUrl.replace(/\/session(\/[^/?#]*)?([?#].*)?$/, '/');
    return clean.endsWith('/') ? clean : `${clean}/`;
  }
};

export const generateSessionInviteText = (
  session: any,
  attendancesOrUrl?: any[] | string,
  sessionUrl?: string,
): string => {
  if (!session) return '';
  const rawUrl = typeof attendancesOrUrl === 'string' ? attendancesOrUrl : (sessionUrl || '');
  const url = normalizeInviteUrl(rawUrl);

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
  const attendances = isFourArgs ? attendancesOrFinancials : [];
  const financials = isFourArgs ? financialsOrUrl : attendancesOrFinancials;

  const actualPlayers = (attendances || []).filter((a: any) => a?.actualAttended);
  const calculatedPlayers = actualPlayers.reduce(
    (acc: number, a: any) => acc + 1 + (Number(a?.guestCount) || 0),
    0,
  );
  const totalActualPlayers = calculatedPlayers || Number(financials?.totalActualPlayers) || 0;

  const courtCost = financials?.courtCost || 0;
  const shuttlecocksUsed = financials?.shuttlecocksUsed || 0;
  const shuttlePrice = financials?.shuttlecockPrice || 0;
  const shuttleCost = shuttlecocksUsed * shuttlePrice;
  const totalCost = financials?.totalSessionCost || (courtCost + shuttleCost);
  const feePerPerson = financials?.calculatedFeePerPerson || 0;
  const courtNumberDisplay = session.courtNumber || 1;

  let text = `🏸 TỔNG KẾT TIỀN SÂN - GRAVITY BADMINTON\n`;
  text += `📅 Ngày: ${session.date || ''} | 📍 ${session.location || ''}\n`;
  text += `🏟️ Số lượng sân: ${courtNumberDisplay}\n`;
  text += `🙌 Tổng số người: ${totalActualPlayers}\n`;
  text += `💰 Chi phí: Sân ${courtCost.toLocaleString('vi-VN')}đ + Cầu (${shuttlecocksUsed} quả = ${shuttleCost.toLocaleString('vi-VN')}đ) = ${totalCost.toLocaleString('vi-VN')}đ\n`;
  text += `💵 Tiền sân/người: ${feePerPerson.toLocaleString('vi-VN')}đ / người`;

  return text;
};

