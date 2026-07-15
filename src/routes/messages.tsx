import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LanguageThemeMenu } from "@/components/LanguageThemeMenu";
import { imageUrl } from "@/components/ListingCard";
import { useT } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — AfghanMarket" }] }),
  component: Messages,
});

type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listings: {
    id: string;
    title: string;
    price: number | null;
    currency: string | null;
    listing_images: { url: string; position: number }[] | null;
  } | null;
  buyer: { id: string; display_name: string | null; avatar_url: string | null } | null;
  seller: { id: string; display_name: string | null; avatar_url: string | null } | null;
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function Messages() {
  const t = useT();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/messages" } });
  }, [loading, user, navigate]);

  const q = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id,listing_id,buyer_id,seller_id,last_message_at, listings(id,title,price,currency,listing_images(url,position)), buyer:profiles!conversations_buyer_id_fkey(id,display_name,avatar_url), seller:profiles!conversations_seller_id_fkey(id,display_name,avatar_url)"
        )
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConversationRow[];
    },
  });

  // Realtime: refetch on new messages
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("conv-list-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => qc.invalidateQueries({ queryKey: ["conversations", user.id] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => qc.invalidateQueries({ queryKey: ["conversations", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("chat.title")}</h1>
        <LanguageThemeMenu />
      </header>
      <div className="px-5 pt-4">
        {loading || (user && q.isLoading) ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : q.data && q.data.length > 0 ? (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
            {q.data.map((c) => {
              const otherIsBuyer = c.seller_id === user?.id;
              const other = otherIsBuyer ? c.buyer : c.seller;
              const cover = c.listings?.listing_images?.slice().sort((a, b) => a.position - b.position)[0]?.url;
              return (
                <li key={c.id}>
                  <Link
                    to="/messages/$id"
                    params={{ id: c.id }}
                    className="tap-highlight-none flex items-center gap-3 p-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {cover ? (
                        <img src={imageUrl(cover)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <MessageCircle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-sm font-semibold">
                          {other?.display_name || "—"}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(c.last_message_at)}
                        </div>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.listings?.title ?? ""}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-base font-bold">{t("chat.empty.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("chat.empty.body")}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
