import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { actionItems, meetings, MOCK_TODAY } from "@/lib/mock-data";
import { ActionItemsView } from "./action-items-view";

export const metadata: Metadata = { title: "My open action items" };

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-9 w-full max-w-[560px]" />
      {[0, 1, 2].map((n) => (
        <Skeleton key={n} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function ActionItemsPage() {
  const meetingTitles = Object.fromEntries(meetings.map((meeting) => [meeting.id, meeting.title]));
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-8">
      <PageHeader title="My open action items" description="Everything assigned in your meetings, in one place." />
      {/* Filters live in the URL query, which needs a Suspense boundary when the page is prerendered. */}
      <Suspense fallback={<ListSkeleton />}>
        <ActionItemsView items={actionItems} meetingTitles={meetingTitles} today={MOCK_TODAY} />
      </Suspense>
    </div>
  );
}
