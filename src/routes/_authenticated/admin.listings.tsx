import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PackageSearch, Search, Trash2, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/_authenticated/admin/listings")({
  head: () => ({ meta: [{ title: "Admin · Listings — AfghanMarket" }] }),
  component: AdminListingsPage,
});

function AdminListingsPage() {
  const t = useT();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "removed">("all");

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

  const listings = useQuery({
    queryKey: ["admin-listings", q, status],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("id, title, price, currency, category, province, status, is_featured, featured_until, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") query = query.eq("status", status);
      if (q.trim()) query = query.ilike("title", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin === true,
  });

  async function removeListing(id: string) {
    if (!window.confirm("Remove this listing?")) return;
    const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing removed");
    listings.refetch();
  }

  async function toggleFeatured(id: string, current: boolean) {
    const patch = current
      ? { is_featured: false, featured_until: null }
      : {
          is_featured: true,
          featured_until: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        };
    const { error } = await supabase.from("listings").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(current ? "Unfeatured" : "Featured for 7 days");
    listings.refetch();
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
        <PackageSearch className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.listings")}</h1>
      </header>

      <div className="space-y-3 px-5 pt-4">
        <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-card">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "removed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                status === s ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 px-5 py-4">
        {listings.isLoading && (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        )}
        {listings.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </div>
        )}
        {listings.data?.map((l) => (
          <div key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  to="/listing/$id"
                  params={{ id: l.id }}
                  className="truncate font-semibold hover:underline"
                >
                  {l.title}
                </Link>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {l.category} · {l.province} · {new Intl.NumberFormat("en-US").format(l.price)}{" "}
                  {l.currency}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    l.status === "active"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {l.status}
                </span>
                {l.is_featured && (
                  <span className="rounded-full bg-saffron/10 px-2 py-0.5 text-[11px] font-semibold text-saffron">
                    ★ featured
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => toggleFeatured(l.id, l.is_featured)}
                className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold"
              >
                <Star className="mr-1 inline h-3 w-3" />
                {l.is_featured ? "Unfeature" : "Feature 7d"}
              </button>
              {l.status !== "removed" && (
                <button
                  onClick={() => removeListing(l.id)}
                  className="flex-1 rounded-xl border border-destructive py-2 text-xs font-semibold text-destructive"
                >
                  <Trash2 className="mr-1 inline h-3 w-3" />
                  {t("admin.remove")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
