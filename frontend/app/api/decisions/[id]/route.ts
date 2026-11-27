import { getUser } from "@/lib/server/auth";
import { BodyReader, updateSet } from "@/lib/server/body";
import { query } from "@/lib/server/db";
import { ApiError, checkId, errorResponse, getBody } from "@/lib/server/http";
import { DECISION_COLUMNS as columns } from "@/lib/server/meetings";

type Params = { params: Promise<{ id: string }> };

// A decision belongs to a user through its meeting, so every query joins meetings on user_id

// GET /api/decisions/:id - one decision
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Decision not found");

    const rows = await query(
      `select ${columns} from decisions d join meetings m on m.id = d.meeting_id where d.id = $1 and m.user_id = $2`,
      [id, user.id],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Decision not found");
    }

    return Response.json({ decision: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/decisions/:id - reword a decision
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Decision not found");
    const body = new BodyReader(await getBody(request));
    const decisionText = body.filledText("decisionText", 500, "Decision", false);
    body.done();

    const set = updateSet({ decision_text: decisionText }, 3);
    const rows = await query(
      `update decisions d set ${set.sql}
       from meetings m
       where d.id = $1 and d.meeting_id = m.id and m.user_id = $2
       returning ${columns}`,
      [id, user.id, ...set.params],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Decision not found");
    }

    return Response.json({ decision: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/decisions/:id - delete a decision
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Decision not found");

    const rows = await query(
      `delete from decisions d using meetings m
       where d.id = $1 and d.meeting_id = m.id and m.user_id = $2
       returning d.id`,
      [id, user.id],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Decision not found");
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
