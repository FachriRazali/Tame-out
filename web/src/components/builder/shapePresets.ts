import type { OutlinePoint } from "@/lib/types";

// Ready-made room outlines, as percentages of the canvas (same unit that is
// stored in floors.outline_points). "rect" has no points: saving it resets the
// floor back to a plain rectangle.
export const SHAPE_PRESETS: {
  key: string;
  label: string;
  points: OutlinePoint[];
}[] = [
  { key: "rect", label: "Persegi", points: [] },
  {
    key: "L",
    label: "L",
    points: [
      [0, 0],
      [55, 0],
      [55, 60],
      [100, 60],
      [100, 100],
      [0, 100],
    ],
  },
  {
    key: "T",
    label: "T",
    points: [
      [0, 0],
      [100, 0],
      [100, 40],
      [65, 40],
      [65, 100],
      [35, 100],
      [35, 40],
      [0, 40],
    ],
  },
  {
    key: "U",
    label: "U",
    points: [
      [0, 0],
      [35, 0],
      [35, 60],
      [65, 60],
      [65, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
  },
  {
    key: "plus",
    label: "Plus (+)",
    points: [
      [33, 0],
      [67, 0],
      [67, 33],
      [100, 33],
      [100, 67],
      [67, 67],
      [67, 100],
      [33, 100],
      [33, 67],
      [0, 67],
      [0, 33],
      [33, 33],
    ],
  },
  {
    key: "cut",
    label: "Sudut miring",
    points: [
      [0, 0],
      [100, 0],
      [100, 70],
      [70, 100],
      [0, 100],
    ],
  },
  {
    key: "hex",
    label: "Segi enam",
    points: [
      [25, 0],
      [75, 0],
      [100, 50],
      [75, 100],
      [25, 100],
      [0, 50],
    ],
  },
];

/** Ray-casting point-in-polygon test (all coordinates in the same unit). */
export function pointInPolygon(
  x: number,
  y: number,
  poly: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
