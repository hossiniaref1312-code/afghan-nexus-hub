# REMAINING_WORK.md — Afghan Nexus Hub (AfghanMarket)

Phase 1 roadmap. Derived only from verified evidence in `MASTER_PROJECT_AUDIT.md`, `FINAL_PHASE0_VERIFICATION.md`, and `MASTER_PROGRESS.md`. The original 1200-step framework is **not** reproduced; only work that is actually missing, partial, broken, unverified, or required for production is listed.

No code, schema, migration, dependency, or configuration was changed to produce this document.

---

# P0 — SECURITY / DATA INTEGRITY / CRITICAL BLOCKERS

### P0-01 — Server-side privileged operation layer
- **CURRENT STATE:** Zero `createServerFn` in the repository; every write goes browser → Postgres, so RLS is the only rule engine.
- **TARGET STATE:** A `src/lib/*.functions.ts` layer for all privileged/validated writes, with `requireSupabaseAuth` middleware and Zod input validation.
- **WHY REQUIRED:** Prerequisite for price integrity, stock atomicity, admin authz, rate limiting, audit logging, and view counting. Nothing else in P0 can be done correctly without it.
- **DEPENDENCIES:** none (root of the graph).
- **IMPLEMENTATION SCOPE:** server fn conventions, shared auth middleware, error mapping, bearer middleware registration in `src/start.ts`.
- **DATABASE IMPACT:** none initially; later revokes of direct client INSERT rights depend on it.
- **SECURITY IMPACT:** High positive — moves trust boundary off the client.
- **TEST REQUIREMENTS:** unit tests for validators; authorization tests that unauthenticated/foreign-user calls reject.
- **ACCEPTANCE:** at least one privileged write executes only via server fn; direct client write path for it is revoked and provably fails.

### P0-02 — Order price integrity
- **CURRENT STATE:** `shop_order_items` INSERT policy validates only order ownership; `title`, `unit_price`, `quantity`, and `shop_orders.total` are client-supplied (`unit_price >= 0` is the only guard).
- **TARGET STATE:** Orders created by a single server function that recomputes line prices and totals from `shop_products`.
- **WHY REQUIRED:** A buyer can currently order at an arbitrary price. Direct revenue loss.
- **DEPENDENCIES:** P0-01.
- **IMPLEMENTATION SCOPE:** `createOrder` server fn; checkout route rewired; direct INSERT revoked on `shop_orders` / `shop_order_items`.
- **DATABASE IMPACT:** policy/grant changes; possible `security definer` RPC.
- **SECURITY IMPACT:** Closes price tampering.
- **TEST REQUIREMENTS:** tampered-price attempt rejected; totals match product table; direct client insert denied.
- **ACCEPTANCE:** no code path allows a client-chosen price to persist.

### P0-03 — Atomic stock handling
- **CURRENT STATE:** `stock` never decremented; no oversell guard.
- **TARGET STATE:** stock decremented inside the same transaction as order creation, with a conditional update that fails on insufficient stock.
- **WHY REQUIRED:** Oversell breaks fulfilment and seller trust.
- **DEPENDENCIES:** P0-01, P0-02.
- **IMPLEMENTATION SCOPE:** transactional RPC; restock on cancellation.
- **DATABASE IMPACT:** RPC + `stock >= 0` CHECK already present.
- **SECURITY IMPACT:** Medium — prevents inventory manipulation.
- **TEST REQUIREMENTS:** concurrent-order test; insufficient-stock rejection.
- **ACCEPTANCE:** two concurrent orders for the last unit produce exactly one success.

### P0-04 — Listing image MIME validation
- **CURRENT STATE:** `accept="image/*"` picker hint only; bucket `allowed_mime_types = any`; extension taken verbatim from filename.
- **TARGET STATE:** bucket-level allowlist (jpeg/png/webp) plus client pre-check and server-side content-type verification.
- **WHY REQUIRED:** Any authenticated user can upload arbitrary file types today.
- **DEPENDENCIES:** P0-01.
- **DATABASE IMPACT:** bucket configuration update.
- **SECURITY IMPACT:** High.
- **TEST REQUIREMENTS:** upload of a non-image rejected at bucket and app level.
- **ACCEPTANCE:** disallowed MIME cannot land in the bucket by any route.

