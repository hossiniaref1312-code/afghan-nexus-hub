import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(p)) acc.push(p);
  }
  return acc;
}

const files = walk("src").filter((f) => !f.endsWith(".test.ts"));
const sources = files.map((f) => ({ f, src: readFileSync(f, "utf8") }));

describe("trusted write path boundaries", () => {
  it("no browser code inserts orders or order items directly", () => {
    const offenders = sources
      .filter(({ f }) => !f.includes(".functions.") && !f.includes(".server."))
      .filter(({ src }) =>
        /from\(\s*["'](shop_orders|shop_order_items)["']\s*\)[\s\S]{0,120}?\.insert\(/.test(src),
      )
      .map(({ f }) => f);
    expect(offenders).toEqual([]);
  });

  it("checkout goes through the createOrder server function", () => {
    const checkout = readFileSync("src/routes/_authenticated/checkout.tsx", "utf8");
    expect(checkout).toContain("createOrder");
    expect(checkout).toContain("useServerFn");
  });

  it("every server function file guards privileged handlers with auth middleware", () => {
    const fnFiles = sources.filter(({ f }) => f.endsWith(".functions.ts"));
    expect(fnFiles.length).toBeGreaterThan(0);
    for (const { f, src } of fnFiles) {
      expect(src, `${f} must use requireSupabaseAuth`).toContain("requireSupabaseAuth");
      expect(src, `${f} must not import the admin client at module scope`).not.toMatch(
        /^import[\s\S]*client\.server/m,
      );
    }
  });

  it("no UI surface prints raw error objects instead of mapped messages", () => {
    const offenders = sources
      .filter(({ f }) => f.startsWith("src/routes") || f.startsWith("src/components"))
      .filter(({ src }) => /toast\.error\(\s*\(?\s*(err|error)[^)]*\)?\s*\.message/.test(src))
      .map(({ f }) => f);
    expect(offenders).toEqual([]);
  });
});
