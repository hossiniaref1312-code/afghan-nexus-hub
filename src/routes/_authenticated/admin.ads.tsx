import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/_authenticated/admin/ads")({
  head: () => ({ meta: [{ title: "Admin · Ads — AfghanMarket" }] }),
  component: AdminAdsPage,
});

function AdminAdsPage() {
  const t = useT();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const orders = useQuery({
    queryKey: ["admin-ad-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_orders")
        .select(
          "id,status,amount_afn,method,reference,payer_phone,admin_note,created_at,listing_id,user_id,listings(title),ad_packages(name,duration_days)"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin === true,
  });

  async function updateStatus(id: string, status: "active" | "rejected", note?: string) {
    const { error } = await supabase
      .from("ad_orders")
      .update({
        status,
        admin_note: note ?? null,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      orders.refetch();
    }
  }

  if (isAdmin === false) {
    return (
      <AppShell>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.notAllowed")}</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center gap-2 px-5 pt-6">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.ads")}</h1>
      </header>

      <div className="space-y-3 px-5 py-6">
        {orders.isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
        {orders.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("admin.empty")}
          </div>
        )}
        {orders.data?.map((o) => {
          const listing = o.listings as { title: string } | null;
          const pkg = o.ad_packages as { name: string; duration_days: number } | null;
          return (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{listing?.title ?? o.listing_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {pkg?.name} · {pkg?.duration_days} {t("promote.days")} ·{" "}
                    {new Intl.NumberFormat("en-US").format(o.amount_afn)} AFN
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Method</dt>
                  <dd className="font-medium">{o.method}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-mono">{o.reference || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Payer phone</dt>
                  <dd className="font-mono">{o.payer_phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd>{new Date(o.created_at).toLocaleString()}</dd>
                </div>
              </dl>
              {o.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => updateStatus(o.id, "active")}
                    className="bg-primary text-primary-foreground flex-1 rounded-xl py-2 text-sm font-semibold"
                  >
                    {t("admin.approve")}
                  </button>
                  <button
                    onClick={() => {
                      const note = window.prompt(t("admin.note")) || "";
                      updateStatus(o.id, "rejected", note);
                    }}
                    className="border-destructive text-destructive flex-1 rounded-xl border py-2 text-sm font-semibold"
                  >
                    {t("admin.reject")}
                  </button>
                </div>
              )}
              {o.admin_note && (
                <p className="mt-2 text-xs text-muted-foreground">Note: {o.admin_note}</p>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