### P0-05 — Listing image size limits
- **CURRENT STATE:** `file_size_limit = none`; count capped at 8, no byte cap.
- **TARGET STATE:** bucket limit (e.g. 5 MB) + client downscale/re-encode before upload.
- **WHY REQUIRED:** storage-cost abuse; mobile users on slow networks.
- **DEPENDENCIES:** P0-04.
- **DATABASE IMPACT:** bucket configuration.
- **SECURITY IMPACT:** Medium (DoS/cost).
- **TEST REQUIREMENTS:** oversized upload rejected; downscale produces bounded dimensions.
- **ACCEPTANCE:** no object above the limit can be stored.

### P0-06 — Storage authorization
- **CURRENT STATE:** `Public read listing images` grants SELECT on the entire `listing-images` bucket to anon, including images of pending/rejected/deleted listings.
- **TARGET STATE:** either an explicit documented public-read decision with only public content stored, or a SELECT policy scoped to active/owned listings; product images get their own owner-folder bucket.
- **WHY REQUIRED:** non-public listing images are enumerable.
- **DEPENDENCIES:** P0-04.
- **DATABASE IMPACT:** storage policy rewrite; new `shop-images` bucket.
- **SECURITY IMPACT:** Medium-High.
- **TEST REQUIREMENTS:** anon read of a pending listing's object denied.
- **ACCEPTANCE:** object visibility matches parent-record visibility.

### P0-07 — Shop phone/address privacy
- **CURRENT STATE:** `Anyone can view active shops` — role `public`, `USING (is_active = true)`, no column restriction; `shops.phone` / `address` scrapable by anon. Same for `listings.contact_phone`.
- **TARGET STATE:** anon reads served from a safe-column view; contact details behind an authenticated, rate-limited server function.
- **WHY REQUIRED:** bulk PII/contact scraping, spam and fraud vector.
- **DEPENDENCIES:** P0-01, P0-09.
- **DATABASE IMPACT:** view + policy changes.
- **SECURITY IMPACT:** High.
- **TEST REQUIREMENTS:** anon select of `phone`/`address` returns nothing.
- **ACCEPTANCE:** contact data reachable only through an authenticated, logged, rate-limited path.

### P0-08 — Server-enforced admin authorization
- **CURRENT STATE:** admin routes read `user_roles` client-side and render "not allowed"; no `beforeLoad` server check. DB policies still enforce, so it is a cosmetic bypass today.
- **TARGET STATE:** `_authenticated/admin` layout route with `beforeLoad` calling a `requireSupabaseAuth` server fn that returns the verified role; all admin mutations move behind server fns.
- **WHY REQUIRED:** admin shell must not be mountable without a real role; needed before any admin action gains privileged server power.
- **DEPENDENCIES:** P0-01.
- **DATABASE IMPACT:** none.
- **SECURITY IMPACT:** High once admin server fns exist.
- **TEST REQUIREMENTS:** non-admin authenticated user redirected; admin server fn rejects non-admin callers.
- **ACCEPTANCE:** no admin UI or mutation is reachable without a server-verified role.

### P0-09 — Rate limiting
- **CURRENT STATE:** none anywhere; unlimited signup, listing creation, messaging, reporting, contact lookups.
- **TARGET STATE:** per-user and per-IP limits enforced in the server layer with a persisted counter table.
- **WHY REQUIRED:** abuse, spam, scraping, cost control.
- **DEPENDENCIES:** P0-01.
- **DATABASE IMPACT:** `rate_limit_events` table + RLS + GRANTs.
- **SECURITY IMPACT:** High.
- **TEST REQUIREMENTS:** limit trips at threshold and resets after window.
- **ACCEPTANCE:** every mutating server fn declares a limit.

