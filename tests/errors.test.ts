import { describe, expect, it } from "vitest";
import { AppError, normalizeError, toUserMessage } from "@/lib/errors";

describe("error mapping", () => {
  it("keeps AppError instances intact", () => {
    const e = new AppError("EMPTY_CART");
    expect(normalizeError(e)).toBe(e);
  });

  it("extracts business codes raised by the database", () => {
    const err = normalizeError(
      new Error('insufficient: INSUFFICIENT_STOCK:Basmati Rice 5kg\nCONTEXT: PL/pgSQL function'),
    );
    expect(err.code).toBe("INSUFFICIENT_STOCK");
    expect(err.detail).toBe("Basmati Rice 5kg");
  });

  it("maps postgres SQLSTATE codes to safe categories", () => {
    expect(normalizeError({ code: "23505", message: "duplicate key" }).code).toBe("CONFLICT");
    expect(normalizeError({ code: "23514", message: "check constraint" }).code).toBe("VALIDATION");
    expect(normalizeError({ code: "42501", message: "permission denied" }).code).toBe("FORBIDDEN");
    expect(normalizeError({ code: "PGRST116", message: "no rows" }).code).toBe("NOT_FOUND");
  });

  it("maps RLS denials to FORBIDDEN", () => {
    expect(
      normalizeError(new Error('new row violates row-level security policy for table "shop_orders"'))
        .code,
    ).toBe("FORBIDDEN");
  });

  it("never leaks raw database text to the user", () => {
    const raw =
      'null value in column "unit_price" of relation "shop_order_items" violates not-null constraint';
    const msg = toUserMessage({ code: "23502", message: raw });
    expect(msg).not.toContain("relation");
    expect(msg).not.toContain("shop_order_items");
    expect(msg).not.toContain("constraint");
    expect(msg).toBe("Something went wrong. Please try again.");
  });

  it("produces a message for every known code", () => {
    const codes = [
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "VALIDATION",
      "EMPTY_CART",
      "INSUFFICIENT_STOCK",
      "UNKNOWN",
    ] as const;
    for (const c of codes) {
      expect(new AppError(c).userMessage.length).toBeGreaterThan(5);
    }
  });
});
