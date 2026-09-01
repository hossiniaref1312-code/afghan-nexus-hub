import type { ComponentType } from "react";
import { Home, Car, ShoppingBag, Briefcase, Megaphone } from "lucide-react";

export type CategoryKey = "real_estate" | "vehicles" | "marketplace" | "jobs" | "services";

export interface CategoryDef {
  key: CategoryKey;
  icon: ComponentType<{ className?: string }>;
  /** Tailwind classes for the icon tile background */
  tile: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: "real_estate", icon: Home, tile: "bg-gradient-brand text-primary-foreground" },
  { key: "vehicles", icon: Car, tile: "bg-gradient-warm text-saffron-foreground" },
  { key: "marketplace", icon: ShoppingBag, tile: "bg-primary/10 text-primary" },
  { key: "jobs", icon: Briefcase, tile: "bg-saffron/15 text-saffron" },
  { key: "services", icon: Megaphone, tile: "bg-accent text-accent-foreground" },
];

export function getCategory(key: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.key === key);
}
