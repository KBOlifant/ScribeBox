import type { ActionItem, Meeting, User } from "./types";

/*
 * Mock data until the API exists. Everything here belongs to one signed-in user.
 * MOCK_TODAY is fixed so overdue states render the same on the server and in the browser.
 */
export const MOCK_TODAY = "2026-11-24";

export const currentUser: User = {
  id: "u-1",
  name: "Lerato Mokoena",
  email: "lerato@example.com",
  memberSince: "2026-10-02",
};

export const meetings: Meeting[] = [
  {
    id: "m-5",
    title: "Budget review",
    date: "2026-11-23",
    source: { kind: "file", name: "budget-review.txt" },
    analysis: { state: "rate_limited", attempts: 1 },
    summary: null,
    decisions: [],
    transcript: [
      "Budget review, Q1 planning",
      "",
      "Thabo: Marketing is asking for another R40,000 for launch ads.",
      "Lerato: That depends on the launch date holding. If it slips again we should wait.",
      "Thabo: I'll put together two scenarios, one with the ads and one without.",
      "Lerato: Good. Let's look at them next week.",
    ].join("\n"),
  },
  {
    id: "m-2",
    title: "Client check-in",
    date: "2026-11-20",
    source: { kind: "paste" },
    analysis: { state: "working", attempts: 1 },
    summary: null,
    decisions: [],
    transcript: [
      "Lerato: Thanks for making time. How has the pilot gone on your side?",
      "Client: Mostly well. The team likes the weekly summaries, but the export to PDF keeps timing out.",
      "Sipho: We saw that too. It happens on the long meetings, anything over two hours.",
      "Client: Can we get a fix before the board pack goes out?",
      "Lerato: When is that?",
      "Client: The first week of December.",
      "Sipho: I'll look at it this week and send an update on Thursday.",
    ].join("\n"),
  },
  {
    id: "m-3",
    title: "Design critique",
    date: "2026-11-18",
    source: { kind: "file", name: "design-crit.md" },
    analysis: { state: "failed", attempts: 3 },
    summary: null,
    decisions: [],
    transcript: [
      "# Design critique: onboarding v2",
      "",
      "**Naledi:** The empty state on the meetings page is doing a lot of work. I like the copy.",
      "**Thabo:** The upload button feels buried on mobile.",
      "**Naledi:** Agreed. Let's try moving it into the header.",
      "**Lerato:** Can we also test the highlighter colour in dark mode? It looked muddy on my phone.",
      "**Naledi:** I'll mock up both by next Wednesday.",
    ].join("\n"),
  },
  {
    id: "m-1",
    title: "Sprint planning",
    date: "2026-11-13",
    source: { kind: "file", name: "sprint-planning.vtt" },
    analysis: { state: "done", finishedAt: "13 Nov at 10:42", attempts: 1 },
    summary:
      "The team moved the launch from 25 November to 2 December because engineering needs another week, and cut the onboarding survey from this release. Thabo will send the revised deck to finance by Friday and Sipho will update the release checklist. Two tasks were raised without a clear owner: booking the offsite venue and confirming the budget for launch ads.",
    decisions: [
      "Move the launch date from 25 November to 2 December.",
      "Cut the onboarding survey from this release and revisit it in January.",
    ],
    transcript: [
      "WEBVTT",
      "",
      "00:00:04.000 --> 00:00:09.000",
      "Lerato: Morning everyone. Two things today: the launch date and the onboarding survey.",
      "",
      "00:03:12.000 --> 00:03:20.000",
      "Sipho: Engineering can't hit the 25th. Realistically we need another week.",
      "",
      "00:05:40.000 --> 00:05:48.000",
      "Lerato: Then let's move launch to the 2nd of December. Everyone okay with that?",
      "",
      "00:05:49.000 --> 00:05:52.000",
      "Thabo: Fine by me.",
      "",
      "00:08:15.000 --> 00:08:25.000",
      "Naledi: If we're short on time I'd cut the onboarding survey. We can add it in January.",
      "",
      "00:08:26.000 --> 00:08:29.000",
      "Lerato: Agreed, the survey is out of scope.",
      "",
      "00:12:04.000 --> 00:12:10.000",
      "Lerato: Thabo, can you get the deck to finance by Friday?",
      "",
      "00:12:11.000 --> 00:12:13.000",
      "Thabo: Yes, Friday works.",
      "",
      "00:18:30.000 --> 00:18:38.000",
      "Sipho: I'll update the release checklist with the new date by Monday.",
      "",
      "00:31:47.000 --> 00:31:55.000",
      "Naledi: Someone needs to lock in the venue for the offsite before the holidays.",
      "",
      "00:33:02.000 --> 00:33:09.000",
      "Lerato: And can someone from finance confirm the budget for the launch ads?",
    ].join("\n"),
  },
  {
    id: "m-6",
    title: "Research sync",
    date: "2026-11-10",
    source: { kind: "file", name: "research-sync.md" },
    analysis: { state: "done", finishedAt: "10 Nov at 15:08", attempts: 1 },
    summary:
      "The onboarding survey closed with 214 responses. The team agreed to run usability tests on the new onboarding flow first. Lerato will share the survey results with design and write up the interview findings; Naledi is recruiting five participants for testing.",
    decisions: ["Usability testing starts with the new onboarding flow."],
    transcript: [
      "# Research sync",
      "",
      "**Lerato:** The survey closed with 214 responses. I'll share the results with the design team by Tuesday the 17th.",
      "**Naledi:** Great. For usability testing I'm recruiting five participants, aiming to have them booked by 5 December.",
      "**Lerato:** Let's test the new onboarding flow first. Everyone agree?",
      "**Naledi:** Yes.",
      "**Naledi:** Someone should write up the interview findings too.",
      "**Lerato:** I'll take that.",
    ].join("\n"),
  },
  {
    id: "m-4",
    title: "All-hands notes",
    date: "2026-11-03",
    source: { kind: "file", name: "all-hands.txt" },
    analysis: { state: "done", finishedAt: "3 Nov at 09:31", attempts: 1 },
    summary:
      "A short company update. October revenue came in 8% ahead of plan, two new engineers join on 1 December, and the office is closed from 24 December to 2 January. No tasks were assigned.",
    decisions: [],
    transcript: [
      "All-hands, 3 November",
      "",
      "Lerato: Quick one today. Revenue for October came in 8% ahead of plan.",
      "Lerato: Two new engineers join on 1 December. Please say hello when you see them.",
      "Thabo: Reminder that the office is closed from 24 December to 2 January.",
      "Lerato: That's everything. Thanks all.",
    ].join("\n"),
  },
];

