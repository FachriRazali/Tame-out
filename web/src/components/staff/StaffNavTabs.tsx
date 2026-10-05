"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutGrid, ScanLine } from "@/components/ui/icons";

const TABS = [
  { href: "/merchant/builder", label: "Manage Layout", icon: LayoutGrid },
  { href: "/pos", label: "Kursi / POS", icon: ScanLine }
];

// Lets a staff account bounce between the floor builder and the seats/POS
// view without going back to "/" first. merchant, cashier and admin are all
// all-in-one staff roles now (see middleware.ts + staffAuth.ts role checks),
// so every one of them can reach both pages — this tab bar is shown on both
// so switching back and forth is a single click either way.
export function StaffNavTabs() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 rounded-full bg-ink-100 p-1">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active ? "bg-surface text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"
            )}
          >
            <Icon size={13} /> {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
