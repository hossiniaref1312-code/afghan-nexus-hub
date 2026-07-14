import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Heart, PlusCircle, MessageCircle, User } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

const tabs = [
  { to: "/", icon: Home, key: "nav.home", match: (p: string) => p === "/" },
  { to: "/favorites", icon: Heart, key: "nav.favorites", match: (p: string) => p.startsWith("/favorites") },
  { to: "/sell", icon: PlusCircle, key: "nav.sell", match: (p: string) => p.startsWith("/sell"), highlight: true },
  { to: "/messages", icon: MessageCircle, key: "nav.messages", match: (p: string) => p.startsWith("/messages") },
  { to: "/profile", icon: User, key: "nav.profile", match: (p: string) => p.startsWith("/profile") },
];

export function BottomNav({ className = "" }: { className?: string }) {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                className="tap-highlight-none flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
              >
                {tab.highlight ? (
                  <span className="bg-gradient-brand grid h-11 w-11 -translate-y-3 place-items-center rounded-2xl shadow-elevated text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </span>
                ) : (
                  <Icon
                    className={`h-6 w-6 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                )}
                <span
                  className={`leading-none ${active ? "text-primary" : "text-muted-foreground"} ${tab.highlight ? "-mt-2" : ""}`}
                >
                  {t(tab.key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
