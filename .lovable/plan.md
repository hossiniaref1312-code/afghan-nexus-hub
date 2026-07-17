# پلن این نوبت

## بخش ۱ — پاکسازی احراز هویت (سریع)

فایل‌های موجود اسکن می‌شن. هرچی mock/placeholder/console.log تستی باشه حذف می‌شه.

- `src/routes/auth.tsx` — بررسی؛ در حال حاضر با Supabase واقعی کار می‌کنه (`signUp`, `signInWithPassword`, `signInWithOtp`, `verifyOtp`). فقط اگه TODO یا placeholder موند حذف می‌شه.
- `src/hooks/use-auth.ts` — بررسی سلامت listener.
- `src/lib/payment-methods.ts` — شماره‌های `0799 000 000` placeholder هستن → یا حذف یا با کامنت واضح "این‌ها را با شماره واقعی جایگزین کنید" علامت‌گذاری می‌شن.
- فعال کردن **Leaked Password Protection** روی Supabase.
- اطمینان از اینکه auto-confirm email خاموشه (امنیت واقعی).

## بخش ۲ — فروشگاه شخصی من (My Shop)

### مدل داده (migration)

- `shops`: مالک، نام، توضیحات، لوگو، آدرس، فعال/غیرفعال (هر کاربر یک shop)
- `shop_categories`: دسته‌بندی محصولات داخل فروشگاه (سلسله‌مراتبی)
- `shop_products`: عنوان، توضیح، قیمت، ارز، عکس‌ها، دسته، **موجودی (stock)**، وضعیت (active/out_of_stock/hidden)
- `shop_orders`: مشتری، فروشگاه، مجموع، وضعیت (pending/paid/shipped/delivered/cancelled)، آدرس ارسال، روش پرداخت
- `shop_order_items`: سفارش، محصول، تعداد، قیمت لحظه‌ای
- `shop_carts` + `shop_cart_items`: سبد خرید (per user)

همه با RLS: مالک فروشگاه محصولات/سفارشاتش را می‌بیند، مشتری فقط سفارشات خودش را، محصولات فعال برای همه قابل دیدن.

### صفحات جدید

```
/shop                              فروشگاه‌های همه (لیست عمومی)
/shop/$slug                        صفحه یک فروشگاه + محصولاتش
/shop/$slug/product/$productId     جزئیات محصول + دکمه افزودن به سبد
/cart                              سبد خرید
/checkout                          فرم آدرس + انتخاب روش پرداخت
/orders                            سفارشات من (خریدار)
/_authenticated/my-shop            داشبورد فروشگاه من (فروشنده)
/_authenticated/my-shop/products   مدیریت محصولات (CRUD + موجودی)
/_authenticated/my-shop/orders     مدیریت سفارشات (تغییر وضعیت)
/_authenticated/my-shop/setup      ساخت/ویرایش اطلاعات فروشگاه
```

### روش پرداخت این نوبت

فقط **Cash on Delivery** و **Bank Transfer دستی** (همان الگوی PAYMENT_METHODS موجود). اتصال PayPal واقعی نوبت بعد چون:
- کلید PayPal Business API لازمه
- Webhook مخصوص لازمه
- باید صرفاً بعد از موافقت شما درخواست کنم

### i18n

کلیدهای فروشگاه به دیکشنری‌های EN/FA/PS اضافه می‌شن.

### دکمه ورودی

روی `SiteHeader` و صفحه اصلی و `profile` لینک "فروشگاه من" اضافه می‌شه.

## بخش ۳ — گزارش کاستی‌ها (بدون کد)

بعد از تحویل این نوبت، لیستی از چیزهایی که یک اپ حرفه‌ای در سطح OLX/Divar داره ولی ما هنوز نداریم رو در چت می‌نویسم:
- اعلانات push
- تبلیغات AdMob (Capacitor)
- PayPal + Stripe
- سیستم نظرات و امتیاز فروشنده
- verification فروشگاه (تیک آبی)
- تحویل/لجستیک
- آنالیتیکس فروشنده
- بازیابی رمز عبور

هرکدوم را که خواستی در نوبت بعد می‌سازم.

## چیزی که این نوبت نمی‌سازم (نیاز به تصمیم/کلید)

- ❌ AdMob (نیاز به Capacitor build + Ad Unit IDs)
- ❌ PayPal (نیاز به کلید PayPal Business)
- ❌ SMS provider واقعی برای OTP افغانستان (Twilio نیاز داره)

بعد از تأیید این پلن، شروع می‌کنم.