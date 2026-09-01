/**
 * Maps raw database / RPC errors to safe, user-facing messages.
 * Raw Postgres messages (constraint names, SQL text, table names) must never
 * reach the UI.
 */

export type SafeError = { code: string; message: string };

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Please sign in to place an order.",
  INVALID_PAYMENT_METHOD: "That payment method is not supported.",
  MISSING_BUYER_DETAILS: "Please enter your name and phone number.",
  EMPTY_CART: "Your cart is empty.",
  MULTIPLE_SHOPS: "You can only order from one shop at a time.",
  SHOP_UNAVAILABLE: "This shop is currently unavailable.",
  INVALID_QUANTITY: "One of the quantities in your cart is invalid.",
  MIXED_CURRENCY: "All items in an order must use the same currency.",
  PRODUCT_UNAVAILABLE: "An item in your cart is no longer available.",
  INSUFFICIENT_STOCK: "An item in your cart is out of stock.",
  INVALID_INPUT: "Please check the form and try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};

const KNOWN_CODES = Object.keys(MESSAGES);

/** Extracts a known error code from an arbitrary error/message shape. */
export function extractOrderErrorCode(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";
  const found = KNOWN_CODES.find((code) => code !== "UNKNOWN" && raw.includes(code));
  return found ?? "UNKNOWN";
}

/** Returns a safe {code, message} pair, never leaking raw database text. */
export function toSafeOrderError(err: unknown): SafeError {
  const code = extractOrderErrorCode(err);
  const detail = detailFor(code, err);
  const base = MESSAGES[code] ?? MESSAGES["UNKNOWN"]!;
  return { code, message: detail ? `${base} (${detail})` : base };
}

/** Item title suffix for `CODE:title` style RPC exceptions. */
function detailFor(code: string, err: unknown): string | undefined {
  if (code !== "PRODUCT_UNAVAILABLE" && code !== "INSUFFICIENT_STOCK") return undefined;
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";
  const match = raw.match(new RegExp(`${code}:([^\\n"]*)`));
  const title = match?.[1]?.trim();
  return title ? title.slice(0, 60) : undefined;
}
