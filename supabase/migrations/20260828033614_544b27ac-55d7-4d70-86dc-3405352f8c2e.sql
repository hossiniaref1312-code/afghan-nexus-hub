-- ============ Listing integrity constraints ============
UPDATE public.listings SET title = 'Untitled' WHERE btrim(title) = '';
UPDATE public.listings SET price = NULL WHERE price IS NOT NULL AND (price < 0 OR price > 100000000000);
UPDATE public.listings SET currency = 'AFN' WHERE currency NOT IN ('AFN','USD','EUR','PKR','IRR');
UPDATE public.listings SET description = left(description, 5000) WHERE length(description) > 5000;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_title_not_blank CHECK (btrim(title) <> '' AND length(title) <= 160),
  ADD CONSTRAINT listings_price_range CHECK (price IS NULL OR (price >= 0 AND price <= 100000000000)),
  ADD CONSTRAINT listings_currency_allowed CHECK (currency IN ('AFN','USD','EUR','PKR','IRR')),
  ADD CONSTRAINT listings_description_len CHECK (description IS NULL OR length(description) <= 5000),
  ADD CONSTRAINT listings_view_count_nonneg CHECK (view_count >= 0);

-- ============ Trusted order placement ============
CREATE OR REPLACE FUNCTION public.place_order(
  _payment_method text,
  _buyer_name text,
  _buyer_phone text,
  _payment_reference text DEFAULT NULL,
  _ship_province text DEFAULT NULL,
  _ship_city text DEFAULT NULL,
  _ship_address text DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cart_id uuid;
  _shop_id uuid;
  _shop_count int;
  _currency text;
  _total numeric := 0;
  _order_id uuid;
  r RECORD;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  IF _payment_method IS NULL OR _payment_method NOT IN ('cash','mpaisa','myMoney','hesab_pay','bank_transfer') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;
  IF btrim(coalesce(_buyer_name,'')) = '' OR btrim(coalesce(_buyer_phone,'')) = '' THEN
    RAISE EXCEPTION 'MISSING_BUYER_DETAILS';
  END IF;

  SELECT id INTO _cart_id FROM public.shop_carts WHERE user_id = _uid;
  IF _cart_id IS NULL THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  -- Lock the involved products to serialize concurrent checkouts.
  PERFORM 1
  FROM public.shop_cart_items ci
  JOIN public.shop_products p ON p.id = ci.product_id
  WHERE ci.cart_id = _cart_id
  ORDER BY p.id
  FOR UPDATE OF p;

  SELECT count(DISTINCT p.shop_id), min(p.shop_id)
    INTO _shop_count, _shop_id
  FROM public.shop_cart_items ci
  JOIN public.shop_products p ON p.id = ci.product_id
  WHERE ci.cart_id = _cart_id;

  IF coalesce(_shop_count, 0) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;
  IF _shop_count > 1 THEN
    RAISE EXCEPTION 'MULTIPLE_SHOPS';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.shops s WHERE s.id = _shop_id AND s.is_active) THEN
    RAISE EXCEPTION 'SHOP_UNAVAILABLE';
  END IF;

  FOR r IN
    SELECT ci.quantity, p.id AS product_id, p.title, p.price, p.currency, p.stock, p.status
    FROM public.shop_cart_items ci
    JOIN public.shop_products p ON p.id = ci.product_id
    WHERE ci.cart_id = _cart_id
    ORDER BY p.id
  LOOP
    IF r.quantity IS NULL OR r.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;
    IF r.status <> 'active' THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE:%', r.title;
    END IF;
    IF r.stock < r.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', r.title;
    END IF;
    _currency := coalesce(_currency, r.currency);
    IF r.currency <> _currency THEN
      RAISE EXCEPTION 'MIXED_CURRENCY';
    END IF;
    _total := _total + (r.price * r.quantity);
  END LOOP;

  INSERT INTO public.shop_orders (
    shop_id, buyer_id, total, currency, status, payment_method, payment_reference,
    buyer_name, buyer_phone, ship_province, ship_city, ship_address, note
  ) VALUES (
    _shop_id, _uid, _total, coalesce(_currency,'AFN'), 'pending', _payment_method,
    nullif(btrim(coalesce(_payment_reference,'')), ''),
    btrim(_buyer_name), btrim(_buyer_phone),
    nullif(btrim(coalesce(_ship_province,'')), ''),
    nullif(btrim(coalesce(_ship_city,'')), ''),
    nullif(btrim(coalesce(_ship_address,'')), ''),
    nullif(btrim(coalesce(_note,'')), '')
  ) RETURNING id INTO _order_id;

  INSERT INTO public.shop_order_items (order_id, product_id, title, unit_price, quantity)
  SELECT _order_id, p.id, p.title, p.price, ci.quantity
  FROM public.shop_cart_items ci
  JOIN public.shop_products p ON p.id = ci.product_id
  WHERE ci.cart_id = _cart_id;

  UPDATE public.shop_products p
     SET stock = p.stock - ci.quantity,
         status = CASE WHEN p.stock - ci.quantity <= 0 THEN 'out_of_stock'::shop_product_status ELSE p.status END,
         updated_at = now()
  FROM public.shop_cart_items ci
  WHERE ci.cart_id = _cart_id AND p.id = ci.product_id;

  IF EXISTS (SELECT 1 FROM public.shop_products WHERE stock < 0) THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:';
  END IF;

  DELETE FROM public.shop_cart_items WHERE cart_id = _cart_id;

  RETURN _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(text,text,text,text,text,text,text,text) TO authenticated;

-- ============ Close the direct client write path ============
DROP POLICY IF EXISTS "Buyer creates own order" ON public.shop_orders;
DROP POLICY IF EXISTS "Buyer inserts items on own orders" ON public.shop_order_items;
REVOKE INSERT ON public.shop_orders FROM authenticated, anon;
REVOKE INSERT ON public.shop_order_items FROM authenticated, anon;
REVOKE UPDATE ON public.shop_order_items FROM authenticated, anon;
GRANT ALL ON public.shop_orders TO service_role;
GRANT ALL ON public.shop_order_items TO service_role;

-- ============ Restock on cancellation ============
CREATE OR REPLACE FUNCTION public.restock_cancelled_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.shop_products p
       SET stock = p.stock + oi.quantity,
           status = CASE WHEN p.status = 'out_of_stock' AND p.stock + oi.quantity > 0
                         THEN 'active'::shop_product_status ELSE p.status END,
           updated_at = now()
    FROM public.shop_order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_orders_restock ON public.shop_orders;
CREATE TRIGGER shop_orders_restock
AFTER UPDATE ON public.shop_orders
FOR EACH ROW EXECUTE FUNCTION public.restock_cancelled_order();