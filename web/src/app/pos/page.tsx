"use client";

import Link from "next/link";
import { POSDashboard } from "@/components/pos/POSDashboard";
import { ArrowLeft, Loader2, ScanLine } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthStatus } from "@/components/ui/AuthStatus";
import { StaffNavTabs } from "@/components/staff/StaffNavTabs";
import { useStaffContext } from "@/lib/useStaffContext";

export default function PosPage() {
  // Same resolution the Floor Plan Builder uses (see useStaffContext): cafe
  // staff get their own cafe; super_admin defaults to the platform's first.
  const { session, isSuperAdmin, cafeId } = useStaffContext();

  return (
    <main className="min-h-screen bg-ink-50 pb-16">
      <header className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between">
            <div>
              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-ink-700"
              >
                <ArrowLeft size={13} /> Back to Tame&apos;out
              </Link>
              <h1 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-ink-900">
                <ScanLine size={20} className="text-brand-600" /> Cashier POS
              </h1>
              <p className="text-sm text-ink-500">
                {session
                  ? `Signed in as ${session.email}`
                  : "Live table grid for your cafe"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AuthStatus />
              <ThemeToggle />
            </div>
          </div>
          {cafeId ? (
            <StaffNavTabs cafeId={cafeId} active="pos" />
          ) : (
            <div className="h-4" />
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {session === undefined ? (
          <div className="flex items-center gap-2 py-16 text-sm text-ink-400">
            <Loader2 size={16} className="animate-spin" /> Loading your cafe…
          </div>
        ) : cafeId ? (
          <POSDashboard cafeId={cafeId} />
        ) : (
          <p className="py-16 text-center text-sm text-ink-500">
            {isSuperAdmin
              ? "No cafes yet — create one from /admin first."
              : "Your account isn't assigned to a cafe yet. Ask your super admin to set this up."}
          </p>
        )}
      </div>
    </main>
  );
}
