/**
 * P0-5 security regression tests — database authorization hardening.
 *
 * Every assertion runs against the REAL database through anonymous or ordinary
 * signed-in sessions using the publishable key, under production RLS and the
 * new guard triggers. The service-role key is used only for fixture
 * setup/teardown, never inside the code path under test.
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

const created = { users: [] as string[], listingId: "", rejectedId: "", conversationId: "" };

async function makeUser(prefix: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const email = `p05-${prefix}-${stamp}@afghanmarket-test.dev`;
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

describe.runIf(enabled)("P0-5 database hardening (real RLS)", () => {
  let ownerId = "";
  let strangerId = "";

  beforeAll(async () => {
    admin = createClient(URL, ADMIN_KEY, anonOpts);
    anon = createClient(URL, KEY, anonOpts);

    const owner = await makeUser("owner");
    ownerId = owner.id;
    ownerClient = owner.client;

    const stranger = await makeUser("stranger");
    strangerId = stranger.id;
    strangerClient = stranger.client;

    const base = {
      user_id: ownerId,
      category: "marketplace" as const,
      purpose: "sell" as const,
      title: "P0-5 Test Listing",
      price: 100,
      currency: "AFN",
      province: "Kabul",
    };

    const listing = await ownerClient
      .from("listings")
      .insert({ ...base, status: "active" })
      .select("id")
      .single();
    expect(listing.error, listing.error?.message).toBeNull();
    created.listingId = listing.data!["id"] as string;

    const rejected = await admin
      .from("listings")
      .insert({ ...base, title: "P0-5 Rejected Listing", status: "rejected" })
      .select("id")
      .single();
    expect(rejected.error, rejected.error?.message).toBeNull();
    created.rejectedId = rejected.data!["id"] as string;

    const convo = await strangerClient
      .from("conversations")
      .insert({ listing_id: created.listingId, buyer_id: strangerId, seller_id: ownerId })
      .select("id")
      .single();
    expect(convo.error, convo.error?.message).toBeNull();
    created.conversationId = convo.data!["id"] as string;

    const msg = await strangerClient.from("messages").insert({
      conversation_id: created.conversationId,
      sender_id: strangerId,
      body: "ORIGINAL_BODY",
    });
    expect(msg.error, msg.error?.message).toBeNull();
  }, 90_000);

  afterAll(async () => {
    if (!admin) return;
    if (created.conversationId) {
      await admin.from("messages").delete().eq("conversation_id", created.conversationId);
      await admin.from("conversations").delete().eq("id", created.conversationId);
    }
    for (const id of [created.listingId, created.rejectedId]) {
      if (!id) continue;
      await admin.from("ad_orders").delete().eq("listing_id", id);
      await admin.from("listings").delete().eq("id", id);
    }
    for (const id of created.users) {
      await admin.from("reports").delete().eq("reporter_id", id);
      await admin.from("user_roles").delete().eq("user_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  }, 90_000);

  // ---- least-privilege grants -------------------------------------------
  it("1. anonymous cannot read profiles", async () => {
    const { data, error } = await anon.from("profiles").select("id").limit(1);
    expect(error ?? (data ?? []).length === 0).toBeTruthy();
  });

  it("2. anonymous cannot read messages or orders", async () => {
    const m = await anon.from("messages").select("id").limit(1);
    const o = await anon.from("shop_orders").select("id").limit(1);
    expect(m.error ?? (m.data ?? []).length === 0).toBeTruthy();
    expect(o.error ?? (o.data ?? []).length === 0).toBeTruthy();
  });

  it("3. anonymous cannot insert a listing", async () => {
    const { error } = await anon.from("listings").insert({
      user_id: ownerId,
      category: "marketplace",
      purpose: "sell",
      title: "anon injected",
      currency: "AFN",
    });
    expect(error).not.toBeNull();
  });

  it("4. authenticated user cannot insert an order directly", async () => {
    const { error } = await strangerClient.from("shop_orders").insert({
      shop_id: created.listingId,
      buyer_id: strangerId,
      total: 0,
      currency: "AFN",
      payment_method: "cash",
      buyer_name: "x",
      buyer_phone: "y",
    });
    expect(error).not.toBeNull();
  });

  // ---- listing write path -------------------------------------------------
  it("5. non-owner cannot modify another user's listing", async () => {
    const { data } = await strangerClient
      .from("listings")
      .update({ title: "HIJACKED" })
      .eq("id", created.listingId)
      .select("id");
    expect(data ?? []).toHaveLength(0);
    const check = await anon.from("listings").select("title").eq("id", created.listingId).single();
    expect(check.data!["title"]).toBe("P0-5 Test Listing");
  });

  it("6. owner cannot self-promote their listing to featured", async () => {
    await ownerClient
      .from("listings")
      .update({ is_featured: true, featured_until: new Date(Date.now() + 8.64e7).toISOString() })
      .eq("id", created.listingId);
    const { data } = await admin
      .from("listings")
      .select("is_featured,featured_until")
      .eq("id", created.listingId)
      .single();
    expect(data!["is_featured"]).toBe(false);
    expect(data!["featured_until"]).toBeNull();
  });

  it("7. owner cannot reassign listing ownership or inflate view_count", async () => {
    await ownerClient
      .from("listings")
      .update({ user_id: strangerId, view_count: 999999 })
      .eq("id", created.listingId);
    const { data } = await admin
      .from("listings")
      .select("user_id,view_count")
      .eq("id", created.listingId)
      .single();
    expect(data!["user_id"]).toBe(ownerId);
    expect(data!["view_count"]).toBe(0);
  });

  it("8. owner can still edit legitimate listing fields", async () => {
    const { error } = await ownerClient
      .from("listings")
      .update({ title: "P0-5 Test Listing", price: 120 })
      .eq("id", created.listingId);
    expect(error, error?.message).toBeNull();
  });

  it("9. owner cannot revive a moderator-rejected listing", async () => {
    const { error } = await ownerClient
      .from("listings")
      .update({ status: "active" })
      .eq("id", created.rejectedId);
    expect(error?.message ?? "").toContain("MODERATED_LISTING_LOCKED");
  });

  // ---- messaging integrity -----------------------------------------------
  it("10. recipient cannot rewrite the sender's message body", async () => {
    await ownerClient
      .from("messages")
      .update({ body: "TAMPERED", read_at: new Date().toISOString() })
      .eq("conversation_id", created.conversationId);
    const { data } = await admin
      .from("messages")
      .select("body,read_at")
      .eq("conversation_id", created.conversationId)
      .single();
    expect(data!["body"]).toBe("ORIGINAL_BODY");
    expect(data!["read_at"]).not.toBeNull();
  });

  it("11. participant cannot swap conversation participants", async () => {
    await strangerClient
      .from("conversations")
      .update({ seller_id: strangerId, buyer_id: ownerId })
      .eq("id", created.conversationId);
    const { data } = await admin
      .from("conversations")
      .select("buyer_id,seller_id")
      .eq("id", created.conversationId)
      .single();
    expect(data!["buyer_id"]).toBe(strangerId);
    expect(data!["seller_id"]).toBe(ownerId);
  });

  it("12. non-participant cannot read the conversation's messages", async () => {
    const third = await makeUser("third");
    const { data } = await third.client
      .from("messages")
      .select("body")
      .eq("conversation_id", created.conversationId);
    expect(data ?? []).toHaveLength(0);
  });

  // ---- role escalation ----------------------------------------------------
  it("13. user cannot grant themselves the admin role", async () => {
    const { error } = await strangerClient
      .from("user_roles")
      .insert({ user_id: strangerId, role: "admin" });
    expect(error).not.toBeNull();
    const { data } = await admin.from("user_roles").select("role").eq("user_id", strangerId);
    expect(data ?? []).toHaveLength(0);
  });

  it("14. user cannot read another user's roles", async () => {
    const { data } = await strangerClient.from("user_roles").select("role").eq("user_id", ownerId);
    expect(data ?? []).toHaveLength(0);
  });

  // ---- ad order integrity -------------------------------------------------
  it("15. ad order price and status are server-controlled", async () => {
    const pkg = await anon
      .from("ad_packages")
      .select("id,price_afn")
      .eq("active", true)
      .order("sort_order")
      .limit(1)
      .single();
    expect(pkg.error, pkg.error?.message).toBeNull();

    const { data, error } = await ownerClient
      .from("ad_orders")
      .insert({
        user_id: ownerId,
        listing_id: created.listingId,
        package_id: pkg.data!["id"] as string,
        amount_afn: 1,
        method: "cash",
        status: "active",
      })
      .select("amount_afn,status")
      .single();
    expect(error, error?.message).toBeNull();
    expect(data!["amount_afn"]).toBe(pkg.data!["price_afn"]);
    expect(data!["status"]).toBe("pending");
  });

  it("16. user cannot buy promotion for someone else's listing", async () => {
    const pkg = await anon.from("ad_packages").select("id").eq("active", true).limit(1).single();
    const { error } = await strangerClient.from("ad_orders").insert({
      user_id: strangerId,
      listing_id: created.listingId,
      package_id: pkg.data!["id"] as string,
      amount_afn: 1,
      method: "cash",
    });
    expect(error).not.toBeNull();
  });

  // ---- reports -------------------------------------------------------------
  it("17. report status and reporter are server-controlled", async () => {
    const { data, error } = await strangerClient
      .from("reports")
      .insert({
        reporter_id: strangerId,
        listing_id: created.listingId,
        reason: "spam",
        status: "resolved",
      })
      .select("reporter_id,status")
      .single();
    expect(error, error?.message).toBeNull();
    expect(data!["reporter_id"]).toBe(strangerId);
    expect(data!["status"]).toBe("open");
  });

  // ---- public browsing unbroken -------------------------------------------
  it("18. anonymous marketplace browsing still works", async () => {
    const listings = await anon.from("listings").select("id,title").eq("id", created.listingId);
    expect(listings.error, listings.error?.message).toBeNull();
    expect(listings.data ?? []).toHaveLength(1);

    const packages = await anon.from("ad_packages").select("id").eq("active", true);
    expect(packages.error, packages.error?.message).toBeNull();
    expect((packages.data ?? []).length).toBeGreaterThan(0);

    const shops = await anon.from("shops").select("id").limit(1);
    expect(shops.error, shops.error?.message).toBeNull();

    const products = await anon.from("shop_products").select("id").limit(1);
    expect(products.error, products.error?.message).toBeNull();

    const images = await anon.from("listing_images").select("id").limit(1);
    expect(images.error, images.error?.message).toBeNull();
  });

  it("19. rejected listings stay invisible to visitors", async () => {
    const { data } = await anon.from("listings").select("id").eq("id", created.rejectedId);
    expect(data ?? []).toHaveLength(0);
  });
});
