
-- =========================================================
-- P0-5 Database Security Hardening
-- =========================================================

-- ---------- 1. Least-privilege GRANTs ----------
-- anon must never write anything (no anon write policy exists anywhere).
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;

-- anon reads only genuinely public marketplace data.
REVOKE SELECT ON public.profiles, public.user_roles, public.listing_contacts,
  public.shop_contacts, public.messages, public.conversations, public.favorites,
  public.reports, public.shop_carts, public.shop_cart_items, public.shop_orders,
  public.shop_order_items, public.ad_orders FROM anon;

GRANT SELECT ON public.listings, public.listing_images, public.shops,
  public.shop_products, public.shop_categories, public.ad_packages TO anon;

-- authenticated: remove DELETE where no DELETE policy exists.
REVOKE DELETE ON public.conversations, public.messages, public.shop_orders,
  public.shop_order_items, public.profiles, public.ad_orders FROM authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ---------- 2. Listing write-path hardening ----------
CREATE OR REPLACE FUNCTION public.guard_listing_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- ownership and promotion state are server/admin controlled
  NEW.user_id       := OLD.user_id;
  NEW.is_featured   := OLD.is_featured;
  NEW.featured_until:= OLD.featured_until;
  NEW.created_at    := OLD.created_at;

  -- view counter may only advance by one at a time
  IF NEW.view_count IS DISTINCT FROM OLD.view_count
     AND NEW.view_count <> OLD.view_count + 1 THEN
    NEW.view_count := OLD.view_count;
  END IF;

  -- a rejected listing cannot be revived by its owner
  IF OLD.status = 'rejected' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'MODERATED_LISTING_LOCKED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_guard_update ON public.listings;
CREATE TRIGGER listings_guard_update BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_update();

-- ---------- 3. Messaging integrity ----------
CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- only read_at may ever change
  NEW.id              := OLD.id;
  NEW.conversation_id := OLD.conversation_id;
  NEW.sender_id       := OLD.sender_id;
  NEW.body            := OLD.body;
  NEW.created_at      := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_guard_update ON public.messages;
CREATE TRIGGER messages_guard_update BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();

CREATE OR REPLACE FUNCTION public.guard_conversation_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.listing_id := OLD.listing_id;
  NEW.buyer_id   := OLD.buyer_id;
  NEW.seller_id  := OLD.seller_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_guard_update ON public.conversations;
CREATE TRIGGER conversations_guard_update BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.guard_conversation_update();

-- ---------- 4. Order immutability (seller may only move status) ----------
CREATE OR REPLACE FUNCTION public.guard_shop_order_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.id                := OLD.id;
  NEW.shop_id           := OLD.shop_id;
  NEW.buyer_id          := OLD.buyer_id;
  NEW.total             := OLD.total;
  NEW.currency          := OLD.currency;
  NEW.payment_method    := OLD.payment_method;
  NEW.payment_reference := OLD.payment_reference;
  NEW.buyer_name        := OLD.buyer_name;
  NEW.buyer_phone       := OLD.buyer_phone;
  NEW.ship_province     := OLD.ship_province;
  NEW.ship_city         := OLD.ship_city;
  NEW.ship_address      := OLD.ship_address;
  NEW.note              := OLD.note;
  NEW.created_at        := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_orders_guard_update ON public.shop_orders;
CREATE TRIGGER shop_orders_guard_update BEFORE UPDATE ON public.shop_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_shop_order_update();

-- ---------- 5. Ad order integrity (price + status + ownership) ----------
CREATE OR REPLACE FUNCTION public.guard_ad_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pkg_price integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.user_id     := auth.uid();
  NEW.status      := 'pending';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.activated_at:= NULL;
  NEW.expires_at  := NULL;

  IF NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = NEW.listing_id AND l.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'NOT_LISTING_OWNER';
  END IF;

  SELECT price_afn INTO pkg_price
  FROM public.ad_packages WHERE id = NEW.package_id AND active;
  IF pkg_price IS NULL THEN
    RAISE EXCEPTION 'INVALID_PACKAGE';
  END IF;
  NEW.amount_afn := pkg_price;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ad_orders_guard_insert ON public.ad_orders;
CREATE TRIGGER ad_orders_guard_insert BEFORE INSERT ON public.ad_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_ad_order_insert();

-- ---------- 6. Report integrity ----------
CREATE OR REPLACE FUNCTION public.guard_report_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.reporter_id := auth.uid();
  NEW.status := 'open';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_guard_insert ON public.reports;
CREATE TRIGGER reports_guard_insert BEFORE INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.guard_report_insert();

-- ---------- 7. Invariants ----------
ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_allowed
  CHECK (status IN ('open','resolved','rejected')) NOT VALID;
