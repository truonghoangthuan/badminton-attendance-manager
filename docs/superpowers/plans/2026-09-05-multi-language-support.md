# Multi-Language Support (English & Vietnamese) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive bilingual localization (English `en` and Vietnamese `vi`) across all public and admin flows in Gravity Badminton Attendance Manager, with a Direction 2 (Compact Globe Popover Dropdown) language switcher.

**Architecture:** A lightweight, reactive Nuxt 4 composable (`useI18n`) backed by strongly-typed dictionaries (`app/locales/en.ts` and `app/locales/vi.ts`), persisted in both `localStorage` and `useCookie` for SSR-safe hydration. The Direction 2 glassmorphic `LanguageSwitcher.vue` component is mounted into both `default.vue` and `admin.vue` layouts, enabling reactive 1-click locale switching across all routes without page reloads.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, Tailwind CSS, Lucide Icons, Node.js built-in test runner (`node --test`).

## Global Constraints

- Never break existing Firebase Auth / Firestore attendance or financial data structures.
- Follow `AGENTS.md` strictly: preserve existing glass visual style (`border-brand-line`, `bg-brand-sand`, `text-brand-ink`).
- Direction 2 approved via huashu-design: Compact globe trigger `[ 🌐 EN ▾ ]` / `[ 🌐 VI ▾ ]` opening a glass popover with native language names (`English`, `Tiếng Việt`), flag indicators, and checkmarks.
- All translation keys must have parity between `en` and `vi` (no missing keys).
- SSR-safe: ensure no hydration mismatch by initializing locale from cookie on server and synchronizing with localStorage on client.

---

### Task 1: Core i18n Engine & Locale Dictionaries

**Files:**
- Create: `app/locales/en.ts`
- Create: `app/locales/vi.ts`
- Create: `app/composables/useI18n.ts`
- Create: `tests/i18n.test.mjs`

**Interfaces:**
- Consumes: None
- Produces:
  - `export type Locale = 'en' | 'vi'`
  - `export function useI18n(): { locale: Ref<Locale>; setLocale: (l: Locale) => void; t: (key: string, params?: Record<string, string | number>) => string; locales: { code: Locale; name: string; nativeName: string; flag: string; region: string }[] }`

- [ ] **Step 1: Write the failing unit test for the translation engine**

Create `tests/i18n.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../app/locales/en.ts';
import { vi } from '../app/locales/vi.ts';

function getNestedKey(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function formatString(template, params = {}) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => (params[key] !== undefined ? String(params[key]) : `{${key}}`));
}

test('i18n key parity between en and vi', () => {
  function getAllKeys(obj, prefix = '') {
    return Object.keys(obj).reduce((res, el) => {
      if (Array.isArray(obj[el])) {
        return res;
      } else if (typeof obj[el] === 'object' && obj[el] !== null) {
        return [...res, ...getAllKeys(obj[el], prefix + el + '.')];
      }
      return [...res, prefix + el];
    }, []);
  }

  const enKeys = getAllKeys(en).sort();
  const viKeys = getAllKeys(vi).sort();

  const missingInVi = enKeys.filter(k => !viKeys.includes(k));
  const missingInEn = viKeys.filter(k => !enKeys.includes(k));

  assert.deepEqual(missingInVi, [], `Missing in VI: ${missingInVi.join(', ')}`);
  assert.deepEqual(missingInEn, [], `Missing in EN: ${missingInEn.join(', ')}`);
});

test('formatString interpolates parameters correctly', () => {
  const tpl = 'Match with {count} players on {court}';
  const res = formatString(tpl, { count: 8, court: 'Court 4' });
  assert.equal(res, 'Match with 8 players on Court 4');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/i18n.test.mjs`
Expected: FAIL with "Cannot find module '../app/locales/en.ts'"

- [ ] **Step 3: Implement English dictionary (`app/locales/en.ts`)**

