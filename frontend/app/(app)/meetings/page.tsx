import type { Metadata } from "next";
import { MeetingsList } from "./meetings-list";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return <MeetingsList />;
}
