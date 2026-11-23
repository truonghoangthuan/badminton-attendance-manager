import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAX_PLAYERS,
  normalizeGuestCount,
  getMaxCapacity,
  calculateJoinedSlots,
  validateRsvpCapacity,
  buildAttendancePayload,
} from '../app/utils/sessionRsvp.ts';

test('normalizeGuestCount clamps invalid, negative, and fractional inputs to non-negative integers', () => {
  assert.equal(normalizeGuestCount(0), 0);
  assert.equal(normalizeGuestCount(2), 2);
  assert.equal(normalizeGuestCount('3'), 3);
  assert.equal(normalizeGuestCount(1.9), 1);
  assert.equal(normalizeGuestCount(-4), 0);
  assert.equal(normalizeGuestCount(''), 0);
  assert.equal(normalizeGuestCount(Number.NaN), 0);
  assert.equal(normalizeGuestCount(undefined), 0);
});

test('getMaxCapacity falls back to DEFAULT_MAX_PLAYERS for missing or non-positive values', () => {
  assert.equal(getMaxCapacity(12), 12);
  assert.equal(getMaxCapacity(8.7), 8);
  assert.equal(getMaxCapacity(0), DEFAULT_MAX_PLAYERS);
  assert.equal(getMaxCapacity(-5), DEFAULT_MAX_PLAYERS);
  assert.equal(getMaxCapacity(undefined), DEFAULT_MAX_PLAYERS);
});

test('calculateJoinedSlots sums 1 + guests only for records with isJoining === true', () => {
  const attendances = [
    { id: 'u1', isJoining: true, guestCount: 0 },
    { id: 'u2', isJoining: true, guestCount: 2 },
    { id: 'u3', isJoining: false, guestCount: 3 },
    { id: 'u4', isJoining: true, guestCount: -1 },
  ];
  assert.equal(calculateJoinedSlots(attendances), 5);
  assert.equal(calculateJoinedSlots([]), 0);
});

test('validateRsvpCapacity enforces full/exceeded limits while crediting existing joining slots', () => {
  const attendances = [
    { id: 'u1', isJoining: true, guestCount: 1 }, // 2 slots
    { id: 'u2', isJoining: true, guestCount: 4 }, // 5 slots (total 7/8)
  ];

  // New user requesting 1 slot fits (7 + 1 <= 8)
  assert.deepEqual(
    validateRsvpCapacity({ attendances, maxPlayers: 8, uid: 'u3', isJoining: true, guestCount: 0 }),
    { ok: true, availableSlots: 1, totalJoinedSlots: 7, maxCapacity: 8 }
  );

  // New user requesting 2 slots exceeds remaining 1 slot
  assert.deepEqual(
    validateRsvpCapacity({ attendances, maxPlayers: 8, uid: 'u3', isJoining: true, guestCount: 1 }),
    { ok: false, reason: 'exceeded', availableSlots: 1, totalJoinedSlots: 7, maxCapacity: 8 }
  );

  // Existing joining user u1 upgrading from 2 slots to 3 slots fits (7 - 2 + 3 = 8)
  assert.deepEqual(
    validateRsvpCapacity({ attendances, maxPlayers: 8, uid: 'u1', isJoining: true, guestCount: 2 }),
    { ok: true, availableSlots: 3, totalJoinedSlots: 7, maxCapacity: 8 }
  );

  // Full session blocks new join with reason 'full'
  const fullAttendances = [...attendances, { id: 'u3', isJoining: true, guestCount: 0 }];
  assert.deepEqual(
    validateRsvpCapacity({ attendances: fullAttendances, maxPlayers: 8, uid: 'u4', isJoining: true, guestCount: 0 }),
    { ok: false, reason: 'full', availableSlots: 0, totalJoinedSlots: 8, maxCapacity: 8 }
  );

  // Switching to unavailable always succeeds even when full
  assert.equal(
    validateRsvpCapacity({ attendances: fullAttendances, maxPlayers: 8, uid: 'u1', isJoining: false, guestCount: 0 }).ok,
    true
  );
});

test('buildAttendancePayload preserves actualAttended and hasPaid invariants', () => {
  const existing = { id: 'u1', actualAttended: true, hasPaid: true };

  // Joining update preserves actualAttended and hasPaid, trims name, normalizes guests
  assert.deepEqual(
    buildAttendancePayload({
      uid: 'u1',
      name: '  Nam  ',
      isJoining: true,
      guestCount: 2.7,
      existingRecord: existing,
      nowIso: '2026-11-23T12:00:00.000Z',
    }),
    {
      uid: 'u1',
      name: 'Nam',
      isJoining: true,
      guestCount: 2,
      actualAttended: true,
      hasPaid: true,
      updatedAt: '2026-11-23T12:00:00.000Z',
    }
  );

  // Unavailable resets guestCount and actualAttended to 0/false, preserves hasPaid
  assert.deepEqual(
    buildAttendancePayload({
      uid: 'u1',
      name: 'Nam',
      isJoining: false,
      guestCount: 3,
      existingRecord: existing,
      nowIso: '2026-11-23T12:00:00.000Z',
    }),
    {
      uid: 'u1',
      name: 'Nam',
      isJoining: false,
      guestCount: 0,
      actualAttended: false,
      hasPaid: true,
      updatedAt: '2026-11-23T12:00:00.000Z',
    }
  );

  // New record initializes actualAttended and hasPaid to false
  assert.deepEqual(
    buildAttendancePayload({
      uid: 'u2',
      name: 'Lan',
      isJoining: true,
      guestCount: 0,
      existingRecord: null,
      nowIso: '2026-11-23T12:00:00.000Z',
    }),
    {
      uid: 'u2',
      name: 'Lan',
      isJoining: true,
      guestCount: 0,
      actualAttended: false,
      hasPaid: false,
      updatedAt: '2026-11-23T12:00:00.000Z',
    }
  );
});
