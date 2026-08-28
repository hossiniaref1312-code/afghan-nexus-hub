import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, normalizeError } from "@/lib/errors";
import { createOrderInputSchema, type CreateOrderInput } from "@/lib/orders.schema";

/**
 * Trusted checkout. The client sends only shipping/contact data — never prices,
 * quantities or product ids. Line prices, totals and stock reservation are
 * computed inside the `place_order` database routine from the buyer's own cart.
 */
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateOrderInput) => createOrderInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: orderId, error } = await supabase.rpc("place_order", {
      _payment_method: data.paymentMethod,
      _buyer_name: data.buyerName,
      _buyer_phone: data.buyerPhone,
      _payment_reference: data.paymentReference ?? undefined,
      _ship_province: data.shipProvince ?? undefined,
      _ship_city: data.shipCity ?? undefined,
      _ship_address: data.shipAddress ?? undefined,
      _note: data.note ?? undefined,
    });

    if (error) {
      const normalized = normalizeError(error);
      console.error("[createOrder]", error);
      throw new AppError(normalized.code, normalized.detail);
    }

    if (!orderId) throw new AppError("UNKNOWN");

    return { orderId: orderId as string };
  });
