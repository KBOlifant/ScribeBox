import { isValidIsoDate } from "./format";

/*
 * Client-side checks for instant feedback. The API must enforce the same rules on the server;
 * these messages are written to be reused there.
 */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;
export const TRANSCRIPT_MAX_BYTES = 1_000_000;
export const TRANSCRIPT_EXTENSIONS = [".txt", ".vtt", ".md"];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(value: string): string | undefined {
  if (!value) return "Enter your email address.";
  if (value.length > 254 || !EMAIL.test(value)) return "Enter an email address, like name@example.com.";
}

export function newPasswordError(value: string): string | undefined {
  if (!value) return "Create a password.";
  if (value.length < PASSWORD_MIN) return "Password must be at least " + PASSWORD_MIN + " characters.";
  if (value.length > PASSWORD_MAX) return "Password must be " + PASSWORD_MAX + " characters or fewer.";
}

export function nameError(value: string): string | undefined {
  if (!value) return "Enter your name.";
  if (value.length > 80) return "Name must be 80 characters or fewer.";
}

export function transcriptFileError(file: { name: string; size: number }): string | undefined {
  const lower = file.name.toLowerCase();
  if (!TRANSCRIPT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return "That file type isn’t supported. Upload a .txt, .vtt or .md file.";
  }
  if (file.size === 0) return "That file is empty. Choose another file or paste the text instead.";
  if (file.size > TRANSCRIPT_MAX_BYTES) {
    return "That file is over 1 MB. Upload a smaller transcript, or paste the text instead.";
  }
}

export function meetingErrors(values: { title: string; date: string; transcript: string }) {
  const errors: FieldErrors<"title" | "date" | "transcript"> = {};
  const title = values.title.trim();
  if (!title) errors.title = "Give the meeting a title.";
  else if (title.length > 120) errors.title = "Keep the title under 120 characters.";
  if (!values.date) errors.date = "Choose the meeting date.";
  else if (!isValidIsoDate(values.date)) errors.date = "Enter a real date.";
  const transcript = values.transcript.trim();
  if (!transcript) errors.transcript = "Paste a transcript or upload a file.";
  else if (new TextEncoder().encode(transcript).length > TRANSCRIPT_MAX_BYTES) {
    errors.transcript = "Transcripts can be up to 1 MB.";
  }
  return errors;
}

export function actionItemErrors(values: { text: string; owner: string; due: string }) {
  const errors: FieldErrors<"text" | "owner" | "due"> = {};
  const text = values.text.trim();
  if (!text) errors.text = "Describe what needs doing.";
  else if (text.length > 300) errors.text = "Keep it under 300 characters.";
  if (values.owner.trim().length > 80) errors.owner = "Owner must be 80 characters or fewer.";
  if (values.due && !isValidIsoDate(values.due)) errors.due = "Enter a real date.";
  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Moves focus to the first invalid field after React has rendered the errors. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    form?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  });
}
