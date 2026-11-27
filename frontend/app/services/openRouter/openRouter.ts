import "server-only"; // makes sure this file is never sent to the browser because le API key

import OpenAI from "openai";

// The text model writes summaries, decisions and action item wording.
// Set OPENROUTER_LLM_MODEL in .env (a chat model such as openai/gpt-4o-mini)
export const DEFAULT_TEXT_MODEL = "openai/gpt-4o-mini";
const TIMEOUT_MS = 60_000;

export function textModelId(): string {
  return process.env.OPENROUTER_LLM_MODEL?.trim() || DEFAULT_TEXT_MODEL;
}

// A failed call to the text model. status is the HTTP status (429 = rate limited), or 0 if there was none
export class TextModelError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// OpenRouter works with the OpenAI package
function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new TextModelError(401, "Missing OPENROUTER_API_KEY in .env");
  }
  return new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1", timeout: TIMEOUT_MS, maxRetries: 1 });
}

// Sends a message to the text model and gives back its reply. With json, the model must reply
// with a JSON object (the system prompt has to describe its shape)
export async function askAI(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; maxTokens?: number } = {},
): Promise<{ text: string; model: string }> {
  const model = textModelId();
  try {
    const response = await getClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: options.maxTokens ?? 1200,
      ...(options.json ? { response_format: { type: "json_object" as const } } : {}),
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new TextModelError(502, "The text model sent back an empty reply");
    }
    return { text, model: response.model || model };
  } catch (error) {
    if (error instanceof TextModelError) throw error;
    const status = error instanceof OpenAI.APIError && typeof error.status === "number" ? error.status : 0;
    console.log("OpenRouter call failed:", error);
    throw new TextModelError(status, `The text model failed${status ? ` (${status})` : ""}`);
  }
}
