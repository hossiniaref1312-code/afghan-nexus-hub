import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { CATEGORIES } from "@/lib/categories";

export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border/60 bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-brand grid h-9 w-9 place-items-center rounded-xl shadow-elevated">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-lg font-bold tracking-tight">{t("app.name")}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("footer.tagline")}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("footer.explore")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.key}>
                <Link
                  to="/category/$category"
                  params={{ category: c.key }}
                  className="text-foreground/80 hover:text-primary"
                >
                  {t(`cat.${c.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("footer.company")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="text-foreground/80">{t("footer.about")}</span></li>
            <li><span className="text-foreground/80">{t("footer.contact")}</span></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("footer.legal")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="text-foreground/80">{t("footer.terms")}</span></li>
            <li><span className="text-foreground/80">{t("footer.privacy")}</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-xs text-muted-foreground md:px-6">
          <span>© {year} {t("app.name")}. {t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
