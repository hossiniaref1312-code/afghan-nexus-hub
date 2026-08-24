# MASTER_ARCHITECTURE.md — Afghan Nexus Hub

Target architecture on the **existing** stack. No stack replacement is proposed; every element below is an addition to or hardening of what Phase 0 verified.

Stack (unchanged): TanStack Start v1 · React 19 · Vite · Tailwind v4 · shadcn/Radix · TanStack Query · Zod · Supabase (Postgres, Auth, Storage, Realtime).

The single largest architectural change: today **100% of writes go browser → Postgres**. The target introduces a thin, mandatory server layer (`createServerFn`) for every privileged or money/stock-touching operation, while keeping ordinary reads on the browser client under RLS.

---

## 1. Boundaries

### 1.1 Frontend
- Routes in `src/routes`; public routes SSR-on, protected routes under `_authenticated/` (managed gate already in place).
- Data: route `loader` → `queryClient.ensureQueryData(queryOptions)` → `useSuspenseQuery`. No `useEffect` fetching.
- Every data-bearing route defines `errorComponent` + `notFoundComponent` + pending UI.
- Components never import `.server.ts`; they call `*.functions.ts`.
- Client-side role reads are presentation only and never a security control.

### 1.2 Server
- `createServerFn` in `src/lib/*.functions.ts` for all app-internal privileged logic; server-only helpers in `*.server.ts`.
- Server routes under `src/routes/api/public/*` only for external callers (payment/webhook callbacks, cron triggers, health check) with signature verification.
- Three Supabase client tiers, already available: browser client (RLS as user), `requireSupabaseAuth` middleware client (RLS as user, server-side), `supabaseAdmin` (service role, privileged only, imported inside handlers).
- Rule: `supabaseAdmin` is never used to *decide* authorization — roles are read through the authenticated client / `has_role`.

### 1.3 Database / domain
Domains and their tables:
- Identity: `profiles`, `user_roles`
- Classifieds: `listings`, `listing_images`, `favorites`, categories/attributes (new)
- Commerce: `shops`, `shop_categories`, `shop_products`, `shop_carts`, `shop_cart_items`, `shop_orders`, `shop_order_items`, plus new `payments`, `order_events`, `inventory_ledger`
- Trust: `reports`, new `reviews`, `rating_aggregates`, `moderation_actions`
- Comms: `conversations`, `messages`, new `notifications`, `notification_preferences`
- Growth: `ad_packages`, `ad_orders`, new `ad_events`, `saved_searches`
- Platform: new `audit_log`, `rate_limits`, `analytics_events`
Cross-domain writes always go through a server function or a SQL function, never through multi-statement client code.

## 2. Security architecture

### 2.1 RLS strategy
Every public-schema table: RLS enabled, explicit GRANTs matched to policies, deny-by-default. Policy classes:
- owner-scoped (`auth.uid() = owner column`)
- participant-scoped (via EXISTS on the parent row)
- public-read (only for genuinely public, non-PII columns)
- staff-scoped (`has_role(auth.uid(),'admin'|'moderator')`)
Rules: no `USING (true)` on any table containing PII; every visibility-gated table also gets an owner-read policy; anon SELECT is granted only where a public policy exists.

### 2.2 Authorization & RBAC
`user_roles` + SECURITY DEFINER `has_role()` stays as the source of truth (verified correct, EXECUTE already restricted). Additions:
- `moderator` role activated with a narrower policy set than admin (content actions only; no role grants, no payments).
- A server function `getMyRoles()` (`requireSupabaseAuth`) feeds an `_authenticated/admin` layout `beforeLoad`; unauthorized users are redirected before the shell mounts.
- Every admin/moderator server function re-checks the role server-side; the route guard is UX only.

### 2.3 Validation
Zod schemas in client-safe modules, shared by the form and the server function's `inputValidator`. DB CHECK constraints are the final backstop (lengths, ranges, non-negative money, enum states). Server functions reject unknown fields; money, status, and ownership fields are never accepted from the client.

## 3. P0 designs (verified findings)

### P0-1 Order price integrity
- Client sends only `{ shopId, items: [{ productId, quantity }], shippingAddress, paymentMethodKey }`.
- `createOrder` server fn (authenticated) calls a Postgres SECURITY DEFINER function `place_order(...)` that, in one transaction: locks the product rows (`SELECT ... FOR UPDATE`), reads authoritative `price`/`currency`/`status`, recomputes line totals, shipping fee (province table), discounts, and grand total, inserts `shop_orders` + `shop_order_items` + `payments(pending)` + `order_events`.
- Direct INSERT on `shop_orders`/`shop_order_items` is revoked from `authenticated`; only the definer function writes them. Same for any future discount/commission field.
- CHECK constraints reinforce: `total >= 0`, `unit_price >= 0`, and a trigger asserting `total = sum(items) + shipping - discount`.

### P0-2 Stock integrity
- `place_order` decrements `shop_products.stock` in the same transaction under row locks; `stock >= 0` CHECK turns any race into a rollback rather than negative stock.
- An `inventory_ledger` append-only table records every delta (`order_placed`, `order_cancelled`, `manual_adjust`) with actor and reason; product stock is reconcilable from it.
- Cancellations/refunds restock through the same function family, never by direct UPDATE.
- Client stock is advisory only; the order call is the authority and returns a typed `OUT_OF_STOCK` result for the UI.