Create `app/locales/en.ts`:
```typescript
export const en = {
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied!',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    yes: 'Yes',
    no: 'No',
    unknown: 'Unknown',
  },
  nav: {
    brandSubtitle: 'Gravity Team',
    brandTitle: 'Gravity',
    brandHighlight: 'Badminton',
    home: 'Home',
    leaderboard: 'Leaderboard',
    dashboard: 'Dashboard',
    backToSite: 'Back to Site',
    logout: 'Logout session',
    welcomeBack: 'Welcome back',
    goodMorning: 'Good morning!',
    goodAfternoon: 'Good afternoon!',
    goodEvening: 'Good evening!',
    editNameAria: 'Change display name',
  },
  language: {
    chooseLanguage: 'Choose Language',
    enName: 'English',
    enDesc: 'United States / Global',
    viName: 'Tiếng Việt',
    viDesc: 'Việt Nam (Bản địa)',
  },
  profileModal: {
    title: 'Update your display name',
    description: 'This changes how your name appears the next time you join a session.',
    nameLabel: 'Display Name',
    namePlaceholder: 'e.g. John Doe',
    saveButton: 'Save Name',
    errorRequired: 'Please enter a name',
    errorTooShort: 'Name is too short',
    errorSaveFailed: 'Failed to save name. Please try again.',
    toastSuccessTitle: 'Name updated',
    toastSuccessDetail: 'Your display name was changed successfully.',
  },
  usernamePrompt: {
    title: 'Enter your name to continue',
    description: 'Please set your name first so organizers and players can identify you.',
    placeholder: 'e.g. Alex Nguyen',
    continue: 'Continue',
  },
  home: {
    heroKicker: 'Gravity Sessions',
    heroTitle: 'Step onto the court with Gravity.',
    heroSubtitle: 'Effortless RSVP tracking, real-time court capacity, and transparent automated fee splits.',
    nextSessionTitle: 'Nearest Upcoming Match',
    noUpcomingTitle: 'No upcoming sessions scheduled',
    noUpcomingDesc: 'Stay tuned! The organizers will announce the next badminton session soon.',
    openSessionsTitle: 'Upcoming Matches',
    pastSessionsTitle: 'Past Matches',
    capacityFull: 'Session is full',
    capacitySpotsLeft: '{count} spots left',
    capacityJoined: '{count} / {max} joined',
    viewMatch: 'View Match Details',
    joinNow: 'Join Match',
  },
  sessionStatus: {
    open: 'Open for RSVP',
    locked: 'Locked for Check-in',
    completed: 'Completed',
  },
  sessionDetail: {
    backToHome: 'Back to all sessions',
    courtInfoTitle: 'Match Details',
    courtNumber: 'Court {court}',
    shuttleBrand: 'Shuttles',
    skillLevel: 'Skill Level',
    organizer: 'Organizer',
    capacityHeading: 'Court Slot Capacity',
    capacityMeterText: '{current} of {max} slots filled ({available} available)',
    rsvpCardTitle: 'Your Attendance Status',
    rsvpSubtext: 'Let the team know if you are attending so we can prepare enough shuttles.',
    attendingYes: 'I am Joining',
    attendingNo: 'Cannot Make It',
    guestsLabel: 'Bringing Guests (+1, +2)?',
    guestsNone: 'Just me (0 guests)',
    guestsOne: '+1 Guest',
    guestsCount: '+{count} Guests',
    submitRsvp: 'Submit RSVP',
    rsvpSubmittedSuccess: 'Your RSVP has been recorded.',
    attendeesTitle: 'Players Roster ({count})',
    noAttendees: 'No players have registered yet. Be the first to join!',
    financialsTitle: 'Session Fee Breakdown',
    financialsSubtitle: 'Costs are split evenly among all attendees who checked in on court.',
    courtFee: 'Court Rental Fee',
    shuttleFee: 'Shuttlecocks ({count} used)',
    totalCost: 'Total Session Cost',
    feePerPerson: 'Fee Per Player',
    yourShareTitle: 'Your Total Amount Due',
    yourShareFormula: '{baseFee} × {playerMultiplier} ({guestNote})',
    justYou: '1 player',
    youAndGuests: 'You + {guests} guests',
    paymentQRTitle: 'Quick Mobile Banking QR (VietQR)',
    paymentQRSubtitle: 'Scan with any banking app in Vietnam. Fee and transfer note are pre-filled.',
    bankInfoTitle: 'Direct Bank Transfer',
    bankName: 'Bank',
    accountNumber: 'Account Number',
    accountName: 'Account Holder',
    transferMemo: 'Transfer Note',
    copyMemoTooltip: 'Copy exact transfer note',
    paidStatusYes: 'Paid',
    paidStatusNo: 'Unpaid',
    hasPaidBadge: 'Payment Verified',
    waitingPaymentBadge: 'Pending Payment',
    socialShareButton: 'Share Announcement',
  },
  socialShare: {
    modalTitle: 'Social Announcement Generator',
    modalDesc: 'Copy 1-click formatted announcements for Zalo, Messenger, or Telegram groups.',
    tabInvite: 'Session Invite',
    tabSettlement: 'Payment Settlement',
    copyButton: 'Copy Formatted Text',
    toastCopied: 'Announcement copied to clipboard!',
  },
  leaderboard: {
    badge: 'Community Roster',
    title: 'Badminton Hall of Fame',
    subtitle: 'Celebrating regular attendance, court dedication, and active participation.',
    rank: 'Rank',
    player: 'Player',
    sessionsAttended: 'Matches Attended',
    attendanceRate: 'Attendance Rate',
    totalGames: 'Total Matches',
    topPodiumTitle: 'Top Active Players',
  },
  admin: {
    panelTitle: 'Admin Panel',
    panelSubtitle: 'Management Console',
    workflowTitle: 'Workflow',
    workflowDesc: 'Review upcoming sessions, then drill into a single match to manage attendance and finance.',
    createSessionBtn: 'Create New Session',
    editSessionBtn: 'Edit Session',
    deleteSessionBtn: 'Delete Session',
    sessionsListTitle: 'Manage Sessions',
    noSessions: 'No sessions found.',
    courtCostLabel: 'Court Rental Cost (VND)',
    shuttleCountLabel: 'Shuttlecocks Used',
    shuttlePriceLabel: 'Price per Shuttle (VND)',
    maxPlayersLabel: 'Max Capacity (Players)',
    checkinRosterTitle: 'Player Check-in & Payment Status',
    walkInBtn: 'Add Walk-in Player',
    walkInDialogTitle: 'Manual Player Walk-In Entry',
    walkInNameLabel: 'Player Name',
    walkInGuestsLabel: 'Additional Guests',
    markAttended: 'Attended',
    markPaid: 'Paid',
    exportCsvBtn: 'Export CSV Report',
    deleteConfirmTitle: 'Delete Session?',
    deleteConfirmMessage: 'This will permanently remove this session and all its attendance records.',
  },
};
```

