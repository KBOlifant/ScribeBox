import "server-only";

import type { ParseResult } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reads a tool's arguments one field at a time and remembers the first problem it finds.
// The model's arguments are never trusted: every field is checked here before a tool runs.
export class ArgReader {
  private problems: string[] = [];
  private seen = new Set<string>();

  constructor(private args: Record<string, unknown>) {}

  private problem(message: string) {
    this.problems.push(message);
  }

  private get(key: string) {
    this.seen.add(key);
    return this.args[key];
  }

  // A required id (meeting ids and action item ids are UUIDs)
  uuid(key: string): string {
    const value = this.get(key);
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
      this.problem(`${key} must be a UUID`);
      return "";
    }
    return value;
  }

  // A required string, trimmed, up to max characters
  text(key: string, max: number): string {
    const before = this.problems.length;
    const value = this.optionalText(key, max);
    if (value === null && this.problems.length === before) {
      this.problem(`${key} is required`);
    }
    return value ?? "";
  }

  // A string that may be left out (or sent as null)
  optionalText(key: string, max: number): string | null {
    const value = this.get(key);
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") {
      this.problem(`${key} must be a string`);
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length > max) {
      this.problem(`${key} must be ${max} characters or fewer`);
      return null;
    }
    return trimmed;
  }

  // One of a fixed list of values
  oneOf<T extends string>(key: string, values: readonly T[]): T {
    const value = this.get(key);
    if (typeof value !== "string" || !values.includes(value as T)) {
      this.problem(`${key} must be one of: ${values.join(", ")}`);
      return values[0];
    }
    return value as T;
  }

  // A whole number that may be left out, kept between min and max
  optionalInt(key: string, min: number, max: number): number | null {
    const value = this.get(key);
    if (value === undefined || value === null) return null;
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
      this.problem(`${key} must be a whole number from ${min} to ${max}`);
      return null;
    }
    return value;
  }

  // A required array. Each entry is checked by the tool itself
  array(key: string, maxLength: number): unknown[] {
    const value = this.get(key);
    if (!Array.isArray(value) || value.length === 0) {
      this.problem(`${key} must be a non-empty array`);
      return [];
    }
    if (value.length > maxLength) {
      this.problem(`${key} can have at most ${maxLength} entries`);
      return [];
    }
    return value;
  }

  // A list of ids that may be left out
  optionalUuidList(key: string, maxLength: number): string[] | null {
    const value = this.get(key);
    if (value === undefined || value === null) return null;
    if (!Array.isArray(value) || value.length > maxLength || !value.every((id) => typeof id === "string" && UUID_PATTERN.test(id))) {
      this.problem(`${key} must be a list of up to ${maxLength} UUIDs`);
      return null;
    }
    return [...new Set(value as string[])];
  }

  // Lets a tool add its own rule, e.g. "send at least one of these fields"
  check(condition: boolean, message: string) {
    if (!condition) this.problem(message);
  }

  // Finishes reading. Fails on the first problem, or on any field the schema doesn't allow
  done<I>(value: I): ParseResult<I> {
    const unknown = Object.keys(this.args).filter((key) => !this.seen.has(key));
    if (unknown.length) {
      this.problem(`Unknown field: ${unknown.join(", ")}`);
    }
    return this.problems.length ? { ok: false, message: this.problems[0] } : { ok: true, value };
  }
}

// Starts reading a tool's arguments. They must be a JSON object
export function readArgs(raw: unknown): ArgReader | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  return new ArgReader(raw as Record<string, unknown>);
}

export const NOT_AN_OBJECT: ParseResult<never> = { ok: false, message: "Arguments must be a JSON object" };
