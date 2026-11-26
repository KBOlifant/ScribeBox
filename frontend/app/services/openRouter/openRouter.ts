import "server-only"; // makes sure this file is never sent to the browser because le API key

import OpenAI from "openai";

// OpenRouter works with the OpenAI package
function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in .env.local");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });

  return client;
}

// Sends a message to the AI and gives back the reply as a string
// TODO: use SYSTEMPROMPT as a guardrail
export async function askAI(systemPrompt: string, userMessage: string) {
  const client = getClient();
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const reply = response.choices[0].message.content;

    if (!reply) {
      throw new Error("AI did not return anything");
    }

    return reply;
  } catch (error) {
    console.log("OpenRouter call failed:", error);
    throw error;
  }
}
