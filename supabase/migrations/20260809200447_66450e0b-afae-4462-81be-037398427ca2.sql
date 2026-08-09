CREATE SCHEMA IF NOT EXISTS extensions;
DROP INDEX IF EXISTS public.idx_shop_products_title_trgm;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS idx_shop_products_title_trgm ON public.shop_products USING gin (title extensions.gin_trgm_ops);