### P0-10 — Audit logging
- **CURRENT STATE:** no audit table; moderation and admin actions leave no trail.
- **TARGET STATE:** append-only `audit_log` written by the server layer for all privileged actions.
- **WHY REQUIRED:** accountability, incident response, dispute resolution.
- **DEPENDENCIES:** P0-01, P0-08.
- **DATABASE IMPACT:** new table, admin-read-only RLS, GRANTs, no client insert.
- **SECURITY IMPACT:** High.
- **TEST REQUIREMENTS:** privileged action produces exactly one immutable row; client cannot insert or update.
- **ACCEPTANCE:** every admin/privileged mutation is logged with actor, target, before/after.

### P0-11 — Automated testing foundation
- **CURRENT STATE:** zero tests, no runner.
- **TARGET STATE:** Vitest configured with a runnable suite and a documented command.
- **DEPENDENCIES:** none technically, but valuable immediately after P0-01.
- **SECURITY IMPACT:** indirect but decisive — no feature can reach PRODUCTION_READY without it.
- **TEST REQUIREMENTS:** self-evident.
- **ACCEPTANCE:** suite runs green locally and in CI.

### P0-12 — RLS tests
- **CURRENT STATE:** 42 policies, none tested.
- **TARGET STATE:** per-table matrix asserting anon / owner / other-user / admin read and write outcomes.
- **DEPENDENCIES:** P0-11.
- **ACCEPTANCE:** every public table has explicit positive and negative assertions.

### P0-13 — Authorization tests
- **CURRENT STATE:** none; IDOR untested.
- **TARGET STATE:** tests for cross-user access on listings, orders, carts, conversations, shops, and all admin server fns.
- **DEPENDENCIES:** P0-11, P0-01, P0-08.
- **ACCEPTANCE:** each privileged server fn has a rejection test.

### P0-14 — CI
- **CURRENT STATE:** no pipeline.
- **TARGET STATE:** typecheck + lint + test on every change, blocking on failure.
- **DEPENDENCIES:** P0-11.
- **ACCEPTANCE:** a failing test blocks the pipeline.

### P0-15 — Health checks
- **CURRENT STATE:** none.
- **TARGET STATE:** `/api/public/health` returning app + database reachability, no PII.
- **DEPENDENCIES:** P0-01.
- **ACCEPTANCE:** endpoint reflects real database state and leaks nothing.

### P0-16 — Listing data constraints
- **CURRENT STATE:** no CHECK on `listings.price >= 0`, no title/description length caps.
- **TARGET STATE:** CHECK constraints matching validated server-side input.
- **DEPENDENCIES:** P0-01.
- **ACCEPTANCE:** negative price and oversized text rejected at the database.

**P0 COUNT: 16**

---

# P1 — CORE MARKETPLACE

