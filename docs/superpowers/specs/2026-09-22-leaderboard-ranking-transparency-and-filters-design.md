# Leaderboard Ranking Transparency and Time Filters Design

## 1. Overview
This specification details the enhancements for the `/leaderboard` page of the Badminton Attendance Manager. It achieves two primary goals:
1. **Ranking Transparency:** Provide a clear, accessible explanation of how players are ranked, what tiebreakers apply, and how titles/badges are awarded.
2. **Timeframe Filters:** Allow players and organizers to view stats, podium rankings, and the full member directory across three time windows: **All time**, **This month**, and **Custom time range**.

---

## 2. User Experience & UI Specifications

### 2.1 "How Ranking Works" Modal (`RankingRulesModal`)
* **Trigger:** An info button in the page header next to the title or back link:
  * Glass button styling (`UIGlassButton`) with a help/info icon (`Info` or `HelpCircle` from `lucide-vue-next`).
  * Text label: `t('leaderboard.rulesButton')` (e.g., "Cách tính hạng" / "How Ranking Works").
* **Modal Content (`UIGlassModal`):**
  * **Header:** Kicker `t('leaderboard.rulesKicker')` ("Quy định minh bạch" / "Transparent Guidelines") and Title `t('leaderboard.rulesTitle')` ("Cách xếp hạng bảng vàng" / "How Ranking Works").
  * **Section 1 - Tiêu chí chính (Primary Metric):**
    * Number of sessions attended (`matchesPlayed`).
    * Explanation: Each session where the organizer marks the player as physically present (`actualAttended = true`) awards 1 match.
  * **Section 2 - Tiêu chí phụ (Tie-breaker):**
    * Attendance Reliability Rate (`reliabilityRate` % = `(matches / rsvps) * 100`).
    * Explanation: If two players have the exact same number of matches, the player with fewer cancellations/no-shows (higher reliability rate) ranks higher.
    * Tertiary tiebreaker: Most recent active match date (`lastPlayedDate`).
  * **Section 3 - Hệ thống danh hiệu (Badges & Titles):**
    * 🥇 **Quán Quân (Club Legend):** Rank 1
    * 🥈 **Á Quân (Top Contender):** Rank 2
    * 🥉 **Hạng Ba (Star Player):** Rank 3
    * 🟢 **Regular:** Rank 4 to 10
    * ⚪ **Member:** Rank 11 and above

### 2.2 Timeframe Filter Bar
* **Location:** Positioned between the header and the stats cards bento grid.
* **Filter Tabs / Segmented Control:**
  * **Tất cả (All time):** Default filter. Computes stats and roster across all recorded sessions.
  * **Tháng này (This month):** Pre-fills the current calendar month range (`YYYY-MM-01` to `YYYY-MM-[lastDay]`).
  * **Khoảng thời gian (Custom time range):** Reveals start and end date input fields.
* **Custom Date Range Inputs:**
  * Inputs: Start Date (`Từ ngày`) and End Date (`Đến ngày`) formatted via HTML5 date inputs styled with Tailwind glass styling.
  * Quick Reset / Clear button to revert to All Time.
* **Active Window Summary Indicator:**
  * Subtle indicator displaying the active date range and the number of sessions found within the window (e.g., "01/09/2026 - 30/09/2026 • 8 buổi cầu").

---

## 3. Data Architecture & In-Memory Reactive Pipeline

### 3.1 Data Ingestion (Initial Load)
* On page mount, query all sessions ordered by `date` desc from Firestore collection `sessions`.
* Concurrently fetch attendances from subcollections `sessions/{id}/attendances`.
* Cache the parsed raw sessions in a reactive reference:
  ```ts
  interface RawSessionAttendance {
    name: string;
    isJoining: boolean;
    actualAttended: boolean;
    guestCount?: number;
  }

  interface RawSessionItem {
    id: string;
    date: string; // "YYYY-MM-DD"
    shuttlecocksUsed: number;
    attendances: RawSessionAttendance[];
  }
  ```

### 3.2 Reactive Derivation
* **State:**
  * `filterMode: 'all' | 'this_month' | 'custom'` (default: `'all'`)
  * `customStartDate: string`
  * `customEndDate: string`
  * `showRulesModal: boolean` (default: `false`)
