import "server-only";

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

// SQL for a meeting's current analysis state: the state of its newest summaries row.
// A meeting with no analysis run yet counts as queued. Use inside a query on the meetings table
export const ANALYSIS_STATE_SQL = `coalesce(
    (select s.analysis_state from summaries s where s.meeting_id = meetings.id order by s.created_at desc limit 1),
    'queued'
  ) as analysis_state`;

// SQL for a meeting's current summary: the text of its newest summaries row that has one
export const SUMMARY_TEXT_SQL = `(select s.summary_text from summaries s
    where s.meeting_id = meetings.id and s.summary_text is not null
    order by s.created_at desc limit 1) as summary`;
