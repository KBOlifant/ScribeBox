import "server-only";

// Client for OpenRouter's decisions endpoint, used by TypeSafe's Jev models. A decisions model
// writes no text and calls no tools: we send it the situation (state) and named questions, and
// it answers each one. Our code then acts on the answers
const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
const TIMEOUT_MS = 30_000;

export const DEFAULT_DECISION_MODEL = "typesafe/jev-1.14";

// The decision model's OpenRouter id, from OPENROUTER_MODEL in .env. Jev can't write text,
// so the text model is set separately in OPENROUTER_LLM_MODEL
export function decisionModelId(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_DECISION_MODEL;
}

// A yes/no question. The answer's noul is the probability of "true", from 0 to 1
export type YesNoQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true: string; false: string };
};

type RawAnswer = { type?: unknown; noul?: unknown };

export type DecisionAnswers = Record<string, RawAnswer | undefined>;

// An HTTP or network failure. status is 0 when the request never got a response
export class DecisionModelError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Asks the decision model the questions about one state. Throws DecisionModelError on failure
export async function askDecisionModel(
  state: string,
  questions: Record<string, YesNoQuestion>,
): Promise<{ answers: DecisionAnswers; cost: number | null }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new DecisionModelError(401, "Missing OPENROUTER_API_KEY in .env");
  }

  let response: Response;
  try {
    response = await fetch(DECISIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: decisionModelId(), state, questions }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new DecisionModelError(0, `The decision model couldn't be reached: ${(error as Error).message}`);
  }

  const body = (await response.json().catch(() => null)) as {
    answers?: DecisionAnswers;
    usage?: { cost?: unknown };
    error?: { message?: unknown };
  } | null;

  if (!response.ok) {
    const message = typeof body?.error?.message === "string" ? body.error.message : response.statusText;
    throw new DecisionModelError(response.status, `The decision model failed (${response.status}): ${message}`);
  }
  if (!body || typeof body.answers !== "object" || body.answers === null) {
    throw new DecisionModelError(502, "The decision model sent back no answers");
  }

  return { answers: body.answers, cost: typeof body.usage?.cost === "number" ? body.usage.cost : null };
}

export type Verdict = "yes" | "no" | "unsure";

// Most answers need to be this sure either way to count; anything in between is unsure
const SURE = 0.7;

// Turns a yes/no answer into a verdict. A refusal, a missing answer or anything unexpected
// counts as unsure, so a person checks it instead of the app treating it as a "no"
export function yesNo(answer: RawAnswer | undefined): { verdict: Verdict; probability: number | null } {
  if (!answer || answer.type !== "noul" || typeof answer.noul !== "number" || !Number.isFinite(answer.noul)) {
    return { verdict: "unsure", probability: null };
  }
  const probability = answer.noul;
  const verdict = probability >= SURE ? "yes" : probability <= 1 - SURE ? "no" : "unsure";
  return { verdict, probability };
}
