import { cn } from "@/lib/cn";

/** A quiet placeholder bar while content is on its way. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-sm bg-paper-sunk", className)} />;
}
