import "server-only";

import { isValidIsoDate } from "@/lib/format";

const DAY = "monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = MONTHS.join("|") + "|sept";

// "by Friday", "next week", "end of the month", "15 March", "before the holidays", "EOD"…
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
// "15 March", "15th March", "the 23rd of November"
const DAY_MONTH = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH})[a-z]*\\b`, "gi");
const MONTH_DAY = new RegExp(`\\b(${MONTH})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "gi");

// The same date check the app and API use
export { isValidIsoDate };

// The first ISO date written in the text, if it's a real date
export function findIsoDate(text: string): string | null {
  const match = ISO_DATE.exec(text);
  return match && isValidIsoDate(match[1]) ? match[1] : null;
}

// The first phrase that sounds like a deadline, exactly as written
export function findDuePhrase(text: string): string | null {
  return DUE_PHRASE.exec(text)?.[0] ?? null;
}

function monthNumber(name: string): number {
  return MONTHS.indexOf(name.toLowerCase().slice(0, 3)) + 1;
}

const DAY_MS = 86_400_000;

// A day and month written in the text ("Friday 27 November", "the 23rd of November") as a full
// date, taking the year from the meeting. A date that would fall more than 60 days before the
// meeting means next year ("5 January" said in December). Returns null if no day and month is written
export function findDayMonthDate(text: string, meetingDate: string | null): string | null {
  if (!meetingDate || !isValidIsoDate(meetingDate)) return null;
  const match = new RegExp(DAY_MONTH.source, "i").exec(text) ?? new RegExp(MONTH_DAY.source, "i").exec(text);
  if (!match) return null;
  const [day, month] = /^\d/.test(match[1])
    ? [Number(match[1]), monthNumber(match[2])]
    : [Number(match[2]), monthNumber(match[1])];

  const pad = (value: number) => String(value).padStart(2, "0");
  let year = Number(meetingDate.slice(0, 4));
  let iso = `${year}-${pad(month)}-${pad(day)}`;
  if (isValidIsoDate(iso) && Date.parse(iso) < Date.parse(meetingDate) - 60 * DAY_MS) {
    year += 1;
    iso = `${year}-${pad(month)}-${pad(day)}`;
  }
  return isValidIsoDate(iso) ? iso : null;
}

// True only when the text itself states this date: the ISO date, or the same day and month
// ("15 March", "March 15th"). Relative phrases like "by Friday" never count
export function textStatesDate(text: string, isoDate: string): boolean {
  if (text.includes(isoDate)) return true;
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));

  for (const match of text.matchAll(DAY_MONTH)) {
    if (Number(match[1]) === day && monthNumber(match[2]) === month) return true;
  }
  for (const match of text.matchAll(MONTH_DAY)) {
    if (monthNumber(match[1]) === month && Number(match[2]) === day) return true;
  }
  return false;
}
