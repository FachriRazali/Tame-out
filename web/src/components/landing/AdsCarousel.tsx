"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BoostedCafe } from "@/lib/types";
import { Megaphone, ChevronLeft, ChevronRight } from "@/components/ui/icons";

const ROTATE_MS = 5500;

// Slide of boosted/sponsored cafes, shown between the search bar and the
// sort/filter bar on the landing page. Renders nothing if there are no
// boosted cafes right now, so it never leaves an empty gap in the layout.
export function AdsCarousel() {
  const [cafes, setCafes] = useState<BoostedCafe[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetch("/api/cafes/boosted")
      .then((r) => r.json())
      .then((d) => setCafes(d.data ?? []))
      .catch(() => setCafes([]));
  }, []);

  useEffect(() => {
    if (cafes.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % cafes.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [cafes.length]);

  if (cafes.length === 0) return null;

  const cafe = cafes[Math.min(active, cafes.length - 1)];

  function go(delta: number) {
    setActive((i) => (i + delta + cafes.length) % cafes.length);
  }

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl shadow-card ring-1 ring-ink-900/5">
      <Link href={`/cafe/${cafe.id}`} className="group block">
        <div className="relative h-32 w-full overflow-hidden sm:h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cafe.coverImageUrl}
            alt={cafe.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-ink-950/40 to-transparent" />

          <div className="absolute inset-y-0 left-0 flex max-w-[80%] flex-col justify-center gap-1 px-5 text-white sm:max-w-[65%] sm:px-6">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">
              <Megaphone size={12} /> Promoted
            </span>
            <h3 className="text-lg font-extrabold leading-tight sm:text-xl">{cafe.name}</h3>
            {cafe.boostTagline && <p className="text-xs text-white/85 sm:text-sm">{cafe.boostTagline}</p>}
          </div>
        </div>
      </Link>

      {cafes.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              go(-1);
            }}
            aria-label="Previous promoted cafe"
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition hover:bg-black/50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              go(1);
            }}
            aria-label="Next promoted cafe"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white transition hover:bg-black/50"
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {cafes.map((c, i) => (
              <button
                key={c.id}
                onClick={(e) => {
                  e.preventDefault();
                  setActive(i);
                }}
                aria-label={`Show promoted cafe ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
