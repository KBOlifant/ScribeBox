"use client";

import { useMemo, type ReactNode } from "react";
import { Stagger, StaggerItem } from "@/components/motion";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MeetingRow } from "@/components/ui/meeting-row";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { toActionItem, toMeeting, type ActionItemRow, type MeetingRow as MeetingRowData } from "@/lib/api";
import { plural } from "@/lib/format";
import { needsReview } from "@/lib/types";

function AddTranscriptLink() {
  return (
    <ButtonLink href="/meetings/new" variant="primary" icon="upload">
      Add a transcript
    </ButtonLink>
  );
}

// Placeholder rows shaped like MeetingRow while the list loads
function MeetingsSkeleton() {
  return (
    <div role="status" aria-label="Loading meetings" className="flex flex-col gap-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="surface flex items-center gap-5 px-4 py-3.5 sm:px-5">
          <Skeleton className="h-[52px] w-12 shrink-0 rounded-md" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3 max-w-[320px]" />
            <Skeleton className="h-4 w-1/2 max-w-[220px]" />
          </span>
          <Skeleton className="hidden h-4 w-16 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function MeetingsList() {
  const meetingsData = useApiData<{ meetings: MeetingRowData[] }>("/api/meetings");
  const itemsData = useApiData<{ actionItems: ActionItemRow[] }>("/api/action-items");

  const list = useMemo(
    () => (meetingsData.data?.meetings ?? []).map((row) => toMeeting(row)).sort((a, b) => b.date.localeCompare(a.date)),
    [meetingsData.data],
  );
  const actionItems = useMemo(() => (itemsData.data?.actionItems ?? []).map(toActionItem), [itemsData.data]);

  // The meetings are the page. Action items only add counts, so their failure gets a small
  // notice instead of hiding the list
  const meetingsLoading = !meetingsData.data && meetingsData.loading;
  const meetingsError = !meetingsData.data && !meetingsData.loading ? meetingsData.error : null;
  const itemsLoading = !itemsData.data && itemsData.loading;
  const itemsFailed = !itemsData.data && !itemsData.loading && itemsData.error !== null;
  const counted = itemsData.data !== null;

  const open = actionItems.filter((item) => item.status !== "done");

  let description: ReactNode;
  if (meetingsData.data && !itemsLoading) {
    description = plural(list.length, "meeting") + (counted ? " · " + plural(open.length, "open action item") : "");
  } else if (!meetingsError) {
    // Holds the line while loading, so the header doesn't jump when the counts arrive
    description = <Skeleton className="my-1 h-4 w-60 max-w-full" />;
  }

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-8">
      <PageHeader title="Meetings" description={description} actions={<AddTranscriptLink />} />
      {meetingsError ? (
        <Alert
          tone="error"
          title="Couldn’t load your meetings"
          action={
            <Button variant="secondary" size="sm" onClick={meetingsData.reload}>
              Try again
            </Button>
          }
        >
          {meetingsError.message}
        </Alert>
      ) : meetingsLoading || itemsLoading ? (
        <MeetingsSkeleton />
      ) : (
        <>
          {itemsFailed && list.length > 0 && (
            <Alert
              title="Action item counts didn’t load, so each meeting shows 0 open."
              action={
                <Button variant="ghost" size="sm" icon="refresh" onClick={itemsData.reload}>
                  Try again
                </Button>
              }
            >
              {itemsData.error?.message}
            </Alert>
          )}
          {list.length === 0 ? (
            <Stagger>
              <StaggerItem>
                <EmptyState title="No meetings yet" action={<AddTranscriptLink />}>
                  Paste a transcript or upload a .txt, .vtt or .md file. You get a summary, decisions and action items.
                </EmptyState>
              </StaggerItem>
            </Stagger>
          ) : (
            <Stagger className="flex flex-col gap-3">
              {list.map((meeting) => {
                // Without the action items (they failed to load) the counts read 0; the notice above says why
                const items = actionItems.filter((item) => item.meetingId === meeting.id);
                return (
                  <StaggerItem key={meeting.id}>
                    <MeetingRow
                      meeting={meeting}
                      openCount={items.filter((item) => item.status !== "done").length}
                      reviewCount={items.filter((item) => item.status !== "done" && needsReview(item)).length}
                    />
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </>
      )}
    </div>
  );
}
