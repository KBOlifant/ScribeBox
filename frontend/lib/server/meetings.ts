import "server-only";

import type { AnalysisState, TranscriptSource } from "@/lib/types";
import { meetingDateError, meetingErrors, meetingTitleError, TRANSCRIPT_MAX_BYTES } from "@/lib/validation";
import { query } from "./db";
import { ApiError, notFound } from "./http";

/** A transcript can be 1 MB, plus room for the other JSON fields. */
export const MEETING_BODY_MAX_BYTES = TRANSCRIPT_MAX_BYTES + 16_000;

type MeetingRow = {
  id: string;
  title: string;
  meeting_date: string;
  source_kind: "file" | "paste";
  source_name: string | null;
  transcript?: string;
  analysis_state: AnalysisState;
  summary: string | null;
  decisions: string[];
  created_at: Date;
  updated_at: Date;
};

export type MeetingDto = {
  id: string;
  title: string;
  date: string;
  source: TranscriptSource;
  transcript?: string;
  analysis: { state: AnalysisState };
  summary: string | null;
  decisions: string[];
  createdAt: string;
  updatedAt: string;
};

// `meeting_date::text` keeps the date as YYYY-MM-DD instead of a JS Date shifted by the server's time zone.
const SUMMARY_COLUMNS = `id, title, meeting_date::text as meeting_date, source_kind, source_name,
  analysis_state, summary, decisions, created_at, updated_at`;
const FULL_COLUMNS = `${SUMMARY_COLUMNS}, transcript`;

function toDto(row: MeetingRow): MeetingDto {
  return {
    id: row.id,
    title: row.title,
    date: row.meeting_date,
    source: row.source_kind === "file" ? { kind: "file", name: row.source_name ?? "transcript" } : { kind: "paste" },
    ...(row.transcript !== undefined && { transcript: row.transcript }),
    analysis: { state: row.analysis_state },
    summary: row.summary,
    decisions: row.decisions,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A malformed id can't match any row, so it's a 404 rather than a database error. */
function assertId(id: string) {
  if (!UUID.test(id)) throw notFound();
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

function invalid(fields: Record<string, string | undefined>) {
  return new ApiError(422, "validation_failed", "Some fields need fixing.", fields);
}

/** Lists a user's meetings, newest first. Transcripts are left out because each can be 1 MB. */
export async function listMeetings(userId: string): Promise<MeetingDto[]> {
  const rows = await query<MeetingRow>(
    `select ${SUMMARY_COLUMNS} from meetings where user_id = $1 order by meeting_date desc, created_at desc`,
    [userId],
  );
  return rows.map(toDto);
}

export async function getMeeting(userId: string, id: string): Promise<MeetingDto> {
  assertId(id);
  // Filtering by owner means another user's meeting looks exactly like a missing one.
  const [row] = await query<MeetingRow>(`select ${FULL_COLUMNS} from meetings where id = $1 and user_id = $2`, [
    id,
    userId,
  ]);
  if (!row) throw notFound();
  return toDto(row);
}

export async function createMeeting(userId: string, body: Record<string, unknown>): Promise<MeetingDto> {
  const values = { title: str(body.title), date: str(body.date), transcript: str(body.transcript) };
  const errors = meetingErrors(values);

  const sourceName = str(body.sourceName).trim();
  if (sourceName.length > 255) errors.transcript = "File name must be 255 characters or fewer.";
  if (Object.values(errors).some(Boolean)) throw invalid(errors);

  const [row] = await query<MeetingRow>(
    `insert into meetings (user_id, title, meeting_date, source_kind, source_name, transcript)
     values ($1, $2, $3, $4, $5, $6)
     returning ${FULL_COLUMNS}`,
    [userId, values.title.trim(), values.date, sourceName ? "file" : "paste", sourceName || null, values.transcript],
  );
  return toDto(row);
}

/** Only the title and date can change. The transcript stays exactly as it was uploaded. */
export async function updateMeeting(userId: string, id: string, body: Record<string, unknown>): Promise<MeetingDto> {
  assertId(id);
  const errors: Record<string, string | undefined> = {};
  const sets: string[] = [];
  const params: unknown[] = [id, userId];

  if ("title" in body) {
    errors.title = meetingTitleError(str(body.title));
    params.push(str(body.title).trim());
    sets.push(`title = $${params.length}`);
  }
  if ("date" in body) {
    errors.date = meetingDateError(str(body.date));
    params.push(str(body.date));
    sets.push(`meeting_date = $${params.length}`);
  }
  if ("transcript" in body) errors.transcript = "A transcript can't be changed after it's saved.";

  if (Object.values(errors).some(Boolean)) throw invalid(errors);
  if (sets.length === 0) throw new ApiError(400, "nothing_to_update", "Send a title or date to update.");

  const [row] = await query<MeetingRow>(
    `update meetings set ${sets.join(", ")}, updated_at = now()
     where id = $1 and user_id = $2
     returning ${FULL_COLUMNS}`,
    params,
  );
  if (!row) throw notFound();
  return toDto(row);
}

export async function deleteMeeting(userId: string, id: string): Promise<void> {
  assertId(id);
  const rows = await query(`delete from meetings where id = $1 and user_id = $2 returning id`, [id, userId]);
  if (rows.length === 0) throw notFound();
}
