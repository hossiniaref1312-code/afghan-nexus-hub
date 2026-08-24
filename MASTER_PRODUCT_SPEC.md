# MASTER_PRODUCT_SPEC.md — Afghan Nexus Hub (AfghanMarket)

Phase 1 specification. Authoritative evidence: `MASTER_PROJECT_AUDIT.md`, `FINAL_PHASE0_VERIFICATION.md`. No code or schema changed.
Legend for every section: **[EXISTS]** verified implemented, **[PARTIAL]** partly implemented, **[NEW]** not implemented today.

---

## 1. Platform vision
A mobile-first, multilingual super-marketplace for Afghanistan combining classifieds (real estate, vehicles, jobs, services, goods) with seller-run shops (catalog, cart, checkout, fulfilment) and a manual, locally-realistic payment layer (mobile money, bank transfer, cash). The platform must work on low-end Android over slow networks, default to Dari/Pashto, and be safe for users whose contact details are a real-world safety concern.

Non-goals for v1: escrow, international card acquiring, in-app delivery fleet, native app store builds.

## 2. Actors

| Actor | Capabilities | Status |
|---|---|---|
| Guest | Browse active listings/shops/products, search, view public shop profile without contact PII, sign up | [PARTIAL] — contact PII currently public |
| Buyer | Favorites, chat, cart, checkout, orders, reviews, reports, saved searches | [PARTIAL] — reviews & saved searches [NEW] |
| Seller (individual) | Post/edit/pause/renew/delete listings, promote listings, chat, respond to reports | [PARTIAL] — only create today |
| Business / Shop owner | Shop profile, categories, products with images, stock, orders, fulfilment, shop analytics | [PARTIAL] — image upload & analytics [NEW] |
| Moderator | Review listing/report queues, hide content, warn users; no role or payment powers | [NEW] (enum exists, unused) |
| Admin | Everything moderators can do + roles, ad orders, shops, orders, payments, audit log, system health | [PARTIAL] — client-gated UI, DB-enforced policies |
| System | Expiry jobs, notification fan-out, ad activation, analytics rollups | [PARTIAL] — ad activation trigger only |

## 3. Categories and dynamic attributes
[EXISTS] Five top-level categories (`real_estate`, `vehicles`, `marketplace`, `jobs`, `services`) with per-category attribute schemas (`src/lib/category-schemas.ts`) stored in `listings.attributes` JSONB and filterable.

Target:
- [NEW] Subcategories (one level) with slug, icon, locale names — DB-driven, not hardcoded.
- [NEW] Attribute definitions moved to a `category_attributes` table so admins add fields without a deploy; attribute types: enum, number, range, boolean, text.
- [NEW] Per-attribute validation (Zod generated from definitions), unit handling (m², jerib, km, year), and indexed attributes for the filters that matter (price, year, rooms, area).

## 4. Lifecycles

### 4.1 Listing lifecycle [PARTIAL]
`draft → pending → active → (paused | sold | expired | rejected) → archived/deleted`
Exists: statuses enum (`active, sold, expired, pending, rejected`), create, admin moderation, featured flag via ad activation.
Target: owner edit, pause/resume, mark sold, renew, soft delete; automatic expiry after N days; resubmission after rejection with reason shown; moderation reason recorded in audit log; view counter incremented server-side with dedupe.

### 4.2 User lifecycle [PARTIAL]
`signup → (email verified | phone verified) → active → (suspended | banned) → deleted`
Exists: email/password signup with profile trigger, profile read/update, language preference.
Target: password reset, email verification UI, Google sign-in, avatar upload, phone verification (blocked on SMS provider), account settings, suspension/ban enforced by policy, self-serve deletion with data-retention rules.

### 4.3 Shop lifecycle [PARTIAL]
`created → active → (paused | suspended) → closed`
Exists: create/edit shop, unique slug and one shop per owner, categories, products, is_active flag.
Target: verification badge, logo/banner uploads, pause mode (hides products, keeps orders), admin suspension, closure with open-order guard.

### 4.4 Order lifecycle [PARTIAL]
`cart → placed(pending) → confirmed → paid → shipped → delivered | cancelled | refunded`
Exists: cart, checkout, order + items creation from the browser, seller status updates.
Target: server-authoritative order creation (see §Payments/Architecture P0-1), stock reservation, cancellation windows (buyer before `shipped`, seller anytime with reason), refund state, immutable order-event history.

### 4.5 Payment lifecycle [PARTIAL]
`awaiting_payment → reference_submitted → seller_verified → paid | failed | refunded`
Exists: manual method catalog (mobile money / bank / cash) and reference text field.
Target: `payments` table separate from orders, one row per attempt, status machine, seller/admin verification action, refund records, and a provider-adapter interface so Stripe/PayPal can be added later without touching order logic. All amounts are server-derived; the client never sends money values.

### 4.6 Delivery lifecycle [NEW]
`not_required | pending → dispatched → in_transit → delivered | failed_delivery | returned`
Province/city/address captured at checkout today; add shipping method, fee (server-computed table by province), courier/reference field, delivery events, and buyer confirmation.

### 4.7 Review lifecycle [NEW]
`eligible (delivered order or completed deal) → submitted → published | flagged → removed`
Product reviews, shop reviews, and buyer↔seller ratings. One review per order line. Editable for 7 days. Ratings aggregate into denormalized `rating_avg`/`rating_count` maintained by trigger. Reviews are moderatable and reportable.

### 4.8 Moderation lifecycle [PARTIAL]
`report/auto-flag → queue → triage → action (none | hide | remove | warn | suspend | ban) → appeal → resolved`
Exists: reports table, admin report and listing queues.
Target: moderator role wired, structured action reasons, audit entries for every action, notification to affected user, appeal channel, automatic flags (duplicate text, banned keywords, image count anomalies, velocity).

