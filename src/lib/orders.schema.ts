import { z } from "zod";

export const PAYMENT_METHOD_KEYS = [
  "cash",
  "bank_transfer",
  "mpaisa",
  "myMoney",
  "hesab_pay",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

export const createOrderInputSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHOD_KEYS),
  buyerName: z.string().trim().min(2).max(120),
  buyerPhone: z
    .string()
    .trim()
    .min(6)
    .max(24)
    .regex(/^[+0-9 ()-]+$/, "INVALID_PHONE"),
  paymentReference: optionalText(80),
  shipProvince: optionalText(80),
  shipCity: optionalText(80),
  shipAddress: optionalText(240),
  note: optionalText(1000),
});

export type CreateOrderInput = z.input<typeof createOrderInputSchema>;
export type CreateOrderData = z.output<typeof createOrderInputSchema>;
