import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_IMAGES_PER_LISTING, validateImageBytes } from "@/lib/image-validation";

export type UploadResult =
  | { ok: true; path: string }
  | {
      ok: false;
      code:
        | "EMPTY_FILE"
        | "FILE_TOO_LARGE"
        | "UNSUPPORTED_TYPE"
        | "NOT_LISTING_OWNER"
        | "TOO_MANY_IMAGES"
        | "UPLOAD_FAILED";
    };

/**
 * Trusted listing-image upload. `userClient` acts as the caller under RLS and
 * is used for the ownership check and the listing_images row; `adminClient` is
 * used only for the storage write after every check passed (direct client
 * INSERT on the bucket is not permitted by storage policy).
 */
export async function uploadListingImageCore(
  userClient: SupabaseClient,
  adminClient: SupabaseClient,
  userId: string,
  input: { listingId: string; bytes: Uint8Array; position: number },
): Promise<UploadResult> {
  const check = validateImageBytes(input.bytes);
  if (!check.ok) return { ok: false, code: check.code };

  const { data: listing } = await userClient
    .from("listings")
    .select("id,user_id")
    .eq("id", input.listingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!listing) return { ok: false, code: "NOT_LISTING_OWNER" };

  const { count } = await userClient
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", input.listingId);
  if ((count ?? 0) >= MAX_IMAGES_PER_LISTING) return { ok: false, code: "TOO_MANY_IMAGES" };

  const path = `${userId}/${input.listingId}/${crypto.randomUUID()}.${check.image.ext}`;
  const up = await adminClient.storage.from("listing-images").upload(path, input.bytes, {
    contentType: check.image.mime,
    upsert: false,
  });
  if (up.error) {
    console.error("[listing-image upload]", up.error.message);
    return { ok: false, code: "UPLOAD_FAILED" };
  }

  const row = await userClient
    .from("listing_images")
    .insert({ listing_id: input.listingId, url: path, position: input.position });
  if (row.error) {
    await adminClient.storage.from("listing-images").remove([path]);
    return { ok: false, code: "UPLOAD_FAILED" };
  }
  return { ok: true, path };
}
