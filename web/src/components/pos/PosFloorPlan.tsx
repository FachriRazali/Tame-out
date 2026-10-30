"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { CafeTable, Reservation } from "@/lib/types";
import type { PosFloor } from "@/lib/store";
import { RoomOutline } from "@/components/floorplan/RoomOutline";
import {
  STATUS_FILL,
  STATUS_LABEL,
  TableShape,
} from "@/components/floorplan/TableShape";
import {
  Building2,
  DoorOpen,
  Flame,
  Plug,
  TreePine,
} from "@/components/ui/icons";

export type PosTable = CafeTable & { reservation?: Reservation };

const ZONE_ICON = {
  indoor: DoorOpen,
  outdoor: TreePine,
  smoking: Flame,
} as const;

interface Props {
  floors: PosFloor[];
  tables: PosTable[];
  selectedTableId?: number | null;
  onSelectTable: (table: PosTable) => void;
}

// The cashier's table view: the very same drawn layout the floor plan builder
// and the customer page use (room outline, table shapes, stop kontak), split
// into one button per building level and, inside a level, one button per zone.
// Only the behaviour differs — tapping a table opens the POS actions
// (check-in, checkout, reserve, maintenance...), it does not start a booking.
export function PosFloorPlan({
  floors,
  tables,
  selectedTableId,
  onSelectTable,
}: Props) {
  const [activeFloorId, setActiveFloorId] = useState<number | undefined>(
    floors[0]?.id,
  );

  // Keep a valid floor selected when the floor list changes (zone deleted, first load).
  useEffect(() => {
    if (floors.length > 0 && !floors.some((f) => f.id === activeFloorId))
      setActiveFloorId(floors[0].id);
  }, [floors, activeFloorId]);

  const activeFloor = floors.find((f) => f.id === activeFloorId) ?? floors[0];
  const levels = useMemo(
    () => [...new Set(floors.map((f) => f.level))].sort((a, b) => a - b),
    [floors],
  );
  const floorsOnLevel = useMemo(
    () => floors.filter((f) => f.level === activeFloor?.level),
    [floors, activeFloor],
  );

  const free = (list: PosTable[]) =>
    list.filter((t) => t.status === "available").length;
  const tablesOfFloor = (floorId: number) =>
    tables.filter((t) => t.floorId === floorId);
  const tablesOfLevel = (level: number) =>
    tables.filter((t) =>
      floors.some((f) => f.id === t.floorId && f.level === level),
    );

  if (!activeFloor) {
    return (
      <div className="rounded-2xl bg-surface p-10 text-center text-sm text-ink-400 ring-1 ring-ink-900/5">
        Belum ada denah. Buat lantai dan zona dulu di Floor Plan Builder.
      </div>
    );
  }

  function selectLevel(level: number) {
    const first = floors.find((f) => f.level === level);
    if (first) setActiveFloorId(first.id);
  }

  const floorTables = tablesOfFloor(activeFloor.id);

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-ink-900/5 sm:p-6">
      {/* One button per level */}
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Lantai"
      >
        {levels.map((level) => (
          <button
            key={level}
            role="tab"
            aria-selected={activeFloor.level === level}
            onClick={() => selectLevel(level)}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition",
              activeFloor.level === level
                ? "bg-brand-600 text-white"
                : "bg-ink-100 text-ink-700 hover:bg-ink-200",
            )}
          >
            <Building2 size={14} /> Lantai {level}
            <span
              className={clsx(
                "text-xs font-semibold",
                activeFloor.level === level ? "text-white/80" : "text-ink-500",
              )}
            >
              · {free(tablesOfLevel(level))} kosong
            </span>
          </button>
        ))}
      </div>

      {/* Within the level: one button per zone */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Zona">
          {floorsOnLevel.map((f) => {
            const Icon = ZONE_ICON[f.zoneType] ?? DoorOpen;
            const list = tablesOfFloor(f.id);
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={activeFloorId === f.id}
                onClick={() => setActiveFloorId(f.id)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  activeFloorId === f.id
                    ? "bg-ink-900 text-white"
                    : "bg-ink-50 text-ink-600 hover:bg-ink-100",
                )}
              >
                <Icon size={14} /> {f.name}
                <span
                  className={clsx(
                    "text-xs",
                    activeFloorId === f.id ? "text-white/70" : "text-ink-400",
                  )}
                >
                  · {free(list)}/{list.length}
                </span>
              </button>
            );
          })}
        </div>
        <Legend />
      </div>

      <div className="overflow-auto rounded-xl border border-dashed border-ink-100 bg-ink-50/60 p-2">
        <svg
          viewBox={`0 0 ${activeFloor.canvasWidth} ${activeFloor.canvasHeight}`}
          width="100%"
          className="max-h-[560px] w-full"
          style={{ minWidth: 480 }}
          data-testid="pos-floor-svg"
        >
          <rect
            width={activeFloor.canvasWidth}
            height={activeFloor.canvasHeight}
            fill="transparent"
          />
          <RoomOutline
            points={activeFloor.outlinePoints}
            width={activeFloor.canvasWidth}
            height={activeFloor.canvasHeight}
            shadeOutside={false}
          />
          {floorTables.map((t) => (
            <TableShape
              key={t.id}
              table={t}
              selected={t.id === selectedTableId}
              onClick={() => onSelectTable(t)}
              tooltip={
                t.reservation
                  ? `${t.tableCode} · ${STATUS_LABEL[t.status]} · ${t.reservation.guestName ?? "Registered guest"} (${t.reservation.partySize} tamu)`
                  : `${t.tableCode} · ${STATUS_LABEL[t.status]}`
              }
            />
          ))}
        </svg>
      </div>
      {floorTables.length === 0 && (
        <p className="mt-3 text-center text-xs text-ink-400">
          Zona ini belum punya meja.
        </p>
      )}
      <p className="mt-3 text-center text-xs text-ink-400">
        Tap meja untuk check-in, checkout, reservasi, atau maintenance.
      </p>
    </div>
  );
}

function Legend() {
  const items = (
    ["available", "reserved", "occupied", "maintenance"] as const
  ).map((s) => ({ color: STATUS_FILL[s], label: STATUS_LABEL[s] }));
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-600">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <Plug size={12} strokeWidth={2.2} /> = stop kontak
      </span>
    </div>
  );
}
