# Design Direction Approval Gate

## Date & Time
2026-09-05T11:22:03+07:00

## Requirement
Implement multi-language support (English `en` and Vietnamese `vi`) and determine the placement and interaction design of the language switcher button using `huashu-design`.

## Presented Design Directions & Artifacts
1. **Direction 1 · 🎲 秒数轮盘 (Rolled #20 White Gallery / Athletic Pill)**
   - Prototype: [direction-1-navbar-inline-pill.html](file:///Users/truonghoangthuan/Documents/Coding/personal/badminton-attendance-manager/design-demos/direction-1-navbar-inline-pill.html)
   - Screenshot: `direction_1_pill.png`
   - Interaction: Inline segmented glass pill with 1-tap instant toggle (`[ 🇬🇧 EN | 🇻🇳 VI ]`).

2. **Direction 2 · 🏆 现实参照 (Stripe / Apple / Linear Standard)**
   - Prototype: [direction-2-globe-dropdown.html](file:///Users/truonghoangthuan/Documents/Coding/personal/badminton-attendance-manager/design-demos/direction-2-globe-dropdown.html)
   - Screenshot: `direction_2_dropdown.png`
   - Interaction: Compact globe trigger (`[ 🌐 EN ▾ ]`) expanding into a glass popover with native language names (`English`, `Tiếng Việt`), flag indicators, and checkmark.

3. **Direction 3 · 🧠 最佳设计师 (Boutique Athletic Craft Capsule)**
   - Prototype: [direction-3-floating-capsule.html](file:///Users/truonghoangthuan/Documents/Coding/personal/badminton-attendance-manager/design-demos/direction-3-floating-capsule.html)
   - Screenshot: `direction_3_floating.png`
   - Interaction: Floating glass capsule docked at bottom-right corner.

## User Selection
- **User's Verbatim Choice**: *"I would go with the direction 2 of this LanguageSwitcher.vue"*
- **Selected Direction**: **Direction 2 (Compact Globe Popover Dropdown)**.

## Approval Status
- **Status**: APPROVED
- **Next Step**: Execute implementation using `superpowers:writing-plans` / `subagent-driven-development`.