| ID | FEATURE | CURRENT | TARGET | WHY | DEPS | SCOPE | DB IMPACT | SECURITY | TESTS | ACCEPTANCE |
|---|---|---|---|---|---|---|---|---|---|---|
| P1-01 | Listing edit | missing | owner edits with re-moderation | sellers cannot correct mistakes | P0-01 | edit route + server fn | status transition | owner-only | authz + validation | edit persists, re-enters review |
| P1-02 | Listing pause | missing | owner hides/unhides | inventory control | P1-06 | status action | `paused` status | owner-only | state tests | paused listing not publicly visible |
| P1-03 | Listing renew | missing | extend expiry | keeps catalog fresh | P1-04 | renew action | `expires_at` | owner-only | state tests | renew extends by policy window |
| P1-04 | Listing expiry | missing | auto-expire via scheduled job | stale listings degrade trust | P0-01 | cron route + job | `expires_at` + index | cron auth | job tests | expired listings drop out of public queries |
| P1-05 | Listing delete | missing | soft delete + storage cleanup | user control, GDPR-style hygiene | P0-06 | delete server fn | `deleted_at` | owner/admin | authz tests | deleted listing and its objects unreachable |
| P1-06 | Listing lifecycle state machine | ad hoc statuses | explicit allowed transitions, server-enforced | prevents invalid states | P1-01..05 | shared transition module | CHECK / trigger | server-enforced | transition matrix tests | invalid transition rejected |
| P1-07 | Shop product image upload | free-text remote URLs | `shop-images` bucket + uploader | sellers cannot practically add images; hotlink/tracking risk | P0-04, P0-06 | bucket, policies, uploader UI | new bucket, column migration | owner-folder isolation | upload + authz tests | product images stored in-platform |
| P1-08 | Reviews | missing | buyer reviews after delivered order | trust loop absent | G4, P0-01 | tables, RLS, UI | new tables + GRANTs | verified-purchase only | RLS + authz | only a delivered buyer can review, once |
| P1-09 | Ratings aggregation | missing | product/shop averages | ranking + trust | P1-08 | trigger or view | aggregate columns | read-only | aggregate tests | average matches source rows |
| P1-10 | Notification center | missing | in-app notifications + unread badge | users miss messages/orders | P0-01 | table, RLS, fan-out, UI | new table | owner-only reads | RLS + fan-out tests | events produce exactly one notification each |
| P1-11 | Pagination | fixed limits | keyset pagination on all lists | lists silently truncate | — | query + UI | index review | none | pagination tests | full result set reachable |
| P1-12 | Full-text search | ILIKE + trigram | tsvector + GIN + ranking, multilingual-aware | relevance is poor | P1-11 | search columns + queries | tsvector + index | none | relevance tests | ranked results beat ILIKE baseline |
| P1-13 | Route-level error handling | root only | `errorComponent`/`notFoundComponent`/pending on every data route; DB errors mapped to localized messages | one failed query blanks the page; raw DB errors leak schema | — | per-route boundaries + error map | none | stops schema leakage | error-path tests | no raw DB message reaches the UI |
| P1-14 | Password reset | missing | request + update flow | users get locked out | B1 | 2 routes | none | token handling | flow tests | reset works end to end |
| P1-15 | Email verification completion | missing | pending state + resend | unverified accounts indistinguishable | B1 | UI + gating | none | gate sensitive actions | flow tests | unverified user is visibly gated |
| P1-16 | Phone authentication decision | BROKEN — code real, no SMS provider | either provision a provider or remove the tab | a visibly broken login path is worse than none | external | decision + implementation | none | OTP rate limiting | OTP tests if kept | no user-facing path that always fails |
| P1-17 | Avatar completion | missing | upload to owner-folder bucket + display | profile identity | P0-04 | bucket + uploader | new bucket | MIME/size limits | upload tests | avatar renders across app |
| P1-18 | Core marketplace integration tests | none | E2E: signup → list → search → chat → cart → order → fulfil | regression safety for the money path | P0-11 | Playwright/Vitest suite | none | includes authz assertions | — | full happy path green in CI |

**P1 COUNT: 18**

---

# P2 — PRODUCT COMPLETION