- [ ] **Step 4: Implement Vietnamese dictionary (`app/locales/vi.ts`)**

Create `app/locales/vi.ts`:
```typescript
export const vi = {
  common: {
    loading: 'Đang tải...',
    save: 'Lưu',
    cancel: 'Hủy',
    edit: 'Sửa',
    delete: 'Xóa',
    confirm: 'Xác nhận',
    back: 'Quay lại',
    close: 'Đóng',
    copy: 'Sao chép',
    copied: 'Đã sao chép!',
    actions: 'Hành động',
    status: 'Trạng thái',
    date: 'Ngày',
    time: 'Giờ',
    location: 'Địa điểm',
    yes: 'Có',
    no: 'Không',
    unknown: 'Chưa rõ',
  },
  nav: {
    brandSubtitle: 'Gravity Team',
    brandTitle: 'Gravity',
    brandHighlight: 'Badminton',
    home: 'Trang chủ',
    leaderboard: 'Bảng xếp hạng',
    dashboard: 'Quản trị',
    backToSite: 'Về trang chính',
    logout: 'Đăng xuất',
    welcomeBack: 'Chào mừng trở lại',
    goodMorning: 'Chào buổi sáng!',
    goodAfternoon: 'Chào buổi chiều!',
    goodEvening: 'Chào buổi tối!',
    editNameAria: 'Đổi tên hiển thị',
  },
  language: {
    chooseLanguage: 'Chọn ngôn ngữ',
    enName: 'English',
    enDesc: 'United States / Global',
    viName: 'Tiếng Việt',
    viDesc: 'Việt Nam (Bản địa)',
  },
  profileModal: {
    title: 'Cập nhật tên hiển thị của bạn',
    description: 'Tên này sẽ hiển thị trong danh sách điểm danh cho các buổi cầu tiếp theo.',
    nameLabel: 'Tên hiển thị',
    namePlaceholder: 'Ví dụ: Nguyễn Văn A',
    saveButton: 'Lưu tên',
    errorRequired: 'Vui lòng nhập tên của bạn',
    errorTooShort: 'Tên quá ngắn',
    errorSaveFailed: 'Không thể lưu tên. Vui lòng thử lại.',
    toastSuccessTitle: 'Đã cập nhật tên',
    toastSuccessDetail: 'Tên hiển thị của bạn đã được thay đổi thành công.',
  },
  usernamePrompt: {
    title: 'Nhập tên của bạn để tiếp tục',
    description: 'Vui lòng đặt tên hiển thị để ban tổ chức và các thành viên dễ nhận diện bạn trên sân.',
    placeholder: 'Ví dụ: Hoàng Thuận',
    continue: 'Tiếp tục',
  },
  home: {
    heroKicker: 'Gravity Sessions',
    heroTitle: 'Tự tin ra sân cùng Gravity Team.',
    heroSubtitle: 'Điểm danh tức thì, theo dõi sĩ số sân theo thời gian thực và chia tiền sân cầu tự động minh bạch.',
    nextSessionTitle: 'Trận cầu sắp diễn ra gần nhất',
    noUpcomingTitle: 'Chưa có buổi cầu nào sắp diễn ra',
    noUpcomingDesc: 'Hãy theo dõi nhé! Ban tổ chức sẽ sớm thông báo lịch thi đấu buổi tiếp theo.',
    openSessionsTitle: 'Các buổi cầu sắp diễn ra',
    pastSessionsTitle: 'Lịch sử các buổi cầu trước',
    capacityFull: 'Đã đủ số lượng',
    capacitySpotsLeft: 'Còn {count} chỗ',
    capacityJoined: '{count} / {max} đã đăng ký',
    viewMatch: 'Xem chi tiết buổi cầu',
    joinNow: 'Tham gia buổi cầu',
  },
  sessionStatus: {
    open: 'Đang mở đăng ký',
    locked: 'Đã chốt danh sách',
    completed: 'Đã kết thúc',
  },
  sessionDetail: {
    backToHome: 'Xem tất cả buổi cầu',
    courtInfoTitle: 'Thông tin trận đấu',
    courtNumber: 'Sân {court}',
    shuttleBrand: 'Loại cầu',
    skillLevel: 'Trình độ',
    organizer: 'Người tổ chức',
    capacityHeading: 'Sĩ số giới hạn trên sân',
    capacityMeterText: 'Đã đăng ký {current} / {max} vị trí (còn trống {available})',
    rsvpCardTitle: 'Trạng thái tham gia của bạn',
    rsvpSubtext: 'Vui lòng thông báo sớm để ban tổ chức chuẩn bị đủ số lượng cầu và sân.',
    attendingYes: 'Tôi sẽ tham gia',
    attendingNo: 'Bận không tham gia',
    guestsLabel: 'Dắt thêm bạn đi cùng (+1, +2)?',
    guestsNone: 'Chỉ mình tôi (0 người đi kèm)',
    guestsOne: '+1 người đi cùng',
    guestsCount: '+{count} người đi cùng',
    submitRsvp: 'Xác nhận đăng ký',
    rsvpSubmittedSuccess: 'Đã cập nhật trạng thái tham gia của bạn.',
    attendeesTitle: 'Danh sách người chơi ({count})',
    noAttendees: 'Chưa có ai đăng ký. Hãy là người đầu tiên tham gia!',
    financialsTitle: 'Quyết toán chi phí buổi cầu',
    financialsSubtitle: 'Chi phí được chia đều tự động cho những ai thực tế có mặt trên sân.',
    courtFee: 'Tiền thuê sân',
    shuttleFee: 'Tiền cầu ({count} quả đã dùng)',
    totalCost: 'Tổng chi phí buổi cầu',
    feePerPerson: 'Tiền mỗi người',
    yourShareTitle: 'Số tiền bạn cần thanh toán',
    yourShareFormula: '{baseFee} × {playerMultiplier} ({guestNote})',
    justYou: '1 người',
    youAndGuests: 'Bạn + {guests} người đi kèm',
    paymentQRTitle: 'Quét mã VietQR chuyển khoản nhanh',
    paymentQRSubtitle: 'Quét bằng bất kỳ ứng dụng ngân hàng nào. Số tiền và nội dung chuyển khoản đã được điền sẵn.',
    bankInfoTitle: 'Thông tin tài khoản ngân hàng',
    bankName: 'Ngân hàng',
    accountNumber: 'Số tài khoản',
    accountName: 'Chủ tài khoản',
    transferMemo: 'Nội dung chuyển khoản',
    copyMemoTooltip: 'Sao chép đúng cú pháp chuyển khoản',
    paidStatusYes: 'Đã thanh toán',
    paidStatusNo: 'Chưa thanh toán',
    hasPaidBadge: 'Đã xác nhận thanh toán',
    waitingPaymentBadge: 'Chờ thanh toán',
    socialShareButton: 'Chia sẻ thông báo',
  },
  socialShare: {
    modalTitle: 'Tạo thông báo chia sẻ mạng xã hội',
    modalDesc: 'Sao chép nhanh 1 chạm nội dung đã định dạng sẵn cho các nhóm Zalo, Messenger hoặc Telegram.',
    tabInvite: 'Mời tham gia sân',
    tabSettlement: 'Quyết toán tiền sân',
    copyButton: 'Sao chép nội dung',
    toastCopied: 'Đã sao chép nội dung thông báo vào bộ nhớ tạm!',
  },
  leaderboard: {
    badge: 'Cộng đồng Gravity',
    title: 'Bảng vàng danh dự cầu lông',
    subtitle: 'Tôn vinh sự hiện diện đều đặn, tinh thần thể thao và sự gắn bó với sân cầu.',
    rank: 'Hạng',
    player: 'Người chơi',
    sessionsAttended: 'Số buổi tham gia',
    attendanceRate: 'Tỷ lệ tham gia',
    totalGames: 'Tổng số trận',
    topPodiumTitle: 'Top người chơi năng nổ nhất',
  },
  admin: {
    panelTitle: 'Admin Panel',
    panelSubtitle: 'Bảng điều khiển quản trị',
    workflowTitle: 'Quy trình tổ chức',
    workflowDesc: 'Xem các buổi cầu sắp tới, sau đó chọn từng buổi để quản lý điểm danh và tài chính.',
    createSessionBtn: 'Tạo buổi cầu mới',
    editSessionBtn: 'Chỉnh sửa buổi cầu',
    deleteSessionBtn: 'Xóa buổi cầu',
    sessionsListTitle: 'Quản lý các buổi cầu',
    noSessions: 'Chưa có buổi cầu nào.',
    courtCostLabel: 'Tiền thuê sân (VND)',
    shuttleCountLabel: 'Số cầu đã sử dụng',
    shuttlePriceLabel: 'Giá mỗi quả cầu (VND)',
    maxPlayersLabel: 'Giới hạn số người chơi',
    checkinRosterTitle: 'Điểm danh & Trạng thái thanh toán',
    walkInBtn: 'Thêm người chơi vãng lai',
    walkInDialogTitle: 'Thêm người chơi trực tiếp tại sân',
    walkInNameLabel: 'Tên người chơi',
    walkInGuestsLabel: 'Số người đi kèm',
    markAttended: 'Có mặt',
    markPaid: 'Đã trả tiền',
    exportCsvBtn: 'Xuất báo cáo CSV',
    deleteConfirmTitle: 'Xóa buổi cầu này?',
    deleteConfirmMessage: 'Hành động này sẽ xóa vĩnh viễn buổi cầu và tất cả dữ liệu điểm danh liên quan.',
  },
};
```

