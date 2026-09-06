import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDisplayDate } from '../app/utils/dateFormat.ts';

test('formatDisplayDate converts YYYY-MM-DD to DD/MM/YYYY', () => {
  assert.equal(formatDisplayDate('2026-09-04'), '04/09/2026', 'Should convert YYYY-MM-DD to DD/MM/YYYY');
  assert.equal(formatDisplayDate('2026-12-31'), '31/12/2026', 'Should convert end of year date');
  assert.equal(formatDisplayDate('2026-01-05'), '05/01/2026', 'Should preserve leading zeros');
});

test('formatDisplayDate handles ISO timestamp string', () => {
  assert.equal(formatDisplayDate('2026-09-04T15:30:00.000Z'), '04/09/2026', 'Should handle full ISO timestamp');
});

test('formatDisplayDate returns already formatted string as-is', () => {
  assert.equal(formatDisplayDate('04/09/2026'), '04/09/2026', 'Should return already formatted DD/MM/YYYY as-is');
});

test('formatDisplayDate handles falsy and edge cases', () => {
  assert.equal(formatDisplayDate(''), '', 'Empty string should return empty string');
  assert.equal(formatDisplayDate('   '), '', 'Whitespace should return empty string');
  assert.equal(formatDisplayDate(null), '', 'Null should return empty string');
  assert.equal(formatDisplayDate(undefined), '', 'Undefined should return empty string');
});

test('sessionSocialShare formats date with formatDisplayDate', async () => {
  const { generateSessionInviteText, generateSessionSettlementText } = await import('../app/utils/sessionSocialShare.ts');
  const mockSession = {
    date: '2026-09-04',
    time: '18:00 - 20:00',
    location: 'Sân Cầu Lông Quân Đội',
  };

  const inviteText = generateSessionInviteText(mockSession, 'https://example.com/session/123');
  assert.ok(inviteText.includes('📅 Ngày: 04/09/2026'), 'Invite text should contain 04/09/2026');

  const settlementText = generateSessionSettlementText(mockSession, [], { totalSessionCost: 200000 });
  assert.ok(settlementText.includes('📅 Ngày: 04/09/2026'), 'Settlement text should contain 04/09/2026');
});

