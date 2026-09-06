/**
 * Formats a date string or timestamp into DD/MM/YYYY.
 *
 * @param dateStr - ISO string (YYYY-MM-DD), full ISO timestamp, or date string
 * @returns Formatted date string in DD/MM/YYYY, or empty string if input is falsy
 *
 * @example
 * formatDisplayDate('2026-09-04') // => '04/09/2026'
 * formatDisplayDate('2026-09-04T12:00:00Z') // => '04/09/2026'
 */
export const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Return as-is if already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Fast path for standard YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Fallback for full ISO timestamps or valid date strings
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return trimmed;
};
