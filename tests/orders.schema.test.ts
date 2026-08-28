import { describe, expect, it } from "vitest";
import { createOrderInputSchema } from "@/lib/orders.schema";

const valid = {
  paymentMethod: "cash" as const,
  buyerName: "Ahmad Javid",
  buyerPhone: "+93 700 123 456",
};

describe("createOrder input validation", () => {
  it("accepts a minimal valid payload", () => {
    expect(createOrderInputSchema.parse(valid).buyerName).toBe("Ahmad Javid");
  });

  it("rejects unknown payment methods", () => {
    expect(() => createOrderInputSchema.parse({ ...valid, paymentMethod: "paypal" })).toThrow();
  });

  it("rejects missing buyer details", () => {
    expect(() => createOrderInputSchema.parse({ ...valid, buyerName: "" })).toThrow();
    expect(() => createOrderInputSchema.parse({ ...valid, buyerPhone: "abc" })).toThrow();
  });

  it("strips price-related fields — prices can never be client supplied", () => {
    const parsed = createOrderInputSchema.parse({
      ...valid,
      total: 1,
      unit_price: 1,
      items: [{ product_id: "x", unit_price: 0 }],
    } as unknown as Record<string, unknown>) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("total");
    expect(parsed).not.toHaveProperty("unit_price");
    expect(parsed).not.toHaveProperty("items");
  });

  it("normalizes empty optional fields to undefined", () => {
    const parsed = createOrderInputSchema.parse({ ...valid, note: "   ", shipCity: "" });
    expect(parsed.note).toBeUndefined();
    expect(parsed.shipCity).toBeUndefined();
  });
});
