import "server-only";

// One spoken line from a transcript, with its speaker and cue time when the transcript has them
export type TranscriptLine = {
  /** 1-based line number in the original transcript */
  lineNumber: number;
  speaker: string | null;
  timestamp: string | null;
  text: string;
};

// "00:00:01.000 --> 00:00:04.000" (a WebVTT cue timing line)
const VTT_TIMING = /^((?:\d{1,2}:)?\d{2}:\d{2})[.,]\d{3}\s*-->/;
// "[00:12]" or "00:12" or "01:02:03" at the start of a line
const CUE = /^\[?((?:\d{1,2}:)?\d{1,2}:\d{2})(?:[.,]\d+)?\]?\s*/;
// "<v Ana>Morning all</v>" (a WebVTT voice tag)
const VOICE = /^<v\s+([^>]{1,60})>(.*?)(?:<\/v>)?$/i;
// "Ana: Morning all", "Johan van Wyk: I'll send it" or Markdown "**Naomi Botha:** Thanks"
const NAME_PARTICLE = "(?:van|von|de|der|den|du|da|di|le|la|dos|del|bin|ibn)";
const SPEAKER = new RegExp(
  `^(?:\\*\\*|__)?([A-Z][\\w'.-]*(?:\\s+(?:${NAME_PARTICLE}\\s+)*[A-Z][\\w'.-]*){0,3})(?::\\*\\*|\\*\\*:|:__|__:|:)\\s+(.+)$`,
);
// Header lines such as "Title: …" or "Kind: captions" describe the meeting; nobody says them
const METADATA_LABELS = new Set([
  "title", "date", "time", "attendees", "attendee", "participants", "presenter", "organizer",
  "location", "agenda", "subject", "duration", "recorded", "kind", "language", "meeting",
]);
// Labels that start a spoken line but aren't people, e.g. "Decision: we ship Friday"
const NOT_SPEAKERS = new Set(["decision", "decisions", "note", "action", "action item", "todo", "update", "next steps"]);

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Lowercases and evens out spacing and curly quotes, so a quote can be matched against the transcript
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Splits a .txt, .md or .vtt transcript into spoken lines
export function parseTranscript(transcript: string): TranscriptLine[] {
  const result: TranscriptLine[] = [];
  let vttTimestamp: string | null = null;
  // Captions often spell a name differently ("Lerato M", "lerato m"): keep the first spelling
  const spellings = new Map<string, string>();

  transcript.split(/\r?\n/).forEach((rawLine, index) => {
    let line = rawLine.trim();

    // Skip blank lines, the WEBVTT header, NOTE blocks and numeric cue ids
    if (!line || /^WEBVTT\b/.test(line) || /^NOTE\b/.test(line) || /^\d+$/.test(line)) {
      if (!line) vttTimestamp = null;
      return;
    }

    // A VTT timing line applies to the text lines under it
    const timing = VTT_TIMING.exec(line);
    if (timing) {
      vttTimestamp = timing[1];
      return;
    }

    let timestamp = vttTimestamp;
    const cue = CUE.exec(line);
    if (cue) {
      timestamp = cue[1];
      line = line.slice(cue[0].length);
    }

    let speaker: string | null = null;
    const voice = VOICE.exec(line);
    const named = voice ?? SPEAKER.exec(line);
    if (named) {
      const label = named[1].trim();
      const key = label.toLowerCase().replace(/\s+/g, " ");
      if (!voice && METADATA_LABELS.has(key)) return;
      if (voice || !NOT_SPEAKERS.has(key)) {
        if (!spellings.has(key)) spellings.set(key, label);
        speaker = spellings.get(key) ?? label;
        line = named[2].trim();
      }
    }

    if (line) {
      result.push({ lineNumber: index + 1, speaker, timestamp, text: line });
    }
  });

  return result;
}

export type TranscriptCheck = {
  verdict: "ok" | "uncertain" | "invalid";
  reasons: string[];
  speakers: string[];
  stats: {
    characters: number;
    words: number;
    lines: number;
    speakerLines: number;
    timestampedLines: number;
  };
};

const MIN_WORDS = 15;
const MAX_SPEAKERS_LISTED = 30;

// Decides whether a transcript is worth analysing. No AI: just counts and patterns
export function checkTranscript(transcript: string): TranscriptCheck {
  const lines = parseTranscript(transcript);
  const words = transcript.split(/\s+/).filter(Boolean).length;
  const letters = (transcript.match(/\p{L}/gu) ?? []).length;
  const visible = transcript.replace(/\s/g, "").length;
  const speakerLines = lines.filter((line) => line.speaker).length;
  const timestampedLines = lines.filter((line) => line.timestamp).length;
  const speakers = [...new Set(lines.flatMap((line) => (line.speaker ? [line.speaker] : [])))];

  const reasons: string[] = [];
  let verdict: TranscriptCheck["verdict"] = "ok";

  if (words < MIN_WORDS) {
    verdict = "invalid";
    reasons.push(`Too short to analyse (${words} words, needs at least ${MIN_WORDS}).`);
  } else if (visible > 0 && letters / visible < 0.5) {
    verdict = "invalid";
    reasons.push("Mostly symbols or numbers, so it doesn't look like a conversation.");
  } else if (speakerLines === 0) {
    verdict = "uncertain";
    reasons.push("No speaker labels, so action item owners can't be confirmed.");
  } else if (speakers.length === 1) {
    verdict = "uncertain";
    reasons.push("Only one speaker is labelled.");
  }

  if (verdict !== "invalid" && timestampedLines === 0) {
    reasons.push("No timestamps, so action items won't have cue times.");
  }

  return {
    verdict,
    reasons,
    speakers: speakers.slice(0, MAX_SPEAKERS_LISTED),
    stats: { characters: transcript.length, words, lines: lines.length, speakerLines, timestampedLines },
  };
}
