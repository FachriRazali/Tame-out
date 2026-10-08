"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutGrid, ScanLine, UtensilsCrossed } from "@/components/ui/icons";

// Lets a staff account bounce between the floor builder, the seats/POS view,
// and menu management — without logging out and back in as a "different"
// role. merchant, cashier and admin are all all-in-one staff roles now (see
// middleware.ts + staffAuth.ts role checks), so every one of them can reach
// all three. Menu management itself still lives on the public cafe page
// (see MenuSection.tsx) — isStaff there is what unlocks the edit controls —
// so this just deep-links to "#menu" on that same page.
//
// Styled to match the Tame'out brand palette: sage fill + white text for the
// active tab (same convention as FilterBar's price-bucket/availability
// pills), soft sage-tinted pill track behind it.
export function StaffNavTabs({ cafeId }: { cafeId: number }) {
  const pathname = usePathname();
  const tabs = [
    {
      href: "/merchant/builder",
      label: "Floor Plan Builder",
      shortLabel: "Builder",
      icon: LayoutGrid,
    },
    { href: "/pos", label: "Cashier POS", shortLabel: "POS", icon: ScanLine },
    {
      href: `/cafe/${cafeId}#menu`,
      label: "Menu",
      shortLabel: "Menu",
      icon: UtensilsCrossed,
    },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-surface p-1 shadow-soft ring-1 ring-brand-100">
      {tabs.map((tab) => {
        const active = tab.href.startsWith("/cafe/")
          ? false
          : pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={tab.label}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
              active
                ? "bg-brand-600 text-white shadow-soft"
                : "text-brand-700 hover:bg-brand-50",
            )}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </Link>
        );
      })}
    </div>
  );
}
