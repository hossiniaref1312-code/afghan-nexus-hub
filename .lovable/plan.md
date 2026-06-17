# AfghanMarket — Build Plan

This is a very large scope (auth, 5 modules, chat, ads, payments, admin, 25+ languages, RTL). I can't ship all of it in a single turn and keep quality high. Here's how I propose to break it down so you get a working, production-quality app in phases — each phase is itself shippable.

## Phase 1 — Foundation (this turn, if you approve)
- Enable Lovable Cloud (database + auth + storage).
- Design system: custom brand (not generic AI look), light + dark mode, mobile-first, Dari/Pashto/English with RTL.
- i18n scaffold supporting all 25 languages you listed (Dari, Pashto, English wired with real strings; others stubbed and easy to fill).
- Phone + OTP auth (Dari/Pashto/English UI), profile with hidden province/city.
- Home dashboard: 5 large category cards, search bar, language switcher, theme toggle.
- DB schema for: profiles, listings (unified, typed by category), favorites, reports, user_roles.
- Listing browse + detail + create flow for **Marketplace** category end-to-end as the reference implementation.

## Phase 2 — Category modules
Real Estate, Vehicles, Jobs, Services — each with category-specific fields, filters, image galleries, favorites, contact-by-phone.

## Phase 3 — Chat
Realtime buyer/seller messaging with image sharing (Cloud Realtime + Storage).

## Phase 4 — Ads & monetization
Boosted/featured listings, in-feed promoted slots, admin controls. AdMob and Afghan telco (Roshan/Etisalat/AWCC) billing are external integrations — I'll wire the UI + DB and we'll connect real providers when you have API access/credentials (they aren't self-serve).

## Phase 5 — Admin panel
Users, listings, reports, analytics, ad/monetization controls. Role-gated via `has_role()`.

## Phase 6 — Polish & hardening
Anti-spam, rate limits, full translations for remaining languages, Capacitor wrap for Android/iOS.

## Technical notes
- Stack: TanStack Start + React + Tailwind v4 + Lovable Cloud (Postgres + Auth + Storage + Realtime).
- Auth: Supabase phone OTP. Afghan telco SMS gateways aren't built-in; default OTP works on +93 numbers via Supabase's SMS provider — for production volume you'll want to plug in Twilio or a local SMS gateway later.
- Ads/payments: AdMob is mobile-SDK only (needs the Capacitor wrap in Phase 6). Afghan telco mobile-balance billing requires per-operator merchant agreements — not something I can provision; I'll build the abstraction so we drop in providers when ready.
- Maps: free OpenStreetMap/Leaflet by default; can swap to Google/Mapbox if you provide a key.
- Privacy: province/city stored on profile but excluded from all public RLS policies; only admin role can read.

## What I need from you
1. **Approve the phased approach** (vs. trying to cram everything at once and shipping a shallow demo).
2. **Brand direction** for Phase 1 — pick one or say "you choose":
   - (a) Warm & local: deep emerald + saffron accents, geometric Islamic-pattern motifs.
   - (b) Modern minimal: near-black + single vivid accent (electric cyan or hot coral), lots of whitespace.
   - (c) Bold trust: deep navy + gold, dense card layouts like top classifieds apps.
3. **OK to defer** real AdMob + Afghan telco payment hookups to Phase 4 once you have provider credentials? (I'll build the UI and stubs now.)

Reply with approval + brand choice and I'll start Phase 1 immediately.
