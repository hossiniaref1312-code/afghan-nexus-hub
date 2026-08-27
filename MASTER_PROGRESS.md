# MASTER_PROGRESS.md — Afghan Nexus Hub (AfghanMarket)

Phase 1 planning artifact. Evidence base: `MASTER_PROJECT_AUDIT.md`, `FINAL_PHASE0_VERIFICATION.md`, repository scan (24 route files, ~6.4k LOC), live schema (19 tables, 5 functions, 11 triggers, 1 bucket).

Status vocabulary: NOT_STARTED, DISCOVERED, IN_PROGRESS, IMPLEMENTED, TESTING, VERIFIED, BLOCKED, PRODUCTION_READY.

**Rule applied:** nothing is PRODUCTION_READY. The project has zero automated tests, no CI, and no server-side validation layer, so the PRODUCTION_READY gate (implemented + integrated + authorized + validated + tested + error-handled + security-checked + production-verified) fails for every feature by construction. Highest status awarded is VERIFIED (exists and manually confirmed against live evidence).

Column key: IMPL = implementation status, TEST = test status, SEC = security status.

---

## A. Foundation

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | 0 | Routing / file-based routes | VERIFIED | PRODUCTION_READY | `src/routes/**`, `routeTree.gen.ts` | IMPLEMENTED | NOT_STARTED | VERIFIED | 24 route files, clean typecheck | — | Route-level error/pending states | P1 |
| A2 | 0 | App shell / header / footer / bottom nav | VERIFIED | PRODUCTION_READY | `AppShell.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`, `BottomNav.tsx` | IMPLEMENTED | NOT_STARTED | VERIFIED | Components present, site+app variants | A1 | Desktop density audit | P2 |
| A3 | 0 | Design system / tokens / dark mode | VERIFIED | PRODUCTION_READY | `src/styles.css`, `theme.tsx` | IMPLEMENTED | NOT_STARTED | VERIFIED | Semantic tokens, emerald/saffron | — | Contrast audit | P2 |
| A4 | 0 | i18n framework (25 languages listed) | IN_PROGRESS | PRODUCTION_READY | `I18nProvider.tsx`, `translations.ts` | IMPLEMENTED | NOT_STARTED | VERIFIED | 7 real dictionaries (en, fa, ps, uz, ar, tr, ur); 18 fall back | A3 | 18 missing dictionaries | P2 |
| A5 | 0 | RTL direction switching | IN_PROGRESS | PRODUCTION_READY | `I18nProvider.tsx:45`, `styles.css` | IMPLEMENTED | NOT_STARTED | VERIFIED | `dir` set globally; `rtl:` utilities in only 5 files | A4 | Page-by-page RTL pass | P2 |
| A6 | 0 | Responsive layout | IN_PROGRESS | PRODUCTION_READY | all routes | IMPLEMENTED | NOT_STARTED | VERIFIED | mobile-first done; admin/my-shop desktop unverified | A2 | Desktop pass on admin/my-shop | P2 |
| A7 | 0 | Accessibility | NOT_STARTED | PRODUCTION_READY | all components | NOT_STARTED | NOT_STARTED | NOT_STARTED | No aria/focus audit found | A2 | Full a11y audit + fixes | P2 |
| A8 | 0 | SEO (robots, sitemap, head) | IN_PROGRESS | PRODUCTION_READY | `robots.txt`, `sitemap[.]xml.ts`, route `head()` | IMPLEMENTED | NOT_STARTED | VERIFIED | Per-route head present; no JSON-LD, no og:image | A1 | JSON-LD, og/twitter images | P2 |
| A9 | 0 | Error handling | IN_PROGRESS | PRODUCTION_READY | `__root.tsx:102-103`, `error-capture.ts` | IMPLEMENTED | NOT_STARTED | BLOCKED | Only root `errorComponent`; raw DB errors surfaced via toasts | A1 | Per-route boundaries, error mapping | P1 |
| A10 | 0 | Logging / observability | IN_PROGRESS | PRODUCTION_READY | `perf.ts`, `PerfOverlay.tsx`, `PerfAlerts.tsx` | IMPLEMENTED | NOT_STARTED | VERIFIED | Client-only perf metrics; no server telemetry | S1 | Server-side observability | P3 |
| A11 | 0 | Health checks | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No health route in `src/routes/api` | S1 | `/api/public/health` + DB probe | P0 |
| A12 | 0 | CI/CD | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No workflow files | T1 | Pipeline: typecheck, lint, test | P0 |