| ID | FEATURE | CURRENT | TARGET | WHY | DEPS | SCOPE | DB IMPACT | SECURITY | TESTS | ACCEPTANCE |
|---|---|---|---|---|---|---|---|---|---|---|
| P2-01 | Districts | missing | district per province | province is too coarse for Kabul-scale search | — | data + filter | table/enum | none | filter tests | district filter narrows results |
| P2-02 | Areas | missing | neighborhood level | local discovery | P2-01 | data + filter | table | none | filter tests | area filter works |
| P2-03 | Coordinates | missing | lat/lng on listings and shops | prerequisite for map/radius | P2-02 | picker + column | geo columns + index | coarse precision for privacy | geo tests | coordinates stored and rounded |
| P2-04 | Map view | missing | map of results | expected in modern marketplaces | P2-03 | client-only map component | none | none | render tests | map renders after hydration only |
| P2-05 | Radius search | missing | "within N km" | mobile local intent | P2-03 | distance query | geo index | none | query tests | radius results correct |
| P2-06 | Nearby search | missing | device-location suggestions | one-tap local discovery | P2-05 | geolocation prompt | none | consent required | flow tests | works with permission, degrades without |
| P2-07 | Saved searches | missing | persist filter sets | retention | P1-10 | table + UI | new table | owner-only | RLS tests | saved search restores filters |
| P2-08 | Search alerts | missing | notify on new matches | retention loop | P2-07, P1-10 | matcher job | job + index | rate limited | matcher tests | new match yields one notification |
| P2-09 | Delivery / shipping tracking | missing | statuses + tracking info | orders end at "shipped" today | G4 | model + UI | columns/table | seller-only writes | state tests | buyer sees tracking state |
| P2-10 | Refunds | missing | refund request + approval + ledger entry | disputes have no resolution path | P3-01..03 | flow + records | refund table | server-enforced | flow tests | refund recorded and reflected in order |
| P2-11 | Moderator role | enum value only | scoped moderation without full admin | least privilege | P0-08 | policies + UI scoping | policy changes | reduces admin blast radius | authz tests | moderator can moderate, not manage users |
| P2-12 | Admin shops | missing | list/suspend/verify shops | no shop oversight | P0-08 | admin section | policies | server-verified | authz tests | admin can suspend a shop |
| P2-13 | Admin orders | missing | inspect/intervene | dispute handling | P0-08 | admin section | policies | server-verified | authz tests | admin sees any order read-only + intervene |
| P2-14 | Admin payments | missing | reconcile manual references | manual payments are unauditable today | G5, P0-10 | admin section | payment records | audit-logged | flow tests | payment marked reconciled with trail |
| P2-15 | Full multilingual dictionaries | 7 of 25 | complete or trim the list | 18 languages silently fall back to English | A4 | translation work | none | none | key-coverage test | no missing-key fallbacks for advertised languages |
| P2-16 | Page-by-page RTL | global switch only, `rtl:` in 5 files | every page audited in Dari | primary audience is RTL | A5 | logical properties, icon flips | none | none | visual checks | each route verified in `dir=rtl` |
| P2-17 | Accessibility | no audit | keyboard, focus, aria, contrast | usability and legal baseline | A2 | audit + fixes | none | none | axe checks | no critical violations |
| P2-18 | SEO completion | partial | canonical, unique heads, image alts | organic discovery | A8 | head work | none | none | head tests | every content route has unique metadata |
| P2-19 | JSON-LD | missing | Product/Offer/LocalBusiness/BreadcrumbList | rich results | P2-18 | structured data in heads | none | none | validator checks | schema validates |
| P2-20 | Sharing | missing | Web Share + clipboard fallback + og/twitter images | listings cannot be shared with a preview | P2-18 | share action + image URLs | none | none | UI tests | share works on mobile and desktop |
| P2-21 | Extra categories + subcategories | 5 categories only | requested verticals + subcategory level | catalog breadth | C1 | schemas + i18n | attribute schemas | none | filter tests | new verticals filterable |
| P2-22 | View counters | column never written | server-side increment with dedupe | seller analytics baseline | P0-01 | server fn | none | rate limited | dedupe tests | one view per user/session/window |
| P2-23 | Chat completeness (receipts, typing, presence, unread, block, attachments) | missing | full messaging feature set | competitive baseline | F1, P1-10 | realtime features | realtime policies | block enforcement | realtime tests | features work without leaking to non-participants |
| P2-24 | Followers / shop verification / seller analytics | missing | follow shops, verified badge, seller stats | seller retention | P1-08 | tables + UI | new tables | owner/admin scoped | RLS tests | follow and badge visible |

**P2 COUNT: 24**

---

# P3 — ADVANCED / GROWTH

