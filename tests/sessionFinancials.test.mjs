import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundToNearestThousand,
  getShuttlecockPriceFromPack,
  resolveShuttlecockPrice,
  calculateTotalSessionCost,
  calculateFeePerPerson,
  getSessionFinancialBreakdown,
  calculateUnpaidSummary,
} from '../app/utils/sessionFinancials.ts';

test('roundToNearestThousand rounds to nearest 1000', () => {
  assert.equal(roundToNearestThousand(20833.33), 21000);
  assert.equal(roundToNearestThousand(20400), 20000);
  assert.equal(roundToNearestThousand(0), 0);
});

test('getShuttlecockPriceFromPack divides by 12 and rounds to 1000', () => {
  assert.equal(getShuttlecockPriceFromPack(250000), 21000);
  assert.equal(getShuttlecockPriceFromPack(0), 0);
  assert.equal(getShuttlecockPriceFromPack(-120000), 0);
});

test('resolveShuttlecockPrice prefers packPrice over shuttlecockPrice', () => {
  assert.equal(resolveShuttlecockPrice({ shuttlecockPackPrice: 240000, shuttlecockPrice: 30000 }), 20000);
  assert.equal(resolveShuttlecockPrice({ shuttlecockPackPrice: 0, shuttlecockPrice: 25000 }), 25000);
  assert.equal(resolveShuttlecockPrice(null), 0);
});

test('calculateTotalSessionCost and calculateFeePerPerson handle normal and zero/invalid inputs', () => {
  const total = calculateTotalSessionCost({ courtCost: 200000, shuttlecocksUsed: 5, shuttlecockPrice: 25000 });
  assert.equal(total, 325000);
  assert.equal(calculateFeePerPerson(325000, 6), 55000);
  assert.equal(calculateFeePerPerson(325000, 0), 0);
  assert.equal(calculateFeePerPerson(325000, -2), 0);
});

test('getSessionFinancialBreakdown returns consistent breakdown', () => {
  const b = getSessionFinancialBreakdown({ courtCost: 200000, shuttlecocksUsed: 4, shuttlecockPackPrice: 240000 }, 5);
  assert.equal(b.shuttlecockPrice, 20000);
  assert.equal(b.shuttlecockCost, 80000);
  assert.equal(b.totalSessionCost, 280000);
  assert.equal(b.feePerPerson, 56000);
});

test('calculateTotalSessionCost and getSessionFinancialBreakdown include additional shuttlecocks', () => {
  const financials = {
    courtCost: 225000,
    shuttlecocksUsed: 9,
    shuttlecockPackPrice: 300000, // 25,000 per shuttle
    additionalShuttlecocksUsed: 2,
    additionalShuttlecockPrice: 30000,
  };
  const b = getSessionFinancialBreakdown(financials, 8);
  assert.equal(b.shuttlecockPrice, 25000);
  assert.equal(b.packShuttlecockCost, 225000);
  assert.equal(b.additionalShuttlecocksUsed, 2);
  assert.equal(b.additionalShuttlecockPrice, 30000);
  assert.equal(b.additionalShuttlecockCost, 60000);
  assert.equal(b.shuttlecockCost, 285000);
  assert.equal(b.totalSessionCost, 510000);
  assert.equal(b.feePerPerson, 64000);
});

test('calculateUnpaidSummary aggregates unpaid checked-in players and guests across sessions', () => {
  const sessions = [
    {
      id: 's1',
      date: '2026-10-20',
      time: '19:00',
      location: 'Court A',
      financials: { calculatedFeePerPerson: 60000 },
    },
    {
      id: 's2',
      date: '2026-10-25',
      time: '19:00',
      location: 'Court B',
      financials: { courtCost: 200000, shuttlecocksUsed: 4, shuttlecockPackPrice: 240000 },
    },
  ];

  const attendancesBySession = {
    s1: [
      { id: 'a1', name: 'Nam', actualAttended: true, hasPaid: false, guestCount: 1 },
      { id: 'a2', name: 'Minh', actualAttended: true, hasPaid: true, guestCount: 0 },
      { id: 'a3', name: 'Ghost', actualAttended: false, hasPaid: false, guestCount: 0 },
    ],
    s2: [
      { id: 'a4', name: 'nam', actualAttended: true, hasPaid: false, guestCount: 0 },
      { id: 'a5', name: 'Lan', actualAttended: true, hasPaid: false, guestCount: 2 },
    ],
  };

  // In s2, totalActualPlayers = 1 (nam) + 3 (Lan + 2 guests) = 4. Total cost = 200k + 80k = 280k -> 70k/person.
  const summary = calculateUnpaidSummary(sessions, attendancesBySession);
  assert.equal(summary.length, 2);

  // Lan owes 3 * 70,000 = 210,000
  assert.equal(summary[0].name, 'Lan');
  assert.equal(summary[0].totalSlots, 3);
  assert.equal(summary[0].totalOwed, 210000);
  assert.equal(summary[0].sessions.length, 1);

  // Nam owes (2 * 60,000) in s1 + (1 * 70,000) in s2 = 190,000
  assert.equal(summary[1].name, 'Nam');
  assert.equal(summary[1].totalSlots, 3);
  assert.equal(summary[1].totalOwed, 190000);
  assert.equal(summary[1].sessions.length, 2);
  assert.equal(summary[1].sessions[0].sessionId, 's2'); // newer date first
  assert.equal(summary[1].sessions[1].sessionId, 's1');
});
