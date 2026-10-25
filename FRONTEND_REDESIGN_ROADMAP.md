# Loyally — Frontend Redesign Roadmap

> **Status:** Planning · **Last updated:** 2026-10-21  
> **Palette:** Chrome Black `#0D0D0D` + Digital Lilac `#D9B8FF`  
> **Design references:** Linear, Vercel, Stripe Dashboard, Notion  
> **Stack:** React 19 · Vite · TypeScript · Tailwind CSS v3 · Lucide React

---

## Guiding Principles

1. **No emoji in UI chrome** — emojis stay only in user-facing data (category labels, stamp icons in `categories.ts`). All navigation, actions, states, and status indicators use Lucide React icons.
2. **Design tokens first** — replace every hardcoded hex with CSS variables before touching components.
3. **RTL is first-class** — Hebrew and Arabic are supported from the start, not bolted on later.
4. **Ship in phases** — each phase is independently deployable and testable.
5. **Both apps move together** — PWA (staff) and Admin share the same design token foundation.

---

## Phase 0 — Foundation (Tokens + Tooling)
*Do this before touching any page. Everything else builds on it.*

### F01 — Design Token System
**App:** Both  
**Files:** `tailwind.config.ts`, `src/index.css`

Replace every hardcoded color (`#0b0c10`, `#13151c`, `#1e2130`) with semantic CSS custom properties. Define once, use everywhere.

```css
:root {
  --bg-base:      #0D0D0D;
  --bg-surface:   #141414;
  --bg-overlay:   #1C1C1C;
  --border:       #2A2A2A;
  --text-primary: #F5F5F5;
  --text-muted:   #6B7280;
  --accent:       #D9B8FF;   /* Digital Lilac */
  --accent-hover: #C9A0FF;
  --success:      #4ADE80;
  --warning:      #FBBF24;
  --danger:       #F87171;
  --info:         #60A5FA;
}
```

Wire into `tailwind.config.ts` so classes like `bg-surface`, `text-accent`, `border-border` work everywhere.

---

### F02 — Install Lucide React
**App:** Both  
**Files:** `package.json`, all pages

```bash
npm install lucide-react
```

No other icon library. Do not use emoji as UI icons (exception: `categories.ts` `stampEmoji` field stays as product data).

---

### F03 — Global Layout Shell
**App:** Both  
**Files:** `src/App.tsx`, `src/layouts/AppShell.tsx`

Extract the header + main area into a reusable `<AppShell>` component so every page gets consistent chrome without copy-paste. Accepts `title`, `subtitle`, `actions` (right-side header buttons) as props.

---

## Phase 1 — PWA Redesign (Business Staff App)

### F04 — LoginPage
**Emoji removed:** `☕` replaced with Lucide `<Layers />` (or brand logomark)  
**Changes:**
- Token-based colors
- Centered card with subtle border, no full-bleed weirdness on large screens
- "Welcome to Loyally" heading, business name field, password field
- Primary button uses `--accent`

---

### F05 — HomePage (Dashboard)
**Emoji removed:** `📸 👥 ⚙️ 📲`  
**Lucide replacements:**
| Emoji | Lucide icon |
|-------|-------------|
| 📸 | `<Camera />` |
| 👥 | `<Users />` (customers) / `<UserCog />` (staff) |
| ⚙️ | `<Settings />` |
| 📲 | `<QrCode />` |

**Changes:**
- Stats row: 3-card grid with icon + value + label (token colors for each metric)
- Action buttons: icon-left + label, full-width stacked cards with `border-border hover:border-accent` transition
- Program info card: clean two-row layout

---

### F06 — ScanPage
**Emoji removed:** `✅ ❌ 🎉`  
**Lucide replacements:**
| Emoji | Lucide icon |
|-------|-------------|
| ✅ | `<CheckCircle2 />` (success state) |
| ❌ | `<XCircle />` (error state) |
| 🎉 | `<Gift />` (reward claimed) |

