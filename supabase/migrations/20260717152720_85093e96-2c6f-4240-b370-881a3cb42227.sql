
-- Order status enum for shop
CREATE TYPE public.shop_order_status AS ENUM ('pending','confirmed','paid','shipped','delivered','cancelled');
CREATE TYPE public.shop_product_status AS ENUM ('active','out_of_stock','hidden');

-- SHOPS
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  phone TEXT,
  province TEXT,
  city TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);
GRANT SELECT ON public.shops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT ALL ON public.shops TO service_role;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active shops" ON public.shops FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Owner can view own shop" ON public.shops FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owner can insert own shop" ON public.shops FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can update own shop" ON public.shops FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can delete own shop" ON public.shops FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SHOP CATEGORIES
CREATE TABLE public.shop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_categories_shop ON public.shop_categories(shop_id);
GRANT SELECT ON public.shop_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_categories TO authenticated;
GRANT ALL ON public.shop_categories TO service_role;
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories of active shops" ON public.shop_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.is_active));
CREATE POLICY "Owner manages own categories" ON public.shop_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- SHOP PRODUCTS
CREATE TABLE public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.shop_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'AFN',
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  status public.shop_product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_products_shop ON public.shop_products(shop_id);
CREATE INDEX idx_shop_products_category ON public.shop_products(category_id);
GRANT SELECT ON public.shop_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products of active shops" ON public.shop_products FOR SELECT
  USING (status = 'active' AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.is_active));
CREATE POLICY "Owner sees own products" ON public.shop_products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));
CREATE POLICY "Owner manages own products" ON public.shop_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));
CREATE TRIGGER shop_products_updated_at BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SHOP ORDERS
CREATE TABLE public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  currency TEXT NOT NULL DEFAULT 'AFN',
  status public.shop_order_status NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  ship_province TEXT,
  ship_city TEXT,
  ship_address TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_orders_shop ON public.shop_orders(shop_id);
CREATE INDEX idx_shop_orders_buyer ON public.shop_orders(buyer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer sees own orders" ON public.shop_orders FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Seller sees shop orders" ON public.shop_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));
CREATE POLICY "Buyer creates own order" ON public.shop_orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Seller updates shop order status" ON public.shop_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));
CREATE TRIGGER shop_orders_updated_at BEFORE UPDATE ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SHOP ORDER ITEMS
CREATE TABLE public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_order_items_order ON public.shop_order_items(order_id);
GRANT SELECT, INSERT ON public.shop_order_items TO authenticated;
GRANT ALL ON public.shop_order_items TO service_role;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer/Seller can see their order items" ON public.shop_order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shop_orders o
    LEFT JOIN public.shops s ON s.id = o.shop_id
    WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR s.owner_id = auth.uid())
  ));
CREATE POLICY "Buyer inserts items on own orders" ON public.shop_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));

-- SHOP CARTS
CREATE TABLE public.shop_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_carts TO authenticated;
GRANT ALL ON public.shop_carts TO service_role;
ALTER TABLE public.shop_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own cart" ON public.shop_carts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER shop_carts_updated_at BEFORE UPDATE ON public.shop_carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shop_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.shop_carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_cart_items TO authenticated;
GRANT ALL ON public.shop_cart_items TO service_role;
ALTER TABLE public.shop_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own cart items" ON public.shop_cart_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shop_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shop_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
