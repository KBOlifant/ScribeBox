import "server-only";

import { parseTranscript, type TranscriptLine } from "./transcript";

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

const FIRST_PERSON = /\b(i'll|i will|i'm going to|i am going to|let me|i can take|i'll take)\b/i;
const TEAM = /\b(we'll|we will|we need to|we should|let's)\b/i;
const REQUEST = /\b(can you|could you|would you|please)\b/i;
const MARKER = /\b(action item|to-?do|follow[- ]up|next step)\b/i;

const DAY = "monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight";
const MONTH = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
const DUE_PHRASE = new RegExp(
  "\\b(?:(?:by|before|until|on|due)\\s+)?(?:" +
    [
      `(?:next|this)\\s+(?:week|month|quarter|${DAY})`,
      "(?:the\\s+)?end\\s+of\\s+(?:the\\s+)?(?:day|week|month|quarter|sprint)",
      `\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH})[a-z]*`,
      `(?:${MONTH})[a-z]*\\s+\\d{1,2}(?:st|nd|rd|th)?`,
      "the\\s+holidays",
      DAY,
      "eod|eow|asap",
    ].join("|") +
    ")\\b",
  "i",
);
const ISO_DATE = /\b(\d{4}-\d{2}-\d{2})\b/;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A speaker named in the line as the one doing the work: "Ben will…", "Ben, can you…", "can you do it, Ben?"
function namedOwner(text: string, speakers: string[]): string | null {
  for (const speaker of speakers) {
    const first = escapeRegExp(speaker.split(" ")[0]);
    const doer = new RegExp(`\\b${first}\\b,?\\s+(will|is going to|should|needs to|can you|could you|please)\\b`, "i");
    const asked = new RegExp(`\\b(can|could|would) you\\b[^.?!]*\\b${first}\\b`, "i");
    if (doer.test(text) || asked.test(text)) {
      return speaker;
    }
  }
  return null;
}

function validIsoDate(value: string) {
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function toCandidate(line: TranscriptLine, speakers: string[]): ActionCandidate | null {
  const { text } = line;
  const signals: string[] = [];
  if (FIRST_PERSON.test(text)) signals.push("first_person_commitment");
  if (TEAM.test(text)) signals.push("team_commitment");
  if (REQUEST.test(text)) signals.push("request");
  if (MARKER.test(text)) signals.push("explicit_marker");

  const named = namedOwner(text, speakers);
  if (named) signals.push("named_owner");

  if (signals.length === 0) return null;

  let ownerHint: ActionCandidate["ownerHint"] = null;
  if (named) {
    ownerHint = { name: named, basis: "named_in_line" };
  } else if (line.speaker && signals.includes("first_person_commitment")) {
    ownerHint = { name: line.speaker, basis: "speaker_committed" };
  }

  const iso = ISO_DATE.exec(text);
  const phrase = DUE_PHRASE.exec(text);

  return {
    lineNumber: line.lineNumber,
    speaker: line.speaker,
    timestamp: line.timestamp,
    quote: text.slice(0, MAX_QUOTE),
    signals,
    ownerHint,
    dueHint: {
      date: iso && validIsoDate(iso[1]) ? iso[1] : null,
      phrase: phrase ? phrase[0] : null,
    },
  };
}

// Finds lines that look like commitments, so the model and the LLM can cite real lines
export function findActionCandidates(transcript: string, limit: number) {
  const lines = parseTranscript(transcript);
  const speakers = [...new Set(lines.flatMap((line) => (line.speaker ? [line.speaker] : [])))];
  const candidates = lines.flatMap((line) => toCandidate(line, speakers) ?? []);

  return {
    candidates: candidates.slice(0, limit),
    total: candidates.length,
    truncated: candidates.length > limit,
  };
}