- [ ] **Step 5: Implement `useI18n` composable (`app/composables/useI18n.ts`)**

Create `app/composables/useI18n.ts`:
```typescript
import { en } from '../locales/en';
import { vi } from '../locales/vi';

export type Locale = 'en' | 'vi';

export interface LocaleOption {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

export const AVAILABLE_LOCALES: LocaleOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    region: 'United States / Global',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    region: 'Việt Nam (Bản địa)',
  },
];

const dictionaries = { en, vi };

export function useI18n() {
  const cookieLocale = useCookie<Locale>('gravity_locale', {
    default: () => 'vi',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  const locale = useState<Locale>('current_locale', () => cookieLocale.value || 'vi');

  // Synchronize on client with localStorage
  if (import.meta.client) {
    const stored = localStorage.getItem('gravity_locale') as Locale | null;
    if (stored && (stored === 'en' || stored === 'vi') && stored !== locale.value) {
      locale.value = stored;
      cookieLocale.value = stored;
    }
  }

  const setLocale = (newLocale: Locale) => {
    if (newLocale !== 'en' && newLocale !== 'vi') return;
    locale.value = newLocale;
    cookieLocale.value = newLocale;
    if (import.meta.client) {
      localStorage.setItem('gravity_locale', newLocale);
      document.documentElement.setAttribute('lang', newLocale);
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const dict = dictionaries[locale.value] || dictionaries.vi;
    const parts = path.split('.');
    let cur: any = dict;

    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = cur[part];
      } else {
        // Fallback to English if missing
        let fallback: any = dictionaries.en;
        for (const fPart of parts) {
          if (fallback && typeof fallback === 'object' && fPart in fallback) {
            fallback = fallback[fPart];
          } else {
            fallback = undefined;
            break;
          }
        }
        cur = fallback !== undefined ? fallback : path;
        break;
      }
    }

    if (typeof cur !== 'string') {
      return path;
    }

    if (!params) {
      return cur;
    }

    return cur.replace(/\{(\w+)\}/g, (_, key) => {
      return params[key] !== undefined ? String(params[key]) : `{${key}}`;
    });
  };

  return {
    locale,
    setLocale,
    t,
    locales: AVAILABLE_LOCALES,
  };
}
```