| ID | FEATURE | CURRENT | TARGET | WHY | DEPS | SCOPE | DB IMPACT | SECURITY | TESTS | ACCEPTANCE |
|---|---|---|---|---|---|---|---|---|---|---|
| P3-01 | Advertising instrumentation (impressions/clicks/CTR/budgets) | ad packages/orders only | event tracking + ad units | monetization measurement | H7, P0-09 | event tables + units | new tables | anti-fraud counting | counting tests | CTR computed from real events |
| P3-02 | Revenue analytics | missing | ad + commission revenue dashboards | business visibility | P3-01 | aggregation | rollup tables | admin-only | aggregate tests | totals reconcile with source |
| P3-03 | Platform analytics (DAU/MAU/GMV/retention) | missing | product analytics | growth decisions | P3-02 | event pipeline | rollups | anonymized | aggregate tests | metrics reproducible |
| P3-04 | AI search (natural language) | missing | NL query → structured filters | discovery quality | P1-12 | AI gateway server fn | none | rate limited, cost capped | prompt tests | NL query returns sane filters |
| P3-05 | AI listing assistant | missing | title/description/pricing help | listing quality | P0-01 | AI server fn | none | rate limited | output tests | suggestions editable, never auto-published |
| P3-06 | AI category prediction | missing | auto-suggest category/attributes | fewer miscategorized listings | P3-05 | AI server fn | none | rate limited | accuracy checks | suggestion accepted or overridden by user |
| P3-07 | Fraud / duplicate detection | missing | heuristics + review queue | scam prevention at scale | P0-10, H6 | scoring + queue | signals table | admin-only | scoring tests | flagged items land in the queue |
| P3-08 | Verification badges | missing | verified seller/user program | trust signal | P2-24, P0-10 | workflow + badge | verification table | admin-granted only | authz tests | badge only via admin workflow |
| P3-09 | Advanced observability | client perf only | server traces, error reporting, alerting | incident response | A10, P0-15 | telemetry | none | no PII in logs | smoke tests | server errors alert with context |
| P3-10 | Email / push notifications + preferences | missing | multi-channel delivery | re-engagement | P1-10 | providers + prefs | prefs table | opt-in only | delivery tests | preferences respected |
| P3-11 | Session / device management | missing | list and revoke sessions | account security | B1 | UI + API | none | high | flow tests | revoked session cannot act |
| P3-12 | Video support / image reordering | missing | richer media | listing quality | P0-04 | upload + ordering | bucket | MIME/size limits | upload tests | media validated and ordered |
| P3-13 | Backup/restore runbook + feature flags | missing | documented DR + flags | operational safety | P0-14 | docs + flag module | flags table | admin-only | drill | restore drill documented and rehearsed |

**P3 COUNT: 13**

---

# PAYMENTS — CORRECTED CLASSIFICATION

Payments are not uniformly P3. The six layers separate cleanly, and the intended production launch (an Afghan marketplace with manual bank/mobile-money transfers) does **not** need a card gateway on day one, but it does need auditable money handling.

| Layer | Current | Classification | Rationale |
|---|---|---|---|
| **A. Payment architecture** (money model, order↔payment records, statuses, currency, ledger of truth) | order `total` only, no payment record, no ledger | **P0/P1 — required for launch** | Money currently exists only as a client-supplied number on the order. Without a payment record and immutable ledger, no launch is defensible. Tied to P0-02 and P0-10. |
| **B. Provider abstraction** (interface with a `manual` adapter first) | none; `payment-methods.ts` is a static list | **P1 — required for launch** | The manual flow must already be an adapter so gateways drop in later without rewriting checkout. |
| **C. Actual provider integration** (Stripe / PayPal / telco) | none | **P2 — deferrable** | Deferrable only because the launch market runs on manual transfer. Becomes P0 the moment card or PayPal checkout is advertised. |
| **D. Webhook handling** | none | **P2 — required with C, not before** | `/api/public/*` route with signature verification and idempotency keys. Ships in the same milestone as C. |
| **E. Reconciliation** (matching manual references to payments) | none — references are collected and never verified | **P1 — required for launch** | Today a buyer can type any reference and the seller has no verification tool. This is the single largest operational gap in the manual flow. Pairs with P2-14 admin payments. |
| **F. Refunds** | none | **P2 — required shortly after launch** | Needs A, B, and E first; a launch can run briefly on manual out-of-band refunds if documented, but disputes will arrive quickly. |

