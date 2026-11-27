import "server-only";

import { query } from "../../db";
import { ArgReader, NOT_AN_OBJECT, readArgs } from "../args";
import { findDuePhrase, isValidIsoDate, textStatesDate } from "../dates";
import { loadMeeting } from "../meetings";
import { escapeRegExp, normalizeText } from "../transcript";
import { defineTool, fail, ok, type ParseResult } from "../types";

const MAX_ITEMS = 30;
const CUE_TIME = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;

type ItemInput = {
  title: string;
  quote: string;
  owner: string | null;
  actionDate: string | null;
  cueTime: string | null;
};

// A row ready to insert, after it has been checked against the transcript
type ItemRow = {
  title: string;
  transcript_quote: string;
  owner: string | null;
  owner_note: string | null;
  action_date: string | null;
  due_note: string | null;
  cue_time: string | null;
};

function parseItem(raw: unknown, index: number): ParseResult<ItemInput> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, message: `items[${index}] must be an object` };
  }
  const item = new ArgReader(raw as Record<string, unknown>);
  const actionDate = item.optionalText("actionDate", 10);
  const cueTime = item.optionalText("cueTime", 12);
  item.check(actionDate === null || isValidIsoDate(actionDate), "actionDate must be a real date as YYYY-MM-DD");
  item.check(cueTime === null || CUE_TIME.test(cueTime), "cueTime must look like mm:ss or hh:mm:ss");

  const result = item.done({
    title: item.text("title", 300),
    quote: item.text("quote", 300),
    owner: item.optionalText("owner", 80),
    actionDate,
    cueTime,
  });
  return result.ok ? result : { ok: false, message: `items[${index}]: ${result.message}` };
}

// Checks one item against the transcript. Returns the row to save, or why it was rejected.
// Owners and dates the transcript doesn't support are removed and noted for review, never kept
function groundItem(item: ItemInput, transcript: string, normalizedTranscript: string): ItemRow | string {
  if (!normalizedTranscript.includes(normalizeText(item.quote))) {
    return "The quote isn't in the transcript. Quote the line exactly";
  }

  let owner = item.owner;
  let ownerNote: string | null = null;
  if (owner && !new RegExp(`\\b${escapeRegExp(owner)}\\b`, "i").test(transcript)) {
    owner = null;
    ownerNote = "The transcript doesn't name this owner.";
  } else if (!owner) {
    ownerNote = "The transcript doesn't say who owns this.";
  }

  let actionDate = item.actionDate;
  let dueNote: string | null = null;
  const phrase = findDuePhrase(item.quote);
  if (actionDate && !textStatesDate(item.quote, actionDate)) {
    actionDate = null;
    dueNote = phrase
      ? `The transcript doesn't give a full date: "${phrase}".`
      : "The quoted line doesn't state a date.";
  } else if (!actionDate && phrase) {
    // Relative ("next week") or missing a year ("15 March"), so a person picks the exact date
    dueNote = `The transcript doesn't give a full date: "${phrase}".`;
  }

  return {
    title: item.title,
    transcript_quote: item.quote,
    owner,
    owner_note: ownerNote,
    action_date: actionDate,
    due_note: dueNote,
    cue_time: item.cueTime,
  };
}

// Saves action items for a meeting, keeping only what the transcript supports
export const saveActionItemsTool = defineTool<{ meetingId: string; items: ItemInput[] }>({
  name: "save_action_items",
  description:
    "Save action items for a meeting. Each item needs a short title and the exact transcript line it comes " +
    "from (quote). Only give an owner the transcript names and an actionDate the quoted line states " +
    "(YYYY-MM-DD); don't turn \"by Friday\" into a date. Unsupported owners and dates are removed and the " +
    "item is flagged for review. Items whose quote isn't in the transcript are rejected. " +
    "Items with a title already saved for this meeting are skipped.",
  parameters: {
    type: "object",
    properties: {
      meetingId: { type: "string", description: "The meeting's id (a UUID)" },
      items: {
        type: "array",
        minItems: 1,
        maxItems: MAX_ITEMS,
        items: {
          type: "object",
          properties: {
            title: { type: "string", maxLength: 300, description: "What needs doing, in a few words" },
            quote: { type: "string", maxLength: 300, description: "The exact transcript line" },
            owner: { type: ["string", "null"], maxLength: 80 },
            actionDate: { type: ["string", "null"], description: "YYYY-MM-DD, only if the line states it" },
            cueTime: { type: ["string", "null"], description: "The line's cue time, e.g. 00:12" },
          },
          required: ["title", "quote"],
          additionalProperties: false,
        },
      },
    },
    required: ["meetingId", "items"],
    additionalProperties: false,
  },
  parse(raw) {
    const args = readArgs(raw);
    if (!args) return NOT_AN_OBJECT;
    const meetingId = args.uuid("meetingId");
    const rawItems = args.array("items", MAX_ITEMS);

    const items: ItemInput[] = [];
    for (const [index, rawItem] of rawItems.entries()) {
      const parsed = parseItem(rawItem, index);
      if (!parsed.ok) return parsed;
      items.push(parsed.value);
    }
    return args.done({ meetingId, items });
  },
  async run({ meetingId, items }, context) {
    const meeting = await loadMeeting(meetingId, context);
    if (!meeting) {
      return fail("not_found", "Meeting not found");
    }

    const normalizedTranscript = normalizeText(meeting.transcript);
    const rows: ItemRow[] = [];
    const rejected: { index: number; title: string; reason: string }[] = [];
    const titles = new Set<string>();

    items.forEach((item, index) => {
      const grounded = groundItem(item, meeting.transcript, normalizedTranscript);
      if (typeof grounded === "string") {
        rejected.push({ index, title: item.title, reason: grounded });
        return;
      }
      const key = item.title.toLowerCase();
      if (titles.has(key)) {
        rejected.push({ index, title: item.title, reason: "Duplicate title in this request" });
        return;
      }
      titles.add(key);
      rows.push(grounded);
    });

    // One statement: insert every row whose title isn't already saved for this meeting
    const saved = rows.length
      ? await query(
          `insert into action_items
             (meeting_id, title, owner, owner_note, action_date, due_note, transcript_quote, cue_time)
           select $1, x.title, x.owner, x.owner_note, x.action_date::date, x.due_note, x.transcript_quote, x.cue_time
           from jsonb_to_recordset($2::jsonb) as x(
             title text, owner text, owner_note text, action_date text,
             due_note text, transcript_quote text, cue_time text
           )
           where not exists (
             select 1 from action_items a where a.meeting_id = $1 and lower(a.title) = lower(x.title)
           )
           returning id, title, owner, owner_note, action_date::text, due_note, cue_time`,
          [meetingId, JSON.stringify(rows)],
        )
      : [];

    const savedTitles = new Set(saved.map((row) => String(row.title).toLowerCase()));
    const skippedAlreadySaved = rows.filter((row) => !savedTitles.has(row.title.toLowerCase())).map((row) => row.title);

    return ok({ saved, skippedAlreadySaved, rejected });
  },
});
