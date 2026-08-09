import { createFileRoute, Link } from "@tanstack/react-router";
import { usePerfQuery } from "@/lib/use-perf-query";
import { useMemo, useState } from "react";
import { Store, ShoppingCart, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/shop/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — AfghanMarket` },
      { name: "description", content: `Products from ${params.slug} on AfghanMarket.` },
    ],
  }),
  component: ShopPage,
});

type Sort = "newest" | "price_asc" | "price_desc";

function ShopPage() {
  const t = useT();
  const { slug } = Route.useParams();
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("newest");

  const shopQ = usePerfQuery("shop/:slug:shop", {
    queryKey: ["shop", slug],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id,slug,name,description,logo_url,banner_url,phone,city,province,address")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const categoriesQ = usePerfQuery("shop/:slug:categories", {
    enabled: !!shopQ.data?.id,
    queryKey: ["shop-categories", shopQ.data?.id],
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("id,name,sort_order")
        .eq("shop_id", shopQ.data!.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const productsQ = usePerfQuery("shop/:slug:products", {
    enabled: !!shopQ.data?.id,
    queryKey: ["shop-products", shopQ.data?.id],
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("id,title,description,price,currency,stock,image_urls,status,category_id,created_at")
        .eq("shop_id", shopQ.data!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = productsQ.data ?? [];
    if (catId) list = list.filter((p) => p.category_id === catId);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((p) => p.title?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
    const sorted = [...list];
    if (sort === "price_asc") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "price_desc") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    else sorted.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return sorted;
  }, [productsQ.data, q, catId, sort]);

  if (shopQ.isLoading) {
    return (
      <AppShell variant="site">
        <div className="mx-auto max-w-6xl px-4 py-8">{t("common.loading")}</div>
      </AppShell>
    );
  }
  if (!shopQ.data) {
    return (
      <AppShell variant="site">
        <div className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground">{t("shop.empty")}</div>
      </AppShell>
    );
  }
  const shop = shopQ.data;
  const categories = categoriesQ.data ?? [];

  return (
    <AppShell variant="site">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border">
          {shop.banner_url ? (
            <img src={shop.banner_url} alt="" className="h-40 w-full object-cover md:h-56" />
          ) : (
            <div className="h-32 w-full bg-gradient-brand md:h-40" />
          )}
          <div className="flex items-center gap-3 p-4">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
                <Store className="h-7 w-7" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{shop.name}</h1>
              <div className="text-xs text-muted-foreground">
                {[shop.city, shop.province].filter(Boolean).join(", ")}
              </div>
            </div>
            <Link
              to="/cart"
              className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
            >
              <ShoppingCart className="h-4 w-4" /> {t("nav.cart")}
            </Link>
          </div>
          {shop.description && (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{shop.description}</p>
          )}
        </div>

        {/* search + sort */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-card">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("shop.searchProducts")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-2xl border border-border bg-card px-3 py-2.5 text-sm shadow-card"
          >
            <option value="newest">{t("shop.sortNewest")}</option>
            <option value="price_asc">{t("shop.sortPriceAsc")}</option>
            <option value="price_desc">{t("shop.sortPriceDesc")}</option>
          </select>
        </div>

        {/* categories */}
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCatId(null)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                !catId ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {t("shop.allCategories")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCatId(c.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  catId === c.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("shop.products")}</h2>
          {!productsQ.isLoading && (
            <span className="text-xs text-muted-foreground">
              {t("shop.resultsCount").replace("{n}", String(filtered.length))}
            </span>
          )}
        </div>

        {productsQ.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {(productsQ.data ?? []).length === 0 ? t("shop.noProducts") : t("shop.noResults")}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {p.image_urls?.[0] ? (
                    <img
                      src={p.image_urls[0]}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <Store className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                  <div className="mt-1 text-sm font-bold text-primary">
                    {formatCurrency(p.price, p.currency)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.stock > 0 ? `${t("shop.inStock")} · ${p.stock}` : t("shop.outOfStock")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
