import type { OutlinePoint } from "@/lib/types";

// Draws a floor's custom room outline: in the builder everything OUTSIDE the polygon is
// shaded (so the room's shape is obvious at a glance — an L, a plus, a U…),
// and the polygon edge gets a solid brand-coloured stroke. Used by the live
// floor plan (customers) and by the builder canvas (staff).
// Must be rendered inside an <svg> whose user space is canvasWidth x canvasHeight.
export function RoomOutline({
  points,
  width,
  height,
  shadeOutside = true,
}: {
  points: OutlinePoint[] | null | undefined;
  width: number;
  height: number;
  /** Shade everything outside the room (builder). The customer view turns this off so only the room itself shows. */
  shadeOutside?: boolean;
}) {
  if (!points || points.length < 3) return null;
  const poly = points.map(
    ([px, py]) => `${(px / 100) * width},${(py / 100) * height}`,
  );
  const d = `M0 0H${width}V${height}H0Z M${poly.join(" L")} Z`;
  return (
    <g pointerEvents="none" data-testid="room-outline">
      {shadeOutside && (
        <path
          d={d}
          fillRule="evenodd"
          style={{ fill: "rgb(var(--ink-100) / 0.85)" }}
        />
      )}
      <polygon
        points={poly.join(" ")}
        fill="none"
        className="stroke-brand-500"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </g>
  );
}
