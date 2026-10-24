// Revision (per the user's own newest asset drop, "Tame 2 Out"): the brand
// mark is now the standalone icon alone — the two-figure "T" submark — not
// the icon+wordmark lockup used before. Same two colorways as before: sage
// green (for light/pale surfaces — every header in this app) and cream (for
// the dark-green hero gradient). Both are transparent-background exports, so
// they drop straight onto whatever surface they're placed on.
interface Props {
  size?: number;
  // "green" for light/pale backgrounds (headers, cards — the default and by
  // far the most common case here), "cream" for the dark-green hero section.
  variant?: "green" | "cream";
  className?: string;
}

const LOGO_SRC: Record<"green" | "cream", string> = {
  green: "/brand/primary-logo-green copy.png",
  cream: "/brand/primary-logo-cream.png",
};

// The mark is now tightly cropped (no transparent padding around it, so it
// renders at its true size in the navbar instead of looking tiny) — native
// artwork is 432x354. Kept as a constant so a future asset swap only needs
// to change this in one place.
const ASPECT_RATIO = 432 / 354;

export function Logo({ size = 40, variant = "green", className = "" }: Props) {
  const height = size;
  const width = Math.round(size * ASPECT_RATIO);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC[variant]}
      alt="Tame'out"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      style={{ height, width }}
    />
  );
}