**Changes:**
- QR scanner area: rounded border frame, `--border` color, pulsing ring animation on active scan
- Result states: full-width banner (green/red/purple) with icon + message + customer name
- Stamp count display: large number with `/goal` in muted

---

### F07 — CustomersPage
**Emoji removed:** `👥` empty state  
**Changes:**
- Empty state: `<Users />` icon (48px, muted) + "No customers yet" + sub-copy
- Customer row: avatar initials circle + name + phone + stamp progress pill
- Reward badge: `<Gift />` icon + "Reward ready" instead of 🎉 badge
- Search bar at top

---

### F08 — SettingsPage
**Changes:**
- Section headers with `<Settings />` icon
- Category picker: icon grid (use Lucide icons per category type, not emojis in the picker UI)
- Form fields: consistent border/focus styles using tokens
- Save button: accent color, `<Save />` icon-left

---

### F09 — StaffPage
**Changes:**
- Staff list: avatar initials + name + role badge + `<Trash2 />` remove icon
- Add staff form: inline or slide-in panel
- Role badge: colored pill (`owner` = lilac, `admin_staff` = blue, `staff` = slate)
- Empty state: `<UserPlus />` icon

---

### F10 — EnrollPage & EnrollQRPage
**Changes:**
- Enrollment form: phone input with country prefix selector
- QR code display: centered, large, white bg card (QR needs white background)
- Print button: `<Printer />` icon
- Share button: `<Share2 />` icon

---

## Phase 2 — Customer-Facing Card (Public Page)

### F11 — CustomerCardPage — Core Redesign
**File:** `src/pages/CustomerCardPage.tsx`  
**Who sees it:** End customers (public URL, no login)  
**Changes:**
- Business logo: centered, rounded-lg, subtle shadow
- Stamp grid: clean circles — filled (accent color) vs empty (surface + border)
- Progress text: "X of Y stamps" in muted, large stamp count in accent
- Reward description: card section with `<Gift />` icon
- Reward-ready state: full-width highlight banner (accent bg, dark text)
- Wallet buttons: official badge images (already in project assets: `en-GB_view_in_wallet_add-wallet-badge.svg`, `enUS_add_to_google_wallet_add-wallet-badge.svg`, etc.) — render correct badge per detected locale

---

### F12 — CustomerCardPage — Wallet Button Locale Logic
**File:** `src/pages/CustomerCardPage.tsx`  
**Context:** Project already contains locale-specific wallet badge SVGs

Map detected language → correct badge asset:

```ts
const walletBadge = {
  'en-US': 'enUS_add_to_google_wallet_add-wallet-badge.svg',
  'en-GB': 'enGB_add_to_google_wallet_add-wallet-badge.svg',
  'ar':    'ar_add_to_google_wallet_add-wallet-badge.svg',
  'es-US': 'esUS_add_to_google_wallet_add-wallet-badge.svg',
};
```

Apple Wallet badge: show when on iOS/macOS (use `navigator.userAgent` detection).

---

## Phase 3 — Admin Portal Redesign

### F13 — Admin LoginPage
**Emoji removed:** none (already clean)  
**Changes:**
- Token-based colors
- `<Shield />` icon instead of `🛡️`
- Same centered-card layout as PWA login

---

### F14 — Admin DashboardPage
**Emoji removed:** `🛡️`  
**Changes:**
- Replace `🛡️` with `<Shield />` Lucide icon in header
- Stats grid: 6-card row with per-metric accent colors (already good structure, needs token colors)
- Bar charts: use token colors (`--accent`, `--success`, `--warning`)
- Pending/Recent lists: status pill colors via tokens
- "All caught up! ✅" → "All caught up" + `<CheckCircle2 className="text-success" />`

---

### F15 — BusinessesPage
**Changes:**
- Table/list view with sortable columns
- Status filter tabs: All · Active · Pending · Suspended
- Business row: name + category icon (Lucide) + status pill + date + actions
- Search input at top

