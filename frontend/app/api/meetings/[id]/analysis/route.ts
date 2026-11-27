import { getUser } from "@/lib/server/auth";
import { runDecision } from "@/lib/server/decision/runner";
import { ApiError, checkId, errorResponse } from "@/lib/server/http";

type Params = { params: Promise<{ id: string }> };

// POST /api/meetings/:id/analysis - analyse the meeting now and return what happened, step by step.
// Works when the meeting has no run yet or its newest run is queued. To analyse a finished meeting
// again, first start a new run with POST /api/meetings/:id/summaries
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Meeting not found");

    const trace = await runDecision({ userId: user.id, meetingId: id });

    if (trace.stoppedBecause === "not_found") throw new ApiError(404, "Meeting not found");
    if (trace.stoppedBecause === "not_allowed") throw new ApiError(409, trace.error ?? "The analysis can't start now");
    if (trace.stoppedBecause === "not_configured") throw new ApiError(503, "Analysis isn't set up on this server");

    // done, invalid, model_error and tool_error all saved a final state the app can show
    return Response.json({ trace });
  } catch (error) {
    return errorResponse(error);
  }
}
