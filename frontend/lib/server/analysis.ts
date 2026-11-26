import "server-only";

// SQL for a meeting's current analysis state: the state of its newest summaries row.
// A meeting with no analysis run yet counts as queued. Use inside a query on the meetings table
export const ANALYSIS_STATE_SQL = `coalesce(
    (select s.analysis_state from summaries s where s.meeting_id = meetings.id order by s.created_at desc limit 1),
    'queued'
  ) as analysis_state`;
