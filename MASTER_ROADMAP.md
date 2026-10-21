# Loyally — Master Product Roadmap

> **Last updated:** 2026-10-21  
> **Version:** 1.0  
> **Target market:** Israeli SMBs — Hebrew/Arabic/English users  
> **Stack:** FastAPI · PostgreSQL · React 19 · Vite · TypeScript · Tailwind CSS v3

---

## How to Read This Document

Each task has:
- **Priority:** 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low
- **Est. time:** Dev hours (solo developer, familiar with the codebase)
- **Blocks:** Tasks that cannot start until this one is done

Tasks are ordered by priority within each section. Do the sections top to bottom.

---

## SECTION 1 — Infrastructure & DevOps
*These unlock everything else. Do first.*

### INF-01 — Create `develop` branch + Railway dev environment
**Priority:** 🔴 Critical  
**Est. time:** 2h  
**Why:** Currently testing directly on prod. One bad push can break live customers.

Steps:
1. `git checkout -b develop` from current `main`
2. Push `develop` to GitHub
3. In Railway: duplicate the prod service → new environment called `dev`
4. Set Railway `develop` branch as source for the dev service
5. Add separate env vars for dev (different DB, different CORS origin)
6. Vercel: create a preview deployment for the `develop` branch

---

### INF-02 — Buy `loyal-ly.app` domain
**Priority:** 🔴 Critical  
**Est. time:** 1h  
**Why:** Can't send to real clients with `loyaltycard-omega.vercel.app` URLs

Steps:
1. Purchase `loyal-ly.app` (or `loyally.app` if available) on Namecheap/Cloudflare
2. Point DNS to Vercel (PWA) and Railway (API)
3. Set up subdomains:
   - `app.loyal-ly.app` → PWA (staff)
   - `api.loyal-ly.app` → Railway backend
   - `admin.loyal-ly.app` → Admin portal
4. Update all env vars: `VITE_API_URL`, `ALLOWED_ORIGINS`, `generate_wallet_jwt` origins list
5. Update Google Wallet JWT `origins` in `wallet_service.py`

---

### INF-03 — Set up Cloudflare for DNS + Admin subdomain
**Priority:** 🟠 High  
**Est. time:** 1h  
**Blocks:** INF-02

Configure Cloudflare:
- Add `loyal-ly.app` to Cloudflare
- `admin.loyal-ly.app` → Admin portal on Vercel
- Enable Cloudflare proxy (orange cloud) for DDoS protection
- SSL: Full (strict) mode

---

## SECTION 2 — Backend / Database
*Core product data model gaps.*

### BE-01 — Add `card_bg_color` to Business model
**Priority:** 🔴 Critical  
**Est. time:** 2h  
**Why:** Business card background color is already wired in `wallet_service.py` but there's no column to store it

Files to touch:
- `app/models/business.py` — add `card_bg_color: str | None`
- `alembic/versions/` — new migration: `ALTER TABLE businesses ADD COLUMN card_bg_color VARCHAR(7)`
- `app/schemas/business.py` — add field to response/update schemas
- `app/api/v1/endpoints/cards.py` — pass `business.card_bg_color` to `create_or_update_pass`
- `app/api/v1/endpoints/stamps.py` — pass `business.card_bg_color` to `update_wallet`

---

### BE-02 — Auth: Forced password change on first login
**Priority:** 🔴 Critical  
**Est. time:** 3h  
**Why:** Right now new staff and business owners receive a temp password they never change. Security risk.

Steps:
1. Add `must_change_password: bool = True` to User model
2. New migration
3. On login: if `must_change_password`, return `{ "must_change_password": true }` in response
4. Frontend: detect flag → redirect to `ChangePasswordPage`
5. `ChangePasswordPage`: current password + new password + confirm → `PATCH /users/me/password`
6. On success: set `must_change_password = False` in DB

---

### BE-03 — Temp password email on business/staff creation
**Priority:** 🔴 Critical  
**Est. time:** 4h  
**Depends on:** BE-02  
**Why:** Currently you manually share passwords. Can't scale.

Steps:
1. Choose email provider: **Resend** (recommended — simple API, generous free tier, good deliverability)
2. `pip install resend`
3. Add `RESEND_API_KEY` env var
4. `app/services/email_service.py`: `send_welcome_email(to, business_name, temp_password)`
5. Call from admin endpoint when creating a business
6. Call from business endpoint when adding staff
7. Email template: welcome + temp password + login URL

