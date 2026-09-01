import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";
import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/payment-methods";

export const Route = createFileRoute("/_authenticated/promote/$id")({
  head: () => ({ meta: [{ title: "Boost listing — AfghanMarket" }] }),
  component: PromotePage,
});

function PromotePage() {
  const t = useT();
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethodKey>("mpaisa");
  const [reference, setReference] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const listing = useQuery({
    queryKey: ["promote-listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,user_id,is_featured,featured_until")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pkgs = useQuery({
    queryKey: ["ad-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_packages")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const myOrders = useQuery({
    queryKey: ["my-ad-orders", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("ad_orders")
        .select("id,status,amount_afn,method,reference,created_at,expires_at")
        .eq("listing_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const selectedMethod = PAYMENT_METHODS.find((m) => m.key === method)!;
  const selectedPkg = pkgs.data?.find((p) => p.id === pkgId) ?? null;
  const isOwner = listing.data && user && listing.data.user_id === user.id;

  async function submitOrder() {
    if (!user || !selectedPkg || !listing.data) return;
    if (!reference.trim()) {
      toast.error(t("promote.reference"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("ad_orders").insert({
      user_id: user.id,
      listing_id: listing.data.id,
      package_id: selectedPkg.id,
      amount_afn: selectedPkg.price_afn,
      method,
      reference: reference.trim(),
      payer_phone: payerPhone.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("promote.pending"));
    setReference("");
    setPayerPhone("");
    setPkgId(null);
    myOrders.refetch();
  }

  if (listing.isLoading) {
    return (
      <AppShell hideNav>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
      </AppShell>
    );
  }
  if (!listing.data) {
    return (
      <AppShell hideNav>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</div>
      </AppShell>
    );
  }
  if (!isOwner) {
    return (
      <AppShell hideNav>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.notAllowed")}</div>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <header className="flex items-center gap-3 px-5 pt-6">
        <button
          onClick={() => navigate({ to: "/listing/$id", params: { id } })}
          className="grid h-9 w-9 place-items-center rounded-full border border-border"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("promote.title")}</h1>
          <p className="text-xs text-muted-foreground">{listing.data.title}</p>
        </div>
      </header>

      <div className="space-y-6 px-5 pb-10 pt-6">
        <p className="text-sm text-muted-foreground">{t("promote.subtitle")}</p>

        {/* Packages */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("promote.pickPackage")}
          </h2>
          <div className="space-y-2">
            {pkgs.data?.map((p) => {
              const active = pkgId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPkgId(p.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-start transition-colors ${
                    active ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.duration_days} {t("promote.days")} · {p.tier}
                    </div>
                    {p.description && (
                      <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
                    )}
                  </div>
                  <div className="text-end">
                    <div className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat("en-US").format(p.price_afn)}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground">AFN</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Payment method */}
        {selectedPkg && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("promote.pickMethod")}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
                    method === m.key ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <span className="font-medium">{m.name}</span>
                  {method === m.key && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("promote.sendTo")}
              </div>
              <div className="mt-1 font-mono text-base font-semibold">{selectedMethod.account}</div>
              <p className="mt-2 text-xs text-muted-foreground">{selectedMethod.instructions}</p>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("promote.reference")}
              </span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="TX123456789"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {t("promote.reference.help")}
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("promote.payerPhone")}
              </span>
              <input
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="07XX XXX XXX"
              />
            </label>

            <button
              onClick={submitOrder}
              disabled={submitting || !reference.trim()}
              className="bg-gradient-brand text-primary-foreground disabled:opacity-60 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold shadow-elevated"
            >
              {submitting ? t("common.loading") : t("promote.submit")}
            </button>
          </section>
        )}

        {/* My orders */}
        {(myOrders.data?.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("promote.myOrders")}
            </h2>
            <div className="space-y-2">
              {myOrders.data!.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {new Intl.NumberFormat("en-US").format(o.amount_afn)} AFN
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {o.method} · {new Date(o.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      o.status === "active"
                        ? "bg-primary/10 text-primary"
                        : o.status === "pending"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : o.status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t(`promote.status.${o.status}` as never)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <Link
          to="/listing/$id"
          params={{ id }}
          className="block py-2 text-center text-xs text-muted-foreground underline"
        >
          {t("common.back")}
        </Link>
      </div>
    </AppShell>
  );
}
