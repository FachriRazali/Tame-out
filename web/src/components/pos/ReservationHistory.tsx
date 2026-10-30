"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { usePolling } from "@/lib/usePolling";
import type { CafeReservationRow } from "@/lib/store";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "@/components/ui/icons";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu bayar",
  confirmed: "Dikonfirmasi",
  checked_in: "Check-in",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  no_show: "No-show",
};

const BADGE: Record<string, string> = {
  pending_payment: "bg-capacity-yellowBg text-capacity-yellow",
  confirmed: "bg-capacity-greenBg text-capacity-green",
  checked_in: "bg-capacity-greenBg text-capacity-green",
  completed: "bg-ink-100 text-ink-600",
  cancelled: "bg-capacity-redBg text-capacity-red",
  expired: "bg-ink-100 text-ink-600",
  no_show: "bg-capacity-redBg text-capacity-red",
};

// Order of the summary tiles.
const SUMMARY_ORDER = [
  "confirmed",
  "pending_payment",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
  "expired",
] as const;

function dayBounds(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const from = new Date(y, m - 1, d, 0, 0, 0, 0);
  const to = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { from, to };
}

function toDayString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDay(day: string, delta: number) {
  const { from } = dayBounds(day);
  from.setDate(from.getDate() + delta);
  return toDayString(from);
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

// Cashier POS: the cafe's reservation history for one day, plus that day's
// summary (how many reservations are in each status). Replaces the QR scanner —
// a guest now just tells the cashier their name or reservation code, and the
// cashier finds it here (search box) and checks them in from the table grid.
export function ReservationHistory({ cafeId }: { cafeId: number }) {
  const today = toDayString(new Date());
  const [day, setDay] = useState(today);
  const [rows, setRows] = useState<CafeReservationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    const { from, to } = dayBounds(day);
    try {
      const res = await fetch(
        `/api/pos/cafes/${cafeId}/reservations?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error?.message ?? "Could not load reservations.");
      setRows(data.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reservations.");
    }
  }, [cafeId, day]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);
  usePolling(load, 20000);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const q = search.trim().toLowerCase();
  const visible = (rows ?? []).filter(
    (r) =>
      !q ||
      r.guestName.toLowerCase().includes(q) ||
      r.reservationCode.toLowerCase().includes(q) ||
      (r.tableCode ?? "").toLowerCase().includes(q) ||
      (r.guestWhatsapp ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")),
  );

  const dayLabel = dayBounds(day).from.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const total = rows?.length ?? 0;
  const guests = (rows ?? [])
    .filter((r) => r.status !== "cancelled" && r.status !== "expired")
    .reduce((n, r) => n + r.partySize, 0);

  return (
    <section
      className="mt-8 rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-ink-900/5"
      aria-label="Riwayat reservasi"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
          aria-expanded={open}
        >
          <CalendarDays size={18} className="text-ink-500" />
          <span>
            <span className="block text-base font-bold text-ink-900">
              Riwayat reservasi &amp; ringkasan harian
            </span>
            <span className="block text-xs text-ink-400">{dayLabel}</span>
          </span>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDay(shiftDay(day, -1))}
            aria-label="Hari sebelumnya"
            className="rounded-lg border border-ink-100 p-2 text-ink-600 hover:bg-ink-50"
          >
            <ChevronLeft size={15} />
          </button>
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            aria-label="Pilih tanggal"
            className="rounded-lg border border-ink-100 bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink-900"
          />
          <button
            onClick={() => setDay(shiftDay(day, 1))}
            aria-label="Hari berikutnya"
            className="rounded-lg border border-ink-100 p-2 text-ink-600 hover:bg-ink-50"
          >
            <ChevronRight size={15} />
          </button>
          {day !== today && (
            <button
              onClick={() => setDay(today)}
              className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white hover:bg-ink-800"
            >
              Hari ini
            </button>
          )}
        </div>
      </div>

      {open && (
        <>
          {/* Daily summary */}
          <div className="mt-4" data-testid="daily-summary">
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Total reservasi" value={total} strong />
              <Tile label="Total tamu (tidak termasuk batal)" value={guests} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUMMARY_ORDER.map((s) => (
                <span
                  key={s}
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    (counts[s] ?? 0) > 0 ? BADGE[s] : "bg-ink-50 text-ink-300",
                  )}
                  data-status={s}
                >
                  {STATUS_LABEL[s]} · {counts[s] ?? 0}
                </span>
              ))}
            </div>
          </div>

          {/* Search */}
          <label className="relative mt-4 block">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama tamu, kode reservasi, meja, atau nomor WhatsApp"
              className="w-full rounded-lg border border-ink-100 bg-surface py-2 pl-8 pr-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="mt-3 text-sm font-medium text-capacity-red"
            >
              {error}
            </p>
          )}

          {rows === null && !error && (
            <div className="mt-6 flex justify-center text-ink-400">
              <Loader2 className="animate-spin" />
            </div>
          )}

          {rows && visible.length === 0 && (
            <p className="mt-4 rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-400">
              {rows.length === 0
                ? "Tidak ada reservasi pada tanggal ini."
                : "Tidak ada yang cocok dengan pencarian."}
            </p>
          )}

          {visible.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs font-bold uppercase tracking-wide text-ink-400">
                    <th className="py-2 pr-3">Jam</th>
                    <th className="py-2 pr-3">Tamu</th>
                    <th className="py-2 pr-3">Kode</th>
                    <th className="py-2 pr-3">Meja</th>
                    <th className="py-2 pr-3">Tamu</th>
                    <th className="py-2 pr-3">DP</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const holdExpired =
                      r.status === "pending_payment" &&
                      r.paymentHoldExpiresAt != null &&
                      new Date(r.paymentHoldExpiresAt).getTime() < Date.now();
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-ink-50 last:border-0"
                        data-testid="cafe-reservation-row"
                        data-code={r.reservationCode}
                      >
                        <td className="whitespace-nowrap py-2.5 pr-3 font-semibold text-ink-900">
                          {new Date(r.startTime).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="block font-semibold text-ink-900">
                            {r.guestName}
                          </span>
                          {r.guestWhatsapp && (
                            <span className="block text-xs text-ink-400">
                              {r.guestWhatsapp}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs text-ink-600">
                          {r.reservationCode}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-ink-700">
                          {r.tableCode ?? "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-700">
                          {r.partySize}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-ink-600">
                          {r.downPayment
                            ? `${formatIDR(r.downPayment.amount)} · ${r.downPayment.status === "paid" ? "lunas" : r.downPayment.status === "pending" ? "belum" : r.downPayment.status}`
                            : "—"}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={clsx(
                              "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
                              holdExpired
                                ? "bg-ink-100 text-ink-600"
                                : (BADGE[r.status] ??
                                    "bg-ink-100 text-ink-600"),
                            )}
                          >
                            {holdExpired
                              ? "Waktu bayar habis"
                              : (STATUS_LABEL[r.status] ?? r.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Tile({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl p-3",
        strong ? "bg-ink-900 text-white" : "bg-ink-50",
      )}
    >
      <p
        className={clsx(
          "text-2xl font-extrabold",
          strong ? "text-white" : "text-ink-900",
        )}
      >
        {value}
      </p>
      <p
        className={clsx(
          "text-xs font-semibold",
          strong ? "text-white/70" : "text-ink-500",
        )}
      >
        {label}
      </p>
    </div>
  );
}