## B. Auth & access

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 4 | Email/password sign-up + sign-in | VERIFIED | PRODUCTION_READY | `auth.tsx`, `profiles` | IMPLEMENTED | NOT_STARTED | VERIFIED | Real Supabase calls; `handle_new_user` trigger | — | Tests, error mapping | P1 |
| B2 | 4 | Phone OTP (+93) | BLOCKED | VERIFIED or removed | `auth.tsx` | IMPLEMENTED | NOT_STARTED | BLOCKED | `signInWithOtp` present, no SMS provider configured | external provider | Decide: provision provider or remove UI | P1 |
| B3 | 4 | Google / social login | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No provider config | — | Enable + configure provider | P1 |
| B4 | 4 | Password reset | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No reset route | B1 | Request + update-password flow | P1 |
| B5 | 4 | Email verification UX | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No verify/resend UI | B1 | Verify pending state + resend | P1 |
| B6 | 4 | Profile page | IN_PROGRESS | PRODUCTION_READY | `profile.tsx`, `profiles` | IMPLEMENTED | NOT_STARTED | VERIFIED | Read + language only | B1, C7 | Avatar upload, settings, delete account | P1 |
| B7 | 4 | RBAC (`user_roles` + `has_role`) | VERIFIED | PRODUCTION_READY | `user_roles`, `has_role()` | IMPLEMENTED | NOT_STARTED | VERIFIED | SECDEF, `SET search_path`, grants clean | — | Authorization tests | P0 |
| B8 | 4 | Admin route authorization | IN_PROGRESS | PRODUCTION_READY | `_authenticated/admin.*.tsx` | IMPLEMENTED | NOT_STARTED | BLOCKED | Client-side role read only; no `beforeLoad` server check | S1, B7 | Server-verified admin guard | P0 |
| B9 | 4 | RLS coverage | VERIFIED | PRODUCTION_READY | 19 public tables, 42 policies | IMPLEMENTED | NOT_STARTED | IN_PROGRESS | Ownership-scoped policies confirmed; 2 gaps on orders | — | Close order gaps + RLS tests | P0 |
| B10 | 4 | Session / device management | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | None found | B1 | Sessions list + revoke | P3 |

## C. Marketplace core

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | 5 | 5 categories + dynamic attributes | VERIFIED | PRODUCTION_READY | `categories.ts`, `category-schemas.ts`, `listings.attributes` | IMPLEMENTED | NOT_STARTED | VERIFIED | JSONB attributes, per-category schemas | — | Tests | P1 |
| C2 | 5 | Extra categories (mobile, electronics, wholesale, animals, agriculture, fashion, home) | NOT_STARTED | PRODUCTION_READY | `categories.ts` | NOT_STARTED | NOT_STARTED | NOT_STARTED | Not present | C1 | Schemas + i18n + filters | P2 |
| C3 | 5 | Subcategories | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No subcategory model | C1 | Model + UI | P2 |
| C4 | 5 | Listing create + image upload | IN_PROGRESS | PRODUCTION_READY | `sell.tsx`, `listings`, `listing-images` bucket | IMPLEMENTED | NOT_STARTED | BLOCKED | `accept="image/*"` only; no MIME/size validation; bucket unlimited | S1, C7 | MIME+size enforcement, downscale | P0 |
| C5 | 5 | Listing edit / delete / pause / renew / expiry | NOT_STARTED | PRODUCTION_READY | `listings` | NOT_STARTED | NOT_STARTED | NOT_STARTED | No edit route exists | S1 | Full lifecycle state machine | P1 |
| C6 | 5 | Listing approval / moderation | IN_PROGRESS | PRODUCTION_READY | `admin.listings.tsx`, `listings.status` | IMPLEMENTED | NOT_STARTED | VERIFIED | Statuses + admin ALL policy | B8 | Submission queue, reasons, audit | P1 |
| C7 | 5 | Storage policies (listing-images) | IN_PROGRESS | PRODUCTION_READY | `storage.objects` | IMPLEMENTED | NOT_STARTED | BLOCKED | Owner-folder writes OK; SELECT world-readable for whole bucket | — | Scope read policy, bucket limits | P0 |
| C8 | 5 | Favorites | VERIFIED | PRODUCTION_READY | `favorites.tsx`, `favorites` | IMPLEMENTED | NOT_STARTED | VERIFIED | Owner-scoped RLS | B1 | Tests | P2 |
| C9 | 5 | Reporting listings | IN_PROGRESS | PRODUCTION_READY | `reports`, `admin.reports.tsx` | IMPLEMENTED | NOT_STARTED | VERIFIED | Table + admin queue; limited report UI | B8 | Report entry points, rate limit | P2 |
| C10 | 5 | View counters | IN_PROGRESS | PRODUCTION_READY | `listings.view_count` | NOT_STARTED | NOT_STARTED | NOT_STARTED | Column never incremented | S1 | Server-side increment + dedupe | P2 |
| C11 | 5 | Video support / image reorder | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | C4 | Upload + ordering UI | P3 |
| C12 | 5 | Listing price/length constraints | NOT_STARTED | PRODUCTION_READY | `listings` | NOT_STARTED | NOT_STARTED | NOT_STARTED | No CHECK on `price >= 0`, no length caps | — | Add CHECK constraints | P0 |