- [ ] **Step 6: Run tests and verify they pass**

Run: `node --test tests/i18n.test.mjs`
Expected: PASS (2 tests passing)

- [ ] **Step 7: Commit Task 1**

```bash
git add app/locales/en.ts app/locales/vi.ts app/composables/useI18n.ts tests/i18n.test.mjs
git commit -m "feat(i18n): implement core localization engine and en/vi dictionaries"
```

---

### Task 2: Direction 2 Globe Popover Dropdown (`LanguageSwitcher.vue`)

**Files:**
- Create: `app/components/UI/LanguageSwitcher.vue`

**Interfaces:**
- Consumes: `useI18n`
- Produces: `<UILanguageSwitcher />` component with glass styling, accessible trigger button, click-outside and escape key listener, and active checkmark indicators.

- [ ] **Step 1: Implement `LanguageSwitcher.vue` component**

Create `app/components/UI/LanguageSwitcher.vue`:
```vue
<script setup lang="ts">
import { Check, ChevronDown, Globe } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';

const { locale, setLocale, locales, t } = useI18n();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const closeDropdown = () => {
  isOpen.value = false;
};

const handleSelect = (code: 'en' | 'vi') => {
  setLocale(code);
  closeDropdown();
};

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    closeDropdown();
  }
};

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<template>
  <div ref="containerRef" class="relative inline-block text-left">
    <!-- Trigger Button (Compact Globe Pill) -->
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-2xl border border-brand-line bg-white/90 px-3 py-2 text-xs font-black text-brand-ink shadow-sm backdrop-blur-sm transition-all hover:border-brand-court hover:bg-brand-sand focus:outline-none"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :aria-label="t('language.chooseLanguage')"
      @click="toggleDropdown"
    >
      <Globe :size="16" class="text-brand-court shrink-0" />
      <span class="font-black uppercase tracking-wider">{{ locale.toUpperCase() }}</span>
      <ChevronDown
        :size="14"
        class="text-brand-slate transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Glass Popover Card -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl border border-brand-line bg-white/95 p-1.5 shadow-[0_20px_40px_-10px_rgba(18,55,42,0.18),0_0_0_1px_rgba(219,230,221,0.8)] backdrop-blur-xl"
        role="menu"
        aria-orientation="vertical"
      >
        <div class="border-b border-brand-line/60 px-3 py-2">
          <p class="text-[9px] font-black uppercase tracking-[0.2em] text-brand-slate">
            {{ t('language.chooseLanguage') }}
          </p>
        </div>

        <div class="p-1 space-y-1">
          <button
            v-for="item in locales"
            :key="item.code"
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-bold transition-colors"
            :class="
              locale === item.code
                ? 'bg-brand-court/10 text-brand-court'
                : 'text-brand-ink hover:bg-brand-sand'
            "
            role="menuitem"
            @click="handleSelect(item.code)"
          >
            <div class="flex items-center gap-2">
              <span class="text-base">{{ item.flag }}</span>
              <div>
                <p class="font-black leading-tight">{{ item.nativeName }}</p>
                <p class="text-[10px] text-brand-slate font-medium mt-0.5">{{ item.region }}</p>
              </div>
            </div>
            <Check v-if="locale === item.code" :size="16" class="text-brand-court" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
```

