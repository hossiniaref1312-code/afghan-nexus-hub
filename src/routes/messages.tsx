import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LanguageThemeMenu } from "@/components/LanguageThemeMenu";
import { useT } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — AfghanMarket" }] }),
  component: Messages,
});

function Messages() {
  const t = useT();
  return (
    <AppShell>
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.messages")}</h1>
        <LanguageThemeMenu />
      </header>
      <div className="px-5 pt-8">
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-base font-bold">{t("common.comingSoon")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>
      </div>
    </AppShell>
  );
}
