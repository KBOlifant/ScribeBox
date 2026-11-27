"use client";

import { useReducedMotion } from "motion/react";
import { motionTokens } from "@/lib/motion-tokens";

/** Enter, settle and exit states that drop the movement (keeping the fade) when the user asks for reduced motion. */
export function useSafeMotion(fullY: number = motionTokens.distance.md) {
  const reduce = useReducedMotion();
  return {
    initial: { opacity: 0, y: reduce ? 0 : fullY },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -fullY },
  };
}
