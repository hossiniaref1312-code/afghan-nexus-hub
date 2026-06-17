// AfghanMarket i18n catalog.
// To add a new language: add its code to LANGUAGES + supply a partial map below.
// Missing keys fall back to English.

export type LangCode =
  | "en" | "fa" | "ps" | "ar" | "de" | "tr" | "fa_IR" | "ur" | "hi"
  | "ru" | "zh_CN" | "zh_TW" | "fr" | "es" | "it" | "pt" | "nl" | "sv"
  | "no" | "da" | "fi" | "pl" | "cs" | "ro" | "el" | "ja" | "ko";

export const LANGUAGES: { code: LangCode; name: string; native: string; rtl?: boolean }[] = [
  { code: "en", name: "English", native: "English" },
  { code: "fa", name: "Dari", native: "دری", rtl: true },
  { code: "ps", name: "Pashto", native: "پښتو", rtl: true },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true },
  { code: "fa_IR", name: "Persian", native: "فارسی", rtl: true },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "fr", name: "French", native: "Français" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh_CN", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh_TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
];

export const RTL_LANGS: LangCode[] = ["fa", "ps", "ar", "fa_IR", "ur"];

type Dict = Record<string, string>;

const en: Dict = {
  "app.name": "AfghanMarket",
  "app.tagline": "Buy, sell & discover across Afghanistan",

  "nav.home": "Home",
  "nav.favorites": "Saved",
  "nav.sell": "Post",
  "nav.messages": "Chat",
  "nav.profile": "Profile",

  "common.search": "Search listings…",
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.continue": "Continue",
  "common.back": "Back",
  "common.signin": "Sign in",
  "common.signup": "Create account",
  "common.signout": "Sign out",
  "common.required": "Required",
  "common.optional": "Optional",
  "common.viewAll": "View all",
  "common.comingSoon": "Coming soon",
  "common.noResults": "Nothing here yet.",
  "common.contactSeller": "Call seller",
  "common.report": "Report",
  "common.favorite": "Save",
  "common.unfavorite": "Saved",
  "common.posted": "Posted",
  "common.price": "Price",
  "common.free": "Free",
  "common.afn": "AFN",
  "common.usd": "USD",

  "cat.real_estate": "Real Estate",
  "cat.vehicles": "Vehicles",
  "cat.marketplace": "Marketplace",
  "cat.jobs": "Jobs",
  "cat.services": "Services & Ads",

  "cat.real_estate.sub": "Houses, apartments, land",
  "cat.vehicles.sub": "Cars, motorcycles, rentals",
  "cat.marketplace.sub": "New & used items",
  "cat.jobs.sub": "Hire & get hired",
  "cat.services.sub": "Promote your business",

  "home.greeting": "Welcome",
  "home.categories": "Categories",
  "home.featured": "Featured",
  "home.recent": "Recently posted",

  "auth.title": "Welcome to AfghanMarket",
  "auth.subtitle": "Sign in or create an account to start posting and saving listings.",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.fullName": "Your name",
  "auth.fullName.help": "Used inside the app. Not shown publicly.",
  "auth.phone": "Phone (Afghanistan)",
  "auth.phone.help": "We share this number when you contact a seller.",
  "auth.province": "Province",
  "auth.province.help": "Stays private. Only admins can see it.",
  "auth.city": "City",
  "auth.signinTab": "Sign in",
  "auth.signupTab": "Create account",
  "auth.submit.signin": "Sign in",
  "auth.submit.signup": "Create account",
  "auth.toggleToSignup": "New here? Create an account",
  "auth.toggleToSignin": "Already have an account? Sign in",
  "auth.error.generic": "Could not complete request.",
  "auth.success.signin": "Signed in.",
  "auth.success.signup": "Account created.",

  "post.title": "Post a listing",
  "post.field.title": "Title",
  "post.field.description": "Description",
  "post.field.price": "Price (AFN)",
  "post.field.category": "Category",
  "post.field.purpose": "Purpose",
  "post.field.province": "Province (public)",
  "post.field.area": "Neighborhood / Area",
  "post.field.images": "Photos",
  "post.submit": "Publish",
  "post.success": "Your listing is live.",

  "purpose.sell": "For sale",
  "purpose.rent": "For rent",
  "purpose.buy": "Wanted",
  "purpose.hire": "Hiring",
  "purpose.offer": "Offering",

  "listing.contact": "Contact seller",
  "listing.report": "Report this listing",
  "listing.featured": "Featured",
  "listing.by": "By",

  "favorites.empty": "You haven't saved anything yet.",

  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.theme.system": "System",

  "browse.empty.title": "No listings here yet",
  "browse.empty.body": "Be the first to post in this category.",
  "browse.cta": "Post the first listing",
};

