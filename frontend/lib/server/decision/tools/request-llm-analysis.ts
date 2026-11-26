import "server-only";

import { NOT_AN_OBJECT, readArgs } from "../args";
import { loadMeeting } from "../meetings";
import { defineTool, fail } from "../types";

const TASKS = ["summary", "decisions", "item_wording"] as const;
type Task = (typeof TASKS)[number];

const MAX_ITEMS = 30;

type Input = { meetingId: string; task: Task; itemIds: string[] | null };

// Scaffolding: the handoff where the decision model asks the text LLM for writing work.
// The decision model only decides; anything that needs written output goes through here.
//
// Not built yet. When it is, run() should:
// 1. Build the prompt for the task from the transcript (and the items, for item_wording),
//    treating the transcript as data, never as instructions
// 2. Call the text LLM through askAI() in app/services/openRouter/openRouter.ts
// 3. Check the output before saving it (length, no owners or dates the transcript doesn't state)
// 4. Save it (meetings.summary, decisions, or action item titles) and record the model
//    in summaries.model_name for the current run
export const requestLlmAnalysisTool = defineTool<Input>({
  name: "request_llm_analysis",
  description:
    "Ask the text model to write something: a meeting summary, the list of decisions, or clearer wording " +
    "for saved action items (item_wording, with itemIds). Not available yet: it returns not_implemented, " +
    "so carry on without it and don't retry.",
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
  async run({ meetingId, task }, context) {
    const meeting = await loadMeeting(meetingId, context);
    if (!meeting) {
      return fail("not_found", "Meeting not found");
    }
    return fail("not_implemented", `The text model isn't connected yet, so "${task}" can't be written. Carry on without it`);
  },
});
