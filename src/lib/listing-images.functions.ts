import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_IMAGE_BYTES } from "@/lib/image-validation";

const schema = z.object({
  listingId: z.string().uuid(),
  position: z.number().int().min(0).max(20),
  // base64 payload; ~4/3 of the byte size
  data: z.string().min(1).max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16),
});

export const uploadListingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => schema.parse(raw))
  .handler(async ({ data, context }) => {
    const bytes = new Uint8Array(Buffer.from(data.data, "base64"));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { uploadListingImageCore } = await import("@/lib/listing-images.server");
    return uploadListingImageCore(context.supabase, supabaseAdmin, context.userId, {
      listingId: data.listingId,
      bytes,
      position: data.position,
    });
  });
