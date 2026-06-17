import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl pb-24">{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
