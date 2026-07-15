import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Phone, Heart, Flag, MapPin, Clock, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { imageUrl } from "@/components/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/listing/$id")({
  head: () => ({ meta: [{ title: "Listing — AfghanMarket" }] }),
  component: ListingDetail,
});

function ListingDetail() {
  const t = useT();
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imgIdx, setImgIdx] = useState(0);

  const q = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, listing_images(url,position), profiles!listings_user_id_fkey(display_name,avatar_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const fav = useQuery({
    queryKey: ["fav", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("listing_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  async function toggleFavorite() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    if (fav.data) {
      await supabase.from("favorites").delete().eq("listing_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("favorites").insert({ listing_id: id, user_id: user.id });
    }
    fav.refetch();
  }

  async function reportListing() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    const reason = window.prompt("Reason for report?") || "";
    if (!reason) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      listing_id: id,
      reason,
    });
    if (error) toast.error(error.message);
    else toast.success("Report submitted.");
  }

  async function startChat() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    const listing = q.data;
    if (!listing) return;
    if (listing.user_id === user.id) {
      toast.info(t("chat.self"));
      return;
    }
    // Find existing conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", listing.user_id)
      .maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.user_id,
        })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      convId = created.id;
    }
    navigate({ to: "/messages/$id", params: { id: convId } });
  }


  if (q.isLoading) {
    return (
      <AppShell hideNav>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
      </AppShell>
    );
  }
  if (!q.data) {
    return (
      <AppShell hideNav>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</div>
      </AppShell>
    );
  }

  const l = q.data;
  const images = (l.listing_images as { url: string; position: number }[] | null)
    ?.slice()
    .sort((a, b) => a.position - b.position) ?? [];
  const cover = images[imgIdx]?.url;

  return (
    <AppShell hideNav>
      {/* Image header */}
      <div className="relative">
        <div className="aspect-square w-full bg-muted">
          {cover ? (
            <img src={imageUrl(cover)} alt={l.title} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <button
          onClick={() => history.back()}
          className="absolute top-3 start-3 grid h-10 w-10 place-items-center rounded-full bg-card/90 text-foreground shadow-card backdrop-blur"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <button
          onClick={toggleFavorite}
          className="absolute top-3 end-3 grid h-10 w-10 place-items-center rounded-full bg-card/90 text-foreground shadow-card backdrop-blur"
          aria-label={t("common.favorite")}
        >
          <Heart className={`h-5 w-5 ${fav.data ? "fill-destructive text-destructive" : ""}`} />
        </button>
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "bg-primary-foreground w-6" : "bg-primary-foreground/50 w-1.5"}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5 px-5 pt-5">
        <div>
          <div className="text-primary text-2xl font-bold">
            {l.price ? `${new Intl.NumberFormat("en-US").format(Number(l.price))} ${l.currency}` : t("common.free")}
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight">{l.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {l.province && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {l.province}{l.area_label ? ` · ${l.area_label}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(l.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {l.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{l.description}</p>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("listing.by")}</div>
          <div className="mt-1 font-semibold">
            {(l.profiles as { display_name?: string } | null)?.display_name || "—"}
          </div>
        </div>

        {l.contact_phone && (
          <a
            href={`tel:${l.contact_phone}`}
            className="bg-gradient-brand text-primary-foreground tap-highlight-none flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold shadow-elevated"
          >
            <Phone className="h-5 w-5" />
            {t("listing.contact")}
          </a>
        )}

        {l.user_id !== user?.id && (
          <button
            onClick={startChat}
            className="tap-highlight-none flex w-full items-center justify-center gap-2 rounded-2xl border border-primary bg-card py-4 text-base font-semibold text-primary shadow-card transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <MessageCircle className="h-5 w-5" />
            {t("chat.startWithSeller")}
          </button>
        )}

        <button
          onClick={reportListing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          <Flag className="h-4 w-4" />
          {t("listing.report")}
        </button>

        <Link to="/" className="block py-4 text-center text-xs text-muted-foreground underline">
          {t("nav.home")}
        </Link>
      </div>
    </AppShell>
  );
}
