
-- Ad packages & orders (Phase 4: Monetization)
CREATE TYPE public.ad_order_status AS ENUM ('pending','active','rejected','expired');
CREATE TYPE public.ad_payment_method AS ENUM ('mpaisa','myMoney','hesab_pay','bank_transfer','cash');

CREATE TABLE public.ad_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_afn INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  tier TEXT NOT NULL DEFAULT 'featured',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_packages TO anon, authenticated;
GRANT ALL ON public.ad_packages TO service_role;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active packages" ON public.ad_packages
  FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins manage packages" ON public.ad_packages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ad_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.ad_packages(id),
  amount_afn INTEGER NOT NULL,
  method public.ad_payment_method NOT NULL,
  payer_phone TEXT,
  reference TEXT,
  status public.ad_order_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ad_orders_user_idx ON public.ad_orders(user_id);
CREATE INDEX ad_orders_status_idx ON public.ad_orders(status);

GRANT SELECT, INSERT ON public.ad_orders TO authenticated;
GRANT ALL ON public.ad_orders TO service_role;
ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own orders" ON public.ad_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own orders" ON public.ad_orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all orders" ON public.ad_orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update orders" ON public.ad_orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER ad_orders_touch BEFORE UPDATE ON public.ad_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approving an ad order activates the listing feature window.
CREATE OR REPLACE FUNCTION public.apply_ad_order_activation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pkg_duration INTEGER;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    SELECT duration_days INTO pkg_duration FROM public.ad_packages WHERE id = NEW.package_id;
    NEW.activated_at := now();
    NEW.expires_at := now() + (pkg_duration || ' days')::interval;
    UPDATE public.listings
      SET is_featured = TRUE,
          featured_until = GREATEST(COALESCE(featured_until, now()), NEW.expires_at)
      WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ad_orders_activate BEFORE UPDATE ON public.ad_orders
  FOR EACH ROW EXECUTE FUNCTION public.apply_ad_order_activation();

-- Seed default packages (Afghan Afghani pricing).
INSERT INTO public.ad_packages (key, name, description, price_afn, duration_days, tier, sort_order) VALUES
  ('basic_7',    'Basic Boost',   '7 days featured placement',  200,  7,  'featured', 1),
  ('standard_15','Standard Boost','15 days featured placement', 350, 15,  'featured', 2),
  ('premium_30', 'Premium Boost', '30 days top placement',      600, 30,  'premium',  3);
