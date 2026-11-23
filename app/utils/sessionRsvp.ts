export const DEFAULT_MAX_PLAYERS = 8;

export interface AttendanceRsvpRecord {
  id?: string;
  uid?: string;
  name?: string;
  isJoining?: boolean;
  guestCount?: number;
  actualAttended?: boolean;
  hasPaid?: boolean;
}

export interface RsvpCapacityResult {
  ok: boolean;
  reason?: 'full' | 'exceeded';
  availableSlots: number;
  totalJoinedSlots: number;
  maxCapacity: number;
}

export interface AttendanceWritePayload {
  uid: string;
  name: string;
  isJoining: boolean;
  guestCount: number;
  actualAttended: boolean;
  hasPaid: boolean;
  updatedAt: string;
}

export function normalizeGuestCount(guestCount: unknown): number {
  const num = Number(guestCount);
  if (!Number.isFinite(num)) return 0;
  const floored = Math.floor(num);
  return floored > 0 ? floored : 0;
}

export function getMaxCapacity(maxPlayers: unknown): number {
  const num = Number(maxPlayers);
  if (!Number.isFinite(num)) return DEFAULT_MAX_PLAYERS;
  const floored = Math.floor(num);
  return floored > 0 ? floored : DEFAULT_MAX_PLAYERS;
}

export function calculateJoinedSlots(attendances: AttendanceRsvpRecord[]): number {
  return attendances.reduce((acc, curr) => {
    if (curr.isJoining === true) {
      return acc + 1 + normalizeGuestCount(curr.guestCount);
    }
    return acc;
  }, 0);
}

export function validateRsvpCapacity(params: {
  attendances: AttendanceRsvpRecord[];
  maxPlayers?: unknown;
  uid?: string | null;
  isJoining: boolean;
  guestCount?: unknown;
}): RsvpCapacityResult {
  const maxCapacity = getMaxCapacity(params.maxPlayers);
  const totalJoinedSlots = calculateJoinedSlots(params.attendances);
  const existing = params.uid
    ? params.attendances.find((a) => a.id === params.uid || a.uid === params.uid)
    : undefined;
  const previousSlots = existing?.isJoining === true ? 1 + normalizeGuestCount(existing.guestCount) : 0;
  const availableSlots = Math.max(0, maxCapacity - (totalJoinedSlots - previousSlots));

  if (!params.isJoining) {
    return {
      ok: true,
      availableSlots,
      totalJoinedSlots,
      maxCapacity,
    };
  }

  const requestedSlots = 1 + normalizeGuestCount(params.guestCount);
  if (requestedSlots > availableSlots) {
    return {
      ok: false,
      reason: availableSlots === 0 ? 'full' : 'exceeded',
      availableSlots,
      totalJoinedSlots,
      maxCapacity,
    };
  }

  return {
    ok: true,
    availableSlots,
    totalJoinedSlots,
    maxCapacity,
  };
}

export function buildAttendancePayload(params: {
  uid: string;
  name: string;
  isJoining: boolean;
  guestCount?: unknown;
  existingRecord?: AttendanceRsvpRecord | null;
  nowIso?: string;
}): AttendanceWritePayload {
  const safeGuestCount = params.isJoining ? normalizeGuestCount(params.guestCount) : 0;
  const actualAttended = params.isJoining ? Boolean(params.existingRecord?.actualAttended) : false;
  const hasPaid = Boolean(params.existingRecord?.hasPaid);

  return {
    uid: params.uid,
    name: params.name.trim(),
    isJoining: params.isJoining,
    guestCount: safeGuestCount,
    actualAttended,
    hasPaid,
    updatedAt: params.nowIso || new Date().toISOString(),
  };
}
