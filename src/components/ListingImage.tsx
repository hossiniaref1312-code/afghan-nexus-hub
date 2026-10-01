import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listing photos live in a private bucket. A short-lived signed URL is issued
 * only when storage policy allows the caller to read the object (active
 * listing, owner, or admin), so photos of non-public listings never resolve.
 */
export function useListingImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["listing-image-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("listing-images")
        .createSignedUrl(path!, 3600);
      if (error) return null;
      return data.signedUrl;
    },
  });
}

export function ListingImage({
  path,
  alt,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const { data: url } = useListingImageUrl(path);
  if (!url) {
    return (
      <div className="grid h-full w-full place-items-center text-muted-foreground">
        <ImageOff className="h-7 w-7" />
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}
