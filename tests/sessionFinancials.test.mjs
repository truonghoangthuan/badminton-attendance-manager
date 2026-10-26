import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundToNearestThousand,
  getShuttlecockPriceFromPack,
  resolveShuttlecockPrice,
  calculateTotalSessionCost,
  calculateFeePerPerson,
  getSessionFinancialBreakdown,
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
