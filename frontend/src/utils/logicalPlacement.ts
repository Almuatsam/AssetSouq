import type { Placement } from "@floating-ui/react";

// Tour steps declare placement in logical (writing-direction-relative)
// terms so the same step data works unmodified in English and Arabic —
// see tours/types.ts's PlacementHint. This resolves that hint to a
// physical floating-ui Placement, reading `dir` the same way
// utils/i18n.ts already drives document.documentElement.dir.
export type PlacementHint = "top" | "bottom" | "inline-start" | "inline-end" | "center";
export type Direction = "ltr" | "rtl";

export function resolveLogicalPlacement(hint: PlacementHint, dir: Direction): Placement {
  switch (hint) {
    case "top":
      return "top";
    case "bottom":
      return "bottom";
    case "inline-start":
      return dir === "rtl" ? "right" : "left";
    case "inline-end":
      return dir === "rtl" ? "left" : "right";
    case "center":
      // Callers must check for "center" before reaching floating-ui (see
      // TourTooltip) — this fallback only exists so the function is total.
      return "top";
  }
}

export function getCurrentDirection(): Direction {
  return document.documentElement.dir === "rtl" ? "rtl" : "ltr";
}
