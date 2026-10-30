"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { RoomOutline } from "@/components/floorplan/RoomOutline";
import { RoomShapeOverlay } from "@/components/builder/RoomShapeOverlay";
import {
  SHAPE_PRESETS,
  pointInPolygon,
} from "@/components/builder/shapePresets";
import {
  CafeTable,
  Floor,
  OutlinePoint,
  TableShape as TableShapeType,
  ZoneType,
} from "@/lib/types";
import { BuilderTableNode } from "./BuilderTableNode";
import {
  Building2,
  Check,
  DoorOpen,
  Flame,
  Loader2,
  Pencil,
  Plug,
  Plus,
  RotateCw,
  Trash2,
  TreePine,
} from "@/components/ui/icons";

const ZONE_ICON: Record<ZoneType, typeof DoorOpen> = {
  indoor: DoorOpen,
  outdoor: TreePine,
  smoking: Flame,
};
const SHAPE_DEFAULTS: Record<
  TableShapeType,
  { width: number; height: number; capacity: number }
> = {
  round: { width: 84, height: 84, capacity: 4 },
  square: { width: 84, height: 84, capacity: 2 },
  rectangle: { width: 130, height: 70, capacity: 6 },
  sofa: { width: 110, height: 70, capacity: 4 },
  bar: { width: 60, height: 100, capacity: 1 },
};

let tempId = -1;

