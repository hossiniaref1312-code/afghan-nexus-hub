-- P0-4: Protected contact / PII architecture

CREATE TABLE IF NOT EXISTS public.listing_contacts (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  contact_phone text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_contacts TO authenticated;
GRANT ALL ON public.listing_contacts TO service_role;

ALTER TABLE public.listing_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own listing contact" ON public.listing_contacts;
CREATE POLICY "Owner manages own listing contact"
ON public.listing_contacts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage listing contacts" ON public.listing_contacts;
CREATE POLICY "Admins manage listing contacts"
ON public.listing_contacts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS listing_contacts_updated_at ON public.listing_contacts;
CREATE TRIGGER listing_contacts_updated_at BEFORE UPDATE ON public.listing_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shop_contacts (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  phone text,
  address text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_contacts TO authenticated;
GRANT ALL ON public.shop_contacts TO service_role;

ALTER TABLE public.shop_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own shop contact" ON public.shop_contacts;
CREATE POLICY "Owner manages own shop contact"
ON public.shop_contacts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage shop contacts" ON public.shop_contacts;
CREATE POLICY "Admins manage shop contacts"
ON public.shop_contacts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS shop_contacts_updated_at ON public.shop_contacts;
CREATE TRIGGER shop_contacts_updated_at BEFORE UPDATE ON public.shop_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing PII out of publicly readable tables (idempotent)
INSERT INTO public.listing_contacts (listing_id, contact_phone)
SELECT l.id, l.contact_phone FROM public.listings l
WHERE l.contact_phone IS NOT NULL AND btrim(l.contact_phone) <> ''
ON CONFLICT (listing_id) DO NOTHING;

INSERT INTO public.shop_contacts (shop_id, phone, address)
SELECT s.id, s.phone, s.address FROM public.shops s
WHERE (s.phone IS NOT NULL AND btrim(s.phone) <> '')
   OR (s.address IS NOT NULL AND btrim(s.address) <> '')
ON CONFLICT (shop_id) DO NOTHING;

-- Remove duplicate (publicly readable) sources of truth
ALTER TABLE public.listings DROP COLUMN IF EXISTS contact_phone;
ALTER TABLE public.shops DROP COLUMN IF EXISTS phone;
ALTER TABLE public.shops DROP COLUMN IF EXISTS address;