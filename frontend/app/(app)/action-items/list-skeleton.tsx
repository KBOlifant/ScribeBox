import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for the filter bar and the first few cards while the list loads. */
export function ListSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading action items</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full max-w-[560px]" />
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
