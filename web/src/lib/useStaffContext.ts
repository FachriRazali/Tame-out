"use client";

import { useEffect, useState } from "react";
import { fetchSessionUser } from "@/lib/sessionUser";

export interface StaffSessionUser {
  id: number;
  fullName: string;
  email: string;
  role: "super_admin" | "admin" | "merchant" | "cashier" | "customer";
  cafeId?: number;
}

// One place that answers "who is signed in, and which cafe do the staff tools
// apply to?" — shared by the Cashier POS page, the Floor Plan Builder page,
// the super-admin page and the staff tab bar on the public cafe page, so they
// all resolve it identically.
//
// - merchant / cashier / admin are cafe-scoped: cafeId comes from the session.
// - super_admin isn't tied to one cafe (no cafe_staff row), so it defaults to
//   the platform's first cafe (via the super-admin-gated /api/admin/cafes).
// - customers and signed-out visitors: isStaff is false, cafeId undefined.
export function useStaffContext() {
  const [session, setSession] = useState<StaffSessionUser | null | undefined>(
    undefined,
  );
  const [firstCafeId, setFirstCafeId] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchSessionUser().then(setSession);
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
      .then((d) => setFirstCafeId(d.data?.[0]?.id))
      .catch(() => setFirstCafeId(undefined));
  }, [isSuperAdmin]);

  const cafeId = isCafeStaff
    ? session?.cafeId
    : isSuperAdmin
      ? firstCafeId
      : undefined;

  return {
    session,
    loading: session === undefined,
    isCafeStaff,
    isSuperAdmin,
    isStaff: isCafeStaff || isSuperAdmin,
    cafeId,
  };
}
