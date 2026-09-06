import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSessionInviteText,
  generateSessionSettlementText,
  normalizeInviteUrl,
} from '../app/utils/sessionSocialShare.ts';

test('normalizeInviteUrl strips session id from full url', () => {
  assert.equal(normalizeInviteUrl('http://localhost:3002/session/cK856h8qL7'), 'http://localhost:3002/');
  assert.equal(normalizeInviteUrl('http://localhost:3002/'), 'http://localhost:3002/');
  assert.equal(normalizeInviteUrl('http://localhost:3002'), 'http://localhost:3002/');
  assert.equal(normalizeInviteUrl('https://example.com/session/123?tab=invite'), 'https://example.com/');
  assert.equal(normalizeInviteUrl('/session/123'), '/');
  assert.equal(normalizeInviteUrl(''), '');
  assert.equal(normalizeInviteUrl(undefined), '');
});

test('generateSessionInviteText produces simple invite text with clean root url', () => {
  const session = {
    date: '2026-08-28',
    time: '19:00',
    location: 'Sân cầu lông Quang Sport',
  };

  const expected = `🏸 KÈO CẦU LÔNG - GRAVITY BADMINTON
📅 Ngày: 28/08/2026
⏰ Giờ: 19:00
📍 Địa điểm: Sân cầu lông Quang Sport

👉 Bấm vào link để xác nhận tham gia:
http://localhost:3002/`;

  const resultWithSessionUrl = generateSessionInviteText(
    session,
    [],
    'http://localhost:3002/session/cK856h8qL7'
  );
  assert.equal(resultWithSessionUrl, expected);

  const resultWithRootUrl = generateSessionInviteText(
    session,
    'http://localhost:3002/'
  );
  assert.equal(resultWithRootUrl, expected);
});

test('generateSessionInviteText includes optional court, shuttle, and level details if present', () => {
  const session = {
    date: '2026-08-28',
    time: '19:00',
    location: 'Sân cầu lông Quang Sport',
    courtNumber: 'Sân 1',
    shuttlecockType: 'Vina Star',
    level: 'Yếu - Trung bình',
  };

  const result = generateSessionInviteText(session, 'http://localhost:3002/session/123');
  assert.ok(result.includes('🏟️ Sân: Sân 1'));
  assert.ok(result.includes('🏸 Cầu: Vina Star'));
  assert.ok(result.includes('🎯 Trình độ: Yếu - Trung bình'));
  assert.ok(result.endsWith('👉 Bấm vào link để xác nhận tham gia:\nhttp://localhost:3002/'));
});


test('generateSessionSettlementText produces exact 6-line simplified settlement text', () => {
  const session = {
    date: '2026-09-06',
    location: 'Sân Cầu Lông Sky',
    courtNumber: 'Sân 3',
  };

  const attendances = [
    { name: 'Thuan', actualAttended: true, guestCount: 1 },
    { name: 'Minh', actualAttended: true, guestCount: 0 },
    { name: 'Hoang', actualAttended: false, guestCount: 2 }, // Did not attend
    { name: 'Nam', actualAttended: true, guestCount: 2 },
  ];

  const financials = {
    courtCost: 200000,
    shuttlecocksUsed: 4,
    shuttlecockPrice: 25000,
    totalSessionCost: 300000,
    calculatedFeePerPerson: 60000,
  };

  const result = generateSessionSettlementText(session, attendances, financials, 'https://example.com/session/123');

  const lines = result.trim().split('\n');
  assert.equal(lines.length, 6, `Expected 6 lines, got ${lines.length}:\n${result}`);
  assert.equal(lines[0], '🏸 TỔNG KẾT TIỀN SÂN - GRAVITY BADMINTON');
  assert.equal(lines[1], '📅 Ngày: 06/09/2026 | 📍 Sân Cầu Lông Sky');
  assert.equal(lines[2], '🏟️ Số lượng sân: Sân 3');
  assert.equal(lines[3], '🙌 Tổng số người: 6'); // (1+1) + (1+0) + (1+2) = 6
  assert.equal(lines[4], '💰 Chi phí: Sân 200.000đ + Cầu (4 quả = 100.000đ) = 300.000đ');
  assert.equal(lines[5], '💵 Tiền sân/người: 60.000đ / người');
});

test('generateSessionSettlementText defaults courtNumber to 1 when missing', () => {
  const session = {
    date: '2026-09-06',
    location: 'Sân Cầu Lông Sky',
  };

  const attendances = [
    { name: 'Thuan', actualAttended: true, guestCount: 0 },
  ];

  const financials = {
    courtCost: 100000,
    shuttlecocksUsed: 0,
    shuttlecockPrice: 25000,
    totalSessionCost: 100000,
    calculatedFeePerPerson: 100000,
  };

  const result = generateSessionSettlementText(session, attendances, financials);
  const lines = result.trim().split('\n');
  assert.equal(lines[2], '🏟️ Số lượng sân: 1');
  assert.equal(lines[3], '🙌 Tổng số người: 1');
  assert.equal(lines[4], '💰 Chi phí: Sân 100.000đ + Cầu (0 quả = 0đ) = 100.000đ');
  assert.equal(lines[5], '💵 Tiền sân/người: 100.000đ / người');
});

test('generateSessionSettlementText handles 3-argument legacy signature gracefully', () => {
  const session = {
    date: '2026-09-06',
    location: 'Sân Cầu Lông Sky',
    courtNumber: '2',
  };

  const financials = {
    courtCost: 150000,
    shuttlecocksUsed: 2,
    shuttlecockPrice: 25000,
    totalSessionCost: 200000,
    calculatedFeePerPerson: 50000,
    totalActualPlayers: 4,
  };

  const result = generateSessionSettlementText(session, financials, 'https://example.com/session/123');
  const lines = result.trim().split('\n');
  assert.equal(lines[2], '🏟️ Số lượng sân: 2');
  assert.equal(lines[3], '🙌 Tổng số người: 4');
});