---

### BE-04 — Logo upload (replace Cloudinary manual URL)
**Priority:** 🟠 High  
**Est. time:** 5h  
**Why:** Currently business owners can't upload a logo from the UI. You manually paste Cloudinary URLs.

Options (pick one):
- **Option A — Direct Cloudinary upload widget** (recommended): Frontend uses Cloudinary Upload Widget (unsigned preset). No backend changes needed. Returns URL which gets saved to `logo_url`.
- **Option B — Backend upload**: `POST /businesses/me/logo` accepts multipart form, stores to Cloudinary via API, returns URL.

Recommend Option A — 2h frontend-only work vs 5h full-stack.

---

### BE-05 — Analytics: per-business endpoint
**Priority:** 🟡 Medium  
**Est. time:** 3h

Add `GET /businesses/me/analytics/detailed` returning:
- Stamps per day (last 30 days)
- Peak hours
- Top 5 customers by stamps
- Redemption rate
- Active vs inactive cards

---

## SECTION 3 — Google Wallet
*Platform approval and polish.*

### GW-01 — Add test Google accounts to Wallet Console whitelist
**Priority:** 🔴 Critical  
**Est. time:** 30 min  
**Why:** Currently only your own Google account can save test passes. Can't demo to clients.

Steps:
1. Go to [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Wallet Objects → your issuer → Test accounts
3. Add Gmail accounts of clients/testers you want to demo to

---

### GW-02 — Wait for Google Wallet API publishing approval
**Priority:** 🔴 Critical (but external — not in our control)  
**Est. time:** 2–5 business days  
**Current status:** Business Profile = Approved · Wallet API = In Review

When approved:
- `[TEST ONLY]` prefix disappears from web wallet view
- All Gmail accounts can save passes (not just whitelisted)
- No further code changes needed

---

### GW-03 — Remove emoji from wallet pass text modules
**Priority:** 🟠 High  
**Est. time:** 1h  
**Depends on:** GW-02 (do after production approval)  
**File:** `app/services/wallet_service.py`

Replace emoji in `_reward_ready_modules()` and `_in_progress_modules()`:
- `"🎁 Reward Ready to Claim!"` → `"Reward Ready to Claim!"`
- `"🎁 Reward Ready!"` in `loyaltyPoints.label` → `"Reward Ready!"`
- Reason: Google Wallet renders emoji inconsistently across devices; plain text is more professional

---

### GW-04 — Hebrew wallet badge SVG
**Priority:** 🟠 High  
**Est. time:** 1h  
**Context:** Project already has official badge SVGs for EN-US, EN-GB, AR, ES-US. Hebrew is missing.

Steps:
1. Download Hebrew "Add to Google Wallet" badge from [Google's brand guidelines](https://developers.google.com/wallet/generic/resources/brand-guidelines)
2. Add to project as `he_add_to_google_wallet_add-wallet-badge.svg`
3. Also add Hebrew "View in Wallet" badge: `he_view_in_wallet_wallet-button.svg`
4. Wire into CustomerCardPage language detection (see F12 / RTL section)

---

### GW-05 — Apple Wallet support
**Priority:** 🟢 Low  
**Est. time:** 16h  
**Cost:** $99/year Apple Developer Program

Steps:
1. Enroll in Apple Developer Program
2. Create Pass Type ID certificate
3. `pip install pypasskit` or use `passkit-generator` npm package
4. `app/services/apple_wallet_service.py`
5. `GET /cards/{token}/apple-wallet` endpoint → returns `.pkpass` file
6. CustomerCardPage: detect iOS → show Apple Wallet button
7. Use official Apple Wallet badge SVG

---

## SECTION 4 — Frontend Foundation
*Must happen before any page redesign.*

### FE-01 — Design Token System
**Priority:** 🔴 Critical  
**Est. time:** 2h  
**Both apps**

Replace every hardcoded hex (`#0b0c10`, `#13151c`, `#1e2130`) with CSS custom properties on `:root`. Wire into `tailwind.config.ts` as named colors (`bg-base`, `bg-surface`, `bg-overlay`, `border-default`, `text-primary`, `text-muted`, `accent`, etc.).

Palette: **Chrome Black + Digital Lilac**
```
--bg-base:    #0D0D0D
--bg-surface: #141414
--bg-overlay: #1C1C1C
--border:     #2A2A2A
--accent:     #D9B8FF   (Digital Lilac)
--success:    #4ADE80
--warning:    #FBBF24
--danger:     #F87171
```

---

### FE-02 — Install Lucide React + replace all UI emoji
**Priority:** 🔴 Critical  
**Est. time:** 3h  
**Both apps**

```bash
npm install lucide-react
```

Emoji-to-icon replacement map:
| Location | Emoji | Lucide Icon |
|----------|-------|-------------|
| HomePage | 📸 | `<Camera />` |
| HomePage | 👥 (customers) | `<Users />` |
| HomePage | 👥 (staff) | `<UserCog />` |
| HomePage | ⚙️ | `<Settings />` |
| HomePage | 📲 | `<QrCode />` |
| ScanPage | ✅ | `<CheckCircle2 />` |
| ScanPage | ❌ | `<XCircle />` |
| ScanPage | 🎉 | `<Gift />` |
| CustomerCardPage | 🎉 | `<Gift />` |
| CustomerCardPage | ❌ | `<XCircle />` |
| CustomerCardPage | 👋 | remove (use name only) |
| DashboardPage (Admin) | 🛡️ | `<Shield />` |
| LoginPage (PWA) | ☕ | `<Layers />` (brand mark) |

**Exception:** `categories.ts` `emoji` and `stampEmoji` fields are user-facing product data — keep them.

---

### FE-03 — Global Layout Shell component
**Priority:** 🔴 Critical  
**Est. time:** 2h  
**Both apps**

Extract shared header + page wrapper into `<AppShell title subtitle actions>` component. All pages use it. No more copy-paste header code.

---

### FE-04 — i18n Library Setup (react-i18next)
**Priority:** 🔴 Critical  
**Est. time:** 3h  
**Both apps**  
**Do this in Phase 0 — cheap to retrofit now, expensive later**

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

Structure:
```
src/i18n/
  index.ts          ← init, language detector
  locales/
    en.json
    he.json         ← Hebrew
    ar.json         ← Arabic
```

Detection order: `localStorage('loyally_lang')` → `navigator.language` → `'en'`

---

### FE-05 — RTL Layout Direction
**Priority:** 🔴 Critical  
**Est. time:** 2h  
**Depends on:** FE-04

On language change:
```ts
document.documentElement.dir  = ['he','ar'].includes(lng) ? 'rtl' : 'ltr';
document.documentElement.lang = lng;
```

Switch all directional Tailwind classes to logical properties:
- `ml-*` / `mr-*` → `ms-*` / `me-*`
- `pl-*` / `pr-*` → `ps-*` / `pe-*`
- `left-*` / `right-*` → `start-*` / `end-*`
- `text-left` → `text-start`
- `border-l-*` → `border-s-*`

---

### FE-06 — RTL Fonts
**Priority:** 🟠 High  
**Est. time:** 1h  
**Depends on:** FE-05

```html
<!-- Hebrew: Heebo -->
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet" />
<!-- Arabic: Noto Sans Arabic -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

```css
:root { font-family: 'Inter', sans-serif; }
:root[lang="he"] { font-family: 'Heebo', sans-serif; }
:root[lang="ar"] { font-family: 'Noto Sans Arabic', sans-serif; }
```

---

## SECTION 5 — CustomerCardPage (Public — Highest Impact)
*This is what customers see. Most important page to get right.*

### CC-01 — CustomerCardPage full redesign
**Priority:** 🔴 Critical  
**Est. time:** 5h  
**Depends on:** FE-01, FE-02

Changes:
- Business logo: rounded-lg with shadow, not tiny circle
- Stamp grid: clean filled/empty circles with accent color (not emoji-only, emoji stays on top of circle)
- Reward-ready banner: full-width accent highlight (lilac bg, dark text)
- Progress text: large count + muted "/goal"
- QR code: white background card (QR always needs white bg)
- Token-based all colors

---

### CC-02 — Language switcher on CustomerCardPage
**Priority:** 🔴 Critical  
**Est. time:** 3h  
**Depends on:** FE-04, FE-05

Customers open this page without an account. They need to switch language themselves.

- Auto-detect from `navigator.language`
- Three-button pill in top-right: `EN` | `עב` | `AR`
- Persists to `localStorage('loyally_lang')`
- Triggers `document.dir` change
- All card text translates (stamp count, reward label, progress, status)

Hebrew translations for card:
| English | Hebrew |
|---------|--------|
| Loyalty Card | כרטיס נאמנות |
| X of Y stamps | X מתוך Y בולים |
| stamps until your free reward | בולים עד הפרס שלך |
| Your Reward | הפרס שלך |
| Reward Ready! | !הפרס מוכן |
| Show this at the counter | הצג זאת בקופה |
| Total rewards redeemed | סך הפרסים שנוצלו |

Arabic translations for card:
| English | Arabic |
|---------|--------|
| Loyalty Card | بطاقة الولاء |
| X of Y stamps | X من Y طوابع |
| stamps until your free reward | طوابع حتى مكافأتك المجانية |
| Your Reward | مكافأتك |
| Reward Ready! | !المكافأة جاهزة |
| Show this at the counter | أرِ هذا عند الكاشير |
| Total rewards redeemed | إجمالي المكافآت المستبدلة |

---

### CC-03 — Wallet badge locale logic
**Priority:** 🟠 High  
**Est. time:** 2h  
**Depends on:** CC-02, GW-04  
**Current state:** CustomerCardPage uses inline SVG hardcoded in JSX. Project has official badge SVG files for EN-US, EN-GB, AR, ES-US. Hebrew badge to be added (GW-04).

Replace inline SVG with badge asset files. Select badge based on current language:

```ts
const GOOGLE_WALLET_BADGES = {
  'en':    '/badges/enUS_add_to_google_wallet_add-wallet-badge.svg',
  'en-GB': '/badges/enGB_add_to_google_wallet_add-wallet-badge.svg',
  'ar':    '/badges/ar_add_to_google_wallet_add-wallet-badge.svg',
  'he':    '/badges/he_add_to_google_wallet_add-wallet-badge.svg',
};

const GOOGLE_WALLET_VIEW_BADGES = {
  'en':    '/badges/en-GB_view_in_wallet_wallet-button.svg',
  'ar':    '/badges/ar_view_in_wallet_wallet-button.svg',
  'he':    '/badges/he_view_in_wallet_wallet-button.svg',  // to be added
};
```

Logic: use `i18next.language` (from FE-04) to pick the right badge. Falls back to `en` if no match.

**Move all badge SVGs to:** `frontend/loyalty-pwa/public/badges/`

---

## SECTION 6 — PWA Staff App Redesign

### PWA-01 — LoginPage
**Priority:** 🟠 High · **Est. time:** 2h  
Replace ☕ with `<Layers />` icon. Token colors. Centered card layout.

### PWA-02 — HomePage
**Priority:** 🟠 High · **Est. time:** 3h  
Emoji → Lucide icons (FE-02 covers the list). Stats row polish. Action buttons with icon-left layout.

### PWA-03 — ScanPage
**Priority:** 🟠 High · **Est. time:** 3h  
QR scanner frame with pulsing border animation. State banners (success/error/reward) with Lucide icons + token colors.

### PWA-04 — CustomersPage
**Priority:** 🟡 Medium · **Est. time:** 3h  
Empty state with `<Users />` icon. Customer rows with initials avatar + stamp progress pill. Search bar.

### PWA-05 — SettingsPage
**Priority:** 🟡 Medium · **Est. time:** 2h  
Token colors. Category picker with Lucide icons. `<Save />` button.

### PWA-06 — StaffPage
**Priority:** 🟡 Medium · **Est. time:** 2h  
Role badges (lilac/blue/slate). `<UserPlus />` add state. `<Trash2 />` remove icon.

### PWA-07 — EnrollPage + EnrollQRPage
**Priority:** 🟡 Medium · **Est. time:** 2h  
Print (`<Printer />`) and share (`<Share2 />`) buttons. QR on white bg card.

### PWA-08 — Language Switcher for Staff
**Priority:** 🟠 High · **Est. time:** 2h  
**Depends on:** FE-04, FE-05  
Compact 3-button pill in header. Staff pick once, it sticks. Translates all nav and action labels.

---

## SECTION 7 — Admin Portal Redesign

### ADM-01 — DashboardPage
**Priority:** 🟡 Medium · **Est. time:** 3h  
`🛡️` → `<Shield />`. Token colors for all stat cards and charts. "All caught up ✅" → `<CheckCircle2 />`.

### ADM-02 — BusinessesPage
**Priority:** 🟡 Medium · **Est. time:** 3h  
Filter tabs (All/Active/Pending/Suspended). Search. Status pills.

### ADM-03 — BusinessDetailPage
**Priority:** 🟡 Medium · **Est. time:** 3h  
Business header with status badge. Stats row. Section cards. Approve/Suspend with confirmation.

### ADM-04 — AddBusinessPage
**Priority:** 🟡 Medium · **Est. time:** 4h  
Multi-section form with live card preview (shows what the customer card will look like).

### ADM-05 — LoginPage (Admin)
**Priority:** 🟡 Medium · **Est. time:** 1h  
Token colors. `<Shield />` icon.

---

## SECTION 8 — Polish

### POL-01 — Toast notification system
**Priority:** 🟠 High · **Est. time:** 2h · **Both apps**  
Replace `alert()` and inline error text with a toast component. Success/error/info variants with Lucide icons.

### POL-02 — Skeleton loading states
**Priority:** 🟡 Medium · **Est. time:** 2h · **Both apps**  
Replace "Loading..." text and spinners with pulsing skeleton placeholder blocks.

### POL-03 — Empty states
**Priority:** 🟡 Medium · **Est. time:** 2h · **Both apps**  
Consistent pattern: large muted Lucide icon + heading + sub-copy + optional CTA.

### POL-04 — Mobile responsiveness audit
**Priority:** 🟠 High · **Est. time:** 3h · **Both apps**  
All tap targets ≥ 44×44px. No horizontal scroll at 390px. Stats grids collapse correctly.

### POL-05 — Transitions & hover states
**Priority:** 🟢 Low · **Est. time:** 1h · **Both apps**  
`transition-colors duration-150` on all interactive elements. `hover:border-accent/50` on clickable cards.

---

## SECTION 9 — Premium Features (Post-Launch)

### PREM-01 — Card Design Editor
**Priority:** 🟢 Low · **Est. time:** 8h  
Background color picker, logo upload, stamp icon selection. Live card preview. Gated behind premium flag on Business record.

### PREM-02 — Business Analytics Dashboard
**Priority:** 🟢 Low · **Est. time:** 6h  
Stamps/day chart, peak hours, top customers, redemption rate. Read the `dataviz` skill before building.

### PREM-03 — AI-Assisted Card Design
**Priority:** 🟢 Low · **Est. time:** varies  
Describe brand in text → get color palette + logo suggestions. Canva embed or Logoai integration. Paid tier feature.

### PREM-04 — PWA Install Prompt
**Priority:** 🟢 Low · **Est. time:** 2h  
Show "Add to Home Screen" after first successful scan. Improves staff retention on mobile.

### PREM-05 — Onboarding Wizard (New Business)
**Priority:** 🟢 Low · **Est. time:** 5h  
First-login flow: set stamp goal → upload logo → preview card → print enrollment QR.

### PREM-06 — Notification Center
**Priority:** 🟢 Low · **Est. time:** 8h  
In-app feed: "Customer X ready to redeem", "New enrollment". WebSocket or polling.

---

## Master Priority Order (What to Do Next)

| # | Task | Est. | Priority |
|---|------|------|----------|
| 1 | INF-01 — dev branch + Railway dev env | 2h | 🔴 |
| 2 | INF-02 — Buy loyal-ly.app domain | 1h | 🔴 |
| 3 | BE-01 — card_bg_color migration | 2h | 🔴 |
| 4 | BE-02 — Forced password change | 3h | 🔴 |
| 5 | BE-03 — Temp password email (Resend) | 4h | 🔴 |
| 6 | GW-01 — Add test accounts to Wallet whitelist | 0.5h | 🔴 |
| 7 | GW-02 — Google Wallet API approval (external) | — | 🔴 |
| 8 | FE-01 — Design token system | 2h | 🔴 |
| 9 | FE-02 — Lucide React + replace UI emoji | 3h | 🔴 |
| 10 | FE-03 — Global layout shell | 2h | 🔴 |
| 11 | FE-04 — i18n setup (react-i18next) | 3h | 🔴 |
| 12 | FE-05 — RTL layout direction | 2h | 🔴 |
| 13 | CC-01 — CustomerCardPage redesign | 5h | 🔴 |
| 14 | CC-02 — Language switcher on CustomerCard | 3h | 🔴 |
| 15 | GW-04 — Hebrew wallet badge SVG | 1h | 🟠 |
| 16 | CC-03 — Wallet badge locale logic | 2h | 🟠 |
| 17 | INF-03 — Cloudflare + admin subdomain | 1h | 🟠 |
| 18 | BE-04 — Logo upload UI | 3h | 🟠 |
| 19 | FE-06 — RTL fonts (Heebo + Noto Arabic) | 1h | 🟠 |
| 20 | GW-03 — Remove emoji from wallet text | 1h | 🟠 |
| 21 | PWA-08 — Language switcher for staff | 2h | 🟠 |
| 22 | PWA-01 — LoginPage | 2h | 🟠 |
| 23 | PWA-02 — HomePage | 3h | 🟠 |
| 24 | PWA-03 — ScanPage | 3h | 🟠 |
| 25 | POL-01 — Toast notifications | 2h | 🟠 |
| 26 | POL-04 — Mobile audit | 3h | 🟠 |
| 27 | PWA-04 — CustomersPage | 3h | 🟡 |
| 28 | PWA-05 — SettingsPage | 2h | 🟡 |
| 29 | PWA-06 — StaffPage | 2h | 🟡 |
| 30 | PWA-07 — EnrollPage + QR | 2h | 🟡 |
| 31 | ADM-01 — Admin Dashboard | 3h | 🟡 |
| 32 | ADM-02 — BusinessesPage | 3h | 🟡 |
| 33 | ADM-03 — BusinessDetailPage | 3h | 🟡 |
| 34 | ADM-04 — AddBusinessPage | 4h | 🟡 |
| 35 | ADM-05 — Admin LoginPage | 1h | 🟡 |
| 36 | BE-05 — Per-business analytics endpoint | 3h | 🟡 |
| 37 | POL-02 — Skeleton loading | 2h | 🟡 |
| 38 | POL-03 — Empty states | 2h | 🟡 |
| 39 | GW-05 — Apple Wallet | 16h | 🟢 |
| 40 | POL-05 — Transitions/hover | 1h | 🟢 |
| 41 | PREM-01 — Card Design Editor | 8h | 🟢 |
| 42 | PREM-02 — Business Analytics Dashboard | 6h | 🟢 |
| 43 | PREM-04 — PWA Install Prompt | 2h | 🟢 |
| 44 | PREM-05 — Onboarding Wizard | 5h | 🟢 |
| 45 | PREM-06 — Notification Center | 8h | 🟢 |
| 46 | PREM-03 — AI Card Design | varies | 🟢 |

**Total estimated (Critical + High only):** ~60h  
**Total estimated (all tasks):** ~130h

---

## Completed ✅

- Google Wallet pass creation & update (per-business class + per-customer object)
- Joe's Coffee logo via Cloudinary
- Per-business card name (`programName`) on wallet card
- Reward-ready state (stamp label + text modules change when card is full)
- Class patch failures non-fatal (wallet works even if Google rejects class update)
- `hexBackgroundColor` wired into wallet class
- `card_bg_color` param in `create_or_update_pass` and both stamp/card endpoints
- Staff management (add/remove)
- Business owner / staff role separation
- Customer enrollment via QR
- PWA scan → stamp flow
- Reward redemption flow
- Admin portal with analytics
- FRONTEND_REDESIGN_ROADMAP.md (detailed task breakdown for all FE tasks)
- EN + AR Google Wallet badges in project assets
- Wallet badge SVGs for: EN-US, EN-GB, AR, ES-US (Add) + EN-GB, AR (View in Wallet)

---

## Notes & Decisions Log

| Date | Decision |
|------|----------|
| 2026-10-19 | Palette chosen: Chrome Black `#0D0D0D` + Digital Lilac `#D9B8FF` |
| 2026-10-19 | Design inspiration: Linear, Vercel, Stripe Dashboard, Notion |
| 2026-10-19 | Icon library: Lucide React (no other icon/emoji library in UI chrome) |
| 2026-10-19 | `categories.ts` stampEmoji stays — it's user-facing product data, not UI chrome |
| 2026-10-21 | RTL: Hebrew + Arabic are first-class, not an afterthought. Setup in Phase 0. |
| 2026-10-21 | Wallet badge logic: use i18next language to select official locale badge SVG |
| 2026-10-21 | Hebrew wallet badge still missing — needs to be downloaded from Google brand kit |
| 2026-10-21 | Email provider decision: Resend (recommended over SendGrid for new projects) |
| 2026-10-21 | Logo upload: Cloudinary Upload Widget preferred (frontend-only, no backend changes) |
