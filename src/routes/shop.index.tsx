import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "Shops — AfghanMarket" },
      { name: "description", content: "Browse trusted local shops across Afghanistan." },
    ],
  }),
  component: ShopsIndex,
});

function ShopsIndex() {
  const t = useT();
  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id,slug,name,description,logo_url,city,province")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell variant="site">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("shop.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !shops || shops.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
            <Store className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{t("shop.empty")}</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <Link
                key={s.id}
                to="/shop/$slug"
                params={{ slug: s.slug }}
                className="group rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="flex items-center gap-3">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="bg-gradient-brand grid h-12 w-12 place-items-center rounded-xl text-primary-foreground">
                      <Store className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[s.city, s.province].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>
                {s.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
