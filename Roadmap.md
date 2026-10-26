# Loyally — Product Roadmap

_Last updated: 2026-10-26_

---

## ✅ Done
- Google Wallet pass creation & update (per-business class + per-customer object)
- Joe's Coffee logo via Cloudinary
- Per-business card name (`programName`) on wallet card
- Reward-ready state: stamp label + text modules change when card is full
- Class patch failures non-fatal (wallet works even if Google rejects class update)
- CORS fully resolved (bare hostnames in ALLOWED_HOSTS, ALLOWED_ORIGINS in config, settings wired in main.py)
- loyal-ly.com Hebrew RTL landing page v1 (animated card, wallet badges, features, contact form)

---

## 🔧 In Progress / Next Up

### Immediate
- [ ] **Landing page: stamp icons** — replace `2/6` counter text with icon-based stamp grid (filled ✦ / empty ○ circles), matching real Google Wallet pass appearance (Priority 1)
- [ ] **Landing page: Google Wallet–style card preview** — card visual should match real wallet pass layout (header logo, program name, stamp row as icon grid, not numbers)
- [ ] **Landing page: business admin UI preview** — add a second card/screenshot showing the business owner's dashboard (stamp button, card list, analytics strip)
- [ ] **Landing page: "How It Works" rewrite** — simplify steps, more conversational Hebrew, less bullet-point feel
- [ ] **Landing page: remove statistics strip** — stats are placeholder; replace with social proof / logos / a single trust line once real numbers exist
- [ ] Add `card_bg_color` column to Business model + Alembic migration
- [ ] Wire `bg_color=business.card_bg_color` through `stamps.py` and `cards.py`

### Short-term
- [ ] Logo upload in admin portal (replace manual Cloudinary URL paste)
- [ ] Forced password change on first login (`must_change_password` field + `ChangePasswordPage`)
- [ ] Temp password email on business/staff creation (Resend)
- [ ] Set admin portal subdomain in Cloudflare

---

## 🗺️ Roadmap

### Card Design
- [ ] **Replace emojis with proper icons** — wallet pass text modules currently use emoji (🎁, etc.). Replace with clean icon assets or icon font glyphs hosted on Cloudinary.
- [ ] Card background color picker in admin portal (color swatch UI, saves to `card_bg_color`)
- [ ] Card design editor in admin — live preview of wallet card (name, logo, bg color)
- [ ] **Stamp icons in wallet pass** — `loyaltyPoints` currently shows `2/6` string; render as icon row in imageModulesData or via secondary text modules

### Premium / Paid Features
- [ ] **AI-assisted card design** — describe your brand, get color palette + logo suggestions
- [ ] Apple Wallet support ($99 Apple Developer enrollment + PassKit)
- [ ] RTL support (Hebrew + Arabic) across all frontend surfaces

### Platform
- [ ] Google Wallet publishing approval (submitted — awaiting Google support reply; `[TEST ONLY]` removed on approval)
- [ ] Multi-language support (Hebrew, Arabic, English)
- [ ] Analytics dashboard for business owners (stamps/day, redemption rate, active cards)
- [ ] Landing page pricing section (once pricing tiers decided)
- [ ] Logo design: 4 versions — primary, secondary, brandmark, favicon

---

## 📝 Notes
- Google Wallet issuer: support ticket submitted for publishing access (demo mode → live); class is already "approved" in console but issuer in demo mode
- Cloudinary logo URL for Joe's Coffee: `https://res.cloudinary.com/w3ip7map/image/upload/v1792437179/Brown_White_Modern_Elegant_Round_Coffee_Shop_Logo.png`
- Logo specs: 300×300px, transparent background, public HTTPS URL
- QR_BASE_URL set to `https://loyal-ly.com/card`
- Landing page live at `https://loyal-ly.com` (deploy from artifact HTML)