import "server-only";

// Who is running a tool. The runner fills this in from the signed-in user, never the model
export type ToolContext = {
  userId: string;
};

// rate_limited and model_failed come from the text model, so the runner can set the matching analysis state
export type ToolErrorCode =
  | "invalid_input"
  | "not_found"
  | "not_allowed"
  | "not_implemented"
  | "rate_limited"
  | "model_failed"
  | "internal";

// What every tool gives back. Errors are results too, so the model can read them and decide what to do next
export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: { code: ToolErrorCode; message: string } };

export type ParseResult<I> = { ok: true; value: I } | { ok: false; message: string };

// A JSON Schema object, sent to the model so it knows what arguments a tool takes
export type JsonSchema = Record<string, unknown>;

// How a tool is written: a schema for the model, a parser for its arguments, and the code that runs
export type ToolDefinition<I> = {
  name: string;
  description: string;
  parameters: JsonSchema;
  parse: (raw: unknown) => ParseResult<I>;
  run: (input: I, context: ToolContext) => Promise<ToolResult>;
};

// How the registry stores a tool once its input type no longer matters
export type DecisionTool = {
  name: string;
  description: string;
  parameters: JsonSchema;
  execute: (raw: unknown, context: ToolContext) => Promise<ToolResult>;
};

export function ok(data: unknown): ToolResult {
  return { ok: true, data };
}

export function fail(code: ToolErrorCode, message: string): ToolResult {
  return { ok: false, error: { code, message } };
}

// Wraps a tool so its arguments are always checked before it runs
export function defineTool<I>(definition: ToolDefinition<I>): DecisionTool {
  return {
    name: definition.name,
    description: definition.description,
    parameters: definition.parameters,
    async execute(raw, context) {
      const parsed = definition.parse(raw);
      if (!parsed.ok) {
        return fail("invalid_input", parsed.message);
      }
      return definition.run(parsed.value, context);
    },
  };
}
