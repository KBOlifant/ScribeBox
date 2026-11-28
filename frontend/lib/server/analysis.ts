import "server-only";

import { query } from "./db";

export const ANALYSIS_STATES = ["queued", "working", "done", "failed", "rate_limited", "invalid"] as const;
export type AnalysisStateName = (typeof ANALYSIS_STATES)[number];

// Which states each state may move to. "none" means the meeting has no analysis run yet.
// invalid is final: the transcript can't be edited, so analysing it again won't help
const ALLOWED_MOVES: Record<AnalysisStateName | "none", AnalysisStateName[]> = {
  none: ["queued", "working", "invalid"],
  queued: ["working", "invalid"],
  working: ["done", "failed", "rate_limited", "invalid"],
  done: ["queued"],
  failed: ["queued"],
  rate_limited: ["queued"],
  invalid: [],
};

export function canMoveTo(from: AnalysisStateName | "none", to: AnalysisStateName): boolean {
  return ALLOWED_MOVES[from].includes(to);
}

// A new run can start when there's no run yet, or the newest one finished without being invalid
export function canStartNewRun(latest: AnalysisStateName | "none"): boolean {
  return canMoveTo(latest, "queued");
}

// A run is only "working" while its request is alive. If the server stops mid-run (a restart, a hot
// reload, a crash) nothing moves it on, so the page would poll forever and no new run could start.
// A real run takes a few minutes at most (25 candidates, 4 at a time, 30s Jev timeout), so a run
// still working after this long is treated as failed
export const STALE_RUN_INTERVAL = "15 minutes";

// SQL for a run's state as people see it: a stale "working" run reads as failed. s is the summaries alias
const stateOf = (s: string) =>
  `case when ${s}.analysis_state = 'working' and ${s}.updated_at < now() - interval '${STALE_RUN_INTERVAL}'
    then 'failed' else ${s}.analysis_state end`;
export const RUN_STATE_SQL = `${stateOf("s")} as analysis_state`;

// SQL for a meeting's current analysis state: the state of its newest summaries row.
// A meeting with no analysis run yet counts as queued. Use inside a query on the meetings table
export const ANALYSIS_STATE_SQL = `coalesce(
    (select ${stateOf("s")} from summaries s where s.meeting_id = meetings.id order by s.created_at desc, s.id desc limit 1),
    'queued'
  ) as analysis_state`;

// Stores the failed state for a meeting's stale run, so a new run can start
// (summaries_one_active_idx allows only one queued or working run per meeting)
export async function failStaleRun(meetingId: string) {
  await query(
    `update summaries set analysis_state = 'failed', updated_at = now()
     where meeting_id = $1 and analysis_state = 'working' and updated_at < now() - interval '${STALE_RUN_INTERVAL}'`,
    [meetingId],
  );
}

// SQL for a meeting's current summary: the text of its newest summaries row that has one
export const SUMMARY_TEXT_SQL = `(select s.summary_text from summaries s
    where s.meeting_id = meetings.id and s.summary_text is not null
    order by s.created_at desc, s.id desc limit 1) as summary`;

// Postgres error code for a unique index violation. summaries_one_active_idx raises it when a
// second run would start while one is queued or working
export const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}
