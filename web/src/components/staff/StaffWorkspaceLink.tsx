"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine } from "@/components/ui/icons";

// Small "Halaman kerja" shortcut for the customer landing page header — only
// for a signed-in staff account (cafe staff → Cashier POS, super_admin →
// /admin). Customers and signed-out visitors get nothing, so the public page
// stays clean; this is just the way back into the staff pages (where the tab
// bar lives) now that there's no global bar.
export function StaffWorkspaceLink() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  const isStaff =
    role === "merchant" ||
    role === "cashier" ||
    role === "admin" ||
    role === "super_admin";
  if (!isStaff) return null;

  return (
    <Link
      href={role === "super_admin" ? "/admin" : "/pos"}
      className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
    >
      <ScanLine size={13} /> Halaman kerja
    </Link>
  );
}
