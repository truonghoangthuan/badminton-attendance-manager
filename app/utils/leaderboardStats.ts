export interface RawAttendance {
  name: string;
  isJoining: boolean;
  actualAttended: boolean;
  guestCount?: number;
}

export interface RawSessionItem {
  id?: string;
  date: string;
  shuttlecocksUsed?: number;
  attendances: RawAttendance[];
}

export interface PlayerStats {
  rank?: number;
  name: string;
  matchesPlayed: number;
  totalRsvps: number;
  reliabilityRate: number;
  lastPlayedDate: string;
}

export function calculatePlayerStats(sessions: RawSessionItem[]): PlayerStats[] {
  const statsMap: Record<string, { matches: number; rsvps: number; lastDate: string }> = {};

  for (const session of sessions) {
    const sessionDate = (session.date || '').split('T')[0];
    for (const att of session.attendances || []) {
      const name = att.name;
      if (!name) continue;

      if (!statsMap[name]) {
        statsMap[name] = { matches: 0, rsvps: 0, lastDate: '' };
      }

      if (att.isJoining) {
        statsMap[name].rsvps += 1;
      }

      if (att.actualAttended) {
        statsMap[name].matches += 1;
        if (!statsMap[name].lastDate || sessionDate > statsMap[name].lastDate) {
          statsMap[name].lastDate = sessionDate;
        }
      }
    }
  }

  return Object.entries(statsMap)
    .filter(([_, stat]) => stat.matches > 0)
    .map(([name, stat]) => {
      const totalRsvps = Math.max(stat.matches, stat.rsvps);
      const reliability = stat.rsvps > 0 ? Math.round((stat.matches / stat.rsvps) * 100) : 100;
      return {
        name,
        matchesPlayed: stat.matches,
        totalRsvps,
        reliabilityRate: Math.min(100, reliability),
        lastPlayedDate: stat.lastDate,
      };
    })
    .sort((a, b) => {
      if (b.matchesPlayed !== a.matchesPlayed) {
        return b.matchesPlayed - a.matchesPlayed;
      }
      if (b.reliabilityRate !== a.reliabilityRate) {
        return b.reliabilityRate - a.reliabilityRate;
      }
      const dateComparison = (b.lastPlayedDate || '').localeCompare(a.lastPlayedDate || '');
      if (dateComparison !== 0) {
        return dateComparison;
      }
      return a.name.localeCompare(b.name);
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
}
