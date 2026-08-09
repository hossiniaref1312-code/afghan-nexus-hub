CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_shops_slug_active ON public.shops (slug) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_shops_active_created ON public.shops (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shop_categories_shop_sort ON public.shop_categories (shop_id, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_shop_products_shop_status_created ON public.shop_products (shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_products_shop_status_price ON public.shop_products (shop_id, status, price);
CREATE INDEX IF NOT EXISTS idx_shop_products_status_created ON public.shop_products (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON public.shop_products (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shop_products_title_trgm ON public.shop_products USING gin (title gin_trgm_ops);