const fa: Dict = {
  "app.name": "افغان مارکیټ",
  "app.tagline": "خرید، فروش و کشف در سراسر افغانستان",

  "nav.home": "خانه",
  "nav.favorites": "ذخیره",
  "nav.sell": "آگهی",
  "nav.messages": "گفتگو",
  "nav.profile": "حساب",

  "common.search": "جستجوی آگهی…",
  "common.loading": "در حال بارگذاری…",
  "common.save": "ذخیره",
  "common.cancel": "لغو",
  "common.delete": "حذف",
  "common.edit": "ویرایش",
  "common.continue": "ادامه",
  "common.back": "بازگشت",
  "common.signin": "ورود",
  "common.signup": "ایجاد حساب",
  "common.signout": "خروج",
  "common.required": "الزامی",
  "common.optional": "اختیاری",
  "common.viewAll": "مشاهده همه",
  "common.comingSoon": "به‌زودی",
  "common.noResults": "چیزی برای نمایش نیست.",
  "common.contactSeller": "تماس با فروشنده",
  "common.report": "گزارش",
  "common.favorite": "ذخیره",
  "common.unfavorite": "ذخیره شد",
  "common.posted": "تاریخ ثبت",
  "common.price": "قیمت",
  "common.free": "رایگان",

  "cat.real_estate": "املاک",
  "cat.vehicles": "وسایط نقلیه",
  "cat.marketplace": "بازار",
  "cat.jobs": "کاریابی",
  "cat.services": "خدمات و تبلیغات",

  "cat.real_estate.sub": "خانه، آپارتمان، زمین",
  "cat.vehicles.sub": "موتر، موترسایکل، کرایه",
  "cat.marketplace.sub": "نو و دست‌دوم",
  "cat.jobs.sub": "استخدام و جستجوی کار",
  "cat.services.sub": "تبلیغ کسب‌وکار",

  "home.greeting": "خوش آمدید",
  "home.categories": "دسته‌بندی‌ها",
  "home.featured": "ویژه",
  "home.recent": "تازه‌ترین",

  "auth.title": "به افغان مارکیټ خوش آمدید",
  "auth.subtitle": "وارد شوید یا حساب جدید بسازید تا آگهی ثبت کنید.",
  "auth.email": "ایمیل",
  "auth.password": "رمز عبور",
  "auth.fullName": "نام شما",
  "auth.fullName.help": "در داخل برنامه استفاده می‌شود. عمومی نیست.",
  "auth.phone": "شماره تلفن (افغانستان)",
  "auth.phone.help": "هنگام تماس با فروشنده، این شماره به نمایش گذاشته می‌شود.",
  "auth.province": "ولایت",
  "auth.province.help": "خصوصی می‌ماند. فقط مدیران می‌توانند ببینند.",
  "auth.city": "شهر",
  "auth.signinTab": "ورود",
  "auth.signupTab": "ساخت حساب",
  "auth.submit.signin": "ورود",
  "auth.submit.signup": "ساخت حساب",
  "auth.toggleToSignup": "حساب ندارید؟ ثبت‌نام کنید",
  "auth.toggleToSignin": "حساب دارید؟ وارد شوید",
  "auth.error.generic": "درخواست ناموفق بود.",
  "auth.success.signin": "وارد شدید.",
  "auth.success.signup": "حساب ساخته شد.",

  "post.title": "ثبت آگهی جدید",
  "post.field.title": "عنوان",
  "post.field.description": "توضیحات",
  "post.field.price": "قیمت (افغانی)",
  "post.field.category": "دسته",
  "post.field.purpose": "نوع آگهی",
  "post.field.province": "ولایت (عمومی)",
  "post.field.area": "محله / منطقه",
  "post.field.images": "تصاویر",
  "post.submit": "انتشار",
  "post.success": "آگهی شما منتشر شد.",

  "purpose.sell": "برای فروش",
  "purpose.rent": "برای کرایه",
  "purpose.buy": "خریدار",
  "purpose.hire": "استخدام",
  "purpose.offer": "ارائه خدمات",

  "listing.contact": "تماس با فروشنده",
  "listing.report": "گزارش این آگهی",
  "listing.featured": "ویژه",
  "listing.by": "از",

  "favorites.empty": "هنوز چیزی ذخیره نکرده‌اید.",

  "settings.language": "زبان",
  "settings.theme": "حالت نمایش",
  "settings.theme.light": "روشن",
  "settings.theme.dark": "تاریک",
  "settings.theme.system": "سیستم",

  "browse.empty.title": "هنوز آگهی‌ای ثبت نشده",
  "browse.empty.body": "اولین نفر باشید که در این دسته آگهی ثبت می‌کند.",
  "browse.cta": "اولین آگهی را ثبت کنید",
};