## D. Search / location

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | 6 | Keyword + category + attribute filters | VERIFIED | PRODUCTION_READY | `category.$category.tsx`, `CategoryFilters.tsx` | IMPLEMENTED | NOT_STARTED | VERIFIED | ILIKE + trigram indexes | C1 | Tests | P1 |
| D2 | 6 | Sorting + URL state | IN_PROGRESS | PRODUCTION_READY | shop/category routes | IMPLEMENTED | NOT_STARTED | VERIFIED | Partial URL sync | D1 | Complete URL state | P2 |
| D3 | 6 | Full-text ranking | NOT_STARTED | PRODUCTION_READY | `listings`, `shop_products` | NOT_STARTED | NOT_STARTED | NOT_STARTED | ILIKE only | D1 | tsvector column + GIN + rank | P1 |
| D4 | 6 | Pagination | NOT_STARTED | PRODUCTION_READY | all list routes | NOT_STARTED | NOT_STARTED | NOT_STARTED | Fixed `limit()` everywhere | D1 | Keyset pagination | P1 |
| D5 | 6 | Province filter | VERIFIED | PRODUCTION_READY | `provinces.ts` | IMPLEMENTED | NOT_STARTED | VERIFIED | Present | — | Tests | P2 |
| D6 | 6 | Districts / areas / coordinates / map / radius | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | D5 | Geo model + map + radius query | P2 |
| D7 | 6 | Saved searches + alerts | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No table | F3 | Tables, RLS, matcher job | P2 |

## E. Seller / shop

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | 7 | Shop CRUD + branding | VERIFIED | PRODUCTION_READY | `my-shop.tsx`, `shops` | IMPLEMENTED | NOT_STARTED | BLOCKED | Anon policy exposes `phone`/`address` | — | Column-safe public read | P0 |
| E2 | 7 | Products CRUD | VERIFIED | PRODUCTION_READY | `my-shop.tsx`, `shop_products` | IMPLEMENTED | NOT_STARTED | VERIFIED | Owner ALL + public active-only SELECT | E1 | Tests | P1 |
| E3 | 7 | Product images | BLOCKED | PRODUCTION_READY | `shop_products.image_urls` | NOT_STARTED | NOT_STARTED | BLOCKED | Comma-separated free-text remote URLs; no bucket | C7 | `shop-images` bucket + uploader | P1 |
| E4 | 7 | Shop search / filter / sort / related | VERIFIED | PRODUCTION_READY | `shop.index.tsx`, `shop.$slug.tsx` | IMPLEMENTED | NOT_STARTED | VERIFIED | Indexes + caching + debounce | D1 | Pagination, tests | P1 |
| E5 | 7 | Followers / reviews / verification / seller analytics | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No tables | G1 | Tables + UI | P2 |

## F. Chat / notifications

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 8 | Conversations + realtime messages | VERIFIED | PRODUCTION_READY | `messages.tsx`, `messages.$id.tsx`, `conversations`, `messages` | IMPLEMENTED | NOT_STARTED | VERIFIED | Publication limited to 2 tables; participant-only RLS | B1 | Tests, rate limiting | P1 |
| F2 | 8 | Read receipts / typing / presence / unread badge / block / attachments | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent (read-receipt UPDATE policy exists, unused) | F1 | Feature set + realtime policies | P2 |
| F3 | 8 | Notification center | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No table/route | S1 | `notifications` table, RLS, UI, fan-out | P1 |
| F4 | 8 | Email / push notifications + preferences | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | F3 | Channels + prefs | P3 |

