import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flag, CheckCircle2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Admin · Reports — AfghanMarket" }] }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const t = useT();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

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

  const reports = useQuery({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select("id, listing_id, reporter_id, reason, details, status, created_at, listings(title)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin === true,
  });

  async function resolve(id: string) {
    const { error } = await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked resolved");
    reports.refetch();
  }

  async function removeListing(listingId: string, reportId: string) {
    if (!window.confirm("Remove reported listing?")) return;
    const { error } = await supabase.from("listings").update({ status: "rejected" }).eq("id", listingId);
    if (error) return toast.error(error.message);
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    toast.success("Listing removed and report resolved");
    reports.refetch();
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
        <Flag className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.reports")}</h1>
      </header>

      <div className="flex gap-2 px-5 pt-4">
        {(["open", "resolved", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
              filter === s ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2 px-5 py-4">
        {reports.isLoading && (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        )}
        {reports.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </div>
        )}
        {reports.data?.map((r) => {
          const listing = r.listings as { title: string } | null;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to="/listing/$id"
                    params={{ id: r.listing_id ?? "" }}
                    className="truncate font-semibold hover:underline"
                  >
                    {listing?.title ?? r.listing_id}
                  </Link>
                  <div className="mt-1 text-xs font-medium text-destructive">{r.reason}</div>
                  {r.details && (
                    <p className="mt-1 text-xs text-muted-foreground">{r.details}</p>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    r.status === "open"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              {r.status === "open" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => resolve(r.id)}
                    className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold"
                  >
                    <CheckCircle2 className="mr-1 inline h-3 w-3" />
                    {t("admin.resolve")}
                  </button>
                  <button
                    onClick={() => r.listing_id && removeListing(r.listing_id, r.id)}
                    className="flex-1 rounded-xl border border-destructive py-2 text-xs font-semibold text-destructive"
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" />
                    {t("admin.remove")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