- [ ] **Step 2: Verify component build and TypeScript validity**

Run: `npm run build`
Expected: Build succeeds without template or TS errors.

- [ ] **Step 3: Commit Task 2**

```bash
git add app/components/UI/LanguageSwitcher.vue
git commit -m "feat(ui): add compact globe popover LanguageSwitcher component (Direction 2)"
```

---

### Task 3: Layouts Shell Integration (`default.vue`, `admin.vue`, & Modals)

**Files:**
- Modify: `app/layouts/default.vue`
- Modify: `app/layouts/admin.vue`
- Modify: `app/components/UsernamePrompt.vue`

**Interfaces:**
- Consumes: `useI18n()`, `<UILanguageSwitcher />`
- Produces: Localized navigation shell for all public and admin pages.

- [ ] **Step 1: Update `default.vue` with `useI18n` and `<UILanguageSwitcher />`**

In `app/layouts/default.vue`:
1. Import and call `const { t, locale } = useI18n()`.
2. Replace static greeting calculation with localized greeting:
```typescript
const welcomeMessage = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return t('nav.goodMorning');
  if (hour < 18) return t('nav.goodAfternoon');
  return t('nav.goodEvening');
});
```
3. In the template right actions cluster:
```vue
<div class="flex items-center gap-2 md:gap-3">
  <!-- Language Switcher Trigger -->
  <UILanguageSwitcher />
  <!-- Rest of nav buttons -->
</div>
```
4. Localize template strings:
- `section-kicker`: `{{ t('nav.brandSubtitle') }}`
- Brand name: `{{ t('nav.brandTitle') }} <span class="text-brand-court">{{ t('nav.brandHighlight') }}</span>`
- Welcome back label: `{{ t('nav.welcomeBack') }}`
- Edit name button: `{{ t('common.edit') }}`
- Nav link Home: `{{ t('nav.home') }}`
- Nav link Leaderboard: `{{ t('nav.leaderboard') }}`
- Nav link Dashboard: `{{ t('nav.dashboard') }}`
- Edit Name Modal: `{{ t('profileModal.title') }}`, `{{ t('profileModal.description') }}`, `{{ t('profileModal.nameLabel') }}`, `{{ t('profileModal.saveButton') }}`, `{{ t('common.cancel') }}`
- Toasts in `handleNameUpdate`: use `t('profileModal.toastSuccessTitle')` and `t('profileModal.toastSuccessDetail')`.

- [ ] **Step 2: Update `admin.vue` with `useI18n` and `<UILanguageSwitcher />`**

In `app/layouts/admin.vue`:
1. Import `const { t } = useI18n()`.
2. In mobile header (`<header>`): Add `<UILanguageSwitcher />` next to hamburger toggle.
3. In desktop sidebar (`<aside>`):
   - Add `<div class="flex items-center justify-between px-1">... <UILanguageSwitcher /></div>`
   - Localize `Management Console`: `{{ t('admin.panelSubtitle') }}`
   - Localize Workflow box: `{{ t('admin.workflowTitle') }}`, `{{ t('admin.workflowDesc') }}`
   - Localize Dashboard link: `{{ t('admin.panelTitle') }}` / `{{ t('nav.dashboard') }}`
   - Localize Back to Site: `{{ t('nav.backToSite') }}`
   - Localize Logout: `{{ t('nav.logout') }}`

- [ ] **Step 3: Localize `UsernamePrompt.vue`**

In `app/components/UsernamePrompt.vue`:
1. Import `const { t } = useI18n()`.
2. Replace hardcoded modal title, description, input label, and button text with `t('usernamePrompt.title')`, `t('usernamePrompt.description')`, `t('usernamePrompt.placeholder')`, `t('usernamePrompt.continue')`.

- [ ] **Step 4: Run build check**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 5: Commit Task 3**

```bash
git add app/layouts/default.vue app/layouts/admin.vue app/components/UsernamePrompt.vue
git commit -m "feat(layout): integrate LanguageSwitcher and localize default & admin shells"
```

---

