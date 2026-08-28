import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/currency";
import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/payment-methods";
import { AF_PROVINCES } from "@/lib/provinces";
import { createOrder } from "@/lib/orders.functions";
import { toUserMessage } from "@/lib/errors";


export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Checkout — AfghanMarket" }] }),
  component: CheckoutPage,
});

interface CartRow {
  id: string;
  quantity: number;
  shop_products: {
    id: string;
    title: string;
    price: number;
    currency: string;
    shop_id: string;
  } | null;
}

function CheckoutPage() {
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<PaymentMethodKey>("cash");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const items = useQuery({
    enabled: !!user,
    queryKey: ["checkout-cart", user?.id],
    queryFn: async () => {
      const { data: cart } = await supabase
        .from("shop_carts")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!cart) return [] as CartRow[];
      const { data, error } = await supabase
        .from("shop_cart_items")
        .select("id,quantity,shop_products(id,title,price,currency,shop_id)")
        .eq("cart_id", cart.id);
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });

  const rows = items.data ?? [];
  const total = rows.reduce((s, r) => s + (r.shop_products?.price ?? 0) * r.quantity, 0);
  const currency = rows[0]?.shop_products?.currency ?? "AFN";
  const shopId = rows[0]?.shop_products?.shop_id;

  const submitOrder = useServerFn(createOrder);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!user || rows.length === 0) return;
    setSubmitting(true);
    try {
      // Prices, totals and stock reservation are computed server-side from the
      // buyer's cart — nothing price-related is sent from the browser.
      await submitOrder({
        data: {
          paymentMethod: method,
          buyerName,
          buyerPhone,
          paymentReference: reference,
          shipProvince: province,
          shipCity: city,
          shipAddress: address,
          note,
        },
      });

      await items.refetch();
      toast.success(t("checkout.placed"));
      navigate({ to: "/orders" });
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  }



  if (!items.isLoading && rows.length === 0) {
    return (
      <AppShell variant="site">
        <div className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">
          {t("cart.empty")}
        </div>
      </AppShell>
    );
  }

  const selectedMethod = PAYMENT_METHODS.find((m) => m.key === method);

  return (
    <AppShell variant="site">
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>

        <form onSubmit={placeOrder} className="mt-6 space-y-4">
          <Field label={t("checkout.buyerName")}>
            <input
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label={t("checkout.buyerPhone")}>
            <input
              required
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("checkout.province")}>
              <select value={province} onChange={(e) => setProvince(e.target.value)} className="input">
                <option value="">—</option>
                {AF_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label={t("checkout.city")}>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="input" />
            </Field>
          </div>
          <Field label={t("checkout.address")}>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
          </Field>
          <Field label={t("checkout.note")}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input min-h-20"
            />
          </Field>

          <Field label={t("checkout.method")}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    method === m.key
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="font-medium">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">{m.instructions}</div>
                </button>
              ))}
            </div>
          </Field>

          {selectedMethod && selectedMethod.key !== "cash" && (
            <Field label={t("checkout.reference")}>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TX123456789"
                className="input"
              />
            </Field>
          )}

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("cart.total")}</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(total, currency)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-brand w-full rounded-2xl py-3.5 text-sm font-semibold text-primary-foreground shadow-elevated disabled:opacity-50"
          >
            {submitting ? t("common.loading") : t("checkout.placeOrder")}
          </button>
        </form>

        <style>{`.input{width:100%;border:1px solid hsl(var(--input));background:hsl(var(--card));border-radius:0.75rem;padding:0.75rem 1rem;font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 2px hsl(var(--primary)/0.2)}`}</style>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}