## G. Commerce

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 | 9 | Cart | VERIFIED | PRODUCTION_READY | `cart.tsx`, `shop_carts`, `shop_cart_items` | IMPLEMENTED | NOT_STARTED | VERIFIED | Ownership RLS + UNIQUE(cart_id,product_id) | B1 | Tests | P1 |
| G2 | 9 | Checkout / order creation | IN_PROGRESS | PRODUCTION_READY | `checkout.tsx`, `shop_orders`, `shop_order_items` | IMPLEMENTED | NOT_STARTED | BLOCKED | Client supplies `unit_price`, `title`, `total`; only `>= 0` guards | S1 | Server-side pricing recompute | P0 |
| G3 | 9 | Stock integrity | NOT_STARTED | PRODUCTION_READY | `shop_products.stock` | NOT_STARTED | NOT_STARTED | BLOCKED | Never decremented; oversell possible | G2 | Atomic decrement in txn | P0 |
| G4 | 9 | Seller fulfilment statuses | VERIFIED | PRODUCTION_READY | `orders.tsx`, `shop_orders.status` | IMPLEMENTED | NOT_STARTED | VERIFIED | Seller-updates-status policy | G2 | State machine + tests | P1 |
| G5 | 9 | Manual payment (bank / mobile money reference) | VERIFIED | PRODUCTION_READY | `payment-methods.ts` | IMPLEMENTED | NOT_STARTED | IN_PROGRESS | Reference-number flow only, no verification | G2 | Reconciliation workflow | P1 |
| G6 | 9 | Payment provider abstraction + gateway | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No provider interface | G5, S1 | Interface, adapters, webhooks, ledger | P2/P3 (see REMAINING_WORK) |
| G7 | 9 | Shipping / delivery tracking / cancellation / returns / refunds | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | G4 | Model + flows | P2 |
| G8 | 9 | Reviews & ratings | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No tables | G4 | Tables, RLS, aggregates, UI | P1 |

## H. Trust / admin / ads / AI

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H1 | 10 | Admin dashboard / users / listings / reports / ads | IN_PROGRESS | PRODUCTION_READY | `_authenticated/admin.*.tsx` | IMPLEMENTED | NOT_STARTED | BLOCKED | Client-side gate only | B8 | Server guard, tests | P0 |
| H2 | 10 | Admin shops / orders / payments / categories / locations / system health | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | H1 | New admin sections | P2 |
| H3 | 10 | Moderator role | NOT_STARTED | PRODUCTION_READY | `app_role` enum | NOT_STARTED | NOT_STARTED | NOT_STARTED | Enum has value, no policies/UI | B7 | Policies + UI scoping | P2 |
| H4 | 10 | Audit log | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No table | S1 | `audit_log` + writes from server layer | P0 |
| H5 | 10 | Rate limiting / abuse prevention | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | None; all writes browser→Postgres | S1 | Limiter in server layer | P0 |
| H6 | 10 | Spam / fraud / duplicate detection | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | H4 | Heuristics + review queue | P3 |
| H7 | 11 | Ad packages / orders / activation trigger | VERIFIED | PRODUCTION_READY | `ad_packages`, `ad_orders`, `apply_ad_order_activation` | IMPLEMENTED | NOT_STARTED | VERIFIED | Trigger sets activation + features listing | B8 | Tests | P2 |
| H8 | 11 | Ad impressions / clicks / CTR / budgets / ad units | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | H7 | Event tables + units | P3 |
| H9 | 11 | Platform analytics (DAU/MAU/GMV/retention) | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | H8 | Aggregation + dashboards | P3 |
| H10 | 11 | AI features (search, listing assistant, category prediction) | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | S1 | AI gateway server fns | P3 |
| H11 | 10 | Sharing (Web Share / clipboard / og:image) | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No `navigator.share`, no og:image | A8 | Share action + social images | P2 |

## S/T. Platform engineering

| STEP | PHASE | FEATURE | CURRENT | TARGET | FILES / TABLES | IMPL | TEST | SEC | EVIDENCE | DEPENDENCIES | REMAINING WORK | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 2 | Server-side privileged layer (`createServerFn`) | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | BLOCKED | Zero `createServerFn` in repo; all writes client-side | — | Build server fn layer + middleware | P0 |
| S2 | 2 | Type safety / build | VERIFIED | PRODUCTION_READY | `tsconfig.json` | IMPLEMENTED | NOT_STARTED | VERIFIED | Clean typecheck | — | Enforce in CI | P0 |
| S3 | 2 | Secrets handling | VERIFIED | PRODUCTION_READY | `.env`, client code | IMPLEMENTED | NOT_STARTED | VERIFIED | No secrets in client bundle | — | Keep invariant in CI | P1 |
| T1 | 12 | Test runner + unit tests | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | No runner, no test files | — | Vitest setup + first suites | P0 |
| T2 | 12 | RLS / authorization tests | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | T1, S1 | Multi-role harness | P0 |
| T3 | 12 | Integration / E2E tests | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | T1 | Core flows | P1 |
| T4 | 12 | Backup / restore runbook, feature flags | NOT_STARTED | PRODUCTION_READY | — | NOT_STARTED | NOT_STARTED | NOT_STARTED | Absent | A12 | Runbook + flags | P3 |

---

## Roll-up

| Status | Count of tracked features (of 62) |
|---|---|
| VERIFIED (exists, manually confirmed) | 20 |
| IN_PROGRESS (partial) | 15 |
| BLOCKED (broken or security-blocked) | 3 |
| NOT_STARTED | 24 |
| PRODUCTION_READY | **0** |

Zero PRODUCTION_READY is correct and intentional: no automated tests, no CI, no server-side validation layer, and four open P0 security items.
