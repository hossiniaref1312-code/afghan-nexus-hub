# FINAL_PHASE0_VERIFICATION.md — Afghan Nexus Hub

Read-only verification, 2026-08-24. Evidence = live database catalogs (`pg_policies`, `pg_proc`, `pg_constraint`, `storage.buckets`, `pg_publication_tables`) and repository scan. Nothing was modified.

---

## 1. RLS policies
**STATUS:** VERIFIED — PRESENT AND MOSTLY CORRECT (2 gaps)
**EVIDENCE:** 42 policies across 19 public tables + 4 storage policies. Ownership-scoped patterns confirmed: `listings` (owner insert/update/delete, public SELECT only `status='active' OR owner OR admin`), `favorites`, `shop_carts`/`shop_cart_items` (via cart ownership), `shop_products` (owner ALL + public SELECT only active product of active shop + owner-sees-own), `shop_orders` (buyer sees own / seller sees shop's / seller updates status), `shop_order_items` (buyer insert bound to own order, buyer+seller read), `conversations` (`buyer_id<>seller_id` on insert, participants read/update), `messages` (participant read, `sender_id=auth.uid()` insert, read-receipt UPDATE limited to `sender_id <> auth.uid()`), `profiles` (own + admin read only), `user_roles` (own read, admin manage), `reports`, `ad_orders`, `ad_packages`.
Gaps found:
- `shop_order_items` INSERT check only verifies the order belongs to the buyer; `title`, `unit_price`, `quantity` are client-supplied, so a buyer can insert arbitrary prices (`unit_price >= 0` is the only guard). Same for `shop_orders.total`.
- No policy blocks a buyer from ordering more than `stock`; stock is not decremented anywhere.
**RISK:** MEDIUM-HIGH — price/total tampering on the client-driven order path.
**REQUIRED ACTION:** Move order creation into a server function (or SECURITY DEFINER RPC) that recomputes line prices and total from `shop_products`, and revoke direct INSERT on `shop_orders`/`shop_order_items`.

## 2. SECURITY DEFINER functions and EXECUTE grants
**STATUS:** VERIFIED — CLEAN (previous warning no longer reproducible)
**EVIDENCE:** `pg_proc.proacl` in `public`:
- `has_role` (SECDEF): `postgres=X, authenticated=X, service_role=X` — intentional, used inside policies.
- `handle_new_user`, `apply_ad_order_activation`, `bump_conversation_last_message` (SECDEF) and `update_updated_at_column`: `postgres=X, service_role=X` only — PUBLIC/authenticated EXECUTE already revoked.
All five have `SET search_path = public`.
**RISK:** LOW.
**REQUIRED ACTION:** None. Keep the revoke pattern for any new SECDEF function.

## 3. Admin authorization
**STATUS:** VERIFIED — DATABASE SIDE ENFORCED, UI SIDE CLIENT-ONLY
**EVIDENCE:** All admin-privileged policies use `has_role(auth.uid(),'admin')` (ad_orders UPDATE, ad_packages ALL, listings ALL, profiles SELECT, reports ALL, user_roles ALL) — server-enforced. But route gating is client-side only: `src/routes/_authenticated/admin.index.tsx:18-53` reads `user_roles` in the browser and renders "not allowed"; sibling admin routes (`admin.users/listings/reports/ads`) repeat the same client read. There is no `beforeLoad` role check and no server function layer.
**RISK:** MEDIUM (cosmetic bypass — an attacker can render the admin shell, but every query/mutation still fails under RLS). No data exposure verified.
**REQUIRED ACTION:** Add a shared server-verified admin guard (`createServerFn` + `requireSupabaseAuth` returning role, checked in `beforeLoad` of an `_authenticated/admin` layout) so the UI can't be mounted without a real role.

## 4. Shop public phone/address exposure
**STATUS:** VERIFIED — EXPOSED (confirmed)
**EVIDENCE:** Policy `Anyone can view active shops` on `public.shops`, role `public` (anon + authenticated), `USING (is_active = true)` with no column restriction. `shops` contains `phone`, `address`, `city`, `province`, `owner_id`. Any anonymous client can `select phone,address from shops` and scrape every active seller's contact data. Same pattern for `listings.contact_phone`, readable by anon for active listings.
**RISK:** MEDIUM-HIGH — bulk PII/contact scraping, spam/fraud vector.
**REQUIRED ACTION:** Split public reads into a safe-column view (or restrict the anon policy to a view without `phone`/`address`) and serve contact details through an authenticated server function with rate limiting.

## 5. Realtime policies
**STATUS:** VERIFIED — PUBLICATION CORRECT, CHANNEL AUTHZ NOT CONFIGURED
**EVIDENCE:** `pg_publication_tables` for `supabase_realtime` = `public.conversations`, `public.messages` only. Row visibility over Realtime follows the RLS SELECT policies above (participant-only), so message leakage is not reproducible. `realtime.messages` has no RLS policies — irrelevant today because the app uses postgres_changes, not private broadcast channels.
**RISK:** LOW today; MEDIUM if private broadcast/presence channels are adopted later.
**REQUIRED ACTION:** None now. Add `realtime.messages` policies before using broadcast/presence.

## 6. Listing-image MIME/size validation
**STATUS:** VERIFIED — NO VALIDATION ANYWHERE
**EVIDENCE:** Bucket `listing-images`: `public=false`, `file_size_limit = none`, `allowed_mime_types = any`. Client (`src/routes/_authenticated/sell.tsx:39-42, 219-229`) only sets `accept="image/*"` (a picker hint, not enforcement) and caps the count at 8; no size check, no MIME check, no dimension/re-encode step, extension taken verbatim from the filename (`:74`).
**RISK:** HIGH — arbitrary file type/size upload by any authenticated user; storage-cost abuse and stored-content abuse.
**REQUIRED ACTION:** Set bucket `file_size_limit` (e.g. 5 MB) and `allowed_mime_types` (jpeg/png/webp), plus client-side pre-checks and client-side downscale before upload.

## 7. Product-image storage/upload architecture
**STATUS:** VERIFIED — NO UPLOAD PATH EXISTS
**EVIDENCE:** `shop_products.image_urls text[]`; `src/routes/_authenticated/my-shop.tsx:297,316` stores a comma-separated free-text field split into URLs — no `supabase.storage` call anywhere in that file. Images render straight from arbitrary remote URLs (`:257-258`). There is no `shop-images` bucket (only `listing-images` exists).
**RISK:** MEDIUM — sellers cannot practically add images; arbitrary external URLs allow hotlinking, broken images, and tracking-pixel/SSRF-adjacent content.
**REQUIRED ACTION:** Create a `shop-images` bucket with owner-folder policies + MIME/size limits and replace the text field with a real uploader.

## 8. Sharing implementation
**STATUS:** VERIFIED — NOT IMPLEMENTED
**EVIDENCE:** No `navigator.share`, no `clipboard.writeText`, no share button anywhere in `src/`. The only "share" hits are unrelated (`previewAuthStorage.ts`, translation keys, `auth.tsx`). No `og:image` on any route head.
**RISK:** LOW security / HIGH growth impact — listings and shops cannot be shared with a rich preview.
**REQUIRED ACTION:** Add a share action (Web Share API with clipboard fallback) on listing/product/shop pages and loader-fed `og:image`/`twitter:image` on those routes.

## 9. RTL implementation page-by-page
**STATUS:** VERIFIED — GLOBAL SWITCH WORKS, PER-PAGE COVERAGE THIN
**EVIDENCE:** `src/lib/i18n/I18nProvider.tsx:45` sets `document.documentElement.dir`, and `src/styles.css` carries `[dir]` rules. But directional utilities (`rtl:`) appear in only 5 files: `promote.$id.tsx` (1), `messages.$id.tsx` (2), `listing.$id.tsx` (1), `category.$category.tsx` (1), `sell.tsx` (1) — all back-chevron flips. Not present in `index.tsx`, `shop.index.tsx`, `shop.$slug.tsx`, `product.$id.tsx`, `cart.tsx`, `checkout.tsx`, `my-shop.tsx`, `orders.tsx`, `profile.tsx`, `favorites.tsx`, `messages.tsx`, admin pages, `SiteHeader/SiteFooter/BottomNav`. Layout relies on logical Tailwind properties in most places, so most pages mirror acceptably, but directional icons, arrows, and any `left-`/`right-`/`pl-`/`pr-` usage are unaudited per page.
**RISK:** MEDIUM UX for the primary Dari/Pashto audience.
**REQUIRED ACTION:** Page-by-page RTL pass in Dari; convert remaining physical spacing/position utilities to logical ones and flip directional icons.

## 10. Existing database constraints/triggers
**STATUS:** VERIFIED — BASIC INTEGRITY PRESENT, BUSINESS RULES MISSING
**EVIDENCE:** CHECK/UNIQUE constraints found: `messages_body_check (1..4000)`, `shop_cart_items_quantity_check (>0)` + UNIQUE(cart_id,product_id), `shop_order_items_quantity_check (>0)`, `unit_price >= 0`, `shop_orders_total_check (>=0)`, `shop_products_price_check (>=0)`, `stock >= 0`, UNIQUE on `shops.owner_id`, `shops.slug`, `shop_carts.user_id`, `ad_packages.key`, `user_roles(user_id,role)`, `conversations(listing_id,buyer_id,seller_id)`. All FKs present per schema. Triggers (11): `handle_new_user` on auth signup, `update_updated_at_column` on 7 tables, `bump_conversation_last_message`, `apply_ad_order_activation` (sets activated/expires and features the listing).
Missing: no CHECK on `listings.price >= 0`, no title-length limits, no stock decrement on order, no listing expiry job, no audit table.
**RISK:** MEDIUM — invalid listing prices and stock oversell are possible.
**REQUIRED ACTION:** Add price/length CHECKs on `listings`, and handle stock decrement + order totals inside a transactional server-side path.

## 11. Existing error handling
**STATUS:** VERIFIED — ROOT-LEVEL ONLY
**EVIDENCE:** `errorComponent`/`notFoundComponent` are declared **only** in `src/routes/__root.tsx:102-103`. No route file defines its own. Data errors are handled ad hoc with `try/catch` + `toast.error((err as Error).message)` (e.g. `sell.tsx:90-92`), which surfaces raw database messages to users. `src/lib/error-capture.ts` records uncaught errors for the server handler; no server-side observability, no Sentry-style reporting.
**RISK:** MEDIUM — a single failed query can blank a page to the global error screen; raw DB errors leak schema hints.
**REQUIRED ACTION:** Add `errorComponent`/`notFoundComponent` (and pending states) to every data-bearing route, and map database errors to friendly localized messages.

## 12. Existing Supabase storage policies
**STATUS:** VERIFIED — FUNCTIONAL, WITH ONE OVER-BROAD READ
**EVIDENCE:** One bucket, `listing-images`, `public=false`, no size/MIME limits. 4 policies on `storage.objects`: INSERT/UPDATE/DELETE restricted to `bucket_id='listing-images' AND foldername[1] = auth.uid()` (correct owner-folder isolation), and `Public read listing images` = SELECT `USING (bucket_id='listing-images')` for anon+authenticated — i.e. **every object in the bucket is world-readable**, including images belonging to pending/rejected/deleted listings.
**RISK:** MEDIUM — images of non-public listings are readable by anyone who knows/enumerates a path.
**REQUIRED ACTION:** Either accept public-read explicitly (and never store private content there) or scope the SELECT policy to objects whose listing is active/owned, and add bucket-level MIME/size limits.

---

## SUMMARY

| # | Item | Status | Risk |
|---|---|---|---|
| 1 | RLS policies | Present, 2 gaps (order price/stock) | MED-HIGH |
| 2 | SECDEF grants | Clean | LOW |
| 3 | Admin authorization | DB enforced, UI client-only | MED |
| 4 | Shop phone/address | Exposed to anon | MED-HIGH |
| 5 | Realtime | Correct today | LOW |
| 6 | Listing-image MIME/size | No validation | HIGH |
| 7 | Product images | No upload path (URL text) | MED |
| 8 | Sharing | Not implemented | LOW (sec) |
| 9 | RTL per page | Global only, thin coverage | MED |
| 10 | Constraints/triggers | Basic only | MED |
| 11 | Error handling | Root-level only | MED |
| 12 | Storage policies | Owner-write OK, world-read | MED |

**TOP PRIORITY BEFORE ANY LAUNCH:** (1) bucket MIME/size limits, (2) server-side order pricing/stock, (3) hide seller phone/address from anon reads, (4) server-verified admin guard.

No files or database objects were modified during this verification.
