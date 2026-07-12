import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LanguageThemeMenu } from "@/components/LanguageThemeMenu";
import { CATEGORIES } from "@/lib/categories";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AfghanMarket — Buy, sell & discover" },
      { name: "description", content: "Afghanistan's all-in-one marketplace: real estate, vehicles, marketplace, jobs and services." },
      { property: "og:title", content: "AfghanMarket — Buy, sell & discover" },
      { property: "og:description", content: "Afghanistan's all-in-one marketplace: real estate, vehicles, marketplace, jobs and services." },
    ],
  }),
  component: Home,
});

function Home() {
  const t = useT();
  const [q, setQ] = useState("");

  const recent = useQuery({
    queryKey: ["recent-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,currency,province,area_label,category,is_featured,created_at,listing_images(url,position)")
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      {/* Hero header */}
      <header className="px-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-brand grid h-9 w-9 place-items-center rounded-xl shadow-elevated">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">{t("app.name")}</span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-balance">
              {t("app.tagline")}
            </p>
          </div>
          <LanguageThemeMenu />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Search routes through marketplace browse for now.
          }}
          className="mt-5"
        >
          <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-card">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.search")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </form>
      </header>

      {/* Category grid */}
      <section className="px-5 pt-7">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.categories")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            // Make first card span 2 cols for a more bespoke layout
            const featured = i === 0;
            return (
              <Link
                key={c.key}
                to="/category/$category"
                params={{ category: c.key }}
                className={`tap-highlight-none group relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-card transition-transform active:scale-[0.98] ${
                  featured ? "col-span-2 min-h-[140px]" : "min-h-[130px]"
                }`}
              >
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${c.tile}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="mt-3">
                  <div className="text-base font-bold leading-tight">{t(`cat.${c.key}`)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t(`cat.${c.key}.sub`)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent listings */}
      <section className="px-5 pt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.recent")}
        </h2>
        {recent.isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : !recent.data || recent.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recent.data.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