### P0-3 Listing image security
- Bucket `listing-images`: set `file_size_limit` 5 MB and `allowed_mime_types = image/jpeg, image/png, image/webp`.
- Client: validate type + size before upload, downscale/re-encode to WebP in-browser (canvas), derive the extension from the sniffed MIME, never from the filename; cap at 8 images.
- Path stays `{auth.uid()}/{listing_id}/{uuid}.{ext}`; INSERT/UPDATE/DELETE policies already bind folder 1 to `auth.uid()` — keep.
- Read: replace the blanket `bucket_id='listing-images'` SELECT policy with one scoped to images whose listing is `active` or owned by the caller or staff. Non-public images are served through signed URLs from a server function.
- Deletion authorization: owner or staff only; removing a listing removes its objects through a server function.

### P0-4 Shop data privacy
| Field | PUBLIC | AUTHENTICATED | OWNER | ADMIN |
|---|---|---|---|---|
| id, slug, name, description, logo_url, banner_url, province, city, is_active, rating | ✅ | ✅ | ✅ | ✅ |
| address | ❌ | ❌ | ✅ | ✅ |
| phone | ❌ | reveal-on-action, rate-limited, logged | ✅ | ✅ |
| owner_id | ❌ | ❌ | ✅ | ✅ |
| orders, payment refs | ❌ | ❌ | ✅ | ✅ |
Implementation: a `shops_public` view (or column-restricted anon policy) backs all public reads; `phone` is returned only by a `revealShopContact` server function that requires auth, applies a rate limit, and writes an audit event. `listings.contact_phone` follows the same rule.

### P0-5 Admin authorization
Enforcement lives in three places, in this order of authority: (1) RLS policies via `has_role` — already correct; (2) server functions that re-check the role before any privileged action; (3) the route guard, which is cosmetic. No admin capability may exist that is reachable without (1) and (2).

### P0-6 Rate limiting
`rate_limits(key, window_start, count)` in Postgres, incremented by a SECURITY DEFINER `check_rate_limit(bucket, identifier, limit, window)` called at the top of the relevant server function. Identifier = user id (fallback: hashed IP for unauthenticated endpoints).

| Bucket | Limit |
|---|---|
| auth attempts (per identifier) | 5 / 15 min, then backoff |
| listing create | 10 / day, 3 / hour |
| messages | 30 / min, 500 / day |
| reports | 10 / day |
| reviews | 5 / day, 1 per order line |
| uploads | 40 files / hour, 100 MB / day |
| order create | 10 / hour |
| payment actions (submit ref / verify) | 20 / hour |
| contact reveal | 30 / day |

### P0-7 Audit logging
`audit_log(id, actor_id, actor_role, action, entity_type, entity_id, before jsonb, after jsonb, reason, ip, user_agent, created_at)`. Append-only: `GRANT INSERT` to nobody directly — rows are written by SECURITY DEFINER functions; no UPDATE/DELETE policy exists for any role; admins have SELECT only. Events: admin/moderator actions, role grants/revocations, listing/shop/user moderation, payment create/verify/refund, order state transitions, contact reveals, failed authorization attempts.

## 4. Supporting subsystems

**Transactions:** any multi-row invariant (order, refund, review aggregate, role change) lives in one SQL function; server functions orchestrate, never sequence unprotected client writes.

**Storage security:** buckets — `listing-images` (as above), new `shop-images` (owner-folder, 5 MB, image MIME), new `avatars` (public-read, 2 MB), new `verification-docs` (fully private, admin read via signed URL), new `chat-attachments` (participant read via signed URL).

**Image processing:** client-side canvas resize/WebP before upload (no native/sharp — the worker runtime forbids it); thumbnails via Supabase image transformations; strip EXIF by re-encoding.

**Notifications:** `notifications` + `notification_preferences`; writes from SQL triggers/server functions; in-app delivery over Realtime on a user-scoped channel; email through platform email infra; push deferred.

**Realtime:** keep `conversations` + `messages` in the publication with participant-only RLS (verified correct); add user-scoped notification rows. If broadcast/presence is adopted, add `realtime.messages` policies first.

**Search:** `tsvector` column with weighted title/description + trigram fallback, GIN indexes, attribute-specific btree indexes, keyset pagination, ranking = relevance × recency × featured boost. Executed as public reads through the anon-safe policy/view.

**Payments:** `payments` table + provider adapter interface (`manual`, later `stripe`, `paddle`). Manual flow: buyer submits reference → seller/admin verifies → `payments.status=paid` → order transitions. Every transition audited; amounts always from the order, never the request.

**Orders / inventory / reviews / moderation:** as in §3 and the product spec; reviews aggregate via trigger into `rating_aggregates`; moderation actions always write `moderation_actions` + `audit_log`.

**Analytics:** append-only `analytics_events` (server-written for money/moderation events, batched client-written for view/click events with a server-side sanity filter), rolled up nightly into summary tables; ad impressions/clicks feed CTR.

**Background jobs:** `pg_cron` calling `/api/public/jobs/*` server routes with a shared secret: listing expiry, ad expiry/unfeature, saved-search alerts, analytics rollups, notification digests, rate-limit table pruning.

**Observability:** structured server logs with request/user correlation, `/api/public/health` (DB ping + build id), error reporting hook on the root error boundary, keep the existing client perf instrumentation.

**CI/CD:** on every change — typecheck, lint, unit (Vitest), RLS/authorization tests against a seeded database using per-role sessions, Playwright E2E for the 8 core flows, build. Migrations forward-only and reviewed; no schema change without a migration file.

**Backup/recovery:** rely on managed Postgres PITR; document and rehearse a restore once; export storage bucket inventory; document RTO/RPO and a rollback procedure for a bad migration.