---

### F16 — BusinessDetailPage
**Changes:**
- Business header: logo + name + status badge + action buttons
- Stats row: customers · stamps · redemptions
- Section cards: Loyalty Program · Staff · Recent Activity
- Approve/Suspend buttons: success/danger colors with icons

---

### F17 — AddBusinessPage
**Changes:**
- Multi-section form: Business Info → Loyalty Program → Card Design → Review
- Category picker: icon grid with Lucide icons
- Stamp goal slider or number input
- Card preview (live preview of what the customer card will look like)

---

## Phase 4 — Polish + Micro-interactions

### F18 — Loading States
**App:** Both  
**Changes:**
- Replace text "Loading..." with consistent skeleton screens (pulsing placeholder blocks)
- Spinner: single ring, accent color, centered

---

### F19 — Empty States
**App:** Both  
**Pattern:** Large muted icon (48–64px) + heading + sub-copy + optional CTA button  
**Pages:** CustomersPage, BusinessesPage, StaffPage, recent lists

---

### F20 — Toast Notifications
**App:** Both  
**Replace:** `alert()` calls and inline error text  
**Implementation:** Lightweight toast system (can use `react-hot-toast` or hand-rolled)  
- Success: `<CheckCircle2 />` + green
- Error: `<AlertCircle />` + red
- Info: `<Info />` + blue

---

### F21 — Transitions & Hover States
**App:** Both  
**Changes:**
- All interactive elements: `transition-colors duration-150`
- Button hover: slight bg lighten or border glow (accent)
- Card hover (clickable cards): `hover:border-accent/50`
- No layout-shifting animations on mobile

---

### F22 — Mobile Responsiveness Audit
**App:** PWA (primary), Admin (secondary)  
**Focus:**
- All tap targets ≥ 44×44px
- No horizontal scroll on any page at 390px width
- Stats grids collapse gracefully
- Action buttons full-width on mobile

---

## Phase 5 — Premium & Future Features

### F23 — Card Design Editor (Premium)
**Who:** Business owners  
**Description:** Visual editor for the loyalty card appearance — background color picker, logo upload, stamp icon selection. Preview updates live.  
**Backend needed:** `card_bg_color`, `logo_url` columns on Business model (partially done)  
**Gated:** Premium tier flag on the business record

---

### F24 — AI Card Design Assistant (Premium — Future)
**Description:** Integration with AI image generation or Canva API. Business owner describes what they want ("modern coffee shop, earthy tones") and gets card design suggestions.  
**Dependencies:** External API partnership, Premium tier

---

### F25 — Analytics Deep-Dive Page (Admin)
**Description:** Dedicated analytics page with time-series charts, cohort retention, stamp velocity per business.  
**Dependencies:** Backend analytics aggregation endpoints

---

### F26 — Business Owner Analytics Page (PWA)
**Description:** Stamping trends, peak hours, top customers, reward redemption rate. Read the `dataviz` skill before implementing charts.

---

### F27 — Notification Center
**App:** PWA  
**Description:** In-app notification feed for staff: "Customer X is ready to redeem", "New customer enrolled", etc.  
**Dependencies:** WebSocket or polling endpoint

---

### F28 — Dark/Light Mode Toggle
**App:** Both  
**Note:** Currently dark-only. CSS variables make this easy once tokens are in place (Phase 0). Light mode is a token swap.  
**Defer until:** After token system is solid (post-F01)

---

### F29 — PWA Install Prompt
**App:** PWA  
**Description:** Custom "Add to Home Screen" prompt shown after first successful scan. Improves staff retention on mobile.

---

### F30 — Onboarding Flow (New Business)
**App:** PWA  
**Description:** First-login wizard: set stamp goal → upload logo → preview card → print enrollment QR. Replaces raw SettingsPage for new businesses.

---

## Phase 6 — RTL & Internationalisation

