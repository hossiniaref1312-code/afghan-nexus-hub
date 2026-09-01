import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { AF_PROVINCES } from "@/lib/provinces";
import { useT } from "@/lib/i18n/I18nProvider";
import { getSchema } from "@/lib/category-schemas";
import type { CategoryKey } from "@/lib/categories";

export type SortKey = "newest" | "priceAsc" | "priceDesc";
export type PurposeKey = "sell" | "rent" | "buy" | "hire" | "offer";

export interface FiltersState {
  q?: string;
  purpose?: PurposeKey;
  province?: string;
  priceMin?: number;
  priceMax?: number;
  sort: SortKey;
  attrs: Record<string, string>;
}

export const DEFAULT_FILTERS: FiltersState = { sort: "newest", attrs: {} };

const PURPOSES_BY_CAT: Record<CategoryKey, PurposeKey[]> = {
  real_estate: ["sell", "rent", "buy"],
  vehicles: ["sell", "rent", "buy"],
  marketplace: ["sell", "buy"],
  jobs: ["hire", "offer"],
  services: ["offer"],
};

interface Props {
  category: CategoryKey;
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  resultsCount?: number;
}

export function CategoryFilters({ category, value, onChange, resultsCount }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const schema = getSchema(category).filter((f) => f.filterable);
  const purposes = PURPOSES_BY_CAT[category] ?? [];

  const activeCount =
    (value.purpose ? 1 : 0) +
    (value.province ? 1 : 0) +
    (value.priceMin != null ? 1 : 0) +
    (value.priceMax != null ? 1 : 0) +
    Object.values(value.attrs).filter(Boolean).length;

  function patch(p: Partial<FiltersState>) {
    onChange({ ...value, ...p });
  }
  function patchAttr(k: string, v: string) {
    const next = { ...value.attrs };
    if (v) next[k] = v;
    else delete next[k];
    onChange({ ...value, attrs: next });
  }

  return (
    <>
      <div className="flex items-center gap-2 px-5 pt-4">
        <div className="relative flex-1">
          <input
            value={value.q ?? ""}
            onChange={(e) => patch({ q: e.target.value || undefined })}
            placeholder={t("filters.search")}
            className="w-full rounded-2xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap-highlight-none relative inline-flex h-11 items-center gap-1.5 rounded-2xl border border-border bg-card px-3 text-sm font-medium"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("filters.open")}
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
        <select
          value={value.sort}
          onChange={(e) => patch({ sort: e.target.value as SortKey })}
          className="h-11 rounded-2xl border border-input bg-card px-3 text-sm outline-none"
          aria-label={t("filters.sort")}
        >
          <option value="newest">{t("filters.sort.newest")}</option>
          <option value="priceAsc">{t("filters.sort.priceAsc")}</option>
          <option value="priceDesc">{t("filters.sort.priceDesc")}</option>
        </select>
      </div>

      {resultsCount != null && (
        <div className="px-5 pt-2 text-xs text-muted-foreground">
          {resultsCount} · {t(`cat.${category}`)}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-5 shadow-elevated sm:rounded-3xl max-h-[90vh]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("filters.title")}</h2>
              <button
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {purposes.length > 0 && (
                <FilterBlock label={t("filters.purpose")}>
                  <PillGroup
                    options={[
                      { v: "", l: t("filters.any") },
                      ...purposes.map((p) => ({ v: p, l: t(`purpose.${p}`) })),
                    ]}
                    value={value.purpose ?? ""}
                    onChange={(v) => patch({ purpose: (v || undefined) as PurposeKey | undefined })}
                  />
                </FilterBlock>
              )}

              <FilterBlock label={t("filters.province")}>
                <select
                  value={value.province ?? ""}
                  onChange={(e) => patch({ province: e.target.value || undefined })}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">{t("filters.any")}</option>
                  {AF_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </FilterBlock>

              <div className="grid grid-cols-2 gap-3">
                <FilterBlock label={t("filters.priceMin")}>
                  <input
                    type="number"
                    min={0}
                    value={value.priceMin ?? ""}
                    onChange={(e) =>
                      patch({ priceMin: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
                  />
                </FilterBlock>
                <FilterBlock label={t("filters.priceMax")}>
                  <input
                    type="number"
                    min={0}
                    value={value.priceMax ?? ""}
                    onChange={(e) =>
                      patch({ priceMax: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
                  />
                </FilterBlock>
              </div>

              {schema.map((f) => (
                <FilterBlock key={f.key} label={t(`attr.${f.key}`)}>
                  {f.type === "select" ? (
                    <PillGroup
                      options={[
                        { v: "", l: t("filters.any") },
                        ...(f.options ?? []).map((o) => ({ v: o, l: t(`attr.${f.key}.${o}`) })),
                      ]}
                      value={value.attrs[f.key] ?? ""}
                      onChange={(v) => patchAttr(f.key, v)}
                    />
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={value.attrs[f.key] ?? ""}
                      onChange={(e) => patchAttr(f.key, e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
                    />
                  )}
                </FilterBlock>
              ))}
            </div>

            <div className="sticky bottom-0 mt-6 flex gap-2 bg-background pt-3">
              <button
                type="button"
                onClick={() => onChange({ sort: value.sort, attrs: {} })}
                className="flex-1 rounded-2xl border border-border py-3 text-sm font-medium"
              >
                {t("filters.reset")}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-gradient-brand text-primary-foreground flex-[2] rounded-2xl py-3 text-sm font-semibold shadow-elevated"
              >
                {t("filters.apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v || "_any"}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
