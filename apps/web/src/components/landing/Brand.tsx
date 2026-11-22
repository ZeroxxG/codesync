import React from "react";

interface BrandProps {
  size?: "sm" | "md";
  showWordmark?: boolean;
}

/** Custom CodeSync mark: a 2x2 tile grid with one live "signal" tile. */
export const Brand: React.FC<BrandProps> = ({ size = "md", showWordmark = true }) => {
  const dim = size === "sm" ? 26 : 32;
  const gap = 3;
  const cell = (dim - gap) / 2;

  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width={dim} height={dim} rx={dim * 0.28} fill="rgb(var(--c-fg))" />
        <rect x={4} y={4} width={cell} height={cell} rx={2} fill="rgb(var(--c-canvas))" />
        <rect x={4 + cell + gap} y={4} width={cell} height={cell} rx={2} fill="rgb(var(--c-canvas))" />
        <rect x={4} y={4 + cell + gap} width={cell} height={cell} rx={2} fill="rgb(var(--c-canvas))" />
        <rect
          x={4 + cell + gap}
          y={4 + cell + gap}
          width={cell}
          height={cell}
          rx={2}
          fill="rgb(var(--c-accent))"
        />
      </svg>
      {showWordmark && (
        <span className="font-display text-[1.0625rem] font-extrabold tracking-tightest text-fg">
          CodeSync
        </span>
      )}
    </span>
  );
};

export default Brand;
