"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutGrid, ScanLine, UtensilsCrossed } from "@/components/ui/icons";

// Lets a staff account bounce between the floor builder, the seats/POS view,
// and menu management — without logging out and back in as a "different"
// role. merchant, cashier and admin are all all-in-one staff roles now (see
// middleware.ts + staffAuth.ts role checks), so every one of them can reach
// all three; this tab bar is shown on the two staff-only pages (builder/POS)
// so switching is a single click. Menu management itself still lives on the
// public cafe page (see MenuSection.tsx) — isStaff there is what unlocks the
// edit controls — so this just deep-links to "#menu" on that same page.
export function StaffNavTabs({ cafeId }: { cafeId: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/merchant/builder", label: "Manage Layout", icon: LayoutGrid },
    { href: "/pos", label: "Kursi / POS", icon: ScanLine },
    { href: `/cafe/${cafeId}#menu`, label: "Menu", icon: UtensilsCrossed },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-ink-100 p-1">
      {tabs.map((tab) => {
        const active = tab.href.startsWith("/cafe/")
          ? false
          : pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-surface text-ink-900 shadow-sm"
                : "text-ink-500 hover:text-ink-800",
            )}
          >
            <Icon size={13} /> {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
