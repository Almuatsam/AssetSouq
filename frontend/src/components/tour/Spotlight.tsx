import { motion } from "framer-motion";

interface SpotlightProps {
  rect: DOMRect | null;
}

const PADDING = 8;
const RADIUS = 8; // matches --radius

// A single portaled full-viewport <svg> with a <mask> cutout, rather
// than a 4-div overlay — one element to keep in sync on scroll/resize,
// free rounded corners via rx, and RTL-agnostic by construction since
// getBoundingClientRect() is already physical-viewport coordinates.
export function Spotlight({ rect }: SpotlightProps) {
  const cutout = rect
    ? {
        x: rect.left - PADDING,
        y: rect.top - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  return (
    <svg className="pointer-events-none fixed inset-0 z-[1000] h-full w-full" aria-hidden="true">
      <defs>
        <mask id="tour-spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {cutout && (
            <motion.rect
              rx={RADIUS}
              fill="black"
              initial={false}
              animate={{ x: cutout.x, y: cutout.y, width: cutout.width, height: cutout.height }}
              transition={{ type: "tween", duration: 0.25 }}
            />
          )}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(20,22,25,0.6)"
        mask="url(#tour-spotlight-mask)"
        className="pointer-events-auto"
      />
      {cutout && (
        <motion.rect
          rx={RADIUS}
          fill="none"
          className="stroke-accent-strong"
          strokeWidth={2}
          initial={false}
          animate={{ x: cutout.x, y: cutout.y, width: cutout.width, height: cutout.height }}
          transition={{ type: "tween", duration: 0.25 }}
        />
      )}
    </svg>
  );
}