export function FloorPlanBuilder({
  initialFloors,
  cafeId,
}: {
  initialFloors: Floor[];
  cafeId: number;
}) {
  const [floors, setFloors] = useState<Floor[]>(initialFloors);
  const [activeFloorId, setActiveFloorId] = useState(initialFloors[0]?.id);
  const [activeLevel, setActiveLevel] = useState(initialFloors[0]?.level ?? 1);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [creatingZone, setCreatingZone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Freeform custom room outline (L-shape, plus-shape, ...) — a polygon the
  // merchant draws point by point, stored/rendered as a clip-shaped overlay.
  const [shapeEditMode, setShapeEditMode] = useState(false);
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>(
    [],
  );
  const [savingShape, setSavingShape] = useState(false);
  const [shapeSavedAt, setShapeSavedAt] = useState<Date | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const levels = useMemo(
    () => [...new Set(floors.map((f) => f.level))].sort((a, b) => a - b),
    [floors],
  );
  const floorsOnLevel = useMemo(
    () => floors.filter((f) => f.level === activeLevel),
    [floors, activeLevel],
  );
  const activeFloor =
    floors.find((f) => f.id === activeFloorId) ?? floorsOnLevel[0] ?? floors[0];
  const selectedTable =
    activeFloor?.tables.find((t) => t.id === selectedTableId) ?? null;

  // Tables whose centre falls outside the room outline (the draft while editing,
  // otherwise the saved one). Customers only see the room, so these would float
  // outside it — warn the merchant instead of silently hiding bookable tables.
  const tablesOutsideShape = useMemo(() => {
    if (!activeFloor) return [] as string[];
    const poly = shapeEditMode
      ? draftPoints
      : (activeFloor.outlinePoints ?? []).map(([px, py]) => ({
          x: (px / 100) * activeFloor.canvasWidth,
          y: (py / 100) * activeFloor.canvasHeight,
        }));
    if (poly.length < 3) return [];
    return activeFloor.tables
      .filter(
        (t) => !pointInPolygon(t.x + t.width / 2, t.y + t.height / 2, poly),
      )
      .map((t) => t.tableCode);
  }, [activeFloor, shapeEditMode, draftPoints]);

  // Zone / level settings: rename, change type, delete.
  const [nameDraft, setNameDraft] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<"zone" | "level" | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [metaNotice, setMetaNotice] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(activeFloor?.name ?? "");
    setConfirmDelete(null);
    setMetaNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFloor?.id]);

  async function saveZoneMeta(patch: { name?: string; zoneType?: ZoneType }) {
    if (!activeFloor) return;
    const floorId = activeFloor.id;
    setSavingMeta(true);
    setErrorMsg(null);
    setMetaNotice(null);
    try {
      const res = await apiFetch(`/api/merchant/floors/${floorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok)
        throw new Error(
          await describeFailure(res, "Could not update this zone."),
        );
      const saved: { name: string; zoneType: ZoneType } = await res.json();
      updateFloor(floorId, (f) => ({
        ...f,
        name: saved.name,
        zoneType: saved.zoneType,
      }));
      setNameDraft(saved.name);
      setMetaNotice("Zona diperbarui ✓");
    } catch (e) {
      setErrorMsg(friendlyNetworkError(e, "Could not update this zone."));
    } finally {
      setSavingMeta(false);
    }
  }

  // After a delete, land on a sensible floor (same level first, else any).
  function afterDelete(removedIds: number[], preferLevel?: number) {
    const rest = floors.filter((f) => !removedIds.includes(f.id));
    setFloors(rest);
    setSelectedTableId(null);
    setConfirmDelete(null);
    const next = rest.find((f) => f.level === preferLevel) ?? rest[0];
    setActiveFloorId(next?.id as number);
    if (next) setActiveLevel(next.level);
  }

  async function deleteZone() {
    if (!activeFloor) return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/merchant/floors/${activeFloor.id}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          await describeFailure(res, "Could not delete this zone."),
        );
      afterDelete([activeFloor.id], activeFloor.level);
    } catch (e) {
      setConfirmDelete(null);
      setErrorMsg(friendlyNetworkError(e, "Could not delete this zone."));
    } finally {
      setDeleting(false);
    }
  }

  async function deleteLevel() {
    if (!activeFloor) return;
    setDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/merchant/floors?cafeId=${cafeId}&level=${activeLevel}`,
        { method: "DELETE" },
      );
      if (!res.ok)
        throw new Error(
          await describeFailure(res, "Could not delete this floor level."),
        );
      afterDelete(
        floors.filter((f) => f.level === activeLevel).map((f) => f.id),
        undefined,
      );
    } catch (e) {
      setConfirmDelete(null);
      setErrorMsg(
        friendlyNetworkError(e, "Could not delete this floor level."),
      );
    } finally {
      setDeleting(false);
    }
  }

  function selectLevel(level: number) {
    setActiveLevel(level);
    const firstOnLevel = floors.find((f) => f.level === level);
    if (firstOnLevel) setActiveFloorId(firstOnLevel.id);
    setSelectedTableId(null);
  }

  function updateFloor(floorId: number, updater: (f: Floor) => Floor) {
    setFloors((prev) => prev.map((f) => (f.id === floorId ? updater(f) : f)));
  }

  function addTable(shape: TableShapeType) {
    if (!activeFloor) return;
    const defaults = SHAPE_DEFAULTS[shape];
    const code = `T${activeFloor.tables.length + 1}`;
    const newTable: CafeTable = {
      id: tempId--,
      floorId: activeFloor.id,
      cafeId,
      tableCode: code,
      shape,
      x: 40 + ((activeFloor.tables.length * 24) % 300),
      y: 40 + ((activeFloor.tables.length * 18) % 200),
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      capacity: defaults.capacity,
      status: "available",
      currentReservationId: null,
      hasPowerOutlet: false,
      powerOutletCount: 1,
    };
    updateFloor(activeFloor.id, (f) => ({
      ...f,
      tables: [...f.tables, newTable],
    }));
    setSelectedTableId(newTable.id);
  }

  async function addZone(zone: ZoneType, level: number = activeLevel) {
    setCreatingZone(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/merchant/floors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId,
          name: `${zone[0].toUpperCase()}${zone.slice(1)} Zone`,
          zoneType: zone,
          level,
        }),
      });
      if (!res.ok)
        throw new Error(
          await describeFailure(
            res,
            "Could not create this zone. Please try again.",
          ),
        );
      const newFloor: Floor = await res.json();
      setFloors((prev) => [...prev, newFloor]);
      setActiveLevel(newFloor.level);
      setActiveFloorId(newFloor.id);
    } catch (e) {
      setErrorMsg(friendlyNetworkError(e, "Could not create this zone."));
    } finally {
      setCreatingZone(false);
    }
  }

  function addLevel() {
    const nextLevel = (levels.at(-1) ?? 0) + 1;
    addZone("indoor", nextLevel);
  }

  function onPointerDown(e: React.PointerEvent, table: CafeTable) {
    e.stopPropagation();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect || !activeFloor) return;
    const floorId = activeFloor.id;
    const maxX = activeFloor.canvasWidth - 40;
    const maxY = activeFloor.canvasHeight - 40;
    dragState.current = {
      id: table.id,
      offsetX: e.clientX - canvasRect.left - table.x,
      offsetY: e.clientY - canvasRect.top - table.y,
    };
    setSelectedTableId(table.id);

    // The very same function objects are added and removed, so nothing leaks
    // between drags (the old version removed a different closure than it added).
    const move = (ev: PointerEvent) => {
      const drag = dragState.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!drag || !rect) return;
      const x = Math.max(
        0,
        Math.min(maxX, ev.clientX - rect.left - drag.offsetX),
      );
      const y = Math.max(
        0,
        Math.min(maxY, ev.clientY - rect.top - drag.offsetY),
      );
      updateFloor(floorId, (f) => ({
        ...f,
        tables: f.tables.map((t) => (t.id === drag.id ? { ...t, x, y } : t)),
      }));
    };
    const up = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function patchSelected(patch: Partial<CafeTable>) {
    if (!activeFloor || !selectedTable) return;
    updateFloor(activeFloor.id, (f) => ({
      ...f,
      tables: f.tables.map((t) =>
        t.id === selectedTable.id ? { ...t, ...patch } : t,
      ),
    }));
  }

  function deleteSelected() {
    if (!activeFloor || !selectedTable) return;
    updateFloor(activeFloor.id, (f) => ({
      ...f,
      tables: f.tables.filter((t) => t.id !== selectedTable.id),
    }));
    setSelectedTableId(null);
  }

  async function saveLayout() {
    if (!activeFloor) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(
        `/api/merchant/floors/${activeFloor.id}/layout`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tables: layoutPayload(activeFloor.tables),
          }),
        },
      );
      if (!res.ok)
        throw new Error(
          await describeFailure(
            res,
            "Could not save this layout. Please try again.",
          ),
        );
      setSavedAt(new Date());
    } catch (e) {
      setErrorMsg(friendlyNetworkError(e, "Could not save this layout."));
    } finally {
      setSaving(false);
    }
  }

  function startShapeEdit() {
    if (!activeFloor) return;
    const existing = activeFloor.outlinePoints;
    setDraftPoints(
      existing && existing.length >= 3
        ? existing.map(([px, py]) => ({
            x: (px / 100) * activeFloor.canvasWidth,
            y: (py / 100) * activeFloor.canvasHeight,
          }))
        : [],
    );
    setSelectedTableId(null);
    setSelectedPoint(null);
    setShapeEditMode(true);
  }

  function cancelShapeEdit() {
    setShapeEditMode(false);
    setDraftPoints([]);
    setSelectedPoint(null);
  }

  function applyPreset(points: OutlinePoint[]) {
    if (!activeFloor) return;
    setDraftPoints(
      points.map(([px, py]) => ({
        x: Math.round(((px / 100) * activeFloor.canvasWidth) / 10) * 10,
        y: Math.round(((py / 100) * activeFloor.canvasHeight) / 10) * 10,
      })),
    );
    setSelectedPoint(null);
  }

  async function saveShape(overridePoints?: { x: number; y: number }[]) {
    if (!activeFloor) return;
    const points = overridePoints ?? draftPoints;
    setSavingShape(true);
    setErrorMsg(null);
    try {
      const outlinePoints: OutlinePoint[] | null =
        points.length >= 3
          ? points.map((p): OutlinePoint => [
              Math.round((p.x / activeFloor.canvasWidth) * 1000) / 10,
              Math.round((p.y / activeFloor.canvasHeight) * 1000) / 10,
            ])
          : null;
      // Primary path: the dedicated /shape endpoint (PUT — the same method the
      // layout save uses; PATCH gets dropped by some networks/proxies/extensions
      // and the browser then reports a bare "Failed to fetch").
      // Fallback path: if that request never reaches the server, or the
      // endpoint is missing/blocked (404/405), send the shape together with the
      // layout save, which is the request that is known to go through.
      let saved: { outlinePoints?: OutlinePoint[] | null } | null = null;
      try {
        const res = await apiFetch(
          `/api/merchant/floors/${activeFloor.id}/shape`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ outlinePoints }),
          },
        );
        if (res.ok) saved = await res.json();
        else if (res.status !== 404 && res.status !== 405)
          throw new Error(
            await describeFailure(res, "Could not save this room shape."),
          );
      } catch (e) {
        if (!(e instanceof TypeError)) throw e; // real server error: show it, don't mask it
      }
      if (!saved) {
        const res = await apiFetch(
          `/api/merchant/floors/${activeFloor.id}/layout`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tables: layoutPayload(activeFloor.tables),
              outlinePoints,
            }),
          },
        );
        if (!res.ok)
          throw new Error(
            await describeFailure(res, "Could not save this room shape."),
          );
        const body = await res.json();
        saved = { outlinePoints: body.outlinePoints ?? outlinePoints };
        setSavedAt(new Date());
      }
      const data = saved;
      updateFloor(activeFloor.id, (f) => ({
        ...f,
        outlinePoints: data.outlinePoints ?? outlinePoints,
      }));
      setShapeEditMode(false);
      setDraftPoints([]);
      setSelectedPoint(null);
      setShapeSavedAt(new Date());
    } catch (e) {
      setErrorMsg(friendlyNetworkError(e, "Could not save this room shape."));
    } finally {
      setSavingShape(false);
    }
  }

  // A cafe super_admin just created has zero floors — show the "add your
  // first level" prompt instead of rendering nothing, so there's always a
  // way to bootstrap a brand-new cafe's seating plan from this page.
  if (!activeFloor) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <div>
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-capacity-red/30 bg-capacity-redBg px-3 py-2 text-xs font-semibold text-capacity-red">
              {errorMsg}
            </div>
          )}
          <Panel title="Building floor">
            <p className="mb-3 text-sm text-ink-400">
              This cafe has no floor/zone yet. Add the first one to start the
              seating plan.
            </p>
            <button
              onClick={addLevel}
              disabled={creatingZone}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-200 py-2 text-xs font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
            >
              {creatingZone ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}{" "}
              Add floor level
            </button>
          </Panel>
        </div>
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-ink-200 text-sm text-ink-400">
          Add a floor level on the left to start placing tables.
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr_260px]">
      {/* Left: levels + zones + palette */}
      <div className="space-y-4">
        {errorMsg && (
          <div className="rounded-xl border border-capacity-red/30 bg-capacity-redBg px-3 py-2 text-xs font-semibold text-capacity-red">
            {errorMsg}
          </div>
        )}

        <Panel title="Building floor">
          <div className="space-y-1.5">
            {levels.map((level) => (
              <button
                key={level}
                onClick={() => selectLevel(level)}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                  level === activeLevel
                    ? "bg-brand-600 text-white"
                    : "bg-ink-50 text-ink-700 hover:bg-ink-100",
                )}
              >
                <Building2 size={14} /> Lantai {level}
              </button>
            ))}
          </div>
          <button
            onClick={addLevel}
            disabled={creatingZone}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-200 py-2 text-xs font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
          >
            {creatingZone ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}{" "}
            Add floor level
          </button>
          {confirmDelete === "level" ? (
            <div className="mt-2 rounded-lg border border-capacity-red/30 bg-capacity-redBg p-2.5 text-xs text-capacity-red">
              <p className="font-semibold">
                Hapus Lantai {activeLevel} beserta {floorsOnLevel.length} zona
                &amp; {floorsOnLevel.reduce((n, f) => n + f.tables.length, 0)}{" "}
                meja? Tidak bisa dibatalkan.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  onClick={deleteLevel}
                  disabled={deleting}
                  className="rounded-lg bg-capacity-red py-1.5 font-bold text-white disabled:opacity-60"
                  data-testid="confirm-delete-level"
                >
                  {deleting ? "Menghapus…" : "Ya, hapus"}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-lg bg-surface py-1.5 font-semibold text-ink-600"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete("level")}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink-100 py-1.5 text-xs font-semibold text-ink-500 hover:border-capacity-red/40 hover:text-capacity-red"
              data-testid="delete-level"
            >
              <Trash2 size={13} /> Hapus Lantai {activeLevel}
            </button>
          )}
        </Panel>

        <Panel title="Zones">
          <div className="space-y-1.5">
            {floorsOnLevel.map((f) => {
              const Icon = ZONE_ICON[f.zoneType];
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFloorId(f.id);
                    setSelectedTableId(null);
                  }}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                    f.id === activeFloorId
                      ? "bg-ink-900 text-white"
                      : "bg-ink-50 text-ink-700 hover:bg-ink-100",
                  )}
                >
                  <Icon size={14} /> {f.name}
                  <span className="ml-auto text-xs opacity-70">
                    {f.tables.length}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {(["indoor", "outdoor", "smoking"] as ZoneType[]).map((z) => {
              const Icon = ZONE_ICON[z];
              return (
                <button
                  key={z}
                  onClick={() => addZone(z)}
                  disabled={creatingZone}
                  className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-ink-200 py-2 text-[10px] font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
                >
                  <Icon size={14} /> +{z}
                </button>
              );
            })}
          </div>

          <div
            className="mt-4 space-y-2 border-t border-dashed border-ink-100 pt-3"
            data-testid="zone-settings"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
              Pengaturan zona terpilih
            </p>
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (nameDraft.trim() && nameDraft.trim() !== activeFloor.name)
                  saveZoneMeta({ name: nameDraft });
              }}
            >
              <input
                value={nameDraft}
                maxLength={40}
                onChange={(e) => setNameDraft(e.target.value)}
                aria-label="Nama zona"
                placeholder="Nama zona"
                className="min-w-0 flex-1 rounded-lg border border-ink-100 bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink-900"
              />
              <button
                type="submit"
                disabled={
                  savingMeta ||
                  !nameDraft.trim() ||
                  nameDraft.trim() === activeFloor.name
                }
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {savingMeta ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}{" "}
                Simpan
              </button>
            </form>
            <select
              value={activeFloor.zoneType}
              onChange={(e) =>
                saveZoneMeta({ zoneType: e.target.value as ZoneType })
              }
              disabled={savingMeta}
              aria-label="Tipe zona"
              className="w-full rounded-lg border border-ink-100 bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-700"
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="smoking">Smoking</option>
            </select>
            {metaNotice && (
              <p className="text-[11px] font-semibold text-capacity-green">
                {metaNotice}
              </p>
            )}

            {confirmDelete === "zone" ? (
              <div className="rounded-lg border border-capacity-red/30 bg-capacity-redBg p-2.5 text-xs text-capacity-red">
                <p className="font-semibold">
                  Hapus zona &ldquo;{activeFloor.name}&rdquo; dan{" "}
                  {activeFloor.tables.length} mejanya? Tidak bisa dibatalkan.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={deleteZone}
                    disabled={deleting}
                    className="rounded-lg bg-capacity-red py-1.5 font-bold text-white disabled:opacity-60"
                    data-testid="confirm-delete-zone"
                  >
                    {deleting ? "Menghapus…" : "Ya, hapus"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="rounded-lg bg-surface py-1.5 font-semibold text-ink-600"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete("zone")}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink-100 py-1.5 text-xs font-semibold text-ink-500 hover:border-capacity-red/40 hover:text-capacity-red"
                data-testid="delete-zone"
              >
                <Trash2 size={13} /> Hapus zona ini
              </button>
            )}
          </div>
        </Panel>

        <Panel title="Add table">
          <div className="space-y-2">
            {(["round", "square", "rectangle"] as TableShapeType[]).map(
              (shape) => (
                <button
                  key={shape}
                  onClick={() => addTable(shape)}
                  className="flex w-full items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm font-semibold text-ink-700 hover:border-brand-400 hover:bg-brand-50"
                >
                  <span className="capitalize">{shape} table</span>
                  <Plus size={14} />
                </button>
              ),
            )}
          </div>
        </Panel>

        <Panel title="Room shape">
          {!shapeEditMode ? (
            <div className="space-y-2">
              <p className="text-xs text-ink-400">
                {activeFloor.outlinePoints &&
                activeFloor.outlinePoints.length >= 3
                  ? "Lantai ini pakai bentuk custom."
                  : "Lantai ini masih persegi biasa."}
                {shapeSavedAt ? " (bentuk tersimpan ✓)" : ""}
              </p>
              <button
                onClick={startShapeEdit}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-200 py-2 text-xs font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600"
              >
                <Pencil size={13} /> Ubah bentuk ruangan
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-ink-400">
                Pilih bentuk siap pakai, atau gambar sendiri: <b>klik canvas</b>{" "}
                = tambah titik, <b>seret titik</b> = geser, klik dua kali /
                tombol hapus = buang titik. Area di luar bentuk diarsir.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {SHAPE_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset.points)}
                    className="rounded-lg border border-ink-100 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-700"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                />
                Snap ke grid (10 px)
              </label>
              <p
                className="text-xs font-semibold text-ink-600"
                data-testid="shape-point-count"
              >
                {draftPoints.length} titik
                {draftPoints.length > 0 && draftPoints.length < 3
                  ? " — minimal 3 titik"
                  : ""}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPoint === null) return;
                    setDraftPoints((prev) =>
                      prev.filter((_, i) => i !== selectedPoint),
                    );
                    setSelectedPoint(null);
                  }}
                  disabled={selectedPoint === null}
                  className="rounded-lg border border-ink-100 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-300 disabled:opacity-40"
                >
                  Hapus titik {selectedPoint !== null ? selectedPoint + 1 : ""}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftPoints([]);
                    setSelectedPoint(null);
                  }}
                  disabled={draftPoints.length === 0}
                  className="rounded-lg border border-ink-100 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-300 disabled:opacity-40"
                >
                  Kosongkan
                </button>
              </div>
              <button
                type="button"
                onClick={() => saveShape()}
                disabled={
                  savingShape ||
                  (draftPoints.length > 0 && draftPoints.length < 3)
                }
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {savingShape ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                {savingShape
                  ? "Menyimpan…"
                  : draftPoints.length === 0
                    ? "Simpan (kembali ke persegi)"
                    : "Simpan bentuk"}
              </button>
              <button
                type="button"
                onClick={cancelShapeEdit}
                disabled={savingShape}
                className="w-full rounded-lg border border-ink-100 py-1.5 text-xs font-semibold text-ink-500 hover:border-ink-300"
              >
                Batal
              </button>
            </div>
          )}
          {tablesOutsideShape.length > 0 && (
            <p
              className="mt-2.5 rounded-lg bg-capacity-yellowBg px-2.5 py-2 text-[11px] font-semibold text-capacity-yellow"
              data-testid="tables-outside-warning"
            >
              {tablesOutsideShape.length} meja di luar bentuk ruangan (
              {tablesOutsideShape.slice(0, 6).join(", ")}
              {tablesOutsideShape.length > 6 ? "…" : ""}). Geser ke dalam
              bentuk, atau lebarkan bentuknya.
            </p>
          )}
        </Panel>
      </div>

      {/* Center: canvas */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-ink-900">
              Lantai {activeFloor.level} · {activeFloor.name}
            </h3>
            <p className="text-xs text-ink-400">
              Drag tables to reposition. Click to edit properties.
            </p>
          </div>
          <button
            onClick={saveLayout}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            {saving
              ? "Saving…"
              : savedAt
                ? "Saved ✓ Save again"
                : "Save layout"}
          </button>
        </div>

        <div
          ref={canvasRef}
          onPointerDown={() => !shapeEditMode && setSelectedTableId(null)}
          className={clsx(
            "floor-grid relative rounded-2xl border border-dashed bg-[linear-gradient(to_right,rgb(var(--ink-100)/0.7)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--ink-100)/0.7)_1px,transparent_1px)] bg-surface",
            shapeEditMode
              ? "cursor-crosshair border-brand-400"
              : "overflow-hidden border-ink-200",
          )}
          style={{
            width: "100%",
            height: activeFloor.canvasHeight,
            maxWidth: activeFloor.canvasWidth,
            backgroundSize: "20px 20px",
          }}
        >
          {/* Saved outline: area outside the room is shaded, edge drawn in brand colour. */}
          {!shapeEditMode &&
            activeFloor.outlinePoints &&
            activeFloor.outlinePoints.length >= 3 && (
              <svg
                viewBox={`0 0 ${activeFloor.canvasWidth} ${activeFloor.canvasHeight}`}
                preserveAspectRatio="none"
                className="pointer-events-none absolute left-0 top-0 h-full w-full"
              >
                <RoomOutline
                  points={activeFloor.outlinePoints}
                  width={activeFloor.canvasWidth}
                  height={activeFloor.canvasHeight}
                />
              </svg>
            )}

          <div style={{ pointerEvents: shapeEditMode ? "none" : "auto" }}>
            {activeFloor.tables.map((t) => (
              <BuilderTableNode
                key={t.id}
                table={t}
                selected={t.id === selectedTableId}
                onPointerDown={onPointerDown}
                onClick={(t) => setSelectedTableId(t.id)}
              />
            ))}
          </div>

          {activeFloor.tables.length === 0 && !shapeEditMode && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-400">
              This zone is empty — add a table from the left panel.
            </p>
          )}

          {/* Room-outline editor overlay (presets / click to add / drag / delete). */}
          {shapeEditMode && (
            <RoomShapeOverlay
              width={activeFloor.canvasWidth}
              height={activeFloor.canvasHeight}
              points={draftPoints}
              selected={selectedPoint}
              snap={snapToGrid}
              onChange={setDraftPoints}
              onSelect={setSelectedPoint}
            />
          )}
        </div>
        {savedAt && (
          <p className="mt-2 text-xs text-capacity-green">
            Layout tersimpan pukul {savedAt.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Right: properties */}
      <div>
        <Panel title="Table properties">
          {selectedTable ? (
            <div className="space-y-3">
              <LabeledField label="Table code">
                <input
                  value={selectedTable.tableCode}
                  onChange={(e) => patchSelected({ tableCode: e.target.value })}
                  className="w-full rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm font-semibold"
                />
              </LabeledField>
              <LabeledField label="Capacity">
                <NumberField
                  key={`c-${selectedTable.id}`}
                  value={selectedTable.capacity}
                  min={1}
                  max={12}
                  onCommit={(n) => patchSelected({ capacity: n })}
                  ariaLabel="Capacity"
                />
              </LabeledField>
              <LabeledField label="Shape">
                <select
                  value={selectedTable.shape}
                  onChange={(e) =>
                    patchSelected({ shape: e.target.value as TableShapeType })
                  }
                  className="w-full rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm font-semibold capitalize"
                >
                  {(["round", "square", "rectangle"] as TableShapeType[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              </LabeledField>
              <LabeledField label="Custom size (panjang × lebar, px)">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    key={`w-${selectedTable.id}`}
                    value={selectedTable.width}
                    min={0}
                    max={400}
                    onCommit={(n) => patchSelected({ width: n })}
                    placeholder="Panjang"
                    ariaLabel="Panjang meja"
                  />
                  <NumberField
                    key={`h-${selectedTable.id}`}
                    value={selectedTable.height}
                    min={0}
                    max={400}
                    onCommit={(n) => patchSelected({ height: n })}
                    placeholder="Lebar"
                    ariaLabel="Lebar meja"
                  />
                </div>
                <p className="mt-1 text-[10px] text-ink-400">
                  Ketik ukuran bebas 0–400 px — tidak harus ikut shape preset.
                  (Angka sangat kecil tetap digambar minimal 16 px di kanvas
                  supaya meja masih bisa dipilih.)
                </p>
              </LabeledField>
              <LabeledField label={`Rotation: ${selectedTable.rotation}°`}>
                <div className="flex items-center gap-2">
                  <RotateCw size={14} className="text-ink-400" />
                  <input
                    type="range"
                    min={0}
                    max={359}
                    value={selectedTable.rotation}
                    onChange={(e) =>
                      patchSelected({ rotation: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </LabeledField>
              <div className="rounded-lg border border-ink-100 px-2.5 py-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                  <input
                    type="checkbox"
                    checked={!!selectedTable.hasPowerOutlet}
                    onChange={(e) =>
                      patchSelected({
                        hasPowerOutlet: e.target.checked,
                        powerOutletCount: selectedTable.powerOutletCount ?? 1,
                      })
                    }
                    className="h-4 w-4 accent-brand-600"
                  />
                  <Plug size={14} className="text-ink-400" /> Ada stop kontak
                </label>
                {selectedTable.hasPowerOutlet && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink-600">
                      Jumlah
                    </span>
                    <div className="w-20">
                      <NumberField
                        key={`o-${selectedTable.id}`}
                        value={selectedTable.powerOutletCount ?? 1}
                        min={1}
                        max={20}
                        onCommit={(n) => patchSelected({ powerOutletCount: n })}
                        ariaLabel="Jumlah stop kontak"
                      />
                    </div>
                    <span className="text-xs text-ink-400">
                      tampil "{selectedTable.powerOutletCount ?? 1} Stop kontak"
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={deleteSelected}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-capacity-red/30 py-2 text-sm font-semibold text-capacity-red hover:bg-capacity-redBg"
              >
                <Trash2 size={14} /> Remove table
              </button>
            </div>
          ) : (
            <p className="text-sm text-ink-400">
              Select a table on the canvas to edit its properties, or add a new
              one.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

// fetch() wrapper: one automatic retry when the request never reaches the
// server (the browser's bare "Failed to fetch" — flaky mobile data, a cold
// serverless start, a dropped connection). Real HTTP errors are not retried.
async function apiFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    await new Promise((r) => setTimeout(r, 700));
    return fetch(url, init);
  }
}

// Turns a failed response into a message that says WHAT failed (status +
// the server's own message) instead of a generic one.
async function describeFailure(
  res: Response,
  fallback: string,
): Promise<string> {
  let detail = "";
  try {
    const data = await res.clone().json();
    detail = data?.error?.message ?? "";
  } catch {
    /* non-JSON body (e.g. a platform error page) */
  }
  if (res.status === 401 || res.status === 403)
    return (
      detail || "Sesi login kamu tidak punya izin untuk ini. Coba login ulang."
    );
  return `${fallback} (${res.status}${detail ? `: ${detail}` : ""})`;
}

function layoutPayload(tables: CafeTable[]) {
  return tables.map((t) => ({
    tableCode: t.tableCode,
    shape: t.shape,
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height,
    rotation: t.rotation,
    capacity: t.capacity,
    hasPowerOutlet: t.hasPowerOutlet,
    powerOutletCount: t.hasPowerOutlet ? (t.powerOutletCount ?? 1) : undefined,
  }));
}

function friendlyNetworkError(e: unknown, fallback: string): string {
  if (e instanceof TypeError)
    return `Koneksi ke server terputus (${e.message}). Cek internet kamu lalu coba lagi.`;
  return e instanceof Error ? e.message : fallback;
}

// A number input that can be typed in freely. The old version clamped on
// every keystroke, so clearing the field or typing "1" of "120" snapped it
// straight back to the minimum and you could never type a value. This keeps
// the raw text locally and only commits (clamped) once it's a valid number —
// while typing if it's already in range, otherwise on blur/Enter.
function NumberField({
  value,
  min,
  max,
  onCommit,
  placeholder,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [text, setText] = useState(String(Math.round(value)));

  function commit(raw: string) {
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) {
      setText(String(Math.round(value))); // empty/garbage → restore last good value
      return;
    }
    const clamped = Math.max(min, Math.min(max, Math.round(n)));
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setText(raw);
        const n = Number(raw);
        if (raw !== "" && n >= min && n <= max && n !== value) onCommit(n); // live preview once valid
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      onFocus={(e) => e.target.select()}
      className="w-full rounded-lg border border-ink-100 bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink-900"
    />
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-ink-900/5">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">
        {title}
      </h4>
      {children}
    </div>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-600">
        {label}
      </span>
      {children}
    </label>
  );
}
