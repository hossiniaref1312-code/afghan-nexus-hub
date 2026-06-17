import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ChevronLeft, X, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useT } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { AF_PROVINCES } from "@/lib/provinces";

export const Route = createFileRoute("/_authenticated/sell")({
  validateSearch: z.object({
    category: z.enum(["real_estate", "vehicles", "marketplace", "jobs", "services"]).optional(),
  }),
  head: () => ({ meta: [{ title: "Post a listing — AfghanMarket" }] }),
  component: SellPage,
});

function SellPage() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = useSearch({ from: "/_authenticated/sell" });

  const [category, setCategory] = useState(search.category ?? "marketplace");
  const [purpose, setPurpose] = useState<"sell" | "rent" | "buy" | "hire" | "offer">("sell");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [province, setProvince] = useState("");
  const [area, setArea] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 8));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      // Pull contact phone from profile
      const { data: profile } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle();

      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          category,
          purpose,
          title,
          description,
          price: price ? Number(price) : null,
          currency: "AFN",
          province: province || null,
          area_label: area || null,
          contact_phone: profile?.phone ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Upload images
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${listing.id}/${Date.now()}-${i}.${ext}`;
        const up = await supabase.storage.from("listing-images").upload(path, f, { upsert: false });
        if (up.error) {
          console.error(up.error);
          continue;
        }
        await supabase.from("listing_images").insert({
          listing_id: listing.id,
          url: path,
          position: i,
        });
      }

      toast.success(t("post.success"));
      navigate({ to: "/listing/$id", params: { id: listing.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell hideNav>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
        <button
          onClick={() => history.back()}
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <h1 className="text-base font-bold">{t("post.title")}</h1>
      </header>

      <form onSubmit={submit} className="space-y-5 px-5 pb-10 pt-5">
        <Field label={t("post.field.category")}>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs transition-all ${
                    active ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {t(`cat.${c.key}`)}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t("post.field.purpose")}>
          <div className="grid grid-cols-3 gap-2">
            {(["sell", "rent", "buy", "hire", "offer"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPurpose(p)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  purpose === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {t(`purpose.${p}`)}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("post.field.title")}>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        <Field label={t("post.field.description")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={4000}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("post.field.price")}>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>
          <Field label={t("post.field.province")}>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">—</option>
              {AF_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t("post.field.area")}>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        <Field label={t("post.field.images")}>
          <div className="grid grid-cols-4 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                <img src={URL.createObjectURL(f)} className="h-full w-full object-cover" alt="" />
                <button
                  type="button"
                  onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground shadow-card"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {files.length < 8 && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <Upload className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            )}
          </div>
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="bg-gradient-brand text-primary-foreground tap-highlight-none w-full rounded-2xl py-4 text-base font-semibold shadow-elevated disabled:opacity-50"
        >
          {submitting ? t("common.loading") : t("post.submit")}
        </button>
      </form>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
