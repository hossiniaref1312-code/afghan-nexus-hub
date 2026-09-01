import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { LanguageThemeMenu } from "@/components/LanguageThemeMenu";
import { useT } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Saved — AfghanMarket" }] }),
  component: Favorites,
});

function Favorites() {
  const t = useT();
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("favorites")
        .select(
          "listings(id,title,price,currency,province,area_label,category,is_featured,created_at,listing_images(url,position))",
        )
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.listings).filter(Boolean) as Parameters<
        typeof ListingCard
      >[0]["listing"][];
    },
    enabled: !!user,
  });

  return (
    <AppShell>
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.favorites")}</h1>
        <LanguageThemeMenu />
      </header>
      <div className="px-5 pt-5">
        {!user ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("auth.subtitle")}
          </div>
        ) : q.isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : q.data && q.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {q.data.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{t("favorites.empty")}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
