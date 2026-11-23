import type { Metadata } from "next";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { MOCK_TODAY } from "@/lib/mock-data";
import { NewMeetingForm } from "./new-meeting-form";

export const metadata: Metadata = { title: "Add a transcript" };

export default function NewMeetingPage() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8">
      <PageHeader
        back={<BackLink href="/meetings">Meetings</BackLink>}
        title="Add a transcript"
        description="Paste the text or upload a file. Analysis starts when you’re ready."
      />
      <NewMeetingForm today={MOCK_TODAY} />
    </div>
  );
}
