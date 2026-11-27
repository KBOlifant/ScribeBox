import "server-only";

import { query } from "../db";
import type { ToolContext } from "./types";

export type ToolMeeting = {
  id: string;
  transcript: string;
  /** The meeting date, YYYY-MM-DD. Gives the year for dates like "27 November" */
  date: string;
};

// Loads a meeting only if it belongs to the user running the tool. Returns null otherwise,
// so a tool can't tell "someone else's meeting" apart from "no such meeting"
export async function loadMeeting(meetingId: string, context: ToolContext): Promise<ToolMeeting | null> {
  const rows = await query<ToolMeeting>(`select id, transcript, meeting_date::text as date from meetings where id = $1 and user_id = $2`, [
    meetingId,
    context.userId,
  ]);
  return rows[0] ?? null;
}
