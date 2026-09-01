import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Search, UserCog } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users — AfghanMarket" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const t = useT();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [q, setQ] = useState("");

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

  const profiles = useQuery({
    queryKey: ["admin-profiles", q],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, display_name, phone, province, city, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q.trim()) {
        query = query.or(
          `full_name.ilike.%${q}%,display_name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin === true,
  });

  const adminRoles = useQuery({
    queryKey: ["admin-role-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      return new Set((data ?? []).map((r) => r.user_id));
    },
    enabled: isAdmin === true,
  });

  async function toggleAdmin(userId: string, currentlyAdmin: boolean) {
    if (currentlyAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Removed admin role");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Granted admin role");
    }
    adminRoles.refetch();
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
        <UserCog className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.users")}</h1>
      </header>

      <div className="px-5 pt-4">
        <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4 shadow-card">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, city…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2 px-5 py-4">
        {profiles.isLoading && (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        )}
        {profiles.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </div>
        )}
        {profiles.data?.map((p) => {
          const isUserAdmin = adminRoles.data?.has(p.id) ?? false;
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {p.display_name || p.full_name || "—"}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {p.phone || "—"} · {p.province || "—"} · {p.city || "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                {isUserAdmin && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <ShieldCheck className="mr-1 inline h-3 w-3" />
                    admin
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleAdmin(p.id, isUserAdmin)}
                className={`mt-3 w-full rounded-xl border py-2 text-xs font-semibold ${
                  isUserAdmin
                    ? "border-destructive text-destructive"
                    : "border-primary text-primary"
                }`}
              >
                {isUserAdmin ? t("admin.removeAdmin") : t("admin.makeAdmin")}
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
