/**
 * P0-4 security regression tests — protected contact PII boundary.
 *
 * These tests exercise the REAL Supabase authorization boundary: every
 * assertion below runs through anonymous or ordinary signed-in sessions with
 * the publishable key, under production RLS. The service-role key is used
 * strictly for fixture setup/teardown (creating confirmed throwaway accounts,
 * granting the admin role, deleting rows) and never inside the code path under
 * test. When it is unavailable the suite skips with a clear reason.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
const ADMIN_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const enabled = Boolean(URL && KEY && ADMIN_KEY);

const anonOpts = {
  auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
} as const;

let admin: SupabaseClient;
let anon: SupabaseClient;
let ownerClient: SupabaseClient;
let strangerClient: SupabaseClient;
let adminUserClient: SupabaseClient;

const created = { users: [] as string[], listingId: "", shopId: "" };

const OWNER_PHONE = "+93700111222";
const SHOP_PHONE = "+93700333444";
const SHOP_ADDRESS = "Private street 9, Kabul";

async function makeUser(prefix: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const email = `p04-${prefix}-${stamp}@afghanmarket-test.dev`;
  const password = `Test-${stamp}-Aa1!`;
  const res = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(res.error, res.error?.message).toBeNull();
  const id = res.data.user!.id;
  created.users.push(id);
  const client = createClient(URL, KEY, anonOpts);
  const signIn = await client.auth.signInWithPassword({ email, password });
  expect(signIn.error, signIn.error?.message).toBeNull();
  return { id, client };
}

describe.runIf(enabled)("P0-4 protected contact PII (real RLS)", () => {
  let ownerId = "";

  beforeAll(async () => {
    admin = createClient(URL, ADMIN_KEY, anonOpts);
    anon = createClient(URL, KEY, anonOpts);

    const owner = await makeUser("owner");
    ownerId = owner.id;
    ownerClient = owner.client;

    const stranger = await makeUser("stranger");
    strangerClient = stranger.client;

    const adminUser = await makeUser("admin");
    adminUserClient = adminUser.client;
    // Fixture only: grant the admin role out-of-band.
    const grant = await admin.from("user_roles").insert({ user_id: adminUser.id, role: "admin" });
    expect(grant.error, grant.error?.message).toBeNull();

    // Owner creates public listing + private contact through their own session.
    const listing = await ownerClient
      .from("listings")
      .insert({
        user_id: ownerId,
        category: "marketplace",
        purpose: "sell",
        status: "active",
        title: "P0-4 Test Listing",
        price: 100,
        currency: "AFN",
        province: "Kabul",
      })
      .select("id")
      .single();
    expect(listing.error, listing.error?.message).toBeNull();
    created.listingId = listing.data!["id"] as string;

    const lc = await ownerClient
      .from("listing_contacts")
      .insert({ listing_id: created.listingId, contact_phone: OWNER_PHONE });
    expect(lc.error, lc.error?.message).toBeNull();

    const shop = await ownerClient
      .from("shops")
      .insert({
        owner_id: ownerId,
        slug: `p04-${Date.now()}`,
        name: "P0-4 Test Shop",
        is_active: true,
      })
      .select("id")
      .single();
    expect(shop.error, shop.error?.message).toBeNull();
    created.shopId = shop.data!["id"] as string;

    const sc = await ownerClient
      .from("shop_contacts")
      .insert({ shop_id: created.shopId, phone: SHOP_PHONE, address: SHOP_ADDRESS });
    expect(sc.error, sc.error?.message).toBeNull();

    const product = await ownerClient.from("shop_products").insert({
      shop_id: created.shopId,
      title: "P0-4 Test Product",
      price: 50,
      currency: "AFN",
      stock: 5,
      status: "active",
      image_urls: [],
    });
    expect(product.error, product.error?.message).toBeNull();
  }, 90_000);

  afterAll(async () => {
    if (!admin) return;
    if (created.shopId) {
      await admin.from("shop_contacts").delete().eq("shop_id", created.shopId);
      await admin.from("shop_products").delete().eq("shop_id", created.shopId);
      await admin.from("shops").delete().eq("id", created.shopId);
    }
    if (created.listingId) {
      await admin.from("listing_contacts").delete().eq("listing_id", created.listingId);
      await admin.from("listings").delete().eq("id", created.listingId);
    }
    for (const id of created.users) {
      await admin.from("user_roles").delete().eq("user_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  }, 90_000);

  it("1. anonymous cannot read a listing contact", async () => {
    const { data } = await anon
      .from("listing_contacts")
      .select("contact_phone")
      .eq("listing_id", created.listingId);
    expect(data ?? []).toHaveLength(0);
  });

  it("2. authenticated non-owner cannot read a listing contact", async () => {
    const { data } = await strangerClient
      .from("listing_contacts")
      .select("contact_phone")
      .eq("listing_id", created.listingId);
    expect(data ?? []).toHaveLength(0);
  });

  it("3. listing owner can read their own listing contact", async () => {
    const { data, error } = await ownerClient
      .from("listing_contacts")
      .select("contact_phone")
      .eq("listing_id", created.listingId)
      .maybeSingle();
    expect(error, error?.message).toBeNull();
    expect(data?.["contact_phone"]).toBe(OWNER_PHONE);
  });

  it("4. admin can read a listing contact", async () => {
    const { data, error } = await adminUserClient
      .from("listing_contacts")
      .select("contact_phone")
      .eq("listing_id", created.listingId)
      .maybeSingle();
    expect(error, error?.message).toBeNull();
    expect(data?.["contact_phone"]).toBe(OWNER_PHONE);
  });

  it("5. anonymous cannot read a shop contact", async () => {
    const { data } = await anon
      .from("shop_contacts")
      .select("phone,address")
      .eq("shop_id", created.shopId);
    expect(data ?? []).toHaveLength(0);
  });

  it("6. authenticated non-owner cannot read a shop contact", async () => {
    const { data } = await strangerClient
      .from("shop_contacts")
      .select("phone,address")
      .eq("shop_id", created.shopId);
    expect(data ?? []).toHaveLength(0);
  });

  it("7. shop owner can read their own shop contact", async () => {
    const { data, error } = await ownerClient
      .from("shop_contacts")
      .select("phone,address")
      .eq("shop_id", created.shopId)
      .maybeSingle();
    expect(error, error?.message).toBeNull();
    expect(data?.["phone"]).toBe(SHOP_PHONE);
    expect(data?.["address"]).toBe(SHOP_ADDRESS);
  });

  it("8. admin can read a shop contact", async () => {
    const { data, error } = await adminUserClient
      .from("shop_contacts")
      .select("phone")
      .eq("shop_id", created.shopId)
      .maybeSingle();
    expect(error, error?.message).toBeNull();
    expect(data?.["phone"]).toBe(SHOP_PHONE);
  });

  it("9. non-owner cannot modify another user's listing contact", async () => {
    const res = await strangerClient
      .from("listing_contacts")
      .update({ contact_phone: "+93700999999" })
      .eq("listing_id", created.listingId)
      .select("contact_phone");
    expect(res.data ?? []).toHaveLength(0);
    const check = await ownerClient
      .from("listing_contacts")
      .select("contact_phone")
      .eq("listing_id", created.listingId)
      .maybeSingle();
    expect(check.data?.["contact_phone"]).toBe(OWNER_PHONE);
  });

  it("10. non-owner cannot modify another user's shop contact", async () => {
    const res = await strangerClient
      .from("shop_contacts")
      .update({ phone: "+93700888888" })
      .eq("shop_id", created.shopId)
      .select("phone");
    expect(res.data ?? []).toHaveLength(0);
    const check = await ownerClient
      .from("shop_contacts")
      .select("phone")
      .eq("shop_id", created.shopId)
      .maybeSingle();
    expect(check.data?.["phone"]).toBe(SHOP_PHONE);
  });

  it("11. anonymous can still browse active listings", async () => {
    const { data, error } = await anon
      .from("listings")
      .select("id,title,status")
      .eq("id", created.listingId);
    expect(error, error?.message).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });

  it("12. anonymous can still browse active shops and products", async () => {
    const shops = await anon.from("shops").select("id,name").eq("id", created.shopId);
    expect(shops.error, shops.error?.message).toBeNull();
    expect(shops.data ?? []).toHaveLength(1);

    const products = await anon
      .from("shop_products")
      .select("id,title,price")
      .eq("shop_id", created.shopId);
    expect(products.error, products.error?.message).toBeNull();
    expect((products.data ?? []).length).toBeGreaterThan(0);
  });

  it("13. public listing payload contains no private seller contact", async () => {
    const { data, error } = await anon
      .from("listings")
      .select("*")
      .eq("id", created.listingId)
      .maybeSingle();
    expect(error, error?.message).toBeNull();
    const keys = Object.keys(data ?? {});
    expect(keys).not.toContain("contact_phone");
    expect(keys).not.toContain("contact_email");
    expect(JSON.stringify(data)).not.toContain(OWNER_PHONE);
  });

  it("14. public shop payload contains no private shop contact", async () => {
    const { data, error } = await anon
      .from("shops")
      .select("*")
      .eq("id", created.shopId)
      .maybeSingle();
    expect(error, error?.message).toBeNull();
    const keys = Object.keys(data ?? {});
    expect(keys).not.toContain("phone");
    expect(keys).not.toContain("address");
    const json = JSON.stringify(data);
    expect(json).not.toContain(SHOP_PHONE);
    expect(json).not.toContain(SHOP_ADDRESS);
  });
});
