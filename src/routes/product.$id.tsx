import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Store, ShoppingCart, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/product/$id")({
  head: () => ({ meta: [{ title: "Product — AfghanMarket" }] }),
  component: ProductPage,
});

async function ensureCart(userId: string) {
  const { data: existing } = await supabase
    .from("shop_carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("shop_carts")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function ProductPage() {
  const t = useT();
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("id,title,description,price,currency,stock,image_urls,shop_id,status,category_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const shopQ = useQuery({
    enabled: !!product.data?.shop_id,
    queryKey: ["product-shop", product.data?.shop_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shops")
        .select("id,slug,name")
        .eq("id", product.data!.shop_id)
        .maybeSingle();
      return data;
    },
  });

  const relatedQ = useQuery({
    enabled: !!product.data?.shop_id,
    queryKey: [
      "product-related",
      product.data?.shop_id,
      product.data?.category_id,
      product.data?.id,
    ],
    queryFn: async () => {
      let q = supabase
        .from("shop_products")
        .select("id,title,price,currency,image_urls")
        .eq("shop_id", product.data!.shop_id)
        .eq("status", "active")
        .neq("id", product.data!.id)
        .limit(8);
      if (product.data!.category_id) q = q.eq("category_id", product.data!.category_id);
      const { data } = await q.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function addToCart() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/product/${id}` } });
      return;
    }
    if (!product.data) return;
    setAdding(true);
    try {
      const cartId = await ensureCart(user.id);
      // enforce single-shop cart
      const { data: existingItems } = await supabase
        .from("shop_cart_items")
        .select("id,product_id,shop_products!inner(shop_id)")
        .eq("cart_id", cartId);
      if (existingItems && existingItems.length > 0) {
        const firstShop = (existingItems[0] as any).shop_products?.shop_id;
        if (firstShop && firstShop !== product.data.shop_id) {
          toast.error(t("cart.mixedShops"));
          setAdding(false);
          return;
        }
      }
      const { data: existing } = await supabase
        .from("shop_cart_items")
        .select("id,quantity")
        .eq("cart_id", cartId)
        .eq("product_id", product.data.id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("shop_cart_items")
          .update({ quantity: existing.quantity + qty })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shop_cart_items")
          .insert({ cart_id: cartId, product_id: product.data.id, quantity: qty });
        if (error) throw error;
      }
      toast.success(t("cart.added"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  if (product.isLoading) {
    return (
      <AppShell variant="site">
        <div className="mx-auto max-w-4xl p-6">{t("common.loading")}</div>
      </AppShell>
    );
  }
  if (!product.data) {
    return (
      <AppShell variant="site">
        <div className="mx-auto max-w-4xl p-6 text-muted-foreground">{t("common.noResults")}</div>
      </AppShell>
    );
  }
  const p = product.data;
  const outOfStock = p.stock <= 0 || p.status !== "active";

  return (
    <AppShell variant="site">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <button
          onClick={() => history.back()}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </button>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
            {p.image_urls?.[0] ? (
              <img src={p.image_urls[0]} alt={p.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                <Store className="h-12 w-12" />
              </div>
            )}
          </div>

          <div>
            {shopQ.data && (
              <Link
                to="/shop/$slug"
                params={{ slug: shopQ.data.slug }}
                className="text-xs font-medium text-primary hover:underline"
              >
                {shopQ.data.name}
              </Link>
            )}
            <h1 className="mt-1 text-2xl font-bold">{p.title}</h1>
            <div className="mt-2 text-3xl font-bold text-primary">
              {formatCurrency(p.price, p.currency)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {outOfStock ? t("shop.outOfStock") : `${t("shop.inStock")} · ${p.stock}`}
            </div>

            {p.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/90">{p.description}</p>
            )}

            {!outOfStock && (
              <div className="mt-6 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={p.stock}
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.max(1, Math.min(p.stock, Number(e.target.value) || 1)))
                  }
                  className="w-20 rounded-xl border border-input bg-card px-3 py-3 text-center text-sm"
                />
                <button
                  onClick={addToCart}
                  disabled={adding}
                  className="bg-gradient-brand flex-1 rounded-2xl py-3 text-sm font-semibold text-primary-foreground shadow-elevated disabled:opacity-50"
                >
                  <ShoppingCart className="mr-1 inline h-4 w-4" />
                  {adding ? t("common.loading") : t("shop.addToCart")}
                </button>
              </div>
            )}
          </div>
        </div>

        {relatedQ.data && relatedQ.data.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold">{t("shop.related")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {relatedQ.data.map((r) => (
                <Link
                  key={r.id}
                  to="/product/$id"
                  params={{ id: r.id }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {r.image_urls?.[0] ? (
                      <img
                        src={r.image_urls[0]}
                        alt={r.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground">
                        <Store className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-1 text-sm font-medium">{r.title}</div>
                    <div className="mt-1 text-sm font-bold text-primary">
                      {formatCurrency(r.price, r.currency)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