> **Why now:** The target market is Israeli SMBs. Hebrew is the primary business language. Arabic is spoken by ~20% of Israel's population and is a significant customer segment. RTL support must be added before launch to real clients.

### F31 — i18n Library Setup
**App:** Both  
**Package:** `react-i18next` + `i18next`

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

**Structure:**
```
src/
  i18n/
    index.ts           ← i18next init, language detector
    locales/
      en.json          ← English strings
      he.json          ← Hebrew strings  
      ar.json          ← Arabic strings
```

**Key config:**
- Default language: `en`
- Fallback: `en`
- Language detection: `localStorage` → `navigator.language` → fallback
- Namespace: `translation` (single namespace for now; split later if needed)

---

### F32 — RTL Layout Direction
**App:** Both  
**Files:** `src/i18n/index.ts`, `index.html`, `src/App.tsx`

On language change, set `document.documentElement.dir` and `document.documentElement.lang`:

```ts
i18next.on('languageChanged', (lng) => {
  const dir = ['he', 'ar'].includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});
```

**Tailwind RTL variants** — enable in `tailwind.config.ts`:
```ts
// Already included in Tailwind v3 core
// Use rtl: prefix for RTL-specific overrides
```

Example RTL-aware component pattern:
```tsx
// Instead of: ml-3
// Use: ms-3  (margin-inline-start — flips automatically)
// Instead of: pl-4
// Use: ps-4  (padding-inline-start)
// Instead of: text-left
// Use: text-start
// Instead of: flex-row
// Add: rtl:flex-row-reverse  (when icon is always on one side)
```

**Rule of thumb:** Use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) everywhere instead of `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`.

---

### F33 — RTL Typography & Fonts
**App:** Both  
**Files:** `index.html`, `src/index.css`

Load RTL-capable fonts via Google Fonts:

```html
<!-- Hebrew -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet" />

<!-- Arabic -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Apply conditionally in CSS:
```css
:root { font-family: 'Inter', sans-serif; }
:root[lang="he"] { font-family: 'Heebo', sans-serif; }
:root[lang="ar"] { font-family: 'Noto Sans Arabic', sans-serif; }
```

- **Heebo** — clean Hebrew web font, designed for UI, Google Fonts
- **Noto Sans Arabic** — excellent Arabic coverage, multiple weights, Google Fonts
- Both fonts pair well with Inter for mixed-language text (business names, phone numbers)

---

### F34 — Language Switcher Component (PWA — Staff)
**App:** PWA  
**File:** `src/components/LanguageSwitcher.tsx`  
**Placement:** Header right side (next to logout), SettingsPage

```tsx
// Three-button toggle: EN | עב | AR
// Saves to localStorage
// Triggers document.dir change
```

**UI:** Compact pill toggle, 2–3 letter labels  
- `EN` → English
- `עב` → Hebrew (abbreviation of עברית)
- `AR` → Arabic (or `ع` if space is tight)

**Who needs it:** Business owners and staff — they choose once, it sticks.

---

### F35 — Language Switcher (CustomerCardPage — Public)
**App:** PWA (public page)  
**File:** `src/pages/CustomerCardPage.tsx`  
**Placement:** Top-right corner of the card page  

The customer card is public (no login). Customers should be able to switch between EN/Hebrew/Arabic without an account.

**Auto-detect:** Check `navigator.language` on load and pre-select matching language.  
**Persist:** `localStorage` key `loyally_lang`  
**UI:** Small flag or text pill in top-right corner

**Translation priority for customer card:**
- Stamp count text: "X of Y stamps" / "X מתוך Y בולים" / "X من Y طوابع"
- Reward label: "Your Reward" / "הפרס שלך" / "مكافأتك"  
- Reward-ready banner: "Reward Ready!" / "!הפרס מוכן" / "!المكافأة جاهزة"
- Progress: "X more to go" / "עוד X לצבירה" / "X أكثر للذهاب"
- Wallet buttons: render locale-appropriate badge SVG (F12 logic)

---

### F36 — Translation Files
**App:** Both

**`src/i18n/locales/en.json`** (excerpt):
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "customers": "Customers",
    "staff": "Staff",
    "settings": "Settings",
    "logout": "Logout"
  },
  "home": {
    "scan": "Scan Customer QR",
    "viewCustomers": "View Customers",
    "manageStaff": "Manage Staff",
    "programSettings": "Program Settings",
    "enrollmentQR": "Enrollment QR Code"
  },
  "card": {
    "stamps": "stamps",
    "of": "of",
    "yourReward": "Your Reward",
    "rewardReady": "Reward Ready!",
    "moreTogo": "more to go",
    "showToCashier": "Show this to the cashier!"
  }
}
```

