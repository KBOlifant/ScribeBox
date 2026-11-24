import "server-only";

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * OpenRouter speaks the OpenAI Chat Completions API, so we use the official
 * OpenAI SDK pointed at OpenRouter's base URL instead of hand-rolling fetch calls.
 *
 * Server-only: the API key must never reach the browser.
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

let client: OpenAI | null = null;

/** Lazily builds one shared client so a missing key fails at call time, not at build time. */
export function getOpenRouterClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("config", "OPENROUTER_API_KEY is not set.");
  }

  client = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      // Optional attribution headers OpenRouter uses for its app rankings.
      ...(process.env.OPENROUTER_SITE_URL && { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }),
      "X-Title": "ScribeBox",
    },
    maxRetries: 2,
    timeout: 60_000,
  });

  return client;
}

export type OpenRouterErrorKind = "config" | "rate_limited" | "auth" | "bad_request" | "upstream" | "empty";

export class OpenRouterError extends Error {
  constructor(
    public readonly kind: OpenRouterErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export interface ChatOptions {
  /** OpenRouter model slug, e.g. "anthropic/claude-sonnet-4". Defaults to OPENROUTER_MODEL. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask the model for a JSON object back. Not every model on OpenRouter supports this. */
  json?: boolean;
  signal?: AbortSignal;
}

/** Sends a chat completion and returns the assistant's text. */
export async function chat(messages: ChatCompletionMessageParam[], options: ChatOptions = {}): Promise<string> {
  const openRouter = getOpenRouterClient();

  try {
    const completion = await openRouter.chat.completions.create(
      {
        model: options.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        ...(options.json && { response_format: { type: "json_object" as const } }),
      },
      { signal: options.signal },
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new OpenRouterError("empty", "The model returned no content.");
    }
    return content;
  } catch (error) {
    throw toOpenRouterError(error);
  }
}

/** Convenience wrapper for a single system + user prompt. */
export function prompt(system: string, user: string, options?: ChatOptions): Promise<string> {
  return chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    options,
  );
}

function toOpenRouterError(error: unknown): OpenRouterError {
  if (error instanceof OpenRouterError) return error;

  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    if (status === 429) return new OpenRouterError("rate_limited", error.message, status);
    if (status === 401 || status === 402 || status === 403) return new OpenRouterError("auth", error.message, status);
    if (status === 400 || status === 422) return new OpenRouterError("bad_request", error.message, status);
    return new OpenRouterError("upstream", error.message, status);
  }

  const message = error instanceof Error ? error.message : String(error);
  return new OpenRouterError("upstream", message);
}
