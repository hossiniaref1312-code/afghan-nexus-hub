/**
 * REAL integration regression test for the `place_order` RPC contract.
 *
 * Nothing is mocked. A unique throwaway user is created, signed in, and all
 * shop/product/cart writes plus the RPC call run through that user's own
 * session under production RLS (publishable key only).
 *
 * Fixture note: the project (correctly) requires email confirmation, so the
 * throwaway account is confirmed and finally deleted through the Auth Admin
 * API using the service-role key that already exists in the server environment.
 * That key is used ONLY for fixture setup/teardown — never for the order path
 * under test, and no production RLS/policy/auth setting is weakened. When the
 * key is absent (e.g. a bare CI runner) the suite skips with a clear reason
 * instead of silently passing.
 */
import { describe, it, expect, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
const ADMIN_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

const enabled = Boolean(URL && KEY && ADMIN_KEY);

let userClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;
let createdUserId = "";
let createdShopId = "";
let createdProductId = "";

afterAll(async () => {
  // Teardown: remove every row this test created, then the throwaway user.
  if (adminClient && createdUserId) {
    const { data: orders } = await adminClient
      .from("shop_orders")
      .select("id")
      .eq("buyer_id", createdUserId);
    const orderIds = (orders ?? []).map((o: { id: string }) => o.id);
    if (orderIds.length) {
      await adminClient.from("shop_order_items").delete().in("order_id", orderIds);
      await adminClient.from("shop_orders").delete().in("id", orderIds);
    }
    if (createdProductId) {
      await adminClient.from("shop_cart_items").delete().eq("product_id", createdProductId);
    }
    await adminClient.from("shop_carts").delete().eq("user_id", createdUserId);
    if (createdShopId) {
      await adminClient.from("shop_products").delete().eq("shop_id", createdShopId);
      await adminClient.from("shops").delete().eq("id", createdShopId);
    }
    await adminClient.auth.admin.deleteUser(createdUserId);
  }
  if (userClient) await userClient.auth.signOut();
});

describe.runIf(enabled)("place_order RPC (real backend)", () => {
  it(
    "creates an order + item, decrements stock and clears the cart",
    { timeout: 60_000 },
    async () => {
      adminClient = createClient(URL, ADMIN_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      });

      const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
      const email = `m2-rpc-${stamp}@afghanmarket-test.dev`;
      const password = `Test-${stamp}-Aa1!`;

      // Fixture only: create a confirmed throwaway account.
      const createdUser = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(createdUser.error, createdUser.error?.message).toBeNull();
      createdUserId = createdUser.data.user!.id;

      // From here on, everything runs as the ordinary signed-in user under RLS.
      userClient = createClient(URL, KEY, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      });
      const signIn = await userClient.auth.signInWithPassword({ email, password });
      expect(signIn.error, signIn.error?.message).toBeNull();
      const userId = signIn.data.user!.id;
      expect(userId).toBe(createdUserId);

      const shop = await userClient
        .from("shops")
        .insert({
          owner_id: userId,
          slug: `m2-rpc-${stamp}`,
          name: "M2 RPC Test Shop",
          is_active: true,
        })
        .select("id")
        .single();
      expect(shop.error, shop.error?.message).toBeNull();
      createdShopId = shop.data!["id"] as string;

      const product = await userClient
        .from("shop_products")
        .insert({
          shop_id: createdShopId,
          title: "M2 RPC Test Product",
          price: 250,
          currency: "AFN",
          stock: 3,
          status: "active",
          image_urls: [],
        })
        .select("id")
        .single();
      expect(product.error, product.error?.message).toBeNull();
      createdProductId = product.data!["id"] as string;

      const cart = await userClient
        .from("shop_carts")
        .insert({ user_id: userId })
        .select("id")
        .single();
      expect(cart.error, cart.error?.message).toBeNull();
      const cartId = cart.data!["id"] as string;

      const cartItem = await userClient
        .from("shop_cart_items")
        .insert({ cart_id: cartId, product_id: createdProductId, quantity: 2 });
      expect(cartItem.error, cartItem.error?.message).toBeNull();

      // REAL RPC call — exact production contract/signature.
      const rpc = await userClient.rpc("place_order", {
        _payment_method: "cash",
        _buyer_name: "Integration Buyer",
        _buyer_phone: "+93700000001",
        _payment_reference: null,
        _ship_province: "Kabul",
        _ship_city: "Kabul",
        _ship_address: "Test street 1",
        _note: "m2 regression",
      });
      expect(rpc.error, rpc.error?.message).toBeNull();
      const orderId = rpc.data as string;
      expect(orderId).toMatch(/^[0-9a-f-]{36}$/i);

      const order = await userClient
        .from("shop_orders")
        .select("id,total,currency,status,buyer_id,shop_id,payment_method,ship_city")
        .eq("id", orderId)
        .single();
      expect(order.error, order.error?.message).toBeNull();
      expect(order.data!["buyer_id"]).toBe(userId);
      expect(order.data!["shop_id"]).toBe(createdShopId);
      expect(Number(order.data!["total"])).toBe(500); // server-derived: 250 x 2
      expect(order.data!["currency"]).toBe("AFN");
      expect(order.data!["status"]).toBe("pending");
      expect(order.data!["payment_method"]).toBe("cash");
      expect(order.data!["ship_city"]).toBe("Kabul");

      const items = await userClient
        .from("shop_order_items")
        .select("product_id,quantity,unit_price")
        .eq("order_id", orderId);
      expect(items.error, items.error?.message).toBeNull();
      expect(items.data).toHaveLength(1);
      expect(items.data![0]!["product_id"]).toBe(createdProductId);
      expect(items.data![0]!["quantity"]).toBe(2);
      expect(Number(items.data![0]!["unit_price"])).toBe(250);

      const after = await userClient
        .from("shop_products")
        .select("stock,status")
        .eq("id", createdProductId)
        .single();
      expect(after.error, after.error?.message).toBeNull();
      expect(after.data!["stock"]).toBe(1);
      expect(after.data!["stock"]).toBeGreaterThanOrEqual(0);

      const remaining = await userClient
        .from("shop_cart_items")
        .select("id", { count: "exact", head: true })
        .eq("cart_id", cartId);
      expect(remaining.error, remaining.error?.message).toBeNull();
      expect(remaining.count).toBe(0);

      // Contract guard: a second call on the now-empty cart must fail loudly.
      const second = await userClient.rpc("place_order", {
        _payment_method: "cash",
        _buyer_name: "Integration Buyer",
        _buyer_phone: "+93700000001",
      });
      expect(second.error?.message ?? "").toContain("EMPTY_CART");
    },
  );
});
