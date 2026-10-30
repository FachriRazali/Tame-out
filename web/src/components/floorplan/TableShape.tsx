import clsx from "clsx";
import { CafeTable, TableStatus } from "@/lib/types";
import { Plug } from "@/components/ui/icons";

export const STATUS_FILL: Record<TableStatus, string> = {
  available: "#22c081",
  reserved: "#f2a71b",
  occupied: "#ef4d5e",
  maintenance: "#9aa2b1",
};

export const STATUS_LABEL: Record<TableStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  maintenance: "Maintenance",
};

interface Props {
  table: CafeTable;
  selected?: boolean;
  interactive?: boolean;
  onClick?: (table: CafeTable) => void;
  scale?: number;
  // Hover/long-press text (e.g. who the table is reserved for on the cashier POS).
  tooltip?: string;
}

export function TableShape({
  table,
  selected,
  interactive = true,
  onClick,
  scale = 1,
  tooltip,
}: Props) {
  const fill = STATUS_FILL[table.status];
  const isRound = table.shape === "round";
  const isRect = table.shape === "rectangle";

  return (
    <g
      transform={`translate(${table.x * scale}, ${table.y * scale}) rotate(${table.rotation}, ${(table.width * scale) / 2}, ${
        (table.height * scale) / 2
      })`}
      onClick={() => interactive && onClick?.(table)}
      className={clsx(interactive && "cursor-pointer")}
    >
      {tooltip && <title>{tooltip}</title>}
      {isRound ? (
        <circle
          cx={(table.width * scale) / 2}
          cy={(table.height * scale) / 2}
          r={(Math.min(table.width, table.height) * scale) / 2}
          fill={fill}
          fillOpacity={0.18}
          stroke={fill}
          strokeWidth={selected ? 3 : 2}
          className="transition-all duration-200"
        />
      ) : (
        <rect
          width={table.width * scale}
          height={table.height * scale}
          rx={isRect ? 8 : 12}
          fill={fill}
          fillOpacity={0.18}
          stroke={fill}
          strokeWidth={selected ? 3 : 2}
          className="transition-all duration-200"
        />
      )}
      <text
        x={(table.width * scale) / 2}
        y={(table.height * scale) / 2 - (table.hasPowerOutlet ? 9 : 4)}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        className="fill-ink-900"
      >
        {table.tableCode}
      </text>
      <text
        x={(table.width * scale) / 2}
        y={(table.height * scale) / 2 + (table.hasPowerOutlet ? 7 : 12)}
        textAnchor="middle"
        fontSize={10}
        className="fill-ink-600"
      >
        {table.capacity} seats
      </text>
      {table.hasPowerOutlet &&
        (() => {
          // Minimalist power-outlet indicator — a small line-icon instead of the
          // 🔌 emoji, which rendered inconsistently across platforms/fonts.
          // Label is "<n> Stop kontak". Width comes from textLength (not the
          // font), so icon (10) + gap (3) + label stays centered on the table
          // whichever font the browser falls back to.
          const count = Math.max(1, table.powerOutletCount ?? 1);
          const label = `${count} Stop kontak`;
          const labelWidth = 46 + 7 * String(count).length; // "Stop kontak" 46 + digits + space
          const total = 13 + labelWidth;
          return (
            <g
              transform={`translate(${(table.width * scale) / 2 - total / 2}, ${(table.height * scale) / 2 + 9})`}
            >
              <Plug
                size={10}
                strokeWidth={2.2}
                className="text-capacity-green"
              />
              <text
                x={13}
                y={8.5}
                fontSize={9}
                fontWeight={600}
                className="fill-capacity-green"
                textLength={labelWidth}
                lengthAdjust="spacingAndGlyphs"
              >
                {label}
              </text>
            </g>
          );
        })()}
      {selected && (
        <rect
          width={table.width * scale}
          height={table.height * scale}
          rx={isRect ? 8 : 12}
          fill="none"
          className="stroke-ink-900"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
    </g>
  );
}
