import { formatDisplayDate } from './dateFormat.ts';

export const exportSessionToCSV = (
  session: any,
  attendances: any[],
  financials: any,
) => {
  if (!session) return;
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel Vietnamese encoding compatibility
  let csv = BOM;

  const fee = financials?.calculatedFeePerPerson || financials?.feePerPerson || 0;

  // Metadata Section
  csv += `BÁO CÁO PHIÊN CẦU LÔNG - GRAVITY BADMINTON\r\n`;
  csv += `Ngày,${formatDisplayDate(session.date)},Giờ,${session.time || ''}\r\n`;
  csv += `Địa điểm,"${(session.location || '').replace(/"/g, '""')}",Sân,"${(session.courtNumber || '').replace(/"/g, '""')}"\r\n`;
  csv += `Trạng thái,${session.status || ''},Sức chứa,"${attendances.length}/${session.maxPlayers || 8}"\r\n`;
  csv += `Cầu lông,"${(session.shuttlecockType || '').replace(/"/g, '""')}",Trình độ,"${(session.level || '').replace(/"/g, '""')}"\r\n`;
  csv += `\r\n`;

  // Financial Summary Section
  csv += `TỔNG KẾT TÀI CHÍNH\r\n`;
  csv += `Tiền sân (VND),${financials?.courtCost || 0}\r\n`;
  csv += `Số quả cầu dùng,${financials?.shuttlecocksUsed || 0},quả\r\n`;
  csv += `Đơn giá cầu (VND),${financials?.shuttlecockPrice || 0}\r\n`;
  csv += `Tổng chi phí phiên (VND),${financials?.totalSessionCost || 0}\r\n`;
  csv += `Số người thực tế chia tiền,${financials?.totalActualPlayers || 0},người\r\n`;
  csv += `Tiền chia mỗi người (VND),${fee}\r\n`;
  csv += `\r\n`;

  // Attendance Table
  csv += `DANH SÁCH NGƯỜI CHƠI\r\n`;
  csv += `STT,Tên người chơi,Khách kèm theo,Tổng slot,Điểm danh (Có mặt),Trạng thái thanh toán,Số tiền phải trả (VND),Loại đăng ký\r\n`;

  attendances.forEach((att, index) => {
    const slots = 1 + (att.guestCount || 0);
    const amount = att.actualAttended ? fee * slots : 0;
    const attended = att.actualAttended ? 'Có mặt' : (att.isJoining ? 'Vắng (Có RSVP)' : 'Không tham gia');
    const paid = att.hasPaid ? 'Đã thanh toán' : 'Chưa thanh toán';
    const entryType = att.isManual ? 'Thủ công (Walk-in)' : 'Tự đăng ký web';
    const cleanName = (att.name || '').replace(/"/g, '""');

    csv += `${index + 1},"${cleanName}",${att.guestCount || 0},${slots},${attended},${paid},${amount},${entryType}\r\n`;
  });

  // Trigger file download in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeDate = (session.date || 'session').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeId = (session.id || '').slice(0, 6);
    link.setAttribute('download', `Badminton_Session_${safeDate}_${safeId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
