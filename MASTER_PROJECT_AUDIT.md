# MASTER_PROJECT_AUDIT.md — Afghan Nexus Hub (AfghanMarket)

Phase 0 — Current State Discovery. Read-only inspection, 2026-08-23.
Evidence: repository scan (24 route files, 10 app components, 13 libs, ~6.4k LOC app code), live database schema (19 tables, 5 functions, 11 triggers, 1 storage bucket), security scan (3 warnings, 0 critical).

## 1. Snapshot

| Layer | Reality |
|---|---|
| Framework | TanStack Start v1 + React 19 + Vite, Tailwind v4 |
| Backend | Lovable Cloud (Postgres + Auth + Storage + Realtime), all access from the browser client; **no `createServerFn` anywhere** |
| Routes | 15 public, 9 authenticated (5 admin) |
| Tests | **none** — no test runner, no test files, no CI |
| i18n | 25 languages listed; 7 real dictionaries (en, fa, ps, uz, ar, tr, ur); others fall back |
| Payments | manual reference-number flow only (no gateway) |

## 2. Feature classification

### Foundation
| Area | Status | Notes |
|---|---|---|
| Routing / layouts / AppShell | COMPLETE | site + app variants, bottom nav, header, footer |
| Design system (tokens, shadcn UI) | COMPLETE | semantic tokens, emerald/saffron, dark mode |
| RTL/LTR | PARTIAL | `dir` switching works; per-page RTL verification untested |
| Responsive | PARTIAL | mobile-first done; desktop density unverified on admin/my-shop |
| Accessibility | MISSING | no focus-management, aria audit, or keyboard testing |
| SEO | PARTIAL | robots, sitemap, per-route `head()`; no JSON-LD, no og:image |
| Error handling | PARTIAL | root error page + capture; most routes lack `errorComponent`/`notFoundComponent` |
| Logging / monitoring | PARTIAL | client perf metrics + alerts only; no server/observability |

### Auth & access
| Area | Status | Notes |
|---|---|---|
| Email/password sign-up + sign-in | COMPLETE | real Supabase calls, profile write on signup |
| Phone OTP (+93) | BROKEN (external blocker) | code is real (`signInWithOtp`), **no SMS provider configured** → fails at runtime |
| Google / social login | MISSING | |
| Password reset, email verify UI, session/device management | MISSING | |
| Profile page | PARTIAL | read + language; no avatar upload, no account settings/privacy/delete |
| RBAC | PARTIAL | `user_roles` + `has_role()` correct; **admin routes gate on client-side role read only** — SECURITY RISK for UI, DB policies still enforce |
| RLS | COMPLETE (mostly) | all 19 tables have policies; 3 scanner warnings open |
| IDOR / authorization tests | MISSING | |

### Marketplace core
| Area | Status |
|---|---|
| 5 categories (real_estate, vehicles, marketplace, jobs, services) + dynamic attributes | COMPLETE |
| Requested extra categories (mobile, electronics, wholesale, animals, agriculture, fashion, home) | MISSING |
| Subcategories | MISSING |
| Listing create + image upload + edit | PARTIAL — create/upload real; **no edit, no delete, no draft, no renew, no pause, no expiry job** |
| Listing approval / rejection workflow | PARTIAL — statuses exist, admin can moderate; no submission queue for new listings |
| Favorites | COMPLETE |
| Reporting listings | PARTIAL — table + admin queue; report UI limited |
| Video support, image reordering/validation | MISSING |
| View counters / analytics per listing | PARTIAL — `view_count` column, not incremented anywhere |

### Search / filter / location
| Area | Status |
|---|---|
| Keyword + category + attribute filters | COMPLETE |
| Sorting, URL state | PARTIAL |
| Full-text ranking, relevance | MISSING (ILIKE + trigram only) |
| Province filter | COMPLETE; district/area/coordinates/map/radius | MISSING |
| Saved searches + alerts | MISSING |
| Pagination | MISSING (fixed limits) |

### Seller / shop
| Area | Status |
|---|---|
| Shop CRUD, branding, categories, products, orders | COMPLETE |
| Shop/product search, filters, related products, caching + indexes | COMPLETE |
| Shop image uploads | BROKEN-ish — product images are **URL text inputs**, not uploads |
| Followers, shop reviews, verification, seller analytics/revenue | MISSING |

### Chat / notifications
| Area | Status |
|---|---|
| Conversations + realtime messages | COMPLETE |
| Read receipts, typing, online status, unread badge, block, attachments | MISSING |
| Notification center, email/push notifications, preferences | MISSING |

