import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { LanguageThemeMenu } from "./LanguageThemeMenu";

interface NavItem {
  to: string;
  key: string;
  match: (p: string) => boolean;
}

const NAV: NavItem[] = [
  { to: "/", key: "nav.home", match: (p) => p === "/" },
  { to: "/shop", key: "nav.shop", match: (p) => p.startsWith("/shop") || p.startsWith("/product") },
  { to: "/category/marketplace", key: "nav.browse", match: (p) => p.startsWith("/category") },
  { to: "/cart", key: "nav.cart", match: (p) => p.startsWith("/cart") },
  { to: "/messages", key: "nav.messages", match: (p) => p.startsWith("/messages") },
];

export function SiteHeader() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" className="tap-highlight-none flex items-center gap-2">
          <span className="bg-gradient-brand grid h-9 w-9 place-items-center rounded-xl shadow-elevated">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-bold tracking-tight">{t("app.name")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            to="/sell"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90 md:inline-flex"
          >
            {t("nav.sell")}
          </Link>
          <LanguageThemeMenu />
          <button
            type="button"
            aria-label={t("nav.menu")}
            onClick={() => setOpen((v) => !v)}
            className="tap-highlight-none grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => {
              const active = n.match(pathname);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                  }`}
                >
                  {t(n.key)}
                </Link>
              );
            })}
            <Link
              to="/sell"
              className="mt-1 rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
            >
              {t("nav.sell")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
