import { useT } from "@/lib/i18n/I18nProvider";
import { getSchema } from "@/lib/category-schemas";
import type { CategoryKey } from "@/lib/categories";

interface Props {
  category: CategoryKey;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/** Dynamic per-category attribute fields for the Sell form. */
export function CategoryAttributeFields({ category, value, onChange }: Props) {
  const t = useT();
  const schema = getSchema(category);
  if (schema.length === 0) return null;

  function set(k: string, v: string) {
    const next = { ...value };
    if (v) next[k] = v;
    else delete next[k];
    onChange(next);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {schema.map((f) => (
        <label key={f.key} className={f.type === "select" ? "col-span-2 block" : "block"}>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(`attr.${f.key}`)}
          </div>
          {f.type === "select" ? (
            <select
              value={value[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">—</option>
              {f.options?.map((o) => (
                <option key={o} value={o}>{t(`attr.${f.key}.${o}`)}</option>
              ))}
            </select>
          ) : (
            <input
              type={f.type === "number" ? "number" : "text"}
              min={f.min}
              max={f.max}
              value={value[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          )}
        </label>
      ))}
    </div>
  );
}
