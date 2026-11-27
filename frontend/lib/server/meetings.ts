import "server-only";

import { ANALYSIS_STATE_SQL, SUMMARY_TEXT_SQL } from "./analysis";
import { query } from "./db";
import { ApiError, checkId } from "./http";

// Columns we send back for a meeting (date as text so it stays YYYY-MM-DD).
// analysis_state and summary come from the meeting's newest summaries rows
export const MEETING_COLUMNS = `id, title, meeting_date::text as date, source_kind, source_name,
  ${ANALYSIS_STATE_SQL}, ${SUMMARY_TEXT_SQL}, created_at, updated_at`;

// Columns we send back for a meeting's analysis runs. Queries alias summaries as s
export const SUMMARY_COLUMNS = `s.id, s.meeting_id, s.model_name, s.analysis_state, s.summary_text,
  s.created_at, s.updated_at`;

// Checks the meeting exists and belongs to the user, for routes that work on its summaries,
// decisions or action items. Throws 404 otherwise, so other users' meetings stay hidden
export async function requireMeeting(meetingId: string, userId: string) {
  checkId(meetingId, "Meeting not found");
  const rows = await query(`select id from meetings where id = $1 and user_id = $2`, [meetingId, userId]);
  if (rows.length === 0) {
    throw new ApiError(404, "Meeting not found");
  }
}
