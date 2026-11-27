import type { Metadata } from "next";
import { Stagger, StaggerItem } from "@/components/motion";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MeetingRow } from "@/components/ui/meeting-row";
import { PageHeader } from "@/components/ui/page-header";
import { plural } from "@/lib/format";
import { actionItems, meetings } from "@/lib/mock-data";
import { needsReview } from "@/lib/types";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  const list = [...meetings].sort((a, b) => b.date.localeCompare(a.date));
  const open = actionItems.filter((item) => item.status !== "done");

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-8">
      <PageHeader
        title="Meetings"
        description={plural(list.length, "meeting") + " · " + plural(open.length, "open action item")}
        actions={
          <ButtonLink href="/meetings/new" variant="primary" icon="upload">
            Add a transcript
          </ButtonLink>
        }
      />
      {list.length === 0 ? (
        <Stagger>
          <StaggerItem>
            <EmptyState
              title="No meetings yet"
              action={
                <ButtonLink href="/meetings/new" variant="primary" icon="upload">
                  Add a transcript
                </ButtonLink>
              }
            >
              Paste a transcript or upload a .txt, .vtt or .md file. You get a summary, decisions and action items.
            </EmptyState>
          </StaggerItem>
        </Stagger>
      ) : (
        <Stagger className="flex flex-col gap-3">
          {list.map((meeting) => {
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
    </div>
  );
}
