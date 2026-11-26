import "server-only";

import { checkTranscriptTool } from "./tools/check-transcript";
import { fail, type DecisionTool, type ToolContext, type ToolResult } from "./types";

// Every tool the decision model is allowed to call. A tool that isn't listed here can't run
export const decisionTools: DecisionTool[] = [checkTranscriptTool];

export function findTool(name: string): DecisionTool | undefined {
  return decisionTools.find((tool) => tool.name === name);
}

// Runs one tool call from the decision model. It never throws: every failure comes back
// as a result the model can read, and unexpected errors are logged without their details
export async function runTool(name: string, rawArgs: unknown, context: ToolContext): Promise<ToolResult> {
  const tool = findTool(name);
  if (!tool) {
    return fail("not_found", `There is no tool called "${name}"`);
  }

  try {
    return await tool.execute(rawArgs, context);
  } catch (error) {
    console.log(`Decision tool ${name} failed:`, error);
    return fail("internal", "The tool failed. Try again later.");
  }
}
