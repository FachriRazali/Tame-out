"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Cafe } from "@/lib/types";
import { formatDistance } from "@/lib/haversine";
import { CapacityBadge } from "@/components/ui/CapacityBadge";
import { MapPin, Pin, Star, Users } from "@/components/ui/icons";
import clsx from "clsx";

// Price badge — driven by avgPriceIdr (the same number the landing page's
// price-bucket filter uses). Deliberately ONE neutral style for every price:
// colouring cheap/pricey cafes differently would put a label on them (e.g. red
// or orange = "expensive") that reads as a judgement of the cafe.
const PRICE_BADGE_STYLE = "bg-surface/90 text-ink-900 ring-1 ring-ink-900/10";

// "35000" -> "35rb", "100000" -> "100rb" — compact rupiah shorthand that
// matches the "< 25rb" / "75-100rb+" labels used in the filter bar.
function formatRupiahShort(amount: number): string {
  return `${Math.round(amount / 1000)}rb`;
}

// Grid is forced to 3 columns at every breakpoint (see page.tsx), so on a
// ~390px phone each card is only ~110px wide. Below `sm` this card switches
// to a compact layout (smaller image, a dot-only availability indicator
// instead of the full "Seats open · 54%" pill, tighter type) so nothing
// overflows or wraps weirdly; from `sm` up (more room per column — tablets
// still get 3 columns too, just much wider ones) it's back to the original,
// roomier card.
export function CafeCard({ cafe, index }: { cafe: Cafe; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link
        href={`/cafe/${cafe.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-ink-900/5 transition hover:-translate-y-1 hover:shadow-card sm:rounded-2xl"
      >
        <div className="relative h-20 w-full overflow-hidden sm:h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cafe.coverImageUrl}
            alt={cafe.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />

          {/* Mobile: just a colored status dot (full pill has no room at ~110px). */}
          <span
            className={clsx(
              "absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full shadow-sm ring-2 ring-white/80 sm:hidden",
              cafe.liveCapacity.color === "green" && "bg-capacity-green",
              cafe.liveCapacity.color === "yellow" && "bg-capacity-yellow",
              cafe.liveCapacity.color === "red" && "bg-capacity-red",
            )}
          />
          {/* sm+: the full "Seats open · 54%" badge. */}
          <div className="absolute left-3 top-3 hidden sm:block">
            <CapacityBadge
              color={cafe.liveCapacity.color}
              occupancyPct={cafe.liveCapacity.occupancyPct}
            />
          </div>

          {/* Pinned by the super admin (Ranking & featured in /admin). */}
          {cafe.isBoosted && (
            <span
              title="Featured"
              className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-brand-mustard px-1.5 py-0.5 text-[8px] font-bold text-brand-dark shadow-sm sm:bottom-3 sm:left-3 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-xs"
            >
              <Pin size={9} className="sm:hidden" />
              <Pin size={12} className="hidden sm:block" />
              <span className="hidden sm:inline">Featured</span>
            </span>
          )}

          <div
            className={`absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide shadow-sm backdrop-blur sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs ${PRICE_BADGE_STYLE}`}
          >
            ~{formatRupiahShort(cafe.avgPriceIdr)}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-2 sm:gap-2 sm:p-4">
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <h3 className="line-clamp-2 text-[11px] font-bold leading-tight text-ink-900 sm:line-clamp-1 sm:text-base">
              {cafe.name}
            </h3>
            <div className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-ink-800 sm:gap-1 sm:text-sm">
              <Star
                size={10}
                className="fill-brand-mustard text-brand-mustard sm:hidden"
              />
              <Star
                size={14}
                className="hidden fill-brand-mustard text-brand-mustard sm:block"
              />
              {cafe.avgRating}
            </div>
          </div>

          <div className="flex items-center gap-1 truncate text-[9px] text-ink-400 sm:text-xs">
            <MapPin size={10} className="shrink-0 sm:hidden" />
            <MapPin size={13} className="hidden shrink-0 sm:block" />
            <span className="truncate">{cafe.districtName}</span>
            {cafe.distanceKm !== undefined && (
              <span className="hidden shrink-0 text-ink-600 sm:inline">
                {" "}
                · {formatDistance(cafe.distanceKm)}
              </span>
            )}
          </div>

          {/* Full "X tables open of Y" + hover link — only where there's room (sm+). */}
          <div className="mt-auto hidden items-center justify-between pt-2 text-xs text-ink-600 sm:flex">
            <span className="flex items-center gap-1">
              <Users size={13} />
              {cafe.liveCapacity.tablesAvailable} tables open of{" "}
              {cafe.liveCapacity.totalTables}
            </span>
            <span className="font-semibold text-brand-700 opacity-0 transition group-hover:opacity-100">
              View floor plan →
            </span>
          </div>
          {/* Mobile: same info, abbreviated to one short line. */}
          <div className="mt-auto flex items-center gap-1 pt-1 text-[9px] font-semibold text-ink-600 sm:hidden">
            <Users size={9} />
            {cafe.liveCapacity.tablesAvailable}/{cafe.liveCapacity.totalTables}{" "}
            meja
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
