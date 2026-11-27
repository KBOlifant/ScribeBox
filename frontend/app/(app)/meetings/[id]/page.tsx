import type { Metadata } from "next";
import { Suspense } from "react";
import { MeetingDetail } from "./meeting-detail";
import { MeetingSkeleton } from "./meeting-skeleton";

type Params = PageProps<"/meetings/[id]">["params"];

// The server can't see who is signed in (auth lives in the browser), so the title stays generic
export const metadata: Metadata = { title: "Meeting" };

// Params are request data, so reading them sits behind Suspense; the meeting itself loads in the browser
export default function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  return (
    <Suspense fallback={<MeetingSkeleton />}>
      <MeetingContent params={params} />
    </Suspense>
  );
}

async function MeetingContent({ params }: { params: Params }) {
  const { id } = await params;
  return <MeetingDetail id={id} />;
}