**Required for the intended production launch:** A, B, E (plus P0-02 price integrity).
**Deferrable:** C, D, F — until card/PayPal checkout is actually offered, at which point C and D become blockers together.

---

# REAL COMPLETION CALCULATION

## Feature classification (62 tracked features from MASTER_PROGRESS.md)

| Class | Count | Definition |
|---|---|---|
| Implemented (exists and manually verified) | 20 | VERIFIED status |
| Partial | 15 | IN_PROGRESS status |
| Missing | 24 | NOT_STARTED status |
| Broken / security-blocked | 3 | BLOCKED status (B2 phone OTP, E3 product images, S1 server layer) |
| Untested | 62 | zero automated tests exist |
| Security risk | 8 | features with SEC = BLOCKED or IN_PROGRESS (A9, B8, B9, C4, C7, E1, G2, G3 — G3 counted under G2's chain) |
| Blocked by external dependency | 1 | B2 (no SMS provider) |

## Transparent formulas

Feature credit: implemented = 1.0, partial = 0.5, broken = 0.25 (code exists but does not deliver the outcome), missing = 0.

```
PRODUCT COMPLETION
= (20*1.0 + 15*0.5 + 3*0.25 + 24*0.0) / 62
= (20 + 7.5 + 0.75) / 62
= 28.25 / 62
= 45.6%  →  46%
```

Production readiness applies the four launch gates, each weighted equally at 25%:

```
Gate 1 — Functional completeness  = 45.6%  (product completion above)
Gate 2 — Test coverage            =  0%    (zero tests, zero CI)
Gate 3 — Security posture         = (62 - 8 at-risk - 16 open P0 items counted once each,
                                     de-duplicated to 12 distinct affected features) / 62
                                  = 50 / 62 = 80.6%
Gate 4 — Operational readiness    =  0%    (no CI, no health check, no observability,
                                            no runbook, no feature flags)

PRODUCTION READINESS = (45.6 + 0 + 80.6 + 0) / 4 = 31.6%  →  32%
```

## Correction of the earlier ~34% estimate

The earlier "~34% real completion" figure was a judgement call with no published formula and is **not mathematically reproducible**. It also conflated two different quantities.

Corrected:
- **PRODUCT COMPLETION: 46%** — how much of the intended feature set exists in some working form. Higher than 34% because the earlier estimate under-credited genuinely complete subsystems (chat, cart/checkout flow, shop CRUD, filters, ads, admin basics, design system, i18n framework).
- **PRODUCTION READINESS: 32%** — how close the product is to being safely launchable. Close to the old number by coincidence; it is low because two of the four gates (tests, operations) score exactly zero.

The earlier figure was, in effect, an unweighted blend of these two. Both numbers are now derived from the 62-row table in `MASTER_PROGRESS.md` and can be recomputed by anyone.

## Work totals

| Metric | Value |
|---|---|
| TOTAL VERIFIED WORK | 28.25 feature-units of 62 (45.6%) |
| TOTAL REMAINING WORK | 33.75 feature-units of 62 (54.4%) |
| REMAINING WORK ITEMS | 71 (16 P0 + 18 P1 + 24 P2 + 13 P3) |
| P0 COUNT | 16 |
| P1 COUNT | 18 |
| P2 COUNT | 24 |
| P3 COUNT | 13 |

---

# DEPENDENCY-AWARE EXECUTION ORDER

The repository evidence justifies one deviation from the suggested example order: **route-level error handling (P1-13) moves earlier**, because every server-layer migration below changes error shapes, and today raw database messages reach users via `toast.error((err as Error).message)`. Fixing error mapping while building the server layer avoids doing it twice. **Testing foundation also moves before the storage and admin work**, so those changes land with tests instead of being retro-tested.

```
1.  P0-01  Server function layer                         (root — unblocks almost everything)
2.  P1-13  Error mapping + route boundaries              (co-built with the server layer)
3.  P0-11  Test runner + first suites
4.  P0-14  CI (typecheck + lint + test, blocking)
5.  P0-02  Order price integrity
6.  P0-03  Atomic stock handling
7.  P0-16  Listing data constraints
8.  P0-04  Image MIME validation
9.  P0-05  Image size limits
10. P0-06  Storage authorization  →  P1-07 shop-images bucket + uploader
11. P0-07  Shop phone/address privacy
12. P0-08  Server-enforced admin authorization
13. P0-09  Rate limiting
14. P0-10  Audit logging
15. P0-12  RLS tests   +   P0-13 Authorization tests
16. P0-15  Health checks
17. P1-01..06  Listing lifecycle state machine
18. P1-14..17  Auth completion (reset, verification, phone decision, avatar)
19. P1-08/09   Reviews + ratings
20. P1-10      Notification center
21. P1-11/12   Pagination + full-text search
22. Payments A + B + E (architecture, abstraction, reconciliation) + P2-14 admin payments
23. P1-18      Core marketplace integration tests
24. P2 batch   Location/geo, saved searches, moderation depth, i18n/RTL/a11y/SEO/sharing
25. Payments C + D + F (provider integration, webhooks, refunds)
26. P3 batch   Ads instrumentation → revenue/platform analytics → AI → fraud → observability
```

Rationale for the shape: steps 1–16 are all P0 and are ordered strictly by dependency (server layer → integrity → storage → authz → controls → verification). Nothing in P1 can be safely built before the server layer exists, because each P1 feature would otherwise add another unvalidated client-side write path that must later be rewritten.

---

# FINAL SECTION

**CURRENT STATUS:**
NOT PRODUCTION READY

**REAL PRODUCT COMPLETION:**
46%

**PRODUCTION READINESS:**
32%

**P0 BLOCKERS (16):**
Server-side privileged layer; order price integrity; atomic stock; image MIME validation; image size limits; storage authorization; shop phone/address privacy; server-enforced admin authorization; rate limiting; audit logging; testing foundation; RLS tests; authorization tests; CI; health checks; listing data constraints.

**P1 (18):**
Listing edit/pause/renew/expiry/delete and lifecycle state machine; shop product image upload; reviews; ratings; notification center; pagination; full-text search; route-level error handling; password reset; email verification; phone-auth decision; avatar; core marketplace integration tests.

**P2 (24):**
Districts, areas, coordinates, map, radius, nearby; saved searches and alerts; delivery; refunds; moderator role; admin shops/orders/payments; full dictionaries; page-by-page RTL; accessibility; SEO; JSON-LD; sharing; extra categories/subcategories; view counters; chat completeness; followers/verification/seller analytics.

**P3 (13):**
Provider integration and webhooks; ads instrumentation; revenue analytics; platform analytics; AI search/assistant/category prediction; fraud and duplicate detection; verification badges; advanced observability; email/push notifications; session management; video/media; backup runbook and feature flags.

**FIRST IMPLEMENTATION MILESTONE:**
**Milestone M1 — "Trusted Write Path"** (P0-01, P1-13, P0-11, P0-14, P0-02, P0-03, P0-16).
Introduce the `createServerFn` layer with auth middleware and Zod validation; move order creation into a single transactional server function that recomputes prices from `shop_products` and atomically decrements stock; revoke direct client INSERT on `shop_orders` / `shop_order_items`; add listing price and length CHECK constraints; map database errors to localized messages behind per-route error boundaries; stand up Vitest and a blocking CI pipeline.
Exit criteria: a tampered price cannot persist, two concurrent orders for the last unit yield exactly one success, no raw database message reaches the UI, and CI blocks on a failing test.

---

**DO NOT IMPLEMENT ANYTHING.** Phase 2 begins only on explicit approval.
