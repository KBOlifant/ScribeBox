import { auth } from "@/app/configs/firebaseconfig";
import type { ActionItem, AnalysisState, ItemStatus, Meeting } from "./types";

/*
 * The browser's way to call the ScribeBox API. Every request carries the signed-in user's
 * Firebase token. Use only from client components (it reads the Firebase user in the browser).
 */

// A failed API call. fields holds a message per invalid field, from 422 responses
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string | undefined>,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiRequestError(401, "You're signed out. Sign in again to carry on.");
  }
  const token = await user.getIdToken();

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError(0, "Couldn't reach ScribeBox. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(response.status, data?.error ?? "Something went wrong. Try again.", data?.fields);
  }
  return data as T;
}

// --- Rows as the API sends them (snake_case, dates as YYYY-MM-DD text) ---

export type MeetingRow = {
  id: string;
  title: string;
  date: string;
  source_kind: "file" | "paste";
  source_name: string | null;
  analysis_state: AnalysisState;
  summary: string | null;
  created_at: string;
  updated_at: string;
  transcript?: string;
};

export type ActionItemRow = {
  id: string;
  meeting_id: string;
  title: string;
  owner: string | null;
  owner_note: string | null;
  action_date: string | null;
  due_note: string | null;
  transcript_quote: string | null;
  cue_time: string | null;
  progress_state: ItemStatus;
  created_at: string;
  updated_at: string;
  meeting_title?: string;
  meeting_date?: string;
};

export type DecisionRow = { id: string; meeting_id: string; decision_text: string; created_at: string };

export type SummaryRow = {
  id: string;
  meeting_id: string;
  model_name: string | null;
  analysis_state: AnalysisState;
  summary_text: string | null;
  created_at: string;
  updated_at: string;
};

// --- Turning rows into the app's types ---

export function toMeeting(row: MeetingRow, decisions: DecisionRow[] = []): Meeting {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    source: row.source_kind === "file" ? { kind: "file", name: row.source_name ?? "Uploaded file" } : { kind: "paste" },
    transcript: row.transcript ?? "",
    analysis: { state: row.analysis_state },
    summary: row.summary,
    decisions: decisions.map((decision) => decision.decision_text),
  };
}

export function toActionItem(row: ActionItemRow): ActionItem {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    text: row.title,
    owner: row.owner,
    ownerNote: row.owner_note ?? undefined,
    due: row.action_date,
    dueNote: row.due_note ?? undefined,
    status: row.progress_state,
    quote: row.transcript_quote ?? undefined,
    timestamp: row.cue_time ?? undefined,
  };
}

// The API body for creating or changing an action item. Only the fields given are sent;
// undefined is left out, and null clears a field (e.g. ownerNote: null after review)
export function actionItemBody(item: Partial<Omit<ActionItem, "id" | "meetingId">>) {
  const body: Record<string, unknown> = {
    title: item.text,
    owner: item.owner,
    ownerNote: item.ownerNote,
    actionDate: item.due,
    dueNote: item.dueNote,
    progressState: item.status,
    transcriptQuote: item.quote,
    cueTime: item.timestamp,
  };
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

/** Today's date in the user's own time zone, YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
