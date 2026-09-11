"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Route-level entrance transition.
 *
 * `template.tsx` remounts on every navigation, which is exactly the lifecycle a
 * page transition needs. Exit animations are intentionally omitted: streaming
 * App Router navigations commit the new tree immediately, so a fade-out would
 * only ever delay perceived load.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