* **Effective Date Range:**
  * Computes `{ start?: string, end?: string }`.
  * For `'this_month'`: calculates current year and month dynamically.
  * For `'custom'`: uses `customStartDate` and `customEndDate`.
* **Filtered Sessions:**
  * Sessions whose `session.date` matches:
    * If `start`: `session.date >= start`
    * If `end`: `session.date <= end`
* **Computed Stats Cards:**
  * `totalSessionsCount`: `filteredSessions.length`
  * `totalPlayerCheckIns`: sum of `1 + (att.guestCount || 0)` for attendees with `actualAttended = true`.
  * `totalShuttlecocksUsed`: sum of `session.shuttlecocksUsed`.
  * `totalActiveMembers`: count of unique players who attended $\ge 1$ session in the period.
* **Computed Player Roster (`allPlayers`):**
  * Aggregate across `filteredSessions`:
    * `matches`: count of `actualAttended = true`.
    * `rsvps`: count of `isJoining = true`.
    * `lastDate`: maximum `session.date` where player attended.
  * Filter out players with `matches === 0`.
  * Compute `reliabilityRate = rsvps > 0 ? Math.min(100, Math.round((matches / rsvps) * 100)) : 100`.
  * Sort order:
    1. `b.matchesPlayed - a.matchesPlayed` (descending)
    2. `b.reliabilityRate - a.reliabilityRate` (descending)
    3. `b.lastPlayedDate.localeCompare(a.lastPlayedDate)` (descending)
* **Top 3 Podium:** `allPlayers.slice(0, 3)`.
* **Member Directory Table:** Filtered by `searchQuery` over `allPlayers`.

---

## 4. Internationalization (i18n)

Update `app/locales/vi.ts` and `app/locales/en.ts` with:
* `leaderboard.rulesButton`: "Cách tính hạng" / "How Ranking Works"
* `leaderboard.rulesTitle`: "Cách xếp hạng bảng vàng" / "How Ranking Works"
* `leaderboard.rulesKicker`: "Quy định minh bạch" / "Transparent Guidelines"
* `leaderboard.rulesPrimaryTitle`: "1. Tiêu chí chính: Số buổi tham gia" / "1. Primary: Matches Attended"
* `leaderboard.rulesPrimaryDesc`: "Mỗi buổi cầu bạn có mặt thực tế và được điểm danh trên sân sẽ tính 1 lượt." / "Each session where you are physically checked in on court counts as 1 match."
* `leaderboard.rulesSecondaryTitle`: "2. Tiêu chí phụ: Điểm uy tín (Reliability)" / "2. Tiebreaker: Attendance Reliability"
* `leaderboard.rulesSecondaryDesc`: "Tỉ lệ % số buổi thực tế trên số lần đăng ký RSVP. Giúp phân định thứ hạng khi bằng số buổi." / "Percentage of attended sessions against RSVP reservations. Breaks ties when matches are equal."
* `leaderboard.rulesBadgesTitle`: "3. Hệ thống danh hiệu" / "3. Title Badges"
* `leaderboard.rulesClose`: "Đã hiểu" / "Got it"
* `leaderboard.filterAll`: "Tất cả" / "All time"
* `leaderboard.filterThisMonth`: "Tháng này" / "This month"
* `leaderboard.filterCustom`: "Tùy chọn ngày" / "Custom range"
* `leaderboard.fromDate`: "Từ ngày" / "From"
* `leaderboard.toDate`: "Đến ngày" / "To"
* `leaderboard.sessionsInPeriod`: "{count} buổi trong giai đoạn này" / "{count} sessions in this period"
* `leaderboard.noActivityInPeriod`: "Không có hoạt động nào trong khoảng thời gian này." / "No session activity recorded in this period."

---

## 5. Verification Plan
* `npm run build` succeeds without TypeScript or template errors.
* Toggle between `All time`, `This month`, and `Custom range`:
  * Verify top 4 stats, Top 3 podium, and member directory update synchronously.
  * Verify only players with $\ge 1$ match appear in the filtered view.
  * Verify search query works seamlessly within the filtered player list.
* Click "How Ranking Works" button:
  * Verify modal opens smoothly with accurate descriptions and badge breakdown.
  * Verify modal can be closed via ESC, backdrop click, or close button.
