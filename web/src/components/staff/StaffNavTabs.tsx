"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  ImageIcon,
  LayoutGrid,
  ScanLine,
  UtensilsCrossed,
} from "@/components/ui/icons";

export type StaffTab = "builder" | "pos" | "menu" | "photos";

// Underline tabs that live INSIDE a staff page's header (Cashier POS, Floor
// Plan Builder, the cafe page's staff bar, Super Admin) — not a global bar.
// They let a signed-in staff account hop between the floor builder, the
// seats/POS view and menu management without re-logging in. merchant,
// cashier and admin are all-in-one staff roles (see middleware.ts +
// staffAuth.ts), so every one of them can reach all three.
//
// Menu and photo management live on the public cafe page (MenuSection.tsx — isStaff
// there unlocks the edit controls), so that tab deep-links to "#menu".
// `active` says which tab is current; pass nothing (e.g. on /admin) for none.
export function StaffNavTabs({
  cafeId,
  active,
  className = "mt-3",
}: {
  cafeId: number;
  active?: StaffTab;
  className?: string;
}) {
  const tabs: {
    key: StaffTab;
    href: string;
    label: string;
    shortLabel: string;
    icon: typeof LayoutGrid;
  }[] = [
    {
      key: "builder",
      href: "/merchant/builder",
      label: "Floor Plan Builder",
      shortLabel: "Layout",
      icon: LayoutGrid,
    },
    {
      key: "pos",
      href: "/pos",
      label: "Cashier POS",
      shortLabel: "Kasir POS",
      icon: ScanLine,
    },
    {
      key: "menu",
      href: `/cafe/${cafeId}#menu`,
      label: "Menu cafe",
      shortLabel: "Menu",
      icon: UtensilsCrossed,
    },
    {
      key: "photos",
      href: `/cafe/${cafeId}#photos`,
      label: "Foto cafe",
      shortLabel: "Foto",
      icon: ImageIcon,
    },
  ];

  return (
    <nav
      aria-label="Staff tools"
      className={clsx(
        "-mb-px flex items-center gap-0.5 overflow-x-auto",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            title={tab.label}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-2.5 py-2.5 text-[11.5px] font-bold transition sm:px-4 sm:text-sm",
              isActive
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-400 hover:border-ink-100 hover:text-ink-800",
            )}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
