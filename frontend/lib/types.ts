export type ItemStatus = "todo" | "in_progress" | "done";

export type AnalysisState = "queued" | "working" | "done" | "failed" | "rate_limited" | "invalid";

export interface User {
  id: string;
  name: string;
  email: string;
  /** ISO date, YYYY-MM-DD */
  memberSince: string;
}

export type TranscriptSource = { kind: "file"; name: string } | { kind: "paste" };

export interface Meeting {
  id: string;
  title: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  source: TranscriptSource;
  /** The original transcript, stored exactly as it was uploaded or pasted. */
  transcript: string;
  analysis: {
    state: AnalysisState;
    /** Human-readable time the last analysis finished, e.g. "13 Nov at 10:42". */
    finishedAt?: string;
    attempts?: number;
  };
  /** Null until an analysis succeeds. */
  summary: string | null;
  decisions: string[];
}

export interface ActionItem {
  id: string;
  meetingId: string;
  text: string;
  /** Only an owner the transcript names. Null when it doesn't say. */
  owner: string | null;
  /** Why the owner needs a person to check it, e.g. a vague reference. */
  ownerNote?: string;
  /** ISO date. Only a date the transcript states. */
  due: string | null;
  /** Why the date needs a person to check it, e.g. "before the holidays". */
  dueNote?: string;
  status: ItemStatus;
  /** The transcript line the item was taken from, and its cue time. */
  quote?: string;
  timestamp?: string;
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

/** An item needs review when the AI couldn't confirm its owner or date from the transcript. */
export function needsReview(item: ActionItem): boolean {
  return !item.owner || Boolean(item.ownerNote) || Boolean(item.dueNote);
}
