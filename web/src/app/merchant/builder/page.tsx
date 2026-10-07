"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Floor } from "@/lib/types";
import { FloorPlanBuilder } from "@/components/builder/FloorPlanBuilder";
import { ArrowLeft, LayoutGrid, Loader2 } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthStatus } from "@/components/ui/AuthStatus";

interface SessionUser {
  id: number;
  fullName: string;
  email: string;
  role: "super_admin" | "admin" | "merchant" | "cashier" | "customer";
  cafeId?: number;
}

export default function MerchantBuilderPage() {
  const [session, setSession] = useState<SessionUser | null | undefined>(
    undefined,
  );
  const [floors, setFloors] = useState<Floor[] | null>(null);
  const [cafeName, setCafeName] = useState("");
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

  // super_admin isn't cafe-scoped (no cafe_staff row) — default to the
  // platform's first cafe so this page still has something to show when a
  // super_admin lands here directly (e.g. via the global staff nav).
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

  useEffect(() => {
    if (!cafeId) return;
    fetch(`/api/cafes/${cafeId}`)
      .then((r) => r.json())
      .then((d) => {
        setFloors(d.floors);
        setCafeName(d.name);
      });
  }, [cafeId]);

  return (
    <main className="min-h-screen bg-ink-50 pb-16">
      <header className="border-b border-ink-100 bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-ink-700"
            >
              <ArrowLeft size={13} /> Back to Tame&apos;out
            </Link>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-ink-900">
              <LayoutGrid size={20} className="text-brand-600" /> Floor Plan
              Builder
            </h1>
            <p className="text-sm text-ink-500">
              {cafeName || "Loading…"} · Merchant / Cafe Staff
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AuthStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {session === undefined ? (
          <div className="flex items-center gap-2 py-16 text-sm text-ink-400">
            <Loader2 size={16} className="animate-spin" /> Loading your cafe…
          </div>
        ) : !cafeId ? (
          <p className="py-16 text-center text-sm text-ink-500">
            {isSuperAdmin
              ? "No cafes yet — create one from /admin first."
              : "Your account isn't assigned to a cafe yet. Ask your super admin to set this up."}
          </p>
        ) : floors ? (
          <FloorPlanBuilder initialFloors={floors} cafeId={cafeId} />
        ) : (
          <div className="grid h-96 place-items-center text-ink-400">
            Loading floor plan…
          </div>
        )}
      </div>
    </main>
  );
}
