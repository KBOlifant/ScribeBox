import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getItemsForMeeting, getMeeting, meetings, MOCK_TODAY, dateOnly } from "@/lib/mock-data";
import { MeetingDetail } from "./meeting-detail";

type Params = PageProps<"/meetings/[id]">["params"];

export function generateStaticParams() {
  return meetings.map((meeting) => ({ id: meeting.id }));
}

export async function generateMetadata({ params }: PageProps<"/meetings/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getMeeting(id)?.title ?? "Meeting not found" };
}

// Put this in suspense to allow the skeleton to load first until the content loads properly
export default function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  return (
    <Suspense fallback={<MeetingSkeleton />}>
      <MeetingContent params={params} />
    </Suspense>
  );
}

async function MeetingContent({ params }: { params: Params }) {
  const { id } = await params;
  const meeting = getMeeting(id);
  // An unknown id, or later one owned by someone else, gets the same 404: never confirm it exists.
  if (!meeting) notFound();
  return <MeetingDetail meeting={meeting} initialItems={getItemsForMeeting(id)} today={dateOnly} />;
}

function MeetingSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex max-w-[880px] flex-col gap-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