### Task 4: Public Homepage & Leaderboard Localization (`index.vue` & `leaderboard.vue`)

**Files:**
- Modify: `app/pages/index.vue`
- Modify: `app/pages/leaderboard.vue`

**Interfaces:**
- Consumes: `useI18n()`
- Produces: Fully translated public landing page and community leaderboard.

- [ ] **Step 1: Localize `app/pages/index.vue`**

1. Import `const { t } = useI18n()`.
2. Replace hardcoded texts:
   - Hero kicker: `{{ t('home.heroKicker') }}`
   - Hero title: `{{ t('home.heroTitle') }}`
   - Hero subtitle: `{{ t('home.heroSubtitle') }}`
   - Nearest session title: `{{ t('home.nextSessionTitle') }}`
   - Empty state: `{{ t('home.noUpcomingTitle') }}`, `{{ t('home.noUpcomingDesc') }}`
   - Status badge texts: helper mapping:
     ```typescript
     const getStatusLabel = (status: string) => {
       if (status === 'open') return t('sessionStatus.open');
       if (status === 'locked') return t('sessionStatus.locked');
       return t('sessionStatus.completed');
     };
     ```
   - Capacity display: `t('home.capacitySpotsLeft', { count: remainingSpots })`, `t('home.capacityFull')`.
   - Action buttons: `{{ t('home.joinNow') }}`, `{{ t('home.viewMatch') }}`.
   - Section titles: `{{ t('home.openSessionsTitle') }}`, `{{ t('home.pastSessionsTitle') }}`.

- [ ] **Step 2: Localize `app/pages/leaderboard.vue`**

1. Import `const { t } = useI18n()`.
2. Replace hardcoded texts:
   - Section kicker: `{{ t('leaderboard.badge') }}`
   - Page title: `{{ t('leaderboard.title') }}`
   - Subtitle: `{{ t('leaderboard.subtitle') }}`
   - Podium heading: `{{ t('leaderboard.topPodiumTitle') }}`
   - Table columns: `{{ t('leaderboard.rank') }}`, `{{ t('leaderboard.player') }}`, `{{ t('leaderboard.sessionsAttended') }}`, `{{ t('leaderboard.attendanceRate') }}`, `{{ t('leaderboard.totalGames') }}`.

- [ ] **Step 3: Run build check**

Run: `npm run build`
Expected: Build passes cleanly.

- [ ] **Step 4: Commit Task 4**

```bash
git add app/pages/index.vue app/pages/leaderboard.vue
git commit -m "feat(pages): localize public homepage and leaderboard"
```

---

### Task 5: Public Match Details & RSVP Localization (`session/[id].vue`)

**Files:**
- Modify: `app/pages/session/[id].vue`
- Modify: `app/components/session/QRCodeDisplay.vue`
- Modify: `app/components/session/SocialShareModal.vue`

**Interfaces:**
- Consumes: `useI18n()`
- Produces: Localized RSVP, capacity meter, cost breakdown, payment QR, and social share modals.

- [ ] **Step 1: Localize `app/pages/session/[id].vue`**

1. Import `const { t } = useI18n()`.
2. Localize breadcrumbs: `{{ t('sessionDetail.backToHome') }}`.
3. Localize metadata chips:
   - Court number: `t('sessionDetail.courtNumber', { court: session.metadata?.courtNumber })`
   - Shuttles: `{{ t('sessionDetail.shuttleBrand') }}: {{ session.metadata?.shuttleBrand }}`
   - Skill level: `{{ t('sessionDetail.skillLevel') }}: {{ session.metadata?.skillLevel }}`
4. Localize capacity meter:
   - Title: `{{ t('sessionDetail.capacityHeading') }}`
   - Progress text: `t('sessionDetail.capacityMeterText', { current: totalJoinedCount, max: session.maxPlayers, available: Math.max(0, session.maxPlayers - totalJoinedCount) })`
5. Localize RSVP card:
   - Card title: `{{ t('sessionDetail.rsvpCardTitle') }}`
   - Subtitle: `{{ t('sessionDetail.rsvpSubtext') }}`
   - Buttons: `{{ t('sessionDetail.attendingYes') }}`, `{{ t('sessionDetail.attendingNo') }}`
   - Guests selector: `{{ t('sessionDetail.guestsLabel') }}`, `t('sessionDetail.guestsNone')`, `t('sessionDetail.guestsOne')`, `t('sessionDetail.guestsCount', { count: n })`
   - Submit button: `{{ t('sessionDetail.submitRsvp') }}`
6. Localize Roster list:
   - Heading: `t('sessionDetail.attendeesTitle', { count: totalActualPlayers })`
   - Empty state: `{{ t('sessionDetail.noAttendees') }}`
   - Badges: `{{ t('sessionDetail.hasPaidBadge') }}`, `{{ t('sessionDetail.waitingPaymentBadge') }}`