const ps: Dict = {
  "app.name": "افغان مارکیټ",
  "app.tagline": "په ټول افغانستان کې پیر، پلور او لټون",

  "nav.home": "کور",
  "nav.favorites": "خوښ شوي",
  "nav.sell": "اعلان",
  "nav.messages": "خبرې",
  "nav.profile": "حساب",

  "common.search": "د اعلانونو لټون…",
  "common.loading": "د بار کولو په حال کې…",
  "common.save": "خوندي کول",
  "common.cancel": "لغوه",
  "common.continue": "دوام",
  "common.back": "شاته",
  "common.signin": "ننوتل",
  "common.signup": "حساب جوړول",
  "common.signout": "وتل",
  "common.contactSeller": "د پلورونکي سره اړیکه",

  "cat.real_estate": "ځمکې او ودانۍ",
  "cat.vehicles": "موټر او موټرسایکل",
  "cat.marketplace": "بازار",
  "cat.jobs": "دندې",
  "cat.services": "خدمتونه او اعلانونه",

  "cat.real_estate.sub": "کور، اپارتمان، ځمکه",
  "cat.vehicles.sub": "موټر، موټرسایکل، کرایه",
  "cat.marketplace.sub": "نوي او کارول شوي",
  "cat.jobs.sub": "د کار موندنه او ګمارنه",
  "cat.services.sub": "د سوداګرۍ اعلان",

  "home.greeting": "ښه راغلاست",
  "home.categories": "ډلې",
  "home.recent": "نوي اعلانونه",
  "home.featured": "ځانګړي",

  "auth.title": "افغان مارکیټ ته ښه راغلاست",
  "auth.subtitle": "د اعلان لپاره ننوځئ یا نوی حساب جوړ کړئ.",
  "auth.email": "ایمیل",
  "auth.password": "پاسورډ",
  "auth.fullName": "ستاسو نوم",
  "auth.phone": "د تلیفون شمېره (افغانستان)",
  "auth.province": "ولایت",
  "auth.city": "ښار",
};

// Stub maps for other languages — they fall back to English until translated.
const empty: Dict = {};

export const translations: Record<LangCode, Dict> = {
  en, fa, ps,
  ar: empty, fa_IR: empty, ur: empty, hi: empty, tr: empty, de: empty,
  fr: empty, es: empty, it: empty, pt: empty, nl: empty, sv: empty, no: empty,
  da: empty, fi: empty, pl: empty, cs: empty, ro: empty, el: empty, ru: empty,
  zh_CN: empty, zh_TW: empty, ja: empty, ko: empty,
};

export function translate(lang: LangCode, key: string): string {
  return translations[lang]?.[key] ?? en[key] ?? key;
}
