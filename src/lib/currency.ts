export function formatCurrency(amount: number | string, currency = "AFN"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!isFinite(n)) return `0 ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${currency}`;
  }
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `shop-${Math.random().toString(36).slice(2, 8)}`
  );
}
