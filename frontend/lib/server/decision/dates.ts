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
const DAY_MONTH = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH})[a-z]*\\b`, "gi");
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
