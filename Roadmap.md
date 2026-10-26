# Loyally — Master Product Roadmap

> **Last updated:** 2026-10-26
> **Version:** 2.0
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

## ✅ Completed

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
- EN + AR Google Wallet badges in project assets
- Wallet badge SVGs for: EN-US, EN-GB, AR, ES-US (Add) + EN-GB, AR (View in Wallet)
- CORS fully resolved (bare hostnames in ALLOWED_HOSTS, ALLOWED_ORIGINS in config, settings wired in main.py)
- loyal-ly.com domain purchased + DNS on Cloudflare
- Hebrew RTL landing page v1 — animated card, wallet badges, features, contact form, admin UI preview
- Landing page: stamp icons as filled/empty circles (Google Wallet style)
- Landing page: "How It Works" simplified to 3 steps
- Landing page: stats strip replaced with trust strip
- Cloudflare Email Routing — contact@loyal-ly.com → personal inbox

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

### INF-02 — Deploy landing page to Cloudflare Pages
**Priority:** 🔴 Critical
**Est. time:** 1h
**Why:** loyal-ly.com is currently empty. Landing page is ready.

Steps:
1. Export HTML from artifact
2. Create new Cloudflare Pages project → upload HTML file
3. Connect custom domain `loyal-ly.com`
4. Wire Web3Forms access key into contact form → submissions land at contact@loyal-ly.com

---

### INF-03 — Set up admin subdomain in Cloudflare
**Priority:** 🟠 High
**Est. time:** 1h

- `admin.loyal-ly.com` → Admin portal on Vercel
- Enable Cloudflare proxy (orange cloud) for DDoS protection
- SSL: Full (strict) mode

---

## SECTION 2 — Backend / Database

### BE-01 — Add `card_bg_color` to Business model
**Priority:** 🔴 Critical
**Est. time:** 2h
**Why:** Business card background color is already wired in `wallet_service.py` but there's no DB column to store it.

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
**Why:** New staff and business owners receive a temp password they never change. Security risk.

Steps:
1. Add `must_change_password: bool = True` to User model + new migration
2. On login: if `must_change_password`, return `{ "must_change_password": true }` in response
3. Frontend: detect flag → redirect to `ChangePasswordPage`
4. `ChangePasswordPage`: current + new + confirm → `PATCH /users/me/password`
5. On success: set `must_change_password = False` in DB

---

### BE-03 — Temp password email on business/staff creation
**Priority:** 🔴 Critical
**Est. time:** 4h
**Depends on:** BE-02
**Why:** Currently passwords are shared manually. Can't scale.

Steps:
1. `pip install resend` — add `RESEND_API_KEY` env var
2. `app/services/email_service.py`: `send_welcome_email(to, business_name, temp_password)`
3. Call from admin endpoint when creating a business
4. Call from business endpoint when adding staff
5. Email template: welcome + temp password + login URL (`app.loyal-ly.com`)

---

### BE-04 — Logo upload (replace Cloudinary manual URL)
**Priority:** 🟠 High
**Est. time:** 2h (Option A — frontend-only)
**Why:** Business owners can't upload a logo from the UI.

**Option A — Cloudinary Upload Widget (recommended):** Frontend uses Cloudinary unsigned upload preset. Returns URL saved to `logo_url`. No backend changes needed.

---

### BE-05 — Analytics: per-business detailed endpoint
**Priority:** 🟡 Medium
**Est. time:** 3h

`GET /businesses/me/analytics/detailed`:
- Stamps per day (last 30 days)
- Peak hours
- Top 5 customers by stamps
- Redemption rate
- Active vs inactive cards

---

## SECTION 3 — Google Wallet

### GW-01 — Add test Google accounts to Wallet Console whitelist
**Priority:** 🔴 Critical
**Est. time:** 30 min
**Why:** Currently only your own Google account can save test passes. Can't demo to clients.

