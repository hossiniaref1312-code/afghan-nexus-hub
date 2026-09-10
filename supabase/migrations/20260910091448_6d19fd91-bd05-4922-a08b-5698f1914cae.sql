REVOKE ALL ON FUNCTION public.guard_listing_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_message_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_conversation_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_shop_order_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_ad_order_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_report_insert() FROM PUBLIC, anon, authenticated;