"use client";

import { StaffNavTabs } from "./StaffNavTabs";
import { useStaffContext } from "@/lib/useStaffContext";

// Slim staff-only strip at the top of the PUBLIC cafe page, so that after
// tapping "Menu cafe" a staff member can get straight back to the builder or
// POS. Renders nothing for customers and signed-out visitors, and for cafe
// staff looking at a cafe that isn't theirs — the customer-facing page stays
// exactly as it was. super_admin sees it on any cafe.
export function StaffCafeBar({ cafeId }: { cafeId: number }) {
  const { session, loading, isCafeStaff, isSuperAdmin } = useStaffContext();
  if (loading) return null;
  const allowed =
    isSuperAdmin || (isCafeStaff && Number(session?.cafeId) === cafeId);
  if (!allowed) return null;

  return (
    <div className="border-b border-ink-100 bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
        <StaffNavTabs cafeId={cafeId} active="menu" className="mt-1.5" />
        <span className="hidden text-xs font-semibold text-ink-400 sm:block">
          Mode staff · menu bisa diedit di bawah
        </span>
      </div>
    </div>
  );
}
