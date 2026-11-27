import "server-only";

import { TextModelError } from "@/app/services/openRouter/openRouter";
import { NOT_AN_OBJECT, readArgs } from "../args";
import { loadMeeting } from "../meetings";
import { defineTool, fail, ok } from "../types";
import { writeDecisions, writeItemWording, writeSummary } from "../writing";

const TASKS = ["summary", "decisions", "item_wording"] as const;
type Task = (typeof TASKS)[number];

const MAX_ITEMS = 30;

type Input = { meetingId: string; task: Task; itemIds: string[] | null };

// The handoff to the text model (GPT, OPENROUTER_LLM_MODEL) for anything that needs writing.
// The prompts, checks and saving live in writing.ts. A text model failure comes back as
// rate_limited or model_failed so the runner can set the matching analysis state
export const requestLlmAnalysisTool = defineTool<Input>({
  name: "request_llm_analysis",
  description:
    "Ask the text model to write something and save it: the meeting summary, the list of decisions " +
    "(each grounded in a transcript quote), or short task titles for saved action items (item_wording, " +
    "with itemIds). Fails with rate_limited or model_failed when the text model can't answer.",
  parameters: {
    type: "object",
    properties: {
      meetingId: { type: "string", description: "The meeting's id (a UUID)" },
      task: { type: "string", enum: [...TASKS] },
      itemIds: {
        type: "array",
        maxItems: MAX_ITEMS,
        items: { type: "string" },
        description: "Action item ids, for item_wording only",
      },
    },
    required: ["meetingId", "task"],
    additionalProperties: false,
  },
  parse(raw) {
    const args = readArgs(raw);
    if (!args) return NOT_AN_OBJECT;
    const meetingId = args.uuid("meetingId");
    const task = args.oneOf("task", TASKS);
    const itemIds = args.optionalUuidList("itemIds", MAX_ITEMS);
    args.check(task !== "item_wording" || (itemIds?.length ?? 0) > 0, "item_wording needs itemIds");
    args.check(task === "item_wording" || itemIds === null, "itemIds is only for item_wording");
    return args.done({ meetingId, task, itemIds });
  },
  async run({ meetingId, task, itemIds }, context) {
    const meeting = await loadMeeting(meetingId, context);
    if (!meeting) {
      return fail("not_found", "Meeting not found");
    }
    try {
      if (task === "summary") return ok({ task, ...(await writeSummary(meetingId, meeting.transcript)) });
      if (task === "decisions") return ok({ task, ...(await writeDecisions(meetingId, meeting.transcript)) });
      return ok({ task, ...(await writeItemWording(meetingId, itemIds ?? [])) });
    } catch (error) {
      if (error instanceof TextModelError) {
        return fail(error.status === 429 ? "rate_limited" : "model_failed", error.message);
      }
      throw error;
    }
  },
});
