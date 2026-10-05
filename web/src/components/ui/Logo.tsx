"use client";

import { useState } from "react";
import { Coffee } from "@/components/ui/icons";

interface Props {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

// Drop a real logo file at web/public/logo.png (square, transparent background
// recommended) to replace the placeholder badge below — nothing else needs to
// change, this component picks it up automatically and falls back to the
// Coffee-icon badge if the file is missing or fails to load.
export function Logo({ size = 32, showWordmark = true, className = "" }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <span className={`flex items-center gap-2 font-extrabold text-ink-900 ${className}`}>
      {!imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt="Tame'out"
          width={size}
          height={size}
          className="rounded-xl object-contain"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="flex shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"
          style={{ width: size, height: size }}
        >
          <Coffee size={Math.round(size * 0.56)} />
        </span>
      )}
      {showWordmark && <span>Tame&apos;out</span>}
    </span>
  );
}
