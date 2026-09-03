export const generateSessionInviteText = (
  session: any,
  attendances: any[],
  sessionUrl: string,
): string => {
  if (!session) return '';
  const joinedPlayers = attendances.filter((a) => a.isJoining);
  const totalSlots = joinedPlayers.reduce((acc, a) => acc + 1 + (a.guestCount || 0), 0);
  const maxCap = session.maxPlayers || 8;
  const remainingSlots = Math.max(0, maxCap - totalSlots);

  let text = `🏸 KÈO CẦU LÔNG - GRAVITY BADMINTON\n`;
  text += `📅 Ngày: ${session.date}\n`;
  text += `⏰ Giờ: ${session.time}\n`;
  text += `📍 Địa điểm: ${session.location}\n`;
  if (session.courtNumber) text += `🏟️ Sân: ${session.courtNumber}\n`;
  if (session.shuttlecockType) text += `🏸 Cầu: ${session.shuttlecockType}\n`;
  if (session.level) text += `🎯 Trình độ: ${session.level}\n`;
  text += `\n👥 Danh sách đăng ký (${totalSlots}/${maxCap}):\n`;

  if (joinedPlayers.length === 0) {
    text += `  (Chưa có ai đăng ký)\n`;
  } else {
    joinedPlayers.forEach((p, idx) => {
      const guestText = p.guestCount ? ` (+${p.guestCount} khách)` : '';
      text += `  ${idx + 1}. ${p.name}${guestText}\n`;
    });
  }

  if (remainingSlots > 0) {
    text += `\n⏳ Còn lại: ${remainingSlots} chỗ trống!\n`;
  } else {
    text += `\n🔥 Sân đã đủ slot!\n`;
  }

  text += `\n👉 Bấm vào link để xác nhận tham gia:\n${sessionUrl}`;
  return text;
};

export const generateSessionSettlementText = (
  session: any,
  attendances: any[],
  financials: any,
  sessionUrl: string,
): string => {
  if (!session) return '';
  const actualPlayers = attendances.filter((a) => a.actualAttended);
  const courtCost = financials?.courtCost || 0;
  const shuttleCost = (financials?.shuttlecocksUsed || 0) * (financials?.shuttlecockPrice || 0);
  const totalCost = financials?.totalSessionCost || (courtCost + shuttleCost);
  const feePerPerson = financials?.calculatedFeePerPerson || 0;

  const paidList = actualPlayers.filter((a) => a.hasPaid);
  const unpaidList = actualPlayers.filter((a) => !a.hasPaid);

  let text = `🏸 TỔNG KẾT TIỀN SÂN - GRAVITY BADMINTON\n`;
  text += `📅 Ngày: ${session.date} | 📍 ${session.location}\n`;
  if (session.courtNumber) text += `🏟️ Sân: ${session.courtNumber}\n`;
  text += `💰 Chi phí: Sân ${courtCost.toLocaleString('vi-VN')}đ + Cầu (${financials?.shuttlecocksUsed || 0} quả = ${shuttleCost.toLocaleString('vi-VN')}đ) = ${totalCost.toLocaleString('vi-VN')}đ\n`;
  text += `💵 Tiền sân/người: ${feePerPerson.toLocaleString('vi-VN')}đ / người\n\n`;

  text += `✅ ĐÃ THANH TOÁN (${paidList.length}):\n`;
  if (paidList.length === 0) {
    text += `  (Chưa có)\n`;
  } else {
    paidList.forEach((p) => {
      const slots = 1 + (p.guestCount || 0);
      const amount = feePerPerson * slots;
      const guestNote = p.guestCount ? ` (+${p.guestCount}k)` : '';
      text += `  • ${p.name}${guestNote}: ${amount.toLocaleString('vi-VN')}đ\n`;
    });
  }

  text += `\n⏳ CHƯA THANH TOÁN (${unpaidList.length}):\n`;
  if (unpaidList.length === 0) {
    text += `  (Tất cả đã thanh toán xong! 🎉)\n`;
  } else {
    unpaidList.forEach((p) => {
      const slots = 1 + (p.guestCount || 0);
      const amount = feePerPerson * slots;
      const guestNote = p.guestCount ? ` (+${p.guestCount}k)` : '';
      text += `  • ${p.name}${guestNote}: ${amount.toLocaleString('vi-VN')}đ\n`;
    });
  }

  if (session.bankInfo?.accountNumber) {
    text += `\n🏦 THÔNG TIN CHUYỂN KHOẢN:\n`;
    text += `  • STK: ${session.bankInfo.accountNumber} (${session.bankInfo.bankName || 'Ngân hàng'})\n`;
    if (session.bankInfo.accountName) text += `  • Chủ TK: ${session.bankInfo.accountName}\n`;
    text += `  • Nội dung: BDM ${session.date.replace(/-/g, '')} [Tên]\n`;
  }

  text += `\n👉 Chi tiết bảng kê và mã VietQR:\n${sessionUrl}`;
  return text;
};
