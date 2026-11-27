"use client";

import { MotionConfig, motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { useSafeMotion } from "@/hooks/use-reduced-motion";
import { motionTokens, smooth, springs } from "@/lib/motion-tokens";

/** Root motion settings: honour the OS reduced-motion setting everywhere. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={smooth}>
      {children}
    </MotionConfig>
  );
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: motionTokens.stagger.item, delayChildren: motionTokens.stagger.delay } },
};

/** A list whose children enter one after another on mount. Wrap each child in StaggerItem. */
export function Stagger({ children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" {...rest}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...rest }: HTMLMotionProps<"div">) {
  const safe = useSafeMotion(motionTokens.distance.md);
  return (
    <motion.div variants={{ hidden: safe.initial, visible: { ...safe.animate, transition: springs.snappy } }} {...rest}>
      {children}
    </motion.div>
  );
}

/** Content that rises in once when it scrolls into view. */
export function Reveal({ children, delay = 0, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  const safe = useSafeMotion(motionTokens.distance.lg);
  return (
    <motion.div
      initial={safe.initial}
      whileInView={safe.animate}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Conditional content that fades and settles in, and fades out on exit.
 * Use as the keyed direct child of an AnimatePresence.
 */
export function Presence({ children, ...rest }: HTMLMotionProps<"div">) {
  const safe = useSafeMotion(motionTokens.distance.sm);
  return (
    <motion.div initial={safe.initial} animate={safe.animate} exit={safe.exit} transition={smooth} {...rest}>
      {children}
    </motion.div>
  );
}