**`src/i18n/locales/he.json`** (excerpt):
```json
{
  "nav": {
    "dashboard": "לוח בקרה",
    "customers": "לקוחות",
    "staff": "צוות",
    "settings": "הגדרות",
    "logout": "התנתק"
  },
  "home": {
    "scan": "סרוק QR של לקוח",
    "viewCustomers": "הצג לקוחות",
    "manageStaff": "ניהול צוות",
    "programSettings": "הגדרות תוכנית",
    "enrollmentQR": "QR להצטרפות"
  },
  "card": {
    "stamps": "בולים",
    "of": "מתוך",
    "yourReward": "הפרס שלך",
    "rewardReady": "!הפרס מוכן",
    "moreTogo": "עוד לצבירה",
    "showToCashier": "הצג זאת לקופאי"
  }
}
```

**`src/i18n/locales/ar.json`** (excerpt):
```json
{
  "nav": {
    "dashboard": "لوحة التحكم",
    "customers": "العملاء",
    "staff": "الموظفون",
    "settings": "الإعدادات",
    "logout": "تسجيل الخروج"
  },
  "home": {
    "scan": "امسح رمز QR للعميل",
    "viewCustomers": "عرض العملاء",
    "manageStaff": "إدارة الموظفين",
    "programSettings": "إعدادات البرنامج",
    "enrollmentQR": "رمز QR للتسجيل"
  },
  "card": {
    "stamps": "طوابع",
    "of": "من",
    "yourReward": "مكافأتك",
    "rewardReady": "!المكافأة جاهزة",
    "moreTogo": "أكثر للذهاب",
    "showToCashier": "أرِ هذا للكاشير"
  }
}
```

---

### F37 — RTL Component Audit
**App:** Both  
**After:** F31–F36 complete

Go through every component and replace directional Tailwind classes with logical equivalents. Checklist:

- [ ] `ml-*` / `mr-*` → `ms-*` / `me-*`
- [ ] `pl-*` / `pr-*` → `ps-*` / `pe-*`
- [ ] `left-*` / `right-*` → `start-*` / `end-*`
- [ ] `text-left` / `text-right` → `text-start` / `text-end`
- [ ] Flex rows with icon-then-text: verify icon stays on correct side in RTL
- [ ] Chevrons and arrows: `rtl:rotate-180` where needed
- [ ] `border-l-*` → `border-s-*`
- [ ] Input fields: `text-right` for number/phone inputs in RTL (they still display LTR numbers)
- [ ] QR code placement: stays centered (no directionality issue)

---

### F38 — Admin Portal Language (Optional)
**App:** Admin  
**Note:** The admin portal is internal — used only by you (Ibraheem) and platform operators. Hebrew/Arabic is lower priority here than in the customer-facing card and the staff PWA.  

**Decision:** Add language switcher to admin only after PWA + CustomerCard are fully RTL. The admin can stay English-first for the initial launch.

---

## Task Summary

