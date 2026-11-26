import "server-only";

import { NOT_AN_OBJECT, readArgs } from "../args";
import { loadMeeting } from "../meetings";
import { checkTranscript } from "../transcript";
import { defineTool, fail, ok } from "../types";

// Sorting step: tells the model whether a meeting's transcript is worth analysing
export const checkTranscriptTool = defineTool<{ meetingId: string }>({
  name: "check_transcript",
  description:
    "Check whether a meeting's transcript can be analysed. Returns verdict ok, uncertain or invalid, " +
    "the reasons, the labelled speakers and line counts. Call this first. If the verdict is invalid, " +
    "stop and mark the analysis invalid instead of analysing.",
  parameters: {
    type: "object",
    properties: {
      meetingId: { type: "string", description: "The meeting's id (a UUID)" },
    },
    required: ["meetingId"],
    additionalProperties: false,
  },
  parse(raw) {
    const args = readArgs(raw);
    if (!args) return NOT_AN_OBJECT;
    return args.done({ meetingId: args.uuid("meetingId") });
  },
  async run({ meetingId }, context) {
    const meeting = await loadMeeting(meetingId, context);
    if (!meeting) {
      return fail("not_found", "Meeting not found");
    }
    return ok(checkTranscript(meeting.transcript));
  },
});
