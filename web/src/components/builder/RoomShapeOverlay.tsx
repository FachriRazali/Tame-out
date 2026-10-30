"use client";

import { useEffect, useRef } from "react";

export interface Pt {
  x: number;
  y: number;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Interactive room-outline editor drawn on top of the builder canvas.
 *
 * - click empty canvas  -> add a point (inserted on the nearest edge once the
 *   outline has 3+ points, so the shape never "zig-zags")
 * - drag a handle       -> move it (pointer capture: works with mouse AND touch,
 *   no window listeners to leak)
 * - select + Delete / double-click / panel button -> remove a point
 * Everything outside the polygon is shaded so the result is visible while editing.
 */
export function RoomShapeOverlay({
  width,
  height,
  points,
  selected,
  snap,
  onChange,
  onSelect,
}: {
  width: number;
  height: number;
  points: Pt[];
  selected: number | null;
  snap: boolean;
  onChange: (next: Pt[]) => void;
  onSelect: (index: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);
  // Latest props for the window key handler (registered once).
  const latest = useRef({ points, selected, onChange, onSelect });
  latest.current = { points, selected, onChange, onSelect };

  function toCanvas(clientX: number, clientY: number): Pt {
    const rect = svgRef.current!.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * width;
    let y = ((clientY - rect.top) / rect.height) * height;
    if (snap) {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
    }
    return {
      x: Math.max(0, Math.min(width, x)),
      y: Math.max(0, Math.min(height, y)),
    };
  }

  function removeAt(i: number) {
    const { points: pts, onChange: change, onSelect: select } = latest.current;
    change(pts.filter((_, idx) => idx !== i));
    select(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      const { selected: sel } = latest.current;
      if (sel === null) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeAt(sel);
      } else if (e.key === "Escape") {
        latest.current.onSelect(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function addPoint(e: React.MouseEvent<SVGSVGElement>) {
    const p = toCanvas(e.clientX, e.clientY);
    if (points.length < 3) {
      onChange([...points, p]);
      onSelect(points.length);
      return;
    }
    // Insert on the closest edge.
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = distToSegment(p, points[i], points[(i + 1) % points.length]);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    const next = [...points.slice(0, best + 1), p, ...points.slice(best + 1)];
    onChange(next);
    onSelect(best + 1);
  }

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const showMask = points.length >= 3;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="absolute left-0 top-0 h-full w-full cursor-crosshair touch-none select-none overflow-visible"
      onClick={addPoint}
      data-testid="shape-overlay"
    >
      {showMask && (
        <path
          d={`M0 0H${width}V${height}H0Z M${points.map((p) => `${p.x},${p.y}`).join(" L")} Z`}
          fillRule="evenodd"
          style={{ fill: "rgb(var(--ink-100) / 0.85)" }}
          pointerEvents="none"
        />
      )}
      {points.length > 1 && (
        <polygon
          points={polygon}
          fill={showMask ? "none" : "rgba(131,145,116,0.18)"}
          className="stroke-brand-500"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeDasharray={points.length < 3 ? "5 4" : undefined}
          pointerEvents="none"
        />
      )}
      {points.map((p, i) => (
        <g
          key={i}
          data-testid="shape-handle"
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            dragging.current = i;
            onSelect(i);
          }}
          onPointerMove={(e) => {
            if (dragging.current !== i) return;
            const q = toCanvas(e.clientX, e.clientY);
            onChange(points.map((pt, idx) => (idx === i ? q : pt)));
          }}
          onPointerUp={(e) => {
            dragging.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            dragging.current = null;
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            removeAt(i);
          }}
        >
          {/* big invisible hit area for fingers */}
          <circle cx={p.x} cy={p.y} r={18} fill="transparent" />
          <circle
            cx={p.x}
            cy={p.y}
            r={selected === i ? 10 : 8}
            className={selected === i ? "fill-brand-mustard" : "fill-brand-500"}
            stroke="#f5f5dc"
            strokeWidth={2.5}
          />
          <text
            x={p.x}
            y={p.y + 3.5}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill="#fff"
            pointerEvents="none"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
