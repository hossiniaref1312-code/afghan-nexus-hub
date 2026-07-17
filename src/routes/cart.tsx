import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — AfghanMarket" }] }),
  component: CartPage,
});

interface CartRow {
  id: string;
  quantity: number;
  product_id: string;
  shop_products: {
    id: string;
    title: string;
    price: number;
    currency: string;
    stock: number;
    image_urls: string[] | null;
    shop_id: string;
  } | null;
}

function CartPage() {
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const items = useQuery({
    enabled: !!user,
    queryKey: ["cart-items", user?.id],
    queryFn: async () => {
      const { data: cart } = await supabase
        .from("shop_carts")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!cart) return [] as CartRow[];
      const { data, error } = await supabase
        .from("shop_cart_items")
        .select("id,quantity,product_id,shop_products(id,title,price,currency,stock,image_urls,shop_id)")
        .eq("cart_id", cart.id);
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });

  async function updateQty(id: string, quantity: number) {
    if (quantity <= 0) return remove(id);
    const { error } = await supabase.from("shop_cart_items").update({ quantity }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cart-items"] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("shop_cart_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cart-items"] });
  }

  if (!user) {
    return (
      <AppShell variant="site">
        <div className="mx-auto max-w-2xl px-4 py-10 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("chat.signInRequired")}</p>
          <Link
            to="/auth"
            search={{ redirect: "/cart" }}
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            {t("common.signin")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const rows = items.data ?? [];
  const total = rows.reduce((s, r) => s + (r.shop_products?.price ?? 0) * r.quantity, 0);
  const currency = rows[0]?.shop_products?.currency ?? "AFN";

  return (
    <AppShell variant="site">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-bold">{t("cart.title")}</h1>

        {items.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
            <Link
              to="/shop"
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              {t("shop.continueShopping")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {rows.map((r) => {
                const p = r.shop_products;
                if (!p) return null;
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {p.image_urls?.[0] && (
                        <img src={p.image_urls[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(p.price, p.currency)}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={p.stock}
                      value={r.quantity}
                      onChange={(e) => updateQty(r.id, Math.min(p.stock, Number(e.target.value) || 1))}
                      className="w-16 rounded-lg border border-input bg-background px-2 py-1.5 text-center text-sm"
                    />
                    <button
                      onClick={() => remove(r.id)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t("cart.remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("cart.total")}
                </div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(total, currency)}</div>
              </div>
              <button
                onClick={() => navigate({ to: "/checkout" })}
                className="bg-gradient-brand rounded-2xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elevated"
              >
                {t("cart.checkout")}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
