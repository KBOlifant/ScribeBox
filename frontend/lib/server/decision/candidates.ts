import "server-only";

import { findDayMonthDate, findDuePhrase, findIsoDate } from "./dates";
import { escapeRegExp, parseTranscript, type TranscriptLine } from "./transcript";

// A transcript line that looks like someone agreed to do something.
// Owners and dates here only ever come from the transcript's own words, never guessed
export type ActionCandidate = {
  lineNumber: number;
  speaker: string | null;
  timestamp: string | null;
  quote: string;
  signals: string[];
  ownerHint: { name: string; basis: "speaker_committed" | "named_in_line" } | null;
  dueHint: { date: string | null; phrase: string | null };
};

const MAX_QUOTE = 300;

const FIRST_PERSON = /\b(i'll|i will|i'm going to|i am going to|let me|i can|i'll take|will do)\b/i;
const TEAM = /\b(we'll|we will|we need to|we should|let's)\b/i;
// A task nobody took on ("someone should update that"): saved without an owner, so it's flagged
const UNASSIGNED = /\b(someone|somebody|anyone|whoever)\b[^.?!]{0,30}\b(should|needs? to|has to|must|will|can)\b/i;
const REQUEST = /\b(can you|could you|would you|please)\b/i;
const MARKER = /\b(action item|to-?do|follow[- ]up|next step)\b/i;

// A speaker named in the line as the one doing the work: "Ben will…", "Ben, can you…", "can you do it, Ben?"
function namedOwner(text: string, speakers: string[]): string | null {
  for (const speaker of speakers) {
    const first = escapeRegExp(speaker.split(" ")[0]);
    const doer = new RegExp(`\\b${first}\\b,?\\s+(will|is going to|should|needs to|can you|could you|please)\\b`, "i");
    const asked = new RegExp(`\\b(can|could|would) you\\b[^.?!]*\\b${first}\\b`, "i");
    // "Aisha, CSV export UI by Friday 27 November?": addressed by name, with a deadline
    const addressed = new RegExp(`^${first},`, "i").test(text) && findDuePhrase(text) !== null;
    if (doer.test(text) || asked.test(text) || addressed) {
      return speaker;
    }
  }
  return null;
}

function toCandidate(line: TranscriptLine, speakers: string[], meetingDate: string | null): ActionCandidate | null {
  const { text } = line;
  const signals: string[] = [];
  if (FIRST_PERSON.test(text)) signals.push("first_person_commitment");
  if (TEAM.test(text)) signals.push("team_commitment");
  if (REQUEST.test(text)) signals.push("request");
  if (MARKER.test(text)) signals.push("explicit_marker");
  if (UNASSIGNED.test(text)) signals.push("unassigned_task");

  const named = namedOwner(text, speakers);
  if (named) signals.push("named_owner");

  if (signals.length === 0) return null;

  let ownerHint: ActionCandidate["ownerHint"] = null;
  if (named) {
    ownerHint = { name: named, basis: "named_in_line" };
  } else if (line.speaker && signals.includes("first_person_commitment")) {
    ownerHint = { name: line.speaker, basis: "speaker_committed" };
  }

  const date = findIsoDate(text) ?? findDayMonthDate(text, meetingDate);

  return {
    lineNumber: line.lineNumber,
    speaker: line.speaker,
    timestamp: line.timestamp,
    quote: text.slice(0, MAX_QUOTE),
    signals,
    ownerHint,
    dueHint: {
      date,
      phrase: date ? null : findDuePhrase(text),
    },
  };
}

// Finds lines that look like commitments, so the model and the LLM can cite real lines
// meetingDate (YYYY-MM-DD) gives the year for dates written as a day and month, like "27 November"
export function findActionCandidates(transcript: string, limit: number, meetingDate: string | null = null) {
  const lines = parseTranscript(transcript);
  const speakers = [...new Set(lines.flatMap((line) => (line.speaker ? [line.speaker] : [])))];
  const candidates = lines.flatMap((line) => toCandidate(line, speakers, meetingDate) ?? []);

  return {
    candidates: candidates.slice(0, limit),
    total: candidates.length,
    truncated: candidates.length > limit,
  };
}