### Commerce
| Area | Status |
|---|---|
| Cart, checkout, order creation, seller fulfilment statuses | COMPLETE |
| Payment: manual bank/mobile-money reference | COMPLETE as a manual flow |
| Stripe / PayPal / wallet / payment intents / ledger / refunds / reconciliation | MISSING |
| Shipping/delivery tracking, cancellation, returns | MISSING |
| Reviews & ratings (products, sellers, buyers) | MISSING (no tables) |

### Trust, admin, ads, AI
| Area | Status |
|---|---|
| Admin dashboard, users, listings, reports, ads | COMPLETE (basic) |
| Admin: shops, orders, payments, categories, locations, audit logs, system health | MISSING |
| Audit trail table | MISSING |
| Spam/fraud/duplicate detection, rate limiting, abuse prevention | MISSING |
| Ad packages, ad orders, approve→feature trigger | COMPLETE |
| Ad impressions/clicks/CTR/campaigns/budgets, in-feed & interstitial ad units, AdMob/PayPal revenue | MISSING |
| Platform analytics (DAU/MAU/GMV/retention) | MISSING |
| AI features (NL search, listing assistant, category prediction, fraud signals) | MISSING |

### Engineering quality
| Area | Status |
|---|---|
| Type safety / build | COMPLETE — clean typecheck |
| Unit / integration / E2E / RLS tests | MISSING — zero tests, no runner |
| CI/CD, health checks, feature flags, backup/restore runbook | MISSING |
| Secrets handling | COMPLETE — no secrets in client code |
| Dead code / TODOs | COMPLETE — scan found no TODO/FIXME/mock code; all data paths hit the real database |

## 3. Security findings (live scan)
1. WARN — `SECURITY DEFINER` functions executable by signed-in users (trigger helpers; should have EXECUTE revoked).
2. WARN — `shops` public policy exposes owner phone/address to anonymous users.
3. WARN — no RLS policies on `realtime.messages` (not currently exploitable; matters if private channels are adopted).
No critical findings. Main *architectural* risk: every write goes directly from browser → Postgres, so all business rules depend solely on RLS; there is no server-side validation layer, rate limiting, or abuse protection.

## 4. Real remaining work (recalculated from the 1200-step target)

| Phase | Target steps | Already satisfied | Remaining |
|---|---|---|---|
| 0 Discovery | 50 | 50 | 0 |
| 1 Spec | 50 | 0 | 50 (documentation) |
| 2 Architecture | 80 | ~30 | ~50 |
| 3 Design/UI | 100 | ~65 | ~35 |
| 4 Auth/users | 70 | ~30 | ~40 |
| 5 Marketplace core | 130 | ~70 | ~60 |
| 6 Search/location | 100 | ~40 | ~60 |
| 7 Seller/shop | 90 | ~55 | ~35 |
| 8 Chat/notifications | 80 | ~25 | ~55 |
| 9 Commerce | 100 | ~35 | ~65 |
| 10 Trust/admin | 130 | ~40 | ~90 |
| 11 Ads/analytics/AI | 110 | ~15 | ~95 |
| 12 QA/production | 110 | ~10 | ~100 |
| **Total** | **1200** | **~465 (≈39%)** | **~735 (≈61%)** |

## 5. Verdict

**NOT PRODUCTION READY.**

Hard blockers before any launch:
1. No automated tests of any kind (incl. RLS/authorization tests).
2. Phone OTP cannot work without an SMS provider (external dependency).
3. No reviews/ratings, notifications, or payment gateway — core marketplace trust and money loops are absent.
4. No rate limiting / abuse prevention on a fully client-driven write path.
5. No audit log, no admin coverage of shops/orders/payments.
6. Listing lifecycle incomplete (no edit/delete/renew/expiry).
7. No CI/CD, health checks, or backup/restore procedure.

## 6. Recommended execution order (largest risk reduction first)
1. Listing lifecycle completion (edit/delete/pause/renew/expire) + shop image uploads.
2. Reviews & ratings + notification center (tables, RLS, UI).
3. Server-function layer for privileged writes + rate limiting + audit log.
4. Auth completion (password reset, avatar, account settings, Google sign-in).
5. Search: pagination, sorting, saved searches, districts/map.
6. Payments abstraction (provider interface) with Stripe/PayPal adapters.
7. Ads instrumentation (impressions/clicks/CTR) and platform analytics.
8. AI assist features via Lovable AI.
9. Test suite (unit + RLS + E2E) and CI, then production hardening.
