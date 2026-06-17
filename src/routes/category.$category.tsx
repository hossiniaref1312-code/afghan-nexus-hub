import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Plus } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { LanguageThemeMenu } from "@/components/LanguageThemeMenu";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/category/$category")({
  parseParams: (p) => ({ category: z.enum(["real_estate", "vehicles", "marketplace", "jobs", "services"]).parse(p.category) }),
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

  const listings = useQuery({
    queryKey: ["listings", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,currency,province,area_label,category,is_featured,created_at,listing_images(url,position)")
        .eq("category", category)
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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

      <div className="px-5 pt-4">
        {listings.isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : !listings.data || listings.data.length === 0 ? (
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
            {listings.data.map((l) => (
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
