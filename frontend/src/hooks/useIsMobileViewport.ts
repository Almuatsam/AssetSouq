import { useEffect, useState } from "react";

const QUERY = "(max-width: 640px)";

// Below this width the tour tooltip switches to a bottom-sheet layout
// regardless of a step's placement hint — see components/tour/TourTooltip.tsx.
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handleChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
