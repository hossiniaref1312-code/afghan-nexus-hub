import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, PlusCircle } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES } from "@/lib/categories";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AfghanMarket — Buy, sell & discover" },
      {
        name: "description",
        content:
          "Afghanistan's all-in-one marketplace: real estate, vehicles, marketplace, jobs and services.",
      },
      { property: "og:title", content: "AfghanMarket — Buy, sell & discover" },
      {
        property: "og:description",
        content:
          "Afghanistan's all-in-one marketplace: real estate, vehicles, marketplace, jobs and services.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const t = useT();
  const [q, setQ] = useState("");

  const featured = useQuery({
    queryKey: ["featured-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,title,price,currency,province,area_label,category,is_featured,created_at,listing_images(url,position)",
        )
        .eq("status", "active")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const recent = useQuery({
    queryKey: ["recent-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,title,price,currency,province,area_label,category,is_featured,created_at,listing_images(url,position)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell variant="site">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 10%, oklch(from var(--primary) l c h / 0.18), transparent 70%), radial-gradient(50% 50% at 90% 10%, oklch(from var(--saffron) l c h / 0.18), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
          <div className="max-w-2xl">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex h-14 items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-card"
            >
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("common.search")}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Link
                to="/category/$category"
                params={{ category: "marketplace" }}
                className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex"
              >
                {t("hero.cta.browse")}
              </Link>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/category/$category"
                params={{ category: "marketplace" }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                {t("hero.cta.browse")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sell"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <PlusCircle className="h-4 w-4" /> {t("hero.cta.post")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 pt-10 md:px-6 md:pt-14">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.categories")}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.key}
                to="/category/$category"
                params={{ category: c.key }}
                className="tap-highlight-none group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${c.tile}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="mt-3">
                  <div className="text-base font-bold leading-tight">{t(`cat.${c.key}`)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t(`cat.${c.key}.sub`)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 pt-12 md:px-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.featured")}
          </h2>
        </div>
        {featured.isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : !featured.data || featured.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("home.featured.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {featured.data.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* Recent */}
      <section className="mx-auto max-w-6xl px-4 pt-12 md:px-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.recent")}
          </h2>
        </div>
        {recent.isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : !recent.data || recent.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <div className="text-base font-semibold text-foreground">
              {t("home.recent.empty.title")}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{t("home.recent.empty.body")}</div>
            <Link
              to="/sell"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <PlusCircle className="h-4 w-4" /> {t("hero.cta.post")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {recent.data.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
