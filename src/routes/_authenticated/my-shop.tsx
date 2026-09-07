import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Store, Package, ClipboardList, Plus, Trash2, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatCurrency, slugify } from "@/lib/currency";
import type { Tables } from "@/integrations/supabase/types";

type Shop = Tables<"shops">;
type Product = Tables<"shop_products">;
type ShopOrderItem = Pick<Tables<"shop_order_items">, "title" | "quantity" | "unit_price">;
type ShopOrder = Tables<"shop_orders"> & { shop_order_items: ShopOrderItem[] | null };

export const Route = createFileRoute("/_authenticated/my-shop")({
  head: () => ({ meta: [{ title: "My shop — AfghanMarket" }] }),
  component: MyShopPage,
});

type Tab = "setup" | "products" | "orders";

function MyShopPage() {
  const t = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("setup");

  const shopQ = useQuery({
    enabled: !!user,
    queryKey: ["my-shop", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (shopQ.data && tab === "setup") setTab("products");
  }, [shopQ.data]); // eslint-disable-line

  return (
    <AppShell variant="site">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-brand grid h-11 w-11 place-items-center rounded-xl text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("myShop.title")}</h1>
            {shopQ.data && (
              <Link
                to="/shop/$slug"
                params={{ slug: shopQ.data.slug }}
                className="text-xs text-primary hover:underline"
              >
                /shop/{shopQ.data.slug}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1">
          {[
            { k: "setup" as Tab, label: t("myShop.setup"), icon: Store },
            { k: "products" as Tab, label: t("myShop.products"), icon: Package },
            { k: "orders" as Tab, label: t("myShop.orders"), icon: ClipboardList },
          ].map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              disabled={k !== "setup" && !shopQ.data}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                tab === k ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "setup" && <ShopSetup shop={shopQ.data} onSaved={() => shopQ.refetch()} />}
          {tab === "products" && shopQ.data && <ProductsTab shopId={shopQ.data.id} />}
          {tab === "orders" && shopQ.data && <OrdersTab shopId={shopQ.data.id} />}
        </div>
      </div>
    </AppShell>
  );
}

/* ============ SETUP ============ */

function ShopSetup({ shop, onSaved }: { shop: Shop | null | undefined; onSaved: () => void }) {
  const t = useT();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: shop?.name ?? "",
    slug: shop?.slug ?? "",
    description: shop?.description ?? "",
    logo_url: shop?.logo_url ?? "",
    banner_url: shop?.banner_url ?? "",
    phone: "",
    province: shop?.province ?? "",
    city: shop?.city ?? "",
    address: "",
    is_active: shop?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  // Contact PII lives in the protected `shop_contacts` table (owner/admin only).
  const contactQ = useQuery({
    enabled: !!shop?.id,
    queryKey: ["my-shop-contact", shop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_contacts")
        .select("phone,address")
        .eq("shop_id", shop!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const c = contactQ.data;
    if (c) setForm((f) => ({ ...f, phone: c.phone ?? "", address: c.address ?? "" }));
  }, [contactQ.data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const slug = (form.slug || slugify(form.name)).toLowerCase();
      const { phone, address, ...publicFields } = form;
      const payload = { ...publicFields, slug, owner_id: user.id };
      let shopId = shop?.id;
      if (shop) {
        const { error } = await supabase.from("shops").update(payload).eq("id", shop.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("shops").insert(payload).select("id").single();
        if (error) throw error;
        shopId = data.id;
      }
      // Ownership is enforced by RLS on shop_contacts (shops.owner_id = auth.uid()).
      const { error: contactError } = await supabase.from("shop_contacts").upsert(
        {
          shop_id: shopId!,
          phone: phone.trim() || null,
          address: address.trim() || null,
        },
        { onConflict: "shop_id" },
      );
      if (contactError) throw contactError;
      toast.success(t("myShop.saved"));
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }


  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-card md:grid-cols-2"
    >
      <Field label={t("myShop.name")}>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("myShop.slug")}>
        <input
          value={form.slug}
          placeholder={slugify(form.name)}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("myShop.description")} className="md:col-span-2">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input min-h-24"
        />
      </Field>
      <Field label={t("myShop.logo")}>
        <input
          value={form.logo_url}
          onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("myShop.banner")}>
        <input
          value={form.banner_url}
          onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("auth.phone")}>
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("checkout.province")}>
        <input
          value={form.province}
          onChange={(e) => setForm({ ...form, province: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("checkout.city")}>
        <input
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("myShop.address")} className="md:col-span-2">
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="input"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
        />
        {t("myShop.active")}
      </label>
      <button
        type="submit"
        disabled={saving}
        className="bg-gradient-brand rounded-2xl py-3 text-sm font-semibold text-primary-foreground shadow-elevated disabled:opacity-50 md:col-span-2"
      >
        {saving ? t("common.loading") : t("myShop.save")}
      </button>

      <style>{`.input{width:100%;border:1px solid hsl(var(--input));background:hsl(var(--background));border-radius:0.75rem;padding:0.65rem 0.9rem;font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 2px hsl(var(--primary)/0.2)}`}</style>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

/* ============ PRODUCTS ============ */

function ProductsTab({ shopId }: { shopId: string }) {
  const t = useT();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const categories = useQuery({
    queryKey: ["my-shop-categories", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("id,name,sort_order")
        .eq("shop_id", shopId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["my-shop-products", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("myShop.productDeleted"));
    qc.invalidateQueries({ queryKey: ["my-shop-products", shopId] });
  }

  return (
    <div>
      <CategoriesManager
        shopId={shopId}
        categories={categories.data ?? []}
        onChange={() => categories.refetch()}
      />

      <div className="mb-4 mt-6 flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> {t("myShop.addProduct")}
        </button>
      </div>

      {(creating || editing) && (
        <ProductForm
          shopId={shopId}
          product={editing}
          categories={categories.data ?? []}
          onDone={() => {
            setCreating(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["my-shop-products", shopId] });
          }}
        />
      )}

      {products.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : !products.data || products.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("shop.noProducts")}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {products.data.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {p.image_urls?.[0] && (
                  <img src={p.image_urls[0]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(p.price, p.currency)} · {t("shop.stock")}: {p.stock} · {p.status}
                </div>
              </div>
              <button
                onClick={() => {
                  setCreating(false);
                  setEditing(p);
                }}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(p.id)}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Category = { id: string; name: string; sort_order: number };

function ProductForm({
  shopId,
  product,
  categories,
  onDone,
}: {
  shopId: string;
  product: Product | null;
  categories: Category[];
  onDone: () => void;
}) {
  const t = useT();
  const [form, setForm] = useState<{
    title: string;
    description: string;
    price: string | number;
    currency: string;
    stock: number;
    images: string;
    status: string;
    category_id: string;
  }>({
    title: product?.title ?? "",
    description: product?.description ?? "",
    price: product?.price ?? "",
    currency: product?.currency ?? "AFN",
    stock: product?.stock ?? 0,
    images: (product?.image_urls ?? []).join(", "),
    status: product?.status ?? "active",
    category_id: product?.category_id ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        shop_id: shopId,
        title: form.title,
        description: form.description || null,
        price: Number(form.price),
        currency: form.currency,
        stock: Number(form.stock),
        status: form.status as Product["status"],
        category_id: form.category_id || null,
        image_urls: form.images
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      };
      const { error } = product
        ? await supabase.from("shop_products").update(payload).eq("id", product.id)
        : await supabase.from("shop_products").insert(payload);
      if (error) throw error;
      toast.success(t("myShop.productSaved"));
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2"
    >
      <Field label={t("myShop.productTitle")} className="md:col-span-2">
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("post.field.description")} className="md:col-span-2">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input min-h-20"
        />
      </Field>
      <Field label={t("myShop.productPrice")}>
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("myShop.productStock")}>
        <input
          required
          type="number"
          min="0"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          className="input"
        />
      </Field>
      <Field label={t("myShop.productImages")} className="md:col-span-2">
        <input
          value={form.images}
          onChange={(e) => setForm({ ...form, images: e.target.value })}
          placeholder="https://..., https://..."
          className="input"
        />
      </Field>
      <Field label={t("myShop.productStatus")}>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="input"
        >
          <option value="active">active</option>
          <option value="out_of_stock">out_of_stock</option>
          <option value="hidden">hidden</option>
        </select>
      </Field>
      <Field label={t("myShop.productCategory")}>
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className="input"
        >
          <option value="">{t("myShop.noCategory")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-gradient-brand flex-1 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? t("common.loading") : t("common.save")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        >
          {t("common.cancel")}
        </button>
      </div>

      <style>{`.input{width:100%;border:1px solid hsl(var(--input));background:hsl(var(--background));border-radius:0.65rem;padding:0.55rem 0.8rem;font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </form>
  );
}

/* ============ ORDERS (seller) ============ */

const STATUSES = ["pending", "confirmed", "paid", "shipped", "delivered", "cancelled"] as const;

function OrdersTab({ shopId }: { shopId: string }) {
  const t = useT();
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ["shop-orders", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_orders")
        .select("*,shop_order_items(title,quantity,unit_price)")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("shop_orders")
      .update({ status: status as Tables<"shop_orders">["status"] })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["shop-orders", shopId] });
  }

  if (orders.isLoading)
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!orders.data || orders.data.length === 0)
    return <p className="text-sm text-muted-foreground">{t("orders.empty")}</p>;

  return (
    <ul className="space-y-3">
      {orders.data.map((o) => (
        <li key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{o.buyer_name}</div>
              <div className="text-xs text-muted-foreground">
                {o.buyer_phone} · {new Date(o.created_at).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {[o.ship_city, o.ship_province, o.ship_address].filter(Boolean).join(", ")}
              </div>
            </div>
            <select
              value={o.status}
              onChange={(e) => updateStatus(o.id, e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`orders.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {o.shop_order_items?.map((it, i: number) => (
              <li key={i} className="flex justify-between text-muted-foreground">
                <span>
                  {it.title} × {it.quantity}
                </span>
                <span>{formatCurrency(it.unit_price * it.quantity, o.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              {o.payment_method}
              {o.payment_reference ? ` · ${o.payment_reference}` : ""}
            </span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(o.total, o.currency)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============ CATEGORIES ============ */

function CategoriesManager({
  shopId,
  categories,
  onChange,
}: {
  shopId: string;
  categories: Category[];
  onChange: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("shop_categories")
      .insert({ shop_id: shopId, name: name.trim(), sort_order: categories.length });
    setBusy(false);
    if (error) return toast.error(error.message);
    setName("");
    toast.success(t("myShop.categorySaved"));
    onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("shop_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("myShop.categoryDeleted"));
    onChange();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">{t("myShop.categories")}</div>
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("myShop.categoryName")}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {t("myShop.addCategory")}
        </button>
      </form>
      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
            >
              {c.name}
              <button
                onClick={() => remove(c.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
