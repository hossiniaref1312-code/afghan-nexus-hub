import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { LanguageThemeMenu } from "@/components/LanguageThemeMenu";
import { CategoryFilters, DEFAULT_FILTERS, type FiltersState } from "@/components/CategoryFilters";
import { CATEGORIES, getCategory, type CategoryKey } from "@/lib/categories";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";

const CategoryEnum = z.enum(["real_estate", "vehicles", "marketplace", "jobs", "services"]);

export const Route = createFileRoute("/category/$category")({
  parseParams: (p) => ({ category: CategoryEnum.parse(p.category) }),
  head: ({ params }) => ({
    meta: [
      { title: `${categoryLabel(params.category)} — AfghanMarket` },
      { name: "description", content: `Browse ${categoryLabel(params.category)} listings on AfghanMarket.` },
    ],
  }),
  component: CategoryPage,
});

function categoryLabel(key: string) {
  const map: Record<string, string> = {
    real_estate: "Real Estate", vehicles: "Vehicles", marketplace: "Marketplace",
    jobs: "Jobs", services: "Services & Ads",
  };
  return map[key] ?? key;
}

function CategoryPage() {
  const t = useT();
  const { category } = Route.useParams();
  const def = getCategory(category)!;
  const Icon = def.icon;
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);

  const listings = useQuery({
    queryKey: ["listings", category, filters.purpose, filters.province, filters.priceMin, filters.priceMax, filters.sort, filters.q],
    queryFn: async () => {
      let q = supabase
        .from("listings")
        .select("id,title,price,currency,province,area_label,category,is_featured,attributes,created_at,listing_images(url,position)")
        .eq("category", category as CategoryKey)
        .eq("status", "active");

      if (filters.purpose) q = q.eq("purpose", filters.purpose);
      if (filters.province) q = q.eq("province", filters.province);
      if (filters.priceMin != null) q = q.gte("price", filters.priceMin);
      if (filters.priceMax != null) q = q.lte("price", filters.priceMax);
      if (filters.q) q = q.ilike("title", `%${filters.q}%`);

      if (filters.sort === "priceAsc") q = q.order("price", { ascending: true, nullsFirst: false });
      else if (filters.sort === "priceDesc") q = q.order("price", { ascending: false, nullsFirst: false });
      else q = q.order("is_featured", { ascending: false }).order("created_at", { ascending: false });

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Client-side filter on jsonb attributes for MVP.
  const results = useMemo(() => {
    const rows = listings.data ?? [];
    const attrs = Object.entries(filters.attrs).filter(([, v]) => v);
    if (attrs.length === 0) return rows;
    return rows.filter((r) => {
      const a = (r.attributes ?? {}) as Record<string, unknown>;
      return attrs.every(([k, v]) => String(a[k] ?? "").toLowerCase().includes(String(v).toLowerCase()));
    });
  }, [listings.data, filters.attrs]);

  return (
    <AppShell>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-3">
          <Link
            to="/"
            className="tap-highlight-none grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
          <div className={`grid h-9 w-9 place-items-center rounded-xl ${def.tile}`}>
            <Icon className="h-5 w-5" />
          </div>
          <h1 className="flex-1 text-base font-bold">{t(`cat.${category}`)}</h1>
          <LanguageThemeMenu />
        </div>
      </header>

      <CategoryFilters
        category={category as CategoryKey}
        value={filters}
        onChange={setFilters}
        resultsCount={listings.isSuccess ? results.length : undefined}
      />

      <div className="px-5 pt-4">
        {listings.isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : results.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center">
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${def.tile}`}>
              <Icon className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-base font-bold">{t("browse.empty.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("browse.empty.body")}</p>
            <Link
              to="/sell"
              search={{ category }}
              className="bg-gradient-brand text-primary-foreground mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-elevated"
            >
              <Plus className="h-4 w-4" /> {t("browse.cta")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {results.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// Touch import to keep treeshaking honest on the catalog
void CATEGORIES;
