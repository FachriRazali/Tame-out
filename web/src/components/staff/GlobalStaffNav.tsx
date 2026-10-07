"use client";

import { useEffect, useState } from "react";
import { StaffNavTabs } from "./StaffNavTabs";

interface SessionUser {
  id: number;
  fullName: string;
  email: string;
  role: "super_admin" | "admin" | "merchant" | "cashier" | "customer";
  cafeId?: number;
}

// Rendered once from the root layout, so it shows up on *every* route —
// the landing page, /login, /admin, the public /cafe/[id] page, and the
// builder/POS pages themselves — whenever a cafe-scoped staff account
// (merchant/cashier/admin) or super_admin is signed in. Customers and
// signed-out visitors get nothing: this bar simply renders null for them.
//
// super_admin isn't tied to one cafe (it manages all of them from /admin),
// so these shortcuts default to whichever cafe comes first on the
// platform — see MerchantBuilderPage/PosPage, which resolve the same
// default when a super_admin lands on those pages directly.
export function GlobalStaffNav() {
  const [session, setSession] = useState<SessionUser | null | undefined>(
    undefined,
  );
  const [firstCafeId, setFirstCafeId] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setSession(data.user ?? null))
      .catch(() => setSession(null));
  }, []);

  const isCafeStaff =
    session?.role === "merchant" ||
    session?.role === "cashier" ||
    session?.role === "admin";
  const isSuperAdmin = session?.role === "super_admin";

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/admin/cafes")
      .then((r) => r.json())
      .then((d) => setFirstCafeId(d.data?.[0]?.id));
  }, [isSuperAdmin]);

  const cafeId = isCafeStaff
    ? session?.cafeId
    : isSuperAdmin
      ? firstCafeId
      : undefined;
  if (!cafeId) return null;

  return (
    <div className="flex items-center justify-center border-b border-ink-100 bg-surface px-4 py-2">
      <StaffNavTabs cafeId={cafeId} />
    </div>
  );
}