7. Localize Financials & Debt Breakdown:
   - Title: `{{ t('sessionDetail.financialsTitle') }}`
   - Court Fee: `{{ t('sessionDetail.courtFee') }}`
   - Shuttle Fee: `t('sessionDetail.shuttleFee', { count: session.financials?.shuttlecocksUsed })`
   - Total Cost: `{{ t('sessionDetail.totalCost') }}`
   - Fee Per Person: `{{ t('sessionDetail.feePerPerson') }}`
   - Personalized Share Title: `{{ t('sessionDetail.yourShareTitle') }}`
   - Multiplier note: `t('sessionDetail.justYou')` vs `t('sessionDetail.youAndGuests', { guests: myGuestCount })`

- [ ] **Step 2: Localize `QRCodeDisplay.vue`**

1. Import `const { t } = useI18n()`.
2. Localize titles and bank table:
   - QR header: `{{ t('sessionDetail.paymentQRTitle') }}`
   - QR subtitle: `{{ t('sessionDetail.paymentQRSubtitle') }}`
   - Bank info title: `{{ t('sessionDetail.bankInfoTitle') }}`
   - Labels: `{{ t('sessionDetail.bankName') }}`, `{{ t('sessionDetail.accountNumber') }}`, `{{ t('sessionDetail.accountName') }}`, `{{ t('sessionDetail.transferMemo') }}`
   - Copy tooltip / toast: `{{ t('common.copied') }}`

- [ ] **Step 3: Localize `SocialShareModal.vue`**

1. Import `const { t } = useI18n()`.
2. Localize modal title & description: `{{ t('socialShare.modalTitle') }}`, `{{ t('socialShare.modalDesc') }}`.
3. Localize tab buttons: `{{ t('socialShare.tabInvite') }}`, `{{ t('socialShare.tabSettlement') }}`.
4. Localize copy button: `{{ t('socialShare.copyButton') }}`.

- [ ] **Step 4: Run build check**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 5: Commit Task 5**

```bash
git add app/pages/session/[id].vue app/components/session/QRCodeDisplay.vue app/components/session/SocialShareModal.vue
git commit -m "feat(session): localize public match details, RSVP, VietQR, and social announcements"
```

---

### Task 6: Admin Dashboard & Session Detail Localization (`admin/index.vue`, `admin/session/[id].vue`, `admin/login.vue`)

**Files:**
- Modify: `app/pages/admin/login.vue`
- Modify: `app/pages/admin/index.vue`
- Modify: `app/pages/admin/session/[id].vue`

**Interfaces:**
- Consumes: `useI18n()`
- Produces: Localized admin management interfaces.

- [ ] **Step 1: Localize `app/pages/admin/login.vue`**

1. Import `const { t } = useI18n()`.
2. Localize login card: Admin email, password, sign in button, error toasts.

- [ ] **Step 2: Localize `app/pages/admin/index.vue`**

1. Import `const { t } = useI18n()`.
2. Localize:
   - Header actions: `{{ t('admin.createSessionBtn') }}`
   - Sessions list: `{{ t('admin.sessionsListTitle') }}`
   - Create/Edit session modal: court rental fee, shuttle price, shuttle count, max capacity, court number, shuttle brand, skill level.
   - Delete confirmation: `t('admin.deleteConfirmTitle')`, `t('admin.deleteConfirmMessage')`.

- [ ] **Step 3: Localize `app/pages/admin/session/[id].vue`**

1. Import `const { t } = useI18n()`.
2. Localize check-in roster:
   - Header: `{{ t('admin.checkinRosterTitle') }}`
   - Walk-in button: `{{ t('admin.walkInBtn') }}`
   - Walk-in dialog: `{{ t('admin.walkInDialogTitle') }}`, `{{ t('admin.walkInNameLabel') }}`, `{{ t('admin.walkInGuestsLabel') }}`
   - Checkbox headers: `{{ t('admin.markAttended') }}`, `{{ t('admin.markPaid') }}`
   - Export CSV button: `{{ t('admin.exportCsvBtn') }}`
   - Financial calculator inputs: Court fee, shuttle count, shuttle price.

- [ ] **Step 4: Run build check**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 5: Commit Task 6**

```bash
git add app/pages/admin/login.vue app/pages/admin/index.vue app/pages/admin/session/[id].vue
git commit -m "feat(admin): localize admin login, sessions dashboard, and match check-in roster"
```

---

### Task 7: End-to-End Build & Visual Verification

**Files:**
- Test: `npm run build`
- Verify with Playwright screenshot on live dev server

- [ ] **Step 1: Run complete build**

Run: `npm run build`
Expected: Build finishes with exit code 0.

- [ ] **Step 2: Run translation unit tests**

Run: `node --test tests/i18n.test.mjs`
Expected: All tests pass.

- [ ] **Step 3: Visual check of live language switching**

Run `npx playwright screenshot` on `/` and `/session/[id]` in both English and Vietnamese to confirm the Direction 2 globe popover works and texts switch seamlessly.

- [ ] **Step 4: Final commit and cleanup**

```bash
git status
git commit -m "chore: complete bilingual English and Vietnamese localization"
```
