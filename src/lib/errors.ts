// Centralized error mapping.
// Raw database / provider errors must never reach the UI: they leak schema
// details and are unreadable. Every thrown error is normalized to a stable
// application code plus a safe, human-readable message.

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "EMPTY_CART"
  | "MULTIPLE_SHOPS"
  | "MIXED_CURRENCY"
  | "SHOP_UNAVAILABLE"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "INVALID_QUANTITY"
  | "INVALID_PAYMENT_METHOD"
  | "MISSING_BUYER_DETAILS"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "UNKNOWN";

const MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  VALIDATION: "Some of the information you entered is not valid.",
  EMPTY_CART: "Your cart is empty.",
  MULTIPLE_SHOPS: "Please order from one shop at a time.",
  MIXED_CURRENCY: "All items in an order must use the same currency.",
  SHOP_UNAVAILABLE: "This shop is currently unavailable.",
  PRODUCT_UNAVAILABLE: "One of the products is no longer available.",
  INSUFFICIENT_STOCK: "Not enough stock left for one of the products.",
  INVALID_QUANTITY: "One of the quantities is not valid.",
  INVALID_PAYMENT_METHOD: "Please choose a valid payment method.",
  MISSING_BUYER_DETAILS: "Please provide your name and phone number.",
  RATE_LIMITED: "Too many attempts. Please try again in a moment.",
  CONFLICT: "That action conflicts with the current state. Please refresh.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly detail: string | undefined;

  constructor(code: AppErrorCode, detail?: string) {
    super(`${code}${detail ? `:${detail}` : ""}`);
    this.name = "AppError";
    this.code = code;
    this.detail = detail;
  }

  get userMessage(): string {
    const base = MESSAGES[this.code];
    return this.detail ? `${base} (${this.detail})` : base;
  }

  toJSON() {
    return { code: this.code, detail: this.detail, message: this.userMessage };
  }
}

const CODE_PREFIXES: AppErrorCode[] = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION",
  "EMPTY_CART",
  "MULTIPLE_SHOPS",
  "MIXED_CURRENCY",
  "SHOP_UNAVAILABLE",
  "PRODUCT_UNAVAILABLE",
  "INSUFFICIENT_STOCK",
  "INVALID_QUANTITY",
  "INVALID_PAYMENT_METHOD",
  "MISSING_BUYER_DETAILS",
  "RATE_LIMITED",
  "CONFLICT",
];

function rawMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const o = error as { message?: unknown; code?: unknown };
    if (typeof o.message === "string") return o.message;
  }
  return "";
}

/** Normalizes anything thrown (Postgres, PostgREST, network, AppError) into an AppError. */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const msg = rawMessage(error);
  const pgCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  for (const code of CODE_PREFIXES) {
    if (msg.includes(code)) {
      const detail = msg.split(`${code}:`)[1]?.split("\n")[0]?.trim();
      return new AppError(code, detail || undefined);
    }
  }

  switch (pgCode) {
    case "23505":
      return new AppError("CONFLICT");
    case "23503":
    case "23514":
    case "22P02":
      return new AppError("VALIDATION");
    case "42501":
    case "PGRST301":
      return new AppError("FORBIDDEN");
    case "PGRST116":
      return new AppError("NOT_FOUND");
    default:
      break;
  }

  if (/unauthor/i.test(msg)) return new AppError("UNAUTHENTICATED");
  if (/permission denied|row-level security/i.test(msg)) return new AppError("FORBIDDEN");

  return new AppError("UNKNOWN");
}

/** Safe message for display in the UI. Never returns raw database text. */
export function toUserMessage(error: unknown): string {
  return normalizeError(error).userMessage;
}
