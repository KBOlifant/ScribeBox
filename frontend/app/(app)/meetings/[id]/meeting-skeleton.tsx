import { Skeleton } from "@/components/ui/skeleton";

/** The meeting page's placeholder while the meeting loads. */
export function MeetingSkeleton() {
  return (
    <div role="status" className="mx-auto max-w-[880px]">
      <span className="sr-only">Loading meeting</span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}
