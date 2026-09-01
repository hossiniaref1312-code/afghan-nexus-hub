import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShieldCheck, Users, PackageSearch, Megaphone, Flag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — AfghanMarket" }] }),
  component: AdminHome,
});

function AdminHome() {
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

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, listings, pendingAds, openReports] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("ad_orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return {
        users: users.count ?? 0,
        listings: listings.count ?? 0,
        pendingAds: pendingAds.count ?? 0,
        openReports: openReports.count ?? 0,
      };
    },
    enabled: isAdmin === true,
  });

  if (isAdmin === false) {
    return (
      <AppShell>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.notAllowed")}</div>
      </AppShell>
    );
  }

  const tiles: {
    to: string;
    icon: typeof Users;
    label: string;
    value: number | undefined;
    accent?: boolean;
  }[] = [
    { to: "/admin/users", icon: Users, label: t("admin.users"), value: stats.data?.users },
    {
      to: "/admin/listings",
      icon: PackageSearch,
      label: t("admin.listings"),
      value: stats.data?.listings,
    },
    {
      to: "/admin/ads",
      icon: Megaphone,
      label: t("admin.ads"),
      value: stats.data?.pendingAds,
      accent: true,
    },
    {
      to: "/admin/reports",
      icon: Flag,
      label: t("admin.reports"),
      value: stats.data?.openReports,
      accent: true,
    },
  ];

  return (
    <AppShell>
      <header className="flex items-center gap-2 px-5 pt-6">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.dashboard")}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 px-5 pt-6">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="group rounded-3xl border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-0.5"
            >
              <div
                className={`grid h-12 w-12 place-items-center rounded-2xl ${
                  tile.accent ? "bg-saffron/15 text-saffron" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tile.label}
              </div>
              <div className="mt-1 text-2xl font-bold">{tile.value ?? "—"}</div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
