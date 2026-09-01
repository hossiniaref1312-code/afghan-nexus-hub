import { describe, it, expect } from "vitest";
import { parsePlaceOrderInput, placeOrderSchema } from "@/lib/order-schema";
import { toSafeOrderError, extractOrderErrorCode } from "@/lib/order-errors";

const base = {
  paymentMethod: "cash",
  buyerName: "Ahmad Jan",
  buyerPhone: "+93700000000",
};

describe("checkout payload validation", () => {
  it("accepts a minimal valid payload", () => {
    expect(parsePlaceOrderInput(base).buyerName).toBe("Ahmad Jan");
  });

  it("strips tampered price fields so the client cannot influence charges", () => {
    const parsed = parsePlaceOrderInput({ ...base, total: 1, unit_price: 1, currency: "USD" });
    expect(parsed).not.toHaveProperty("total");
    expect(parsed).not.toHaveProperty("unit_price");
    expect(parsed).not.toHaveProperty("currency");
    expect(Object.keys(parsed).sort()).toEqual(["buyerName", "buyerPhone", "paymentMethod"]);
  });

  it("rejects unknown payment methods", () => {
    expect(() => parsePlaceOrderInput({ ...base, paymentMethod: "free" })).toThrow();
  });

  it("rejects missing buyer details", () => {
    expect(() => parsePlaceOrderInput({ ...base, buyerName: "" })).toThrow();
    expect(() => parsePlaceOrderInput({ ...base, buyerPhone: "abc" })).toThrow();
  });

  it("has no price-bearing keys in the schema at all", () => {
    const keys = Object.keys(placeOrderSchema.shape);
    expect(keys.some((k) => /price|total|amount|currency|product|shop/i.test(k))).toBe(false);
  });
});

describe("safe error mapping", () => {
  it("never leaks raw database text to the UI", () => {
    const raw = new Error(
      'duplicate key value violates unique constraint "shop_order_items_pkey" DETAIL: ...',
    );
    const safe = toSafeOrderError(raw);
    expect(safe.code).toBe("UNKNOWN");
    expect(safe.message).toBe("Something went wrong. Please try again.");
    expect(safe.message).not.toMatch(/constraint|shop_order_items|DETAIL/i);
  });

  it("maps known RPC exceptions to friendly text", () => {
    expect(toSafeOrderError({ message: "EMPTY_CART" }).message).toBe("Your cart is empty.");
    expect(toSafeOrderError({ message: "MULTIPLE_SHOPS" }).code).toBe("MULTIPLE_SHOPS");
  });

  it("surfaces only the item title for stock failures", () => {
    const safe = toSafeOrderError({ message: 'INSUFFICIENT_STOCK:Rice 5kg\nCONTEXT: PL/pgSQL' });
    expect(safe.code).toBe("INSUFFICIENT_STOCK");
    expect(safe.message).toContain("Rice 5kg");
    expect(safe.message).not.toMatch(/PL\/pgSQL|CONTEXT/);
  });

  it("extracts codes from string errors", () => {
    expect(extractOrderErrorCode("SHOP_UNAVAILABLE")).toBe("SHOP_UNAVAILABLE");
    expect(extractOrderErrorCode(undefined)).toBe("UNKNOWN");
  });
});
