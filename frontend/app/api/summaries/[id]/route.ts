import { ANALYSIS_STATES, canMoveTo, type AnalysisStateName } from "@/lib/server/analysis";
import { getUser } from "@/lib/server/auth";
import { BodyReader, updateSet } from "@/lib/server/body";
import { query } from "@/lib/server/db";
import { ApiError, checkId, errorResponse, getBody } from "@/lib/server/http";
import { SUMMARY_COLUMNS as columns } from "@/lib/server/meetings";

type Params = { params: Promise<{ id: string }> };

type Run = { id: string; meeting_id: string; analysis_state: AnalysisStateName; is_latest: boolean };

// A run belongs to a user through its meeting, so every query joins meetings on user_id

// GET /api/summaries/:id - one analysis run
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Summary not found");

    const rows = await query(
      `select ${columns} from summaries s join meetings m on m.id = s.meeting_id where s.id = $1 and m.user_id = $2`,
      [id, user.id],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Summary not found");
    }

    return Response.json({ summary: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/summaries/:id - edit the summary text, the model name, or move the analysis state.
// State moves follow the same rules as the decision model's set_analysis_state tool,
// and only the meeting's newest run can change state
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Summary not found");
    const body = new BodyReader(await getBody(request));
    const summaryText = body.text("summaryText", 4000, "Summary");
    const modelName = body.text("modelName", 100, "Model name");
    let state = body.oneOf("analysisState", ANALYSIS_STATES, "Analysis state");
    body.done();

    const found = await query<Run>(
      `select s.id, s.meeting_id, s.analysis_state,
         s.id = (select l.id from summaries l where l.meeting_id = s.meeting_id order by l.created_at desc limit 1) as is_latest
       from summaries s join meetings m on m.id = s.meeting_id
       where s.id = $1 and m.user_id = $2`,
      [id, user.id],
    );
    const run = found[0];
    if (!run) {
      throw new ApiError(404, "Summary not found");
    }

    if (state === run.analysis_state) state = undefined;
    if (state !== undefined) {
      if (!run.is_latest) {
        throw new ApiError(409, "Only the meeting's newest analysis run can change state");
      }
      if (state === "queued") {
        throw new ApiError(409, `To analyse again, start a new run with POST /api/meetings/${run.meeting_id}/summaries`);
      }
      if (!canMoveTo(run.analysis_state, state)) {
        throw new ApiError(409, `The analysis can't move from ${run.analysis_state} to ${state}`);
      }
    }

    const set = updateSet({ summary_text: summaryText, model_name: modelName, analysis_state: state }, 4);
    // The state check stops two changes at once from both applying
    const rows = await query(
      `update summaries s set ${set.sql}, updated_at = now()
       from meetings m
       where s.id = $1 and s.meeting_id = m.id and m.user_id = $2 and s.analysis_state = $3
       returning ${columns}`,
      [id, user.id, run.analysis_state, ...set.params],
    );
    if (rows.length === 0) {
      throw new ApiError(409, "The analysis changed while you were editing. Reload and try again");
    }

    return Response.json({ summary: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/summaries/:id - delete an analysis run. The meeting's state falls back to its previous run
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Summary not found");

    const rows = await query(
      `delete from summaries s using meetings m
       where s.id = $1 and s.meeting_id = m.id and m.user_id = $2
       returning s.id`,
      [id, user.id],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Summary not found");
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
