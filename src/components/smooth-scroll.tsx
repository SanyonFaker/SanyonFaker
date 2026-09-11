"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";

/**
 * Lenis smooth scrolling, mounted once for the whole document.
 *
 * Every descendant can reach the instance through `useLenis()` — the Lightbox
 * uses that to halt scrolling while it is open.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <ReactLenis
      root
      options={{
        // A gentle lerp reads as "expensive" without feeling laggy. Anything
        // above ~1.2s of catch-up starts to feel like input delay.
        lerp: 0.085,
        duration: 1.1,
        smoothWheel: !reduceMotion,
        syncTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
        gestureOrientation: "vertical",
      }}
    >
      <ScrollToTopOnNavigate />
      {children}
    </ReactLenis>
  );
}

/**
 * Next.js restores scroll on navigation, which fights Lenis' virtual position.
 * Resetting immediately on a pathname change keeps deep links landing at the
 * top of the new page.
 */
function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    lenis.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);

  return null;
}
