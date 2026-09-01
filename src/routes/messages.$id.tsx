import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { imageUrl } from "@/components/ListingCard";
import { useT } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({ meta: [{ title: "Chat — AfghanMarket" }] }),
  component: Thread,
});

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function Thread() {
  const t = useT();
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { redirect: `/messages/${id}` } });
    }
  }, [loading, user, id, navigate]);

  const conv = useQuery({
    queryKey: ["conversation", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id,buyer_id,seller_id,listing_id, listings(id,title,price,currency,listing_images(url,position)), buyer:profiles!conversations_buyer_id_fkey(id,display_name,avatar_url), seller:profiles!conversations_seller_id_fkey(id,display_name,avatar_url)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const msgs = useQuery({
    queryKey: ["messages", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,body,created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  // Realtime new messages
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`msgs-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          qc.setQueryData<Msg[]>(["messages", id], (prev) => {
            if (!prev) return [m];
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, user, qc]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.data?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      body,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setText(body);
    }
  }

  if (loading || conv.isLoading) {
    return (
      <AppShell hideNav>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
      </AppShell>
    );
  }
  if (!conv.data) {
    return (
      <AppShell hideNav>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</div>
      </AppShell>
    );
  }

  const c = conv.data as unknown as {
    id: string;
    buyer_id: string;
    seller_id: string;
    listing_id: string;
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
  const otherIsBuyer = c.seller_id === user?.id;
  const other = otherIsBuyer ? c.buyer : c.seller;
  const cover = c.listings?.listing_images?.slice().sort((a, b) => a.position - b.position)[0]?.url;

  return (
    <AppShell hideNav>
      <div className="flex h-screen flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
          <button
            onClick={() => history.back()}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground hover:bg-accent/60"
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{other?.display_name || "—"}</div>
            <Link
              to="/listing/$id"
              params={{ id: c.listing_id }}
              className="block truncate text-xs text-muted-foreground hover:text-primary"
            >
              {c.listings?.title}
            </Link>
          </div>
          <Link to="/listing/$id" params={{ id: c.listing_id }} className="shrink-0">
            <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
              {cover ? (
                <img src={imageUrl(cover)} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
          </Link>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-background px-4 py-4">
          {msgs.data?.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card text-foreground border border-border rounded-bl-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div
                    className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"} text-end`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {msgs.data && msgs.data.length === 0 && (
            <div className="pt-10 text-center text-xs text-muted-foreground">
              {t("chat.empty.body")}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={send}
          className="flex items-end gap-2 border-t border-border bg-card px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder={t("chat.placeholder")}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            maxLength={4000}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="bg-gradient-brand text-primary-foreground grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-elevated disabled:opacity-50"
            aria-label={t("chat.send")}
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
