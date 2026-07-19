import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Store, Search, Package } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "Shops — AfghanMarket" },
      { name: "description", content: "Browse trusted local shops across Afghanistan." },
    ],
  }),
  component: ShopsIndex,
});

type Tab = "shops" | "products";

function ShopsIndex() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("shops");
  const [q, setQ] = useState("");
  const term = q.trim();

  const shopsQ = useQuery({
    queryKey: ["shops-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id,slug,name,description,logo_url,city,province")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const productsQ = useQuery({
    enabled: tab === "products" && term.length > 0,
    queryKey: ["global-products", term],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("id,title,price,currency,image_urls,stock,shop_id,shops!inner(slug,name,is_active)")
        .eq("status", "active")
        .eq("shops.is_active", true)
        .ilike("title", `%${term}%`)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredShops = useMemo(() => {
    const list = shopsQ.data ?? [];
    if (!term) return list;
    const s = term.toLowerCase();
    return list.filter(
      (x) =>
        x.name?.toLowerCase().includes(s) ||
        x.city?.toLowerCase().includes(s) ||
        x.province?.toLowerCase().includes(s) ||
        x.description?.toLowerCase().includes(s),
    );
  }, [shopsQ.data, term]);

  return (
    <AppShell variant="site">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("shop.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-card">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "shops" ? t("shop.searchShops") : t("shop.searchProducts")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1 rounded-2xl border border-border bg-card p-1">
            {(["shops", "products"] as Tab[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  tab === k ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                {k === "shops" ? <Store className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                {t(k === "shops" ? "shop.tabShops" : "shop.tabProducts")}
              </button>
            ))}
          </div>
        </div>

        {tab === "shops" ? (
          shopsQ.isLoading ? (
            <p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : filteredShops.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
              <Store className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {term ? t("shop.noResults") : t("shop.empty")}
              </p>
            </div>
          ) : (
            <>
              <p className="mt-4 text-xs text-muted-foreground">
                {t("shop.resultsCount").replace("{n}", String(filteredShops.length))}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredShops.map((s) => (
                  <Link
                    key={s.id}
                    to="/shop/$slug"
                    params={{ slug: s.slug }}
                    className="group rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <div className="flex items-center gap-3">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="h-12 w-12 rounded-xl object-cover" />
                      ) : (
                        <div className="bg-gradient-brand grid h-12 w-12 place-items-center rounded-xl text-primary-foreground">
                          <Store className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{s.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[s.city, s.province].filter(Boolean).join(", ")}
                        </div>
                      </div>
                    </div>
                    {s.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )
        ) : !term ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">{t("shop.searchProducts")}</p>
        ) : productsQ.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !productsQ.data || productsQ.data.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">{t("shop.noResults")}</p>
        ) : (
          <>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("shop.resultsCount").replace("{n}", String(productsQ.data.length))}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {productsQ.data.map((p: any) => (
                <Link
                  key={p.id}
                  to="/product/$id"
                  params={{ id: p.id }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {p.image_urls?.[0] ? (
                      <img src={p.image_urls[0]} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                    <div className="mt-1 text-sm font-bold text-primary">
                      {formatCurrency(p.price, p.currency)}
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {p.shops?.name}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
