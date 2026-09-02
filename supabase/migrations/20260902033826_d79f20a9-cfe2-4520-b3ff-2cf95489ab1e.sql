CREATE OR REPLACE FUNCTION public.place_order(_payment_method text, _buyer_name text, _buyer_phone text, _payment_reference text DEFAULT NULL::text, _ship_province text DEFAULT NULL::text, _ship_city text DEFAULT NULL::text, _ship_address text DEFAULT NULL::text, _note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT count(DISTINCT p.shop_id), (array_agg(DISTINCT p.shop_id))[1]
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

  DELETE FROM public.shop_cart_items WHERE cart_id = _cart_id;

  RETURN _order_id;
END;
$function$;