export const actionItems: ActionItem[] = [
  {
    id: "a-1",
    meetingId: "m-1",
    text: "Send the revised launch deck to finance",
    owner: "Thabo",
    due: "2026-11-20",
    status: "in_progress",
    quote: "Thabo, can you get the deck to finance by Friday?",
    timestamp: "00:12:04",
  },
  {
    id: "a-2",
    meetingId: "m-1",
    text: "Update the release checklist with the new launch date",
    owner: "Sipho",
    due: "2026-11-16",
    status: "done",
    quote: "I'll update the release checklist with the new date by Monday.",
    timestamp: "00:18:30",
  },
  {
    id: "a-3",
    meetingId: "m-1",
    text: "Book the venue for the December offsite",
    owner: null,
    due: null,
    dueNote: "Date unclear: ‘before the holidays’",
    status: "todo",
    quote: "Someone needs to lock in the venue for the offsite before the holidays.",
    timestamp: "00:31:47",
  },
  {
    id: "a-4",
    meetingId: "m-1",
    text: "Confirm the budget for the launch ads",
    owner: null,
    ownerNote: "Owner unclear: ‘someone from finance’",
    due: null,
    status: "todo",
    quote: "And can someone from finance confirm the budget for the launch ads?",
    timestamp: "00:33:02",
  },
  {
    id: "b-1",
    meetingId: "m-6",
    text: "Share the survey results with the design team",
    owner: "Lerato",
    due: "2026-11-17",
    status: "todo",
    quote: "I'll share the results with the design team by Tuesday the 17th.",
  },
  {
    id: "b-2",
    meetingId: "m-6",
    text: "Recruit and book five usability-test participants",
    owner: "Naledi",
    due: "2026-12-05",
    status: "in_progress",
    quote: "I'm recruiting five participants, aiming to have them booked by 5 December.",
  },
  {
    id: "b-3",
    meetingId: "m-6",
    text: "Write up the interview findings",
    owner: "Lerato",
    due: null,
    status: "todo",
    quote: "I'll take that.",
  },
];

export function getMeeting(id: string): Meeting | undefined {
  return meetings.find((meeting) => meeting.id === id);
}

export function getItemsForMeeting(meetingId: string): ActionItem[] {
  return actionItems.filter((item) => item.meetingId === meetingId);
}
