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
