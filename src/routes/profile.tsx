import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, User as UserIcon, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LanguageThemeMenu } from "@/components/LanguageThemeMenu";
import { useT } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — AfghanMarket" }] }),
  component: Profile,
});

function Profile() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const myListings = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("listings")
        .select("id,title,price,currency,province,area_label,category,is_featured,created_at,listing_images(url,position)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.profile")}</h1>
        <LanguageThemeMenu />
      </header>

      {!user ? (
        <div className="px-5 pt-6">
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="bg-gradient-brand text-primary-foreground w-full rounded-2xl py-4 text-base font-semibold shadow-elevated"
          >
            {t("common.signin")}
          </button>
        </div>
      ) : (
        <div className="space-y-6 px-5 pt-6">
          <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-card">
            <div className="bg-gradient-brand grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground">
              <UserIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold">{profile.data?.display_name || profile.data?.full_name || user.email}</div>
              <div className="truncate text-xs text-muted-foreground">{profile.data?.phone ?? user.email}</div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("home.recent")}
            </h2>
            {myListings.data && myListings.data.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {myListings.data.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("common.noResults")}
              </div>
            )}
          </div>

          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-medium text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {t("common.signout")}
          </button>
          <MessageCircle className="hidden" />
        </div>
      )}
    </AppShell>
  );
}
