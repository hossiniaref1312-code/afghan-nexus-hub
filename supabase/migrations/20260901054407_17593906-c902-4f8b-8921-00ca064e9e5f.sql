ALTER TABLE public.shop_products DROP CONSTRAINT IF EXISTS shop_products_stock_nonneg;
ALTER TABLE public.shop_products ADD CONSTRAINT shop_products_stock_nonneg CHECK (stock >= 0) NOT VALID;
ALTER TABLE public.shop_products VALIDATE CONSTRAINT shop_products_stock_nonneg;

ALTER TABLE public.shop_order_items DROP CONSTRAINT IF EXISTS shop_order_items_qty_positive;
ALTER TABLE public.shop_order_items ADD CONSTRAINT shop_order_items_qty_positive CHECK (quantity > 0) NOT VALID;

ALTER TABLE public.shop_order_items DROP CONSTRAINT IF EXISTS shop_order_items_price_nonneg;
ALTER TABLE public.shop_order_items ADD CONSTRAINT shop_order_items_price_nonneg CHECK (unit_price >= 0) NOT VALID;

ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_total_nonneg;
ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_total_nonneg CHECK (total >= 0) NOT VALID;