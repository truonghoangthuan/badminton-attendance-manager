export type SessionFinancials = {
  courtCost?: number;
  shuttlecocksUsed?: number;
  shuttlecockPackPrice?: number;
  shuttlecockPrice?: number;
  additionalShuttlecocksUsed?: number;
  additionalShuttlecockPrice?: number;
  calculatedFeePerPerson?: number;
};

export interface UnpaidSessionItem {
  sessionId: string;
  attendanceId: string;
  date: string;
  time: string;
  location: string;
  guestCount: number;
  slots: number;
  feePerPerson: number;
  amountOwed: number;
}

export interface UnpaidPlayerSummary {
  name: string;
  totalSlots: number;
  totalOwed: number;
  sessions: UnpaidSessionItem[];
}

const SHUTTLECOCKS_PER_PACK = 12;
const PRICE_ROUNDING_STEP = 1000;

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return 0;
};

export const roundToNearestThousand = (value: number) => {
  return Math.round(value / PRICE_ROUNDING_STEP) * PRICE_ROUNDING_STEP;
};

export const getShuttlecockPriceFromPack = (packPrice: number) => {
  if (packPrice <= 0) {
    return 0;
  }

  return roundToNearestThousand(packPrice / SHUTTLECOCKS_PER_PACK);
};

export const resolveShuttlecockPrice = (financials?: SessionFinancials | null) => {
  const packPrice = toNumber(financials?.shuttlecockPackPrice);

  if (packPrice > 0) {
    return getShuttlecockPriceFromPack(packPrice);
  }

  return toNumber(financials?.shuttlecockPrice);
};

export const calculateTotalSessionCost = (financials?: SessionFinancials | null) => {
  const courtCost = Math.max(0, toNumber(financials?.courtCost));
  const shuttlecocksUsed = Math.max(0, toNumber(financials?.shuttlecocksUsed));
  const shuttlecockPrice = Math.max(0, resolveShuttlecockPrice(financials));
  const additionalShuttlecocksUsed = Math.max(0, toNumber(financials?.additionalShuttlecocksUsed));
  const additionalShuttlecockPrice = Math.max(0, toNumber(financials?.additionalShuttlecockPrice));

  return (
    courtCost +
    shuttlecocksUsed * shuttlecockPrice +
    additionalShuttlecocksUsed * additionalShuttlecockPrice
  );
};

export const calculateFeePerPerson = (totalSessionCost: number, totalActualPlayers: number) => {
  if (totalActualPlayers <= 0) {
    return 0;
  }

  return Math.ceil(totalSessionCost / totalActualPlayers / PRICE_ROUNDING_STEP) * PRICE_ROUNDING_STEP;
};

export const getSessionFinancialBreakdown = (
  financials: SessionFinancials | null | undefined,
  totalActualPlayers: number,
) => {
  const courtCost = Math.max(0, toNumber(financials?.courtCost));
  const shuttlecocksUsed = Math.max(0, toNumber(financials?.shuttlecocksUsed));
  const shuttlecockPackPrice = Math.max(0, toNumber(financials?.shuttlecockPackPrice));
  const rawShuttlecockPrice = shuttlecockPackPrice > 0 ? shuttlecockPackPrice / SHUTTLECOCKS_PER_PACK : 0;
  const shuttlecockPrice = Math.max(0, resolveShuttlecockPrice(financials));
  const packShuttlecockCost = shuttlecocksUsed * shuttlecockPrice;
  const additionalShuttlecocksUsed = Math.max(0, toNumber(financials?.additionalShuttlecocksUsed));
  const additionalShuttlecockPrice = Math.max(0, toNumber(financials?.additionalShuttlecockPrice));
  const additionalShuttlecockCost = additionalShuttlecocksUsed * additionalShuttlecockPrice;
  const shuttlecockCost = packShuttlecockCost + additionalShuttlecockCost;
  const totalSessionCost = courtCost + shuttlecockCost;
  const rawFeePerPerson = totalActualPlayers > 0 ? totalSessionCost / totalActualPlayers : 0;
  const feePerPerson = calculateFeePerPerson(totalSessionCost, totalActualPlayers);

  return {
    courtCost,
    shuttlecocksPerPack: SHUTTLECOCKS_PER_PACK,
    shuttlecocksUsed,
    shuttlecockPackPrice,
    rawShuttlecockPrice,
    shuttlecockPrice,
    packShuttlecockCost,
    additionalShuttlecocksUsed,
    additionalShuttlecockPrice,
    additionalShuttlecockCost,
    shuttlecockCost,
    totalSessionCost,
    rawFeePerPerson,
    feePerPerson,
    totalActualPlayers,
  };
};

export const calculateUnpaidSummary = (
  sessions: any[],
  attendancesBySessionId: Record<string, any[]> | Map<string, any[]>,
): UnpaidPlayerSummary[] => {
  const byPlayer = new Map<string, UnpaidPlayerSummary>();

  for (const session of sessions || []) {
    if (!session?.id) continue;
    const attList: any[] =
      attendancesBySessionId instanceof Map
        ? attendancesBySessionId.get(session.id) || []
        : attendancesBySessionId?.[session.id] || [];

    const totalActualPlayers = attList.reduce((acc, a) => {
      if (!a?.actualAttended) return acc;
      const guests = Math.max(0, Math.floor(Number(a.guestCount) || 0));
      return acc + 1 + guests;
    }, 0);

    const persistedFee = toNumber(session.financials?.calculatedFeePerPerson);
    const feePerPerson =
      persistedFee > 0
        ? persistedFee
        : getSessionFinancialBreakdown(session.financials, totalActualPlayers).feePerPerson;

    for (const att of attList) {
      if (!att?.actualAttended || att?.hasPaid) continue;
      const cleanName = String(att.name || '').trim();
      if (!cleanName) continue;

      const key = cleanName.toLowerCase();
      const guestCount = Math.max(0, Math.floor(Number(att.guestCount) || 0));
      const slots = 1 + guestCount;
      const amountOwed = feePerPerson * slots;

      const existing = byPlayer.get(key) || {
        name: cleanName,
        totalSlots: 0,
        totalOwed: 0,
        sessions: [],
      };

      existing.totalSlots += slots;
      existing.totalOwed += amountOwed;
      existing.sessions.push({
        sessionId: session.id,
        attendanceId: att.id || '',
        date: session.date || '',
        time: session.time || '',
        location: session.location || '',
        guestCount,
        slots,
        feePerPerson,
        amountOwed,
      });

      byPlayer.set(key, existing);
    }
  }

  return Array.from(byPlayer.values())
    .map((entry) => ({
      ...entry,
      sessions: [...entry.sessions].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    }))
    .sort((a, b) => {
      if (b.totalOwed !== a.totalOwed) return b.totalOwed - a.totalOwed;
      if (b.sessions.length !== a.sessions.length) return b.sessions.length - a.sessions.length;
      return a.name.localeCompare(b.name);
    });
};
