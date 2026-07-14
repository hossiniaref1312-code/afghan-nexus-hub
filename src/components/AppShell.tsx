import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  /** Use the wide, marketing-style layout (header + footer, wide container). */
  variant?: "app" | "site";
}

export function AppShell({ children, hideNav, variant = "app" }: AppShellProps) {
  if (variant === "site") {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <SiteFooter />
        {!hideNav && <BottomNav className="md:hidden" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl pb-24">{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
