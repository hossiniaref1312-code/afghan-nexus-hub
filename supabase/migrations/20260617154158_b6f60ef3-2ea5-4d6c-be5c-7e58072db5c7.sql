
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.listing_category AS ENUM ('real_estate', 'vehicles', 'marketplace', 'jobs', 'services');
CREATE TYPE public.listing_status AS ENUM ('active', 'sold', 'expired', 'pending', 'rejected');
CREATE TYPE public.listing_purpose AS ENUM ('sell', 'rent', 'buy', 'hire', 'offer');

-- =========================
-- update_updated_at helper
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- PROFILES
-- name not public, phone partially public, province/city hidden
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,                  -- private
  display_name TEXT,               -- public (defaults to first name)
  phone TEXT,                      -- semi-public via listing contact
  province TEXT,                   -- PRIVATE (admin only)
  city TEXT,                       -- PRIVATE (admin only)
  preferred_language TEXT NOT NULL DEFAULT 'en',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own full profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name',''), ' ', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- USER ROLES (separate table - prevents privilege escalation)
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin policy on profiles (using has_role; no recursion since it queries user_roles)
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- LISTINGS (single table, category-typed; sensitive location not exposed)
-- =========================
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.listing_category NOT NULL,
  purpose public.listing_purpose NOT NULL DEFAULT 'sell',
  status public.listing_status NOT NULL DEFAULT 'active',
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(14,2),                  -- nullable for jobs/services
  currency TEXT NOT NULL DEFAULT 'AFN',
  -- public location (province only, optional & user-chosen)
  province TEXT,
  area_label TEXT,                      -- e.g. neighborhood, free text
  -- category-specific fields stored as jsonb (brand, year, bedrooms, etc.)
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- promotion
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_until TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  -- contact
  contact_phone TEXT,                   -- snapshot from profile at create time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listings_category_idx ON public.listings(category, status, created_at DESC);
CREATE INDEX listings_user_idx ON public.listings(user_id);
CREATE INDEX listings_featured_idx ON public.listings(is_featured, created_at DESC) WHERE is_featured = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;   -- public browsing
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active listings"
  ON public.listings FOR SELECT TO anon, authenticated
  USING (status = 'active' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own listings"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own listings"
  ON public.listings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own listings"
  ON public.listings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all listings"
  ON public.listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- LISTING IMAGES
-- =========================
CREATE TABLE public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listing_images_listing_idx ON public.listing_images(listing_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_images TO authenticated;
GRANT SELECT ON public.listing_images TO anon;
GRANT ALL ON public.listing_images TO service_role;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads images for active listings"
  ON public.listing_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.status='active' OR l.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "Owners write images"
  ON public.listing_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));

-- =========================
-- FAVORITES
-- =========================
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON public.favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- REPORTS
-- =========================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users read own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage reports"
  ON public.reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