| ID | Phase | Title | App | Priority |
|----|-------|-------|-----|----------|
| F01 | 0 | Design Token System | Both | 🔴 Critical |
| F02 | 0 | Install Lucide React | Both | 🔴 Critical |
| F03 | 0 | Global Layout Shell | Both | 🔴 Critical |
| F04 | 1 | LoginPage redesign | PWA | 🟠 High |
| F05 | 1 | HomePage redesign | PWA | 🟠 High |
| F06 | 1 | ScanPage redesign | PWA | 🟠 High |
| F07 | 1 | CustomersPage redesign | PWA | 🟠 High |
| F08 | 1 | SettingsPage redesign | PWA | 🟡 Medium |
| F09 | 1 | StaffPage redesign | PWA | 🟡 Medium |
| F10 | 1 | Enroll pages redesign | PWA | 🟡 Medium |
| F11 | 2 | CustomerCardPage redesign | PWA | 🔴 Critical |
| F12 | 2 | Wallet badge locale logic | PWA | 🟠 High |
| F13 | 3 | Admin LoginPage | Admin | 🟡 Medium |
| F14 | 3 | Admin DashboardPage | Admin | 🟡 Medium |
| F15 | 3 | BusinessesPage | Admin | 🟡 Medium |
| F16 | 3 | BusinessDetailPage | Admin | 🟡 Medium |
| F17 | 3 | AddBusinessPage | Admin | 🟡 Medium |
| F18 | 4 | Loading states | Both | 🟡 Medium |
| F19 | 4 | Empty states | Both | 🟡 Medium |
| F20 | 4 | Toast notifications | Both | 🟠 High |
| F21 | 4 | Transitions & hover | Both | 🟢 Low |
| F22 | 4 | Mobile responsiveness audit | Both | 🟠 High |
| F23 | 5 | Card Design Editor (Premium) | PWA | 🟢 Low |
| F24 | 5 | AI Design Assistant (Premium/Future) | PWA | 🟢 Low |
| F25 | 5 | Analytics deep-dive (Admin) | Admin | 🟢 Low |
| F26 | 5 | Business analytics page | PWA | 🟢 Low |
| F27 | 5 | Notification center | PWA | 🟢 Low |
| F28 | 5 | Dark/light mode toggle | Both | 🟢 Low |
| F29 | 5 | PWA install prompt | PWA | 🟢 Low |
| F30 | 5 | Onboarding flow | PWA | 🟢 Low |
| F31 | 6 | i18n library setup | Both | 🔴 Critical |
| F32 | 6 | RTL layout direction | Both | 🔴 Critical |
| F33 | 6 | RTL typography & fonts | Both | 🟠 High |
| F34 | 6 | Language switcher (PWA staff) | PWA | 🟠 High |
| F35 | 6 | Language switcher (CustomerCard) | PWA | 🔴 Critical |
| F36 | 6 | Translation files (EN/HE/AR) | Both | 🟠 High |
| F37 | 6 | RTL component audit | Both | 🟠 High |
| F38 | 6 | Admin portal language (optional) | Admin | 🟢 Low |

---

## Recommended Implementation Order

For the fastest path to a shippable, client-ready product:

```
F01 → F02 → F03           Phase 0 (tokens + tooling)
F31 → F32 → F33           RTL infrastructure (do early, cheap to retrofit)
F11 → F35 → F12           CustomerCardPage (public face, highest impact)
F05 → F06 → F04           PWA core pages (scan, home, login)
F20 → F22                 Toasts + mobile audit
F36 → F34                 Translations + language switcher for staff
F07 → F08 → F09 → F10    Remaining PWA pages
F14 → F15 → F16 → F17    Admin portal
F37                        RTL audit pass
F18 → F19 → F21           Polish
```

---

## Out of Scope (This Roadmap)

- Backend API changes (tracked separately)
- Google Wallet / Apple Wallet pass design
- `card_bg_color` Alembic migration (backend task)
- Domain migration to `loyal-ly.app`
- Google Wallet API publishing approval
- SendGrid/Resend email integration
- `develop` branch / Railway dev environment split
