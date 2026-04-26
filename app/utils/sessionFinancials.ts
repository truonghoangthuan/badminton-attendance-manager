export type SessionFinancials = {
  courtCost?: number;
  shuttlecocksUsed?: number;
  shuttlecockPackPrice?: number;
  shuttlecockPrice?: number;
};

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
  const courtCost = toNumber(financials?.courtCost);
  const shuttlecocksUsed = toNumber(financials?.shuttlecocksUsed);
  const shuttlecockPrice = resolveShuttlecockPrice(financials);

  return courtCost + shuttlecocksUsed * shuttlecockPrice;
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
  const courtCost = toNumber(financials?.courtCost);
  const shuttlecocksUsed = toNumber(financials?.shuttlecocksUsed);
  const shuttlecockPackPrice = toNumber(financials?.shuttlecockPackPrice);
  const rawShuttlecockPrice = shuttlecockPackPrice > 0 ? shuttlecockPackPrice / SHUTTLECOCKS_PER_PACK : 0;
  const shuttlecockPrice = resolveShuttlecockPrice(financials);
  const shuttlecockCost = shuttlecocksUsed * shuttlecockPrice;
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
    shuttlecockCost,
    totalSessionCost,
    rawFeePerPerson,
    feePerPerson,
    totalActualPlayers,
  };
};
