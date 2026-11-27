import "server-only";

import { ANALYSIS_STATES as STATES, canMoveTo, type AnalysisStateName as State } from "../../analysis";
import { query } from "../../db";
import { NOT_AN_OBJECT, readArgs } from "../args";
import { loadMeeting } from "../meetings";
import { defineTool, fail, ok } from "../types";

type Run = { id: string; analysis_state: State };

// Moves a meeting's analysis through its states. Each run is a row in summaries:
// queuing again after done, failed or rate_limited starts a new run, so earlier attempts are kept
export const setAnalysisStateTool = defineTool<{ meetingId: string; state: State }>({
  name: "set_analysis_state",
  description:
    "Set a meeting's analysis state. Allowed moves: no run yet -> queued, working or invalid; " +
    "queued -> working or invalid; working -> done, failed, rate_limited or invalid; " +
    "done, failed or rate_limited -> queued (starts a new run). invalid is final. " +
    "Setting the current state again changes nothing.",
  parameters: {
    type: "object",
    properties: {
      meetingId: { type: "string", description: "The meeting's id (a UUID)" },
      state: { type: "string", enum: [...STATES] },
    },
    required: ["meetingId", "state"],
    additionalProperties: false,
  },
  parse(raw) {
    const args = readArgs(raw);
    if (!args) return NOT_AN_OBJECT;
    return args.done({ meetingId: args.uuid("meetingId"), state: args.oneOf("state", STATES) });
  },
  async run({ meetingId, state }, context) {
    const meeting = await loadMeeting(meetingId, context);
    if (!meeting) {
      return fail("not_found", "Meeting not found");
    }

    const runs = await query<Run>(
      `select id, analysis_state from summaries where meeting_id = $1 order by created_at desc limit 1`,
      [meetingId],
    );
    const latest = runs[0] ?? null;
    const from = latest ? latest.analysis_state : "none";

    if (from === state) {
      return ok({ meetingId, runId: latest?.id ?? null, from, to: state, changed: false });
    }
    if (!canMoveTo(from, state)) {
      return fail("not_allowed", `Can't move from ${from} to ${state}`);
    }

    // No run yet, or queuing a finished run again: start a new run
    if (!latest || state === "queued") {
      const inserted = await query<{ id: string }>(
        `insert into summaries (meeting_id, analysis_state) values ($1, $2) returning id`,
        [meetingId, state],
      );
      return ok({ meetingId, runId: inserted[0].id, from, to: state, changed: true, newRun: true });
    }

    // Otherwise update the current run, but only if nobody changed it since we read it
    const updated = await query<{ id: string }>(
      `update summaries set analysis_state = $3, updated_at = now()
       where id = $1 and analysis_state = $2
       returning id`,
      [latest.id, from, state],
    );
    if (updated.length === 0) {
      return fail("not_allowed", "The analysis state changed while this ran. Check it and try again");
    }
    return ok({ meetingId, runId: latest.id, from, to: state, changed: true, newRun: false });
  },
});
