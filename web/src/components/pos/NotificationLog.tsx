"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { usePolling } from "@/lib/usePolling";
import { NotificationLogEntry } from "@/lib/types";
import { Bell, ChevronDown, Loader2 } from "@/components/ui/icons";

const TYPE_LABEL: Record<string, string> = {
  qr_ticket: "Konfirmasi reservasi",
  booking_confirmation: "Konfirmasi booking",
  reminder_h1: "Pengingat H-1 jam",
  payment_hold_warning: "Peringatan batas bayar",
  payment_confirmed: "Pembayaran diterima",
  cancellation: "Pembatalan",
  checked_in: "Check-in",
  admin_alert: "Info admin",
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Notifications sent for THIS cafe's reservations (guest WhatsApp messages),
// shown on the Cashier POS so staff can see what a guest was told. The API
// only returns the signed-in cafe's own entries; this panel just lists them.
export function NotificationLog({ cafeId }: { cafeId: number }) {
  const [items, setItems] = useState<NotificationLogEntry[] | null>(null);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?cafeId=${cafeId}&limit=40`, {
        cache: "no-store",
      });
      if (!res.ok)
        throw new Error(
          res.status === 403
            ? "Sesi berakhir — silakan login ulang."
            : "Gagal memuat log.",
        );
      const body = await res.json();
      setItems(body.data ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat log.");
      setItems((prev) => prev ?? []);
    }
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);
  usePolling(load, 20000);

  return (
    <section className="mt-8" data-testid="notification-log">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-left shadow-soft ring-1 ring-ink-900/5"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Bell size={16} className="text-brand-600" /> Log notifikasi
          {items && (
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
              {items.length}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={clsx("text-ink-400 transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-2 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-ink-900/5 sm:p-4">
          {error && (
            <p
              role="alert"
              className="mb-2 rounded-lg bg-capacity-redBg px-3 py-2 text-xs font-semibold text-capacity-red"
            >
              {error}
            </p>
          )}
          {items === null ? (
            <p className="flex items-center gap-2 py-4 text-sm text-ink-400">
              <Loader2 size={14} className="animate-spin" /> Memuat…
            </p>
          ) : items.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-400">
              Belum ada notifikasi untuk cafe ini.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="py-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                      {TYPE_LABEL[n.type] ?? n.type}
                    </span>
                    {n.reservationCode && (
                      <span className="text-xs font-semibold text-ink-700">
                        {n.reservationCode}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-ink-400">
                      {timeLabel(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-800">{n.message}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {n.guestName ? `${n.guestName} · ` : ""}
                    {n.channel === "whatsapp" ? "WhatsApp" : n.channel} →{" "}
                    {n.recipient}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-ink-400">
            Pengiriman WhatsApp masih simulasi: log ini mencatat pesan yang akan
            dikirim ke tamu.
          </p>
        </div>
      )}
    </section>
  );
}
