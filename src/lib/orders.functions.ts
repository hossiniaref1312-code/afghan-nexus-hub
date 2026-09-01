import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePlaceOrderInput } from "@/lib/order-schema";
import { toSafeOrderError } from "@/lib/order-errors";

/**
 * Trusted write path for checkout.
 *
 * All pricing, stock checks and cart clearing happen atomically inside the
 * `place_order` SECURITY DEFINER function. The client cannot supply prices.
 */
export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    try {
      return parsePlaceOrderInput(raw);
    } catch {
      throw new Error("INVALID_INPUT");
    }
  })
  .handler(async ({ data, context }) => {
    const { data: orderId, error } = await context.supabase.rpc("place_order", {
      _payment_method: data.paymentMethod,
      _buyer_name: data.buyerName,
      _buyer_phone: data.buyerPhone,
      _payment_reference: data.paymentReference ?? undefined,
      _ship_province: data.province ?? undefined,
      _ship_city: data.city ?? undefined,
      _ship_address: data.address ?? undefined,
      _note: data.note ?? undefined,
    });

    if (error) {
      // Log full detail server-side only.
      console.error("[place_order]", error.message);
      const safe = toSafeOrderError(error);
      return { ok: false as const, code: safe.code, message: safe.message };
    }

    return { ok: true as const, orderId: orderId as string };
  });