Steps:
1. Go to [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Wallet Objects → your issuer → Test accounts
3. Add Gmail accounts of clients/testers

---

### GW-02 — Google Wallet API publishing approval
**Priority:** 🔴 Critical (external — not in our control)
**Est. time:** 2–5 business days
**Current status:** Business Profile = Approved · Wallet API = In Review · Support ticket submitted

When approved:
- `[TEST ONLY]` prefix disappears automatically
- All Gmail accounts can save passes
- No further code changes needed

---

### GW-03 — Remove emoji from wallet pass text modules
**Priority:** 🟠 High
**Est. time:** 1h
**Depends on:** GW-02
**File:** `app/services/wallet_service.py`

- `"🎁 Reward Ready to Claim!"` → `"Reward Ready to Claim!"`
- `"🎁 Reward Ready!"` in `loyaltyPoints.label` → `"Reward Ready!"`
- Reason: Google Wallet renders emoji inconsistently across devices

---

### GW-04 — Hebrew wallet badge SVG
**Priority:** 🟠 High
**Est. time:** 1h

1. Download Hebrew "Add to Google Wallet" badge from [Google brand guidelines](https://developers.google.com/wallet/generic/resources/brand-guidelines)
2. Add as `he_add_to_google_wallet_add-wallet-badge.svg`
3. Add Hebrew "View in Wallet" badge: `he_view_in_wallet_wallet-button.svg`
4. Wire into CustomerCardPage language detection (CC-03)

---

### GW-05 — Apple Wallet support
**Priority:** 🟢 Low
**Est. time:** 16h
**Cost:** $99/year Apple Developer Program

Steps:
1. Enroll in Apple Developer Program
2. Create Pass Type ID certificate
3. `app/services/apple_wallet_service.py`
4. `GET /cards/{token}/apple-wallet` → returns `.pkpass` file
5. CustomerCardPage: detect iOS → show Apple Wallet button

---

## SECTION 4 — Frontend Foundation
*Must happen before any page redesign.*

### FE-01 — Design Token System
**Priority:** 🔴 Critical
**Est. time:** 2h · Both apps

Replace every hardcoded hex with CSS custom properties on `:root`, wired into `tailwind.config.ts`:

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
**Est. time:** 3h · Both apps

```bash
npm install lucide-react
```

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
| CustomerCardPage | 👋 | remove |
| DashboardPage | 🛡️ | `<Shield />` |
| LoginPage (PWA) | ☕ | `<Layers />` |

**Exception:** `categories.ts` `emoji` / `stampEmoji` fields are user-facing product data — keep them.

---

### FE-03 — Global Layout Shell component
**Priority:** 🔴 Critical
**Est. time:** 2h · Both apps

Extract shared header + page wrapper into `<AppShell title subtitle actions>`. All pages use it.

---

### FE-04 — i18n Library Setup (react-i18next)
**Priority:** 🔴 Critical
**Est. time:** 3h · Both apps

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

```
src/i18n/
  index.ts
  locales/
    en.json
    he.json
    ar.json
```

Detection order: `localStorage('loyally_lang')` → `navigator.language` → `'en'`

---

### FE-05 — RTL Layout Direction
**Priority:** 🔴 Critical
**Est. time:** 2h · Depends on: FE-04

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
**Est. time:** 1h · Depends on: FE-05

```css
:root            { font-family: 'Inter', sans-serif; }
:root[lang="he"] { font-family: 'Heebo', sans-serif; }
:root[lang="ar"] { font-family: 'Noto Sans Arabic', sans-serif; }
```

---

## SECTION 5 — CustomerCardPage (Public — Highest Impact)
*This is what customers see. Most important page to get right.*

### CC-01 — CustomerCardPage full redesign
**Priority:** 🔴 Critical
**Est. time:** 5h · Depends on: FE-01, FE-02

- Business logo: rounded-lg with shadow
- Stamp grid: filled/empty circles with accent color
- Reward-ready banner: full-width accent highlight
- QR code: white background card
- All colors from tokens

---

### CC-02 — Language switcher on CustomerCardPage
**Priority:** 🔴 Critical
**Est. time:** 3h · Depends on: FE-04, FE-05

- Auto-detect from `navigator.language`
- Three-button pill: `EN` | `עב` | `AR`
- Persists to `localStorage('loyally_lang')`
- Triggers `document.dir` change

| English | Hebrew | Arabic |
|---------|--------|--------|
| Loyalty Card | כרטיס נאמנות | بطاقة الولاء |
| X of Y stamps | X מתוך Y בולים | X من Y طوابع |
| Reward Ready! | !הפרס מוכן | !المكافأة جاهزة |
| Show this at the counter | הצג זאת בקופה | أرِ هذا عند الكاشير |

---

### CC-03 — Wallet badge locale logic
**Priority:** 🟠 High
**Est. time:** 2h · Depends on: CC-02, GW-04

```ts
const GOOGLE_WALLET_BADGES = {
  'en':    '/badges/enUS_add_to_google_wallet_add-wallet-badge.svg',
  'en-GB': '/badges/enGB_add_to_google_wallet_add-wallet-badge.svg',
  'ar':    '/badges/ar_add_to_google_wallet_add-wallet-badge.svg',
  'he':    '/badges/he_add_to_google_wallet_add-wallet-badge.svg',
};
```

Move all badge SVGs to: `frontend/loyalty-pwa/public/badges/`

---

## SECTION 6 — PWA Staff App Redesign

| Task | Priority | Est. | Notes |
|------|----------|------|-------|
| PWA-08 — Language switcher for staff | 🟠 High | 2h | Depends on FE-04, FE-05 |
| PWA-01 — LoginPage | 🟠 High | 2h | `<Layers />` icon, token colors |
| PWA-02 — HomePage | 🟠 High | 3h | Emoji → Lucide, stats polish |
| PWA-03 — ScanPage | 🟠 High | 3h | QR frame, pulse animation, state banners |
| PWA-04 — CustomersPage | 🟡 Medium | 3h | Empty state, avatar, search |
| PWA-05 — SettingsPage | 🟡 Medium | 2h | Token colors, category picker |
| PWA-06 — StaffPage | 🟡 Medium | 2h | Role badges, add/remove |
| PWA-07 — EnrollPage + QR | 🟡 Medium | 2h | Print + share buttons |

---

## SECTION 7 — Admin Portal Redesign

| Task | Priority | Est. | Notes |
|------|----------|------|-------|
| ADM-01 — DashboardPage | 🟡 Medium | 3h | `<Shield />`, token colors |
| ADM-02 — BusinessesPage | 🟡 Medium | 3h | Filter tabs, search, status pills |
| ADM-03 — BusinessDetailPage | 🟡 Medium | 3h | Stats row, approve/suspend |
| ADM-04 — AddBusinessPage | 🟡 Medium | 4h | Multi-section form + live card preview |
| ADM-05 — LoginPage (Admin) | 🟡 Medium | 1h | Token colors, `<Shield />` |

---

## SECTION 8 — Polish

| Task | Priority | Est. | Notes |
|------|----------|------|-------|
| POL-01 — Toast notifications | 🟠 High | 2h | Replace `alert()`, success/error/info |
| POL-04 — Mobile responsiveness audit | 🟠 High | 3h | ≥44px tap targets, no horizontal scroll |
| POL-02 — Skeleton loading states | 🟡 Medium | 2h | Pulsing placeholders |
| POL-03 — Empty states | 🟡 Medium | 2h | Icon + heading + sub-copy + CTA |
| POL-05 — Transitions & hover | 🟢 Low | 1h | `transition-colors duration-150` |

---

## SECTION 9 — Landing Page Remaining
*Low priority — page is live and functional.*

| Task | Priority | Est. | Notes |
|------|----------|------|-------|
| Web3Forms contact form wiring | 🟠 High | 30 min | Need Web3Forms access key |
| Deploy to Cloudflare Pages | 🟠 High | 30 min | HTML ready, waiting on deploy |
| Pricing section | 🟡 Medium | 2h | Once pricing tiers decided |
| Logo + brand assets | 🟡 Medium | — | 4 versions: primary, secondary, brandmark, favicon |

---

## SECTION 10 — Premium Features (Post-Launch)

| Task | Priority | Est. | Notes |
|------|----------|------|-------|
| PREM-01 — Card Design Editor | 🟢 Low | 8h | BG picker, logo upload, live preview |
| PREM-02 — Business Analytics Dashboard | 🟢 Low | 6h | Read dataviz skill before building |
| PREM-04 — PWA Install Prompt | 🟢 Low | 2h | After first successful scan |
| PREM-05 — Onboarding Wizard | 🟢 Low | 5h | First-login flow: stamp goal → logo → QR |
| PREM-06 — Notification Center | 🟢 Low | 8h | WebSocket or polling |
| PREM-03 — AI Card Design | 🟢 Low | varies | Canva/Logoai integration, paid tier |

---

## Master Priority Order

| # | Task | Est. | Priority |
|---|------|------|----------|
| 1 | INF-01 — dev branch + Railway dev env | 2h | 🔴 |
| 2 | INF-02 — Deploy landing page to Cloudflare Pages | 1h | 🔴 |
| 3 | BE-01 — card_bg_color migration | 2h | 🔴 |
| 4 | BE-02 — Forced password change | 3h | 🔴 |
| 5 | BE-03 — Temp password email (Resend) | 4h | 🔴 |
| 6 | GW-01 — Add test accounts to Wallet whitelist | 0.5h | 🔴 |
| 7 | GW-02 — Google Wallet publishing approval (external) | — | 🔴 |
| 8 | FE-01 — Design token system | 2h | 🔴 |
| 9 | FE-02 — Lucide React + replace UI emoji | 3h | 🔴 |
| 10 | FE-03 — Global layout shell | 2h | 🔴 |
| 11 | FE-04 — i18n setup (react-i18next) | 3h | 🔴 |
| 12 | FE-05 — RTL layout direction | 2h | 🔴 |
| 13 | CC-01 — CustomerCardPage redesign | 5h | 🔴 |
| 14 | CC-02 — Language switcher on CustomerCard | 3h | 🔴 |
| 15 | INF-03 — Cloudflare admin subdomain | 1h | 🟠 |
| 16 | BE-04 — Logo upload (Cloudinary widget) | 2h | 🟠 |
| 17 | GW-03 — Remove emoji from wallet text | 1h | 🟠 |
| 18 | GW-04 — Hebrew wallet badge SVG | 1h | 🟠 |
| 19 | CC-03 — Wallet badge locale logic | 2h | 🟠 |
| 20 | FE-06 — RTL fonts (Heebo + Noto Arabic) | 1h | 🟠 |
| 21 | PWA-08 — Language switcher for staff | 2h | 🟠 |
| 22 | PWA-01 — LoginPage | 2h | 🟠 |
| 23 | PWA-02 — HomePage | 3h | 🟠 |
| 24 | PWA-03 — ScanPage | 3h | 🟠 |
| 25 | POL-01 — Toast notifications | 2h | 🟠 |
| 26 | POL-04 — Mobile audit | 3h | 🟠 |
| 27 | Landing — Web3Forms + Cloudflare deploy | 1h | 🟠 |
| 28 | PWA-04 — CustomersPage | 3h | 🟡 |
| 29 | PWA-05 — SettingsPage | 2h | 🟡 |
| 30 | PWA-06 — StaffPage | 2h | 🟡 |
| 31 | PWA-07 — EnrollPage + QR | 2h | 🟡 |
| 32 | ADM-01 — Admin Dashboard | 3h | 🟡 |
| 33 | ADM-02 — BusinessesPage | 3h | 🟡 |
| 34 | ADM-03 — BusinessDetailPage | 3h | 🟡 |
| 35 | ADM-04 — AddBusinessPage | 4h | 🟡 |
| 36 | ADM-05 — Admin LoginPage | 1h | 🟡 |
| 37 | BE-05 — Per-business analytics endpoint | 3h | 🟡 |
| 38 | POL-02 — Skeleton loading | 2h | 🟡 |
| 39 | POL-03 — Empty states | 2h | 🟡 |
| 40 | Landing — Pricing section | 2h | 🟡 |
| 41 | Landing — Logo + brand assets | — | 🟡 |
| 42 | GW-05 — Apple Wallet | 16h | 🟢 |
| 43 | POL-05 — Transitions/hover | 1h | 🟢 |
| 44 | PREM-01 — Card Design Editor | 8h | 🟢 |
| 45 | PREM-02 — Business Analytics Dashboard | 6h | 🟢 |
| 46 | PREM-04 — PWA Install Prompt | 2h | 🟢 |
| 47 | PREM-05 — Onboarding Wizard | 5h | 🟢 |
| 48 | PREM-06 — Notification Center | 8h | 🟢 |
| 49 | PREM-03 — AI Card Design | varies | 🟢 |

**Total estimated (Critical + High only):** ~65h
**Total estimated (all tasks):** ~140h

---

## Notes & Decisions Log

| Date | Decision |
|------|----------|
| 2026-10-19 | Palette: Chrome Black `#0D0D0D` + Digital Lilac `#D9B8FF` |
| 2026-10-19 | Design inspiration: Linear, Vercel, Stripe Dashboard, Notion |
| 2026-10-19 | Icon library: Lucide React (no other icon/emoji library in UI chrome) |
| 2026-10-19 | `categories.ts` stampEmoji stays — user-facing product data, not UI chrome |
| 2026-10-21 | RTL: Hebrew + Arabic are first-class, not an afterthought. Setup in Phase 0. |
| 2026-10-21 | Wallet badge logic: use i18next language to select official locale badge SVG |
| 2026-10-21 | Hebrew wallet badge missing — needs download from Google brand kit |
| 2026-10-21 | Email provider: Resend (recommended over SendGrid for new projects) |
| 2026-10-21 | Logo upload: Cloudinary Upload Widget preferred (frontend-only, no backend changes) |
| 2026-10-26 | Domain: loyal-ly.com (not loyal-ly.app) — already live with Cloudflare DNS |
| 2026-10-26 | Contact email: contact@loyal-ly.com — Cloudflare Email Routing configured |
| 2026-10-26 | Landing page: contact form wired to Web3Forms pending access key |
| 2026-10-26 | Google Wallet support ticket submitted — awaiting publishing access approval |