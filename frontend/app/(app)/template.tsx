"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useSafeMotion } from "@/hooks/use-reduced-motion";
import { motionTokens, smooth } from "@/lib/motion-tokens";

/** Each signed-in page fades and rises in when it mounts. */
export default function AppTemplate({ children }: { children: ReactNode }) {
  const safe = useSafeMotion(motionTokens.distance.sm);
  // Enter-only: the template remounts per navigation and AnimatePresence exits across App Router routes are unreliable.
  return (
    <motion.div initial={safe.initial} animate={safe.animate} transition={smooth}>
      {children}
    </motion.div>
  );
}
