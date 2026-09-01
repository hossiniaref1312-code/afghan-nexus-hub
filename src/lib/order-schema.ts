import { z } from "zod";

export const PAYMENT_METHOD_KEYS = [
  "cash",
  "mpaisa",
  "myMoney",
  "hesab_pay",
  "bank_transfer",
] as const;

/**
 * Client-safe checkout payload schema.
 *
 * NOTE (order integrity): the payload intentionally carries NO prices, totals,
 * currency, product ids or shop id. Those are derived server-side from the
 * user's cart inside the `place_order` database function, so a tampered client
 * cannot influence what is charged.
 */
export const placeOrderSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHOD_KEYS),
  buyerName: z.string().trim().min(2).max(120),
  buyerPhone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "INVALID_PHONE"),
  paymentReference: z.string().trim().max(80).optional().nullable(),
  province: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

/** Strips any unexpected fields (e.g. injected `total`/`price`) before validation. */
export function parsePlaceOrderInput(raw: unknown): PlaceOrderInput {
  return placeOrderSchema.parse(raw);
}
