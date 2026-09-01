import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/currency";
import type { Tables } from "@/integrations/supabase/types";

type OrderItem = Pick<Tables<"shop_order_items">, "title" | "quantity" | "unit_price">;
type BuyerOrder = Tables<"shop_orders"> & {
  shops: { name: string } | null;
  shop_order_items: OrderItem[] | null;
};

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My orders — AfghanMarket" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const t = useT();
  const { user } = useAuth();

  const orders = useQuery({
    enabled: !!user,
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_orders")
        .select(
          "id,total,currency,status,payment_method,created_at,shop_id,shops(name,slug),shop_order_items(title,quantity,unit_price)",
        )
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell variant="site">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-bold">{t("orders.title")}</h1>

        {orders.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !orders.data || orders.data.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">{t("orders.empty")}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.data.map((o) => (
              <li key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{o.shops?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                    {t(`orders.status.${o.status}`)}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {o.shop_order_items?.map((it, i: number) => (
                    <li key={i} className="flex justify-between text-muted-foreground">
                      <span className="truncate">
                        {it.title} × {it.quantity}
                      </span>
                      <span>{formatCurrency(it.unit_price * it.quantity, o.currency)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">{o.payment_method}</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(o.total, o.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
