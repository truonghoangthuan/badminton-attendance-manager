import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlayerStats } from '../app/utils/leaderboardStats.ts';

test('calculatePlayerStats correctly computes matches, totalRsvps, and reliabilityRate', () => {
  const sessions = [
    {
      date: '2026-09-01',
      attendances: [
        { name: 'Alice', isJoining: true, actualAttended: true },
        { name: 'Bob', isJoining: true, actualAttended: false },
        { name: 'Charlie', isJoining: false, actualAttended: true }, // walkin
      ],
    },
    {
      date: '2026-09-08',
      attendances: [
        { name: 'Alice', isJoining: true, actualAttended: true },
        { name: 'Bob', isJoining: true, actualAttended: true },
      ],
    },
  ];

  const stats = calculatePlayerStats(sessions);

  // Alice: 2 matches, 2 rsvps -> 100%
  // Bob: 1 match, 2 rsvps -> 50%
  // Charlie: 1 match, 0 rsvps recorded -> totalRsvps = Math.max(1, 0) = 1, 100%
  assert.equal(stats.length, 3);

  const alice = stats.find(p => p.name === 'Alice');
  assert.deepEqual(alice, {
    rank: 1,
    name: 'Alice',
    matchesPlayed: 2,
    totalRsvps: 2,
    reliabilityRate: 100,
    lastPlayedDate: '2026-09-08',
  });

  const bob = stats.find(p => p.name === 'Bob');
  assert.equal(bob.matchesPlayed, 1);
  assert.equal(bob.totalRsvps, 2);
  assert.equal(bob.reliabilityRate, 50);

  const charlie = stats.find(p => p.name === 'Charlie');
  assert.equal(charlie.matchesPlayed, 1);
  assert.equal(charlie.totalRsvps, 1);
  assert.equal(charlie.reliabilityRate, 100);
});
