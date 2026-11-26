import "server-only";

import { query } from "../../db";
import { NOT_AN_OBJECT, readArgs } from "../args";
import { defineTool, fail, ok } from "../types";

const MAX_NOTE = 200;

type Input = { itemId: string; ownerNote: string | null; dueNote: string | null };

// Marks an action item as needing a person to check its owner or date, with the reason.
// The app shows an item for review whenever owner_note or due_note is set
export const flagForReviewTool = defineTool<Input>({
  name: "flag_for_review",
  description:
    "Flag a saved action item for a person to check, with the reason. Use ownerNote when the owner is " +
    "vague or unconfirmed (\"someone from finance\") and dueNote when the date is relative or unclear " +
    "(\"before the holidays\"). Send at least one note. A note replaces any earlier note of the same kind.",
  parameters: {
    type: "object",
    properties: {
      itemId: { type: "string", description: "The action item's id (a UUID), from save_action_items" },
      ownerNote: { type: "string", maxLength: MAX_NOTE, description: "Why the owner needs checking" },
      dueNote: { type: "string", maxLength: MAX_NOTE, description: "Why the date needs checking" },
    },
    required: ["itemId"],
    additionalProperties: false,
  },
  parse(raw) {
    const args = readArgs(raw);
    if (!args) return NOT_AN_OBJECT;
    const itemId = args.uuid("itemId");
    const ownerNote = args.optionalText("ownerNote", MAX_NOTE);
    const dueNote = args.optionalText("dueNote", MAX_NOTE);
    args.check(ownerNote !== null || dueNote !== null, "Send ownerNote, dueNote or both");
    return args.done({ itemId, ownerNote, dueNote });
  },
  async run({ itemId, ownerNote, dueNote }, context) {
    // Action items belong to a user through their meeting, so the join keeps this to the user's own items
    const rows = await query(
      `update action_items a
       set owner_note = coalesce($3, a.owner_note), due_note = coalesce($4, a.due_note), updated_at = now()
       from meetings m
       where a.id = $1 and a.meeting_id = m.id and m.user_id = $2
       returning a.id, a.title, a.owner_note, a.due_note`,
      [itemId, context.userId, ownerNote, dueNote],
    );
    if (rows.length === 0) {
      return fail("not_found", "Action item not found");
    }
    return ok({ item: rows[0], needsReview: true });
  },
});
