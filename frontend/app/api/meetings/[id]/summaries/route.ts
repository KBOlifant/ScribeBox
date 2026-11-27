import { canStartNewRun, type AnalysisStateName } from "@/lib/server/analysis";
import { getUser } from "@/lib/server/auth";
import { BodyReader, getOptionalBody } from "@/lib/server/body";
import { query } from "@/lib/server/db";
import { ApiError, errorResponse } from "@/lib/server/http";
import { requireMeeting, SUMMARY_COLUMNS as columns } from "@/lib/server/meetings";

type Params = { params: Promise<{ id: string }> };

// GET /api/meetings/:id/summaries - every analysis run of the meeting, newest first
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    await requireMeeting(id, user.id);

    const summaries = await query(
      `select ${columns} from summaries s where s.meeting_id = $1 order by s.created_at desc`,
      [id],
    );

    return Response.json({ summaries });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/meetings/:id/summaries - start a new analysis run (queued). This is the "Retry" action.
// Only allowed when there's no run yet or the newest one has finished (done, failed, rate_limited)
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    await requireMeeting(id, user.id);
    const body = new BodyReader(await getOptionalBody(request));
    const modelName = body.text("modelName", 100, "Model name");
    body.done();

    const latest = await query<{ analysis_state: AnalysisStateName }>(
      `select analysis_state from summaries where meeting_id = $1 order by created_at desc limit 1`,
      [id],
    );
    const state = latest[0]?.analysis_state ?? "none";
    if (!canStartNewRun(state)) {
      throw new ApiError(
        409,
        state === "invalid"
          ? "This transcript can't be analysed. Upload a new one instead"
          : `The analysis is already ${state}`,
      );
    }

    const rows = await query(
      `insert into summaries as s (meeting_id, model_name) values ($1, $2) returning ${columns}`,
      [id, modelName ?? null],
    );

    return Response.json({ summary: rows[0] }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
