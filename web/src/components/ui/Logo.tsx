// The real Tame'out logo artwork (brand guideline), not a placeholder —
// "Primary logo" is the icon+wordmark lockup, exported in two colorways:
// sage green (for light/pale surfaces — every header in this app) and cream
// (for the dark-green hero gradient, matching the brand sheet's own hero
// presentation). No dynamic img-with-fallback needed anymore since these
// files ship with the app under public/brand/.
interface Props {
  size?: number;
  // "green" for light/pale backgrounds (headers, cards — the default and by
  // far the most common case here), "cream" for the dark-green hero section.
  variant?: "green" | "cream";
  className?: string;
}

const LOGO_SRC: Record<"green" | "cream", string> = {
  green: "/brand/primary-logo-green.png",
  cream: "/brand/primary-logo-cream.png",
};

// Native aspect ratio of the exported artwork (738x430) — passed through so
// Next/the browser can reserve the right box and avoid layout shift.
const ASPECT_RATIO = 738 / 430;

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
