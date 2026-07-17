import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store, ShoppingCart } from "lucide-react";
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

function ShopPage() {
  const t = useT();
  const { slug } = Route.useParams();

  const shopQ = useQuery({
    queryKey: ["shop", slug],
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

  const productsQ = useQuery({
    enabled: !!shopQ.data?.id,
    queryKey: ["shop-products", shopQ.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("id,title,price,currency,stock,image_urls,status")
        .eq("shop_id", shopQ.data!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
            >
              <ShoppingCart className="h-4 w-4" /> {t("nav.cart")}
            </Link>
          </div>
          {shop.description && (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{shop.description}</p>
          )}
        </div>

        <h2 className="mt-8 text-lg font-semibold">{t("shop.products")}</h2>
        {productsQ.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !productsQ.data || productsQ.data.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("shop.noProducts")}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {productsQ.data.map((p) => (
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