### 4.9 Notification lifecycle [NEW]
`event → preference check → in-app record → (email | push) delivery → read → archived`
Events: new message, listing approved/rejected/expiring, order placed/status change, payment verified, review received, ad approved/expired, moderation action. In-app notification center with unread badge; per-channel per-category preferences; email through the platform email infrastructure; web push later.

### 4.10 Advertising lifecycle [PARTIAL]
`package selected → order created (pending) → payment reference → admin approve/reject → active → expired`
Exists: `ad_packages`, `ad_orders`, approval trigger that features the listing until `expires_at`.
Target: impression/click tracking with CTR, in-feed native ad units and interstitials with skip timer, expiry job that unfeatures listings, advertiser-facing performance view, revenue reporting. Third-party ad networks and PayPal payouts remain a business/account dependency, not a code blocker.

## 5. Cross-cutting product requirements

**Verification [NEW]:** phone-verified (SMS provider dependency), email-verified, ID-verified shop (manual admin review with document upload to a private bucket), each surfaced as a badge; verification level can gate posting limits.

**Search [PARTIAL]:** keyword + category + attribute + province filters exist (ILIKE/trigram). Target: Postgres full-text with weighted title/description, language-aware normalization for Dari/Pashto, relevance + recency + featured ranking, pagination (keyset), sortable, URL-synced state, typo tolerance via trigram fallback, zero-result suggestions.

**Saved searches [NEW]:** save any filter set, name it, opt into daily/instant alerts, delivered through the notification system.

**Messaging [PARTIAL]:** realtime conversations and messages exist with participant-only RLS. Target: unread badge, read receipts (column exists), typing indicator, block/mute, report from thread, image attachments through a private bucket, message rate limiting, push/email on new message when offline.

**Location [PARTIAL]:** 34 provinces exist. Target: districts, optional coordinates + map picker, radius search, "near me", and province/district-aware SEO landing pages.

**Trust [PARTIAL]:** RLS-enforced ownership exists. Target: seller since-date, response rate, verification badges, report counts visible to admins, scam-warning banner in chat, safe-trade guidance in Dari/Pashto.

**Ratings [NEW]:** 1–5 stars with optional text, aggregate shown on shop, product, and seller profile; only from completed orders; anti-brigading via one-per-order and rate limits.

**Favorites [EXISTS]:** per-user listing favorites with own-row RLS. Target extension: favorite shops and products, and saved-item alerts on price drop.

**Multilingual [PARTIAL]:** 25 locales listed, 7 real dictionaries (en, fa, ps, uz, ar, tr, ur). Target: complete dictionaries for the declared set or reduce the visible list to what is translated; no hardcoded user-facing strings; localized numbers, dates (Hijri Shamsi option), and currency; per-user persisted locale.

**RTL/LTR [PARTIAL]:** global `dir` switch works; only 5 files use directional utilities. Target: page-by-page RTL audit, logical CSS properties everywhere, mirrored icons, RTL screenshots in CI.

**Accessibility [NEW]:** WCAG 2.1 AA target — keyboard reachable flows, visible focus, labelled inputs, dialog focus traps, 4.5:1 contrast in both themes, alt text required on uploads, screen-reader pass on the 8 core flows.

**SEO [PARTIAL]:** robots, sitemap, per-route `head()`. Target: unique title/description per content route, JSON-LD (`Product`, `Offer`, `LocalBusiness`, `BreadcrumbList`, `AggregateRating`), canonical URLs, hreflang for locales, `og:image`/`twitter:image` from real listing/product images, image lazy-loading, and share actions.

**Monetization [PARTIAL]:** featured-listing ad packages (manual payment). Target: shop subscription tiers, promoted search placement, in-feed ad units, commission-ready order records, and payout/reconciliation reporting.

**Analytics [PARTIAL]:** client-side perf metrics only. Target: platform KPIs (DAU/MAU, listings created, GMV, order conversion, chat-to-deal rate, retention), per-listing and per-shop dashboards, ad CTR — computed server-side from event tables, never from client-trusted counters.

**AI [NEW]:** via Lovable AI — natural-language search parsing to filters, listing assistant (title/description/attribute suggestion from photos), category prediction, duplicate/scam signal scoring for the moderation queue, and Dari/Pashto translation assist. All AI calls run server-side with per-user rate limits and a hard budget cap.

## 6. Production acceptance criteria
A release is production-ready only when **all** hold:
1. No client-supplied money or stock values are trusted anywhere; order pricing and stock changes are server/DB-derived and transactional.
2. Every table has RLS + explicit GRANTs, and an automated RLS/authorization test suite passes for buyer, seller, moderator, admin, and anonymous roles.
3. Admin/moderator access is enforced server-side; client gating is UX only.
4. Uploads enforce MIME + size + ownership; no bucket is world-readable beyond intentionally public assets.
5. Seller phone/address are not readable by anonymous clients.
6. Rate limits are active on auth, listings, messages, reports, reviews, uploads, orders, and payment actions.
7. Immutable audit log covers admin actions, role changes, moderation, payments, refunds, and order state changes.
8. Listing lifecycle complete (edit/pause/renew/expire/delete) with a working expiry job.
9. Notifications and reviews are live; core trust loop closed.
10. Every data-bearing route has `errorComponent`/`notFoundComponent`; no raw DB error text reaches users.
11. Dari RTL verified page-by-page; declared locales fully translated.
12. CI runs typecheck, lint, unit, RLS, and E2E on every change; health check endpoint green; documented backup/restore procedure tested once.
13. Lighthouse mobile ≥ 85 performance / ≥ 95 accessibility on home, category, listing, shop, product.

Current status against these criteria: **NOT PRODUCTION READY**.
