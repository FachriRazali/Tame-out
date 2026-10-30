"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthStatus } from "@/components/ui/AuthStatus";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  TriangleAlert,
  Users,
} from "@/components/ui/icons";
import type { MyReservation } from "@/lib/store";

type Item = MyReservation;

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
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

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

// "Active" = still ahead of you: waiting for payment or confirmed, and the slot
// hasn't ended yet. Everything else (done, cancelled, expired, or a slot that
// has already passed) is history.
function isActive(r: Item, now: number) {
  return (
    (r.status === "pending_payment" ||
      r.status === "confirmed" ||
      r.status === "checked_in") &&
    new Date(r.endTime).getTime() > now
  );
}

// Only a booking that is still waiting for payment or confirmed — and has not
// finished — can be cancelled. Someone who is already seated is checked out by
// the cashier instead.
function canCancel(r: Item, now: number) {
  return (
    (r.status === "pending_payment" || r.status === "confirmed") &&
    new Date(r.endTime).getTime() > now
  );
}

export default function MyReservationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reservations/mine", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?next=/reservations");
        return;
      }
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error?.message ?? "Could not load your reservations.",
        );
      setItems(data.data);
      setLoadError(null);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load your reservations.",
      );
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const active = (items ?? []).filter((r) => isActive(r, now));
  const past = (items ?? []).filter((r) => !isActive(r, now));

  return (
    <main className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-surface/80 glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Tame'out home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold text-ink-600">
            <AuthStatus />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft size={15} /> Back to cafes
        </Link>
        <h1 className="text-2xl font-extrabold text-ink-900">
          My reservations
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Everything you've booked with your account. You can cancel an upcoming
          reservation right here.
        </p>

        {loadError && (
          <div
            role="alert"
            className="mt-6 rounded-xl bg-capacity-redBg p-4 text-sm font-medium text-capacity-red"
          >
            {loadError}{" "}
            <button onClick={load} className="font-bold underline">
              Try again
            </button>
          </div>
        )}

        {items === null && !loadError && (
          <div className="mt-10 flex justify-center text-ink-400">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {items && items.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-ink-100 bg-surface p-8 text-center">
            <CalendarDays className="mx-auto mb-2 text-ink-300" />
            <p className="font-semibold text-ink-900">No reservations yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Pick a cafe and a free table — it will show up here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              Find a cafe
            </Link>
          </div>
        )}

        {items && items.length > 0 && (
          <>
            <Section
              title="Upcoming"
              empty="Nothing coming up."
              list={active}
              onChanged={load}
              now={now}
            />
            <Section
              title="History"
              empty="No past reservations yet."
              list={past}
              onChanged={load}
              now={now}
            />
          </>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  empty,
  list,
  onChanged,
  now,
}: {
  title: string;
  empty: string;
  list: Item[];
  onChanged: () => void;
  now: number;
}) {
  return (
    <section className="mt-8" aria-label={title}>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">
        {title} <span className="text-ink-300">· {list.length}</span>
      </h2>
      {list.length === 0 ? (
        <p className="rounded-xl bg-surface p-4 text-sm text-ink-400 ring-1 ring-ink-900/5">
          {empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <ReservationCard key={r.id} r={r} onChanged={onChanged} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReservationCard({
  r,
  onChanged,
  now,
}: {
  r: Item;
  onChanged: () => void;
  now: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { date, time } = formatWhen(r.startTime);
  const holdExpired =
    r.status === "pending_payment" &&
    r.paymentHoldExpiresAt != null &&
    new Date(r.paymentHoldExpiresAt).getTime() < now;
  const label = holdExpired
    ? "Payment time ran out"
    : (STATUS_LABEL[r.status] ?? r.status);
  const badge = holdExpired
    ? "bg-ink-100 text-ink-600"
    : (BADGE[r.status] ?? "bg-ink-100 text-ink-600");
  const dpPaid = r.downPayment?.status === "paid";
  const cancellable = canCancel(r, now);

  async function cancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${r.id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error?.message ?? "Could not cancel this reservation.",
        );
      }
      onChanged();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not cancel this reservation.",
      );
      setCancelling(false);
    }
  }

  return (
    <li
      className="rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-ink-900/5"
      data-testid="reservation-card"
      data-code={r.reservationCode}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/cafe/${r.cafeId}`}
            className="block truncate text-base font-bold text-ink-900 hover:underline"
          >
            {r.cafeName}
          </Link>
          <p className="font-mono text-xs text-ink-400">{r.reservationCode}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}
        >
          {label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-600">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={14} className="text-ink-400" /> {date}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="text-ink-400" /> {time}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin size={14} className="text-ink-400" /> Table{" "}
          {r.tableCode ?? "—"}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} className="text-ink-400" /> {r.partySize}{" "}
          {r.partySize === 1 ? "guest" : "guests"}
        </span>
      </div>

      {r.downPayment && (
        <p className="mt-2 text-xs text-ink-500">
          Down payment {formatIDR(r.downPayment.amount)} ·{" "}
          {dpPaid
            ? "paid"
            : r.downPayment.status === "pending" && !holdExpired
              ? "not paid yet"
              : r.downPayment.status}
        </p>
      )}

      {cancellable && !confirming && (
        <div className="mt-4 border-t border-dashed border-ink-100 pt-3">
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-capacity-red/40 px-3 py-1.5 text-sm font-semibold text-capacity-red transition hover:bg-capacity-redBg"
          >
            Cancel reservation
          </button>
        </div>
      )}

      {cancellable && confirming && (
        <div
          role="alertdialog"
          aria-label="Confirm cancellation"
          className="mt-4 rounded-xl bg-capacity-redBg p-3"
        >
          <p className="flex items-start gap-2 text-sm font-semibold text-ink-900">
            <TriangleAlert
              size={16}
              className="mt-0.5 shrink-0 text-capacity-red"
            />
            Cancel this reservation? Your table will be released for other
            guests.
          </p>
          {dpPaid && (
            <p className="mt-1.5 pl-6 text-xs text-ink-600">
              Your down payment of {formatIDR(r.downPayment!.amount)} has
              already been paid. Cancelling does not refund it automatically —
              please contact the cafe about a refund.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-2 pl-6 text-sm font-medium text-capacity-red"
            >
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2 pl-6">
            <button
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={cancelling}
              className="rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-ink-50 disabled:opacity-50"
            >
              Keep it
            </button>
            <button
              onClick={cancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 rounded-lg bg-capacity-red px-3 py-1.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50"
            >
              {cancelling && <Loader2 size={14} className="animate-spin" />}
              Yes, cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
