import type { Metadata } from "next";
import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: { absolute: "ScribeBox: meeting transcripts to decisions and action items" },
  description:
    "Paste or upload a meeting transcript. ScribeBox writes the summary, lists the decisions and tracks every action item, and flags anything the meeting left unclear.",
};

export default function Home() {
  return <Landing />;
}
