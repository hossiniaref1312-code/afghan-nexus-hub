import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";

export interface ListingCardData {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  province: string | null;
  area_label: string | null;
  category: string;
  is_featured?: boolean | null;
  created_at: string;
  listing_images?: { url: string; position: number }[];
}

function formatPrice(price: number | null, currency: string, t: (k: string) => string) {
  if (price == null) return t("common.free");
  return `${new Intl.NumberFormat("en-US").format(price)} ${currency}`;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function imageUrl(path: string) {
  // Bucket is private — but read policy allows all. Use the public URL helper anyway;
  // it constructs the storage object URL which is then served per RLS read policy.
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const t = useT();
  const cover = listing.listing_images?.sort((a, b) => a.position - b.position)[0];
  const url = cover ? imageUrl(cover.url) : null;

  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="tap-highlight-none group block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full bg-muted">
        {url ? (
          <img
            src={url}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <ImageOff className="h-7 w-7" />
          </div>
        )}
        {listing.is_featured && (
          <span className="bg-saffron text-saffron-foreground absolute top-2 start-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-card">
            {t("listing.featured")}
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="line-clamp-1 text-sm font-semibold">{listing.title}</div>
        <div className="text-primary text-sm font-bold">
          {formatPrice(listing.price, listing.currency, t)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate">
            {listing.province ?? ""}
            {listing.area_label ? ` · ${listing.area_label}` : ""}
          </span>
          <span className="shrink-0">{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
