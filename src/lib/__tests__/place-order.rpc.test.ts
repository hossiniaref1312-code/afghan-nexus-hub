/**
 * REAL integration regression test for the `place_order` RPC contract.
 *
 * No mocking: it signs up a throwaway user with the publishable key, creates a
 * shop/product/cart under production RLS, calls the real RPC and asserts the
 * order, order item, stock decrement and cart clearing.
 *
 * If the RPC signature/contract changes, the call fails and this test fails loudly.
 */
import { describe, it, expect, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const KEY =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";

const enabled = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
const created = { shopId: "", productId: "" };

afterAll(async () => {
  if (!client) return;
  // Best-effort cleanup within RLS: hide the temp product and deactivate the shop.
  // Rows referenced by an order cannot be deleted (FK + no delete policy on orders).
  if (created.productId) {
    await client.from("shop_products").update({ status: "hidden" }).eq("id", created.productId);
  }
  if (created.shopId) {
    await client.from("shops").update({ is_active: false }).eq("id", created.shopId);
  }
  await client.auth.signOut();
});

describe.runIf(enabled)("place_order RPC (real backend)", () => {
  it(
    "creates an order, an order item, decrements stock and clears the cart",
    { timeout: 60_000 },
    async () => {
      client = createClient(URL, KEY, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      });

      const stamp = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
      const email = `m2-rpc-${stamp}@afghanmarket-test.dev`;
      const password = `Test-${stamp}-Aa1!`;

      const signUp = await client.auth.signUp({ email, password });
      expect(signUp.error, signUp.error?.message).toBeNull();

      if (!signUp.data.session) {
        const signIn = await client.auth.signInWithPassword({ email, password });
        expect(signIn.error, signIn.error?.message).toBeNull();
      }
      const { data: userData } = await client.auth.getUser();
      const userId = userData.user?.id;
      expect(userId).toBeTruthy();

      // Shop
      const shop = await client
        .from("shops")
        .insert({
          owner_id: userId!,
          slug: `m2-rpc-${stamp}`,
          name: "M2 RPC Test Shop",
          is_active: true,
        })
        .select("id")
        .single();
      expect(shop.error, shop.error?.message).toBeNull();
      created.shopId = shop.data!.id as string;

      // Product with exactly 3 units
      const product = await client
        .from("shop_products")
        .insert({
          shop_id: created.shopId,
          title: "M2 RPC Test Product",
          price: 250,
          currency: "AFN",
          stock: 3,
          status: "active",
          image_urls: [],
        })
        .select("id,stock")
        .single();
      expect(product.error, product.error?.message).toBeNull();
      created.productId = product.data!.id as string;

      // Cart + item (quantity 2)
      const cart = await client
        .from("shop_carts")
        .insert({ user_id: userId! })
        .select("id")
        .single();
      expect(cart.error, cart.error?.message).toBeNull();
      const cartId = cart.data!.id as string;

      const cartItem = await client
        .from("shop_cart_items")
        .insert({ cart_id: cartId, product_id: created.productId, quantity: 2 });
      expect(cartItem.error, cartItem.error?.message).toBeNull();

      // REAL RPC call — exact production contract/signature.
      const rpc = await client.rpc("place_order", {
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

      // Order
      const order = await client
        .from("shop_orders")
        .select("id,total,currency,status,buyer_id,shop_id,payment_method")
        .eq("id", orderId)
        .single();
      expect(order.error, order.error?.message).toBeNull();
      expect(order.data!.buyer_id).toBe(userId);
      expect(order.data!.shop_id).toBe(created.shopId);
      expect(Number(order.data!.total)).toBe(500); // server-derived: 250 * 2
      expect(order.data!.currency).toBe("AFN");
      expect(order.data!.status).toBe("pending");
      expect(order.data!.payment_method).toBe("cash");

      // Order item
      const items = await client
        .from("shop_order_items")
        .select("product_id,quantity,unit_price,title")
        .eq("order_id", orderId);
      expect(items.error, items.error?.message).toBeNull();
      expect(items.data).toHaveLength(1);
      expect(items.data![0]!.product_id).toBe(created.productId);
      expect(items.data![0]!.quantity).toBe(2);
      expect(Number(items.data![0]!.unit_price)).toBe(250);

      // Stock decrement
      const after = await client
        .from("shop_products")
        .select("stock,status")
        .eq("id", created.productId)
        .single();
      expect(after.error, after.error?.message).toBeNull();
      expect(after.data!.stock).toBe(1);
      expect(after.data!.stock).toBeGreaterThanOrEqual(0);

      // Cart cleared
      const remaining = await client
        .from("shop_cart_items")
        .select("id", { count: "exact", head: true })
        .eq("cart_id", cartId);
      expect(remaining.error, remaining.error?.message).toBeNull();
      expect(remaining.count).toBe(0);

      // Contract guard: empty cart must now fail with the documented code.
      const second = await client.rpc("place_order", {
        _payment_method: "cash",
        _buyer_name: "Integration Buyer",
        _buyer_phone: "+93700000001",
      });
      expect(second.error?.message ?? "").toContain("EMPTY_CART");
    },
  );
});
