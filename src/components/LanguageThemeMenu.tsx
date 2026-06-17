import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme } from "@/lib/theme";
import { Globe, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageThemeMenu() {
  const { lang, setLang, languages, t } = useI18n();
  const { theme, setTheme, resolved } = useTheme();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={t("settings.theme")}
        onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
        className="tap-highlight-none grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        {resolved === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("settings.language")}
            className="tap-highlight-none grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Globe className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto">
          <DropdownMenuLabel>{t("settings.language")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {languages.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onSelect={() => setLang(l.code)}
              className={l.code === lang ? "font-semibold text-primary" : ""}
            >
              <span className="flex-1">{l.native}</span>
              <span className="text-xs text-muted-foreground ms-3">{l.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("settings.theme")}</DropdownMenuLabel>
          {(["light", "dark", "system"] as const).map((opt) => (
            <DropdownMenuItem
              key={opt}
              onSelect={() => setTheme(opt)}
              className={theme === opt ? "font-semibold text-primary" : ""}
            >
              {t(`settings.theme.${opt}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
