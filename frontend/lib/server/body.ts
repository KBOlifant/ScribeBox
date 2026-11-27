import "server-only";

import { isValidIsoDate } from "@/lib/format";
import { ApiError } from "./http";

// A field read from a request body:
// undefined = not sent (keep the old value), null = sent empty or null (clear it)
type Field<T> = T | null | undefined;

// Reads a JSON body one field at a time. Each bad field gets its own message, and done()
// sends them all back together as a 422, the same shape the meetings API already uses
export class BodyReader {
  private errors: Record<string, string> = {};
  private seen = new Set<string>();

  constructor(private body: Record<string, unknown>) {}

  private read(key: string) {
    this.seen.add(key);
    return this.body[key];
  }

  // Text up to max characters, trimmed. Blank text counts as null
  text(key: string, max: number, label: string): Field<string> {
    const value = this.read(key);
    if (value === undefined || value === null) return value;
    if (typeof value !== "string") {
      this.errors[key] = `${label} must be text.`;
      return undefined;
    }
    // Postgres can't store the null character, so it would fail with a 500
    if (value.includes("\u0000")) {
      this.errors[key] = `${label} contains a character that can't be saved.`;
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > max) {
      this.errors[key] = `${label} must be ${max} characters or fewer.`;
      return undefined;
    }
    return trimmed;
  }

  // Text that can't be cleared. When creating, also pass required so it can't be left out
  filledText(key: string, max: number, label: string, required: boolean): string | undefined {
    const value = this.text(key, max, label);
    if (this.errors[key]) return undefined;
    if (value === null || (value === undefined && required)) {
      this.errors[key] = `${label} can't be empty.`;
      return undefined;
    }
    return value;
  }

  // A real calendar date, YYYY-MM-DD
  date(key: string, label: string): Field<string> {
    const value = this.read(key);
    if (value === undefined || value === null) return value;
    if (value === "") return null;
    // Postgres has no year 0, so it would reject 0000-xx-xx with a 500
    if (typeof value !== "string" || !isValidIsoDate(value) || value.startsWith("0000")) {
      this.errors[key] = `${label} must be a real date, like 2026-11-27.`;
      return undefined;
    }
    return value;
  }

  // One of a fixed list of values. It can't be cleared
  oneOf<T extends string>(key: string, values: readonly T[], label: string): T | undefined {
    const value = this.read(key);
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !values.includes(value as T)) {
      this.errors[key] = `${label} must be one of: ${values.join(", ")}.`;
      return undefined;
    }
    return value as T;
  }

  // Finishes reading. Throws 422 if any field was bad, or if the body has fields we don't accept
  done() {
    for (const key of Object.keys(this.body)) {
      if (!this.seen.has(key)) this.errors[key] = "This field can't be set here.";
    }
    if (Object.keys(this.errors).length) {
      throw new ApiError(422, "Some fields need fixing", this.errors);
    }
  }
}

// Reads a JSON body that may be left out entirely (e.g. a POST that needs no fields)
export async function getOptionalBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const body = JSON.parse(text);
    if (typeof body === "object" && body !== null && !Array.isArray(body)) return body;
  } catch {
    // falls through to the error below
  }
  throw new ApiError(400, "Invalid JSON body");
}

// Builds "column = $n" pairs for an UPDATE from the fields that were sent (undefined = not sent).
// Column names always come from our code, never from the request. Throws 400 if nothing was sent
export function updateSet(changes: Record<string, unknown>, firstParam: number) {
  const sent = Object.entries(changes).filter(([, value]) => value !== undefined);
  if (sent.length === 0) {
    throw new ApiError(400, "Send at least one field to update");
  }
  return {
    sql: sent.map(([column], index) => `${column} = $${firstParam + index}`).join(", "),
    params: sent.map(([, value]) => value),
  };
}
