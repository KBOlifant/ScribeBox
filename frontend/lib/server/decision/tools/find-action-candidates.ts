import "server-only";

import { NOT_AN_OBJECT, readArgs } from "../args";
import { findActionCandidates } from "../candidates";
import { loadMeeting } from "../meetings";
import { defineTool, fail, ok } from "../types";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

// Finds transcript lines that look like commitments, with the speaker, quote, cue time and any stated date
export const findActionCandidatesTool = defineTool<{ meetingId: string; limit: number }>({
  name: "find_action_candidates",
  description:
    "List transcript lines that look like commitments or requests (\"I'll…\", \"Ben, can you…\", \"by Friday\"). " +
    "Each candidate has the exact quote, line number, speaker, cue time, an owner hint only when the line names " +
    "one, and a due hint (an ISO date only if the transcript states one, otherwise the phrase used). " +
    "Use these to decide which action items to save; candidates can be false positives.",
  parameters: {
    type: "object",
    properties: {
      meetingId: { type: "string", description: "The meeting's id (a UUID)" },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: MAX_LIMIT,
        description: `Most candidates to return (default ${DEFAULT_LIMIT})`,
      },
    },
    required: ["meetingId"],
    additionalProperties: false,
  },
  parse(raw) {
    const args = readArgs(raw);
    if (!args) return NOT_AN_OBJECT;
    return args.done({
      meetingId: args.uuid("meetingId"),
      limit: args.optionalInt("limit", 1, MAX_LIMIT) ?? DEFAULT_LIMIT,
    });
  },
  async run({ meetingId, limit }, context) {
    const meeting = await loadMeeting(meetingId, context);
    if (!meeting) {
      return fail("not_found", "Meeting not found");
    }
    return ok(findActionCandidates(meeting.transcript, limit, meeting.date));
  },
});
