import "server-only";

import { ANALYSIS_STATE_SQL, RUN_STATE_SQL, SUMMARY_TEXT_SQL } from "./analysis";
import type { BodyReader } from "./body";
import { query } from "./db";
import { ApiError, checkId } from "./http";

// Columns we send back for a meeting (date as text so it stays YYYY-MM-DD).
// analysis_state and summary come from the meeting's newest summaries rows
export const MEETING_COLUMNS = `id, title, meeting_date::text as date, source_kind, source_name,
  ${ANALYSIS_STATE_SQL}, ${SUMMARY_TEXT_SQL}, created_at, updated_at`;

// Columns we send back for a meeting's analysis runs. Queries alias summaries as s
export const SUMMARY_COLUMNS = `s.id, s.meeting_id, s.model_name, ${RUN_STATE_SQL}, s.summary_text,
  s.created_at, s.updated_at`;

// Columns we send back for a decision. Queries alias decisions as d
export const DECISION_COLUMNS = `d.id, d.meeting_id, d.decision_text, d.created_at`;

// Columns we send back for an action item (date as text so it stays YYYY-MM-DD). Queries alias action_items as a
export const ACTION_ITEM_COLUMNS = `a.id, a.meeting_id, a.title, a.owner, a.owner_note, a.action_date::text as action_date,
  a.due_note, a.transcript_quote, a.cue_time, a.progress_state, a.created_at, a.updated_at`;

export const PROGRESS_STATES = ["todo", "in_progress", "done"] as const;

// Reads an action item's fields from a request body, keyed by column name. People editing items
// are the source of truth, so unlike save_action_items there's no transcript grounding here
export function readActionItem(body: BodyReader, creating: boolean) {
  return {
    title: body.filledText("title", 300, "Title", creating),
    owner: body.text("owner", 80, "Owner"),
    owner_note: body.text("ownerNote", 200, "Owner note"),
    action_date: body.date("actionDate", "Due date"),
    due_note: body.text("dueNote", 200, "Due note"),
    transcript_quote: body.text("transcriptQuote", 300, "Transcript quote"),
    cue_time: body.text("cueTime", 12, "Cue time"),
    progress_state: body.oneOf("progressState", PROGRESS_STATES, "Progress"),
  };
}

// Checks the meeting exists and belongs to the user, for routes that work on its summaries,
// decisions or action items. Throws 404 otherwise, so other users' meetings stay hidden
export async function requireMeeting(meetingId: string, userId: string) {
  checkId(meetingId, "Meeting not found");
  const rows = await query(`select id from meetings where id = $1 and user_id = $2`, [meetingId, userId]);
  if (rows.length === 0) {
    throw new ApiError(404, "Meeting not found");
  }
}
