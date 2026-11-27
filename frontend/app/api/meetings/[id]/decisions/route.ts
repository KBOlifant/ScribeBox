import { getUser } from "@/lib/server/auth";
import { BodyReader } from "@/lib/server/body";
import { query } from "@/lib/server/db";
import { errorResponse, getBody } from "@/lib/server/http";
import { DECISION_COLUMNS as columns, requireMeeting } from "@/lib/server/meetings";

type Params = { params: Promise<{ id: string }> };

// GET /api/meetings/:id/decisions - the meeting's decisions, in the order they were added
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    await requireMeeting(id, user.id);

    const decisions = await query(
      `select ${columns} from decisions d where d.meeting_id = $1 order by d.created_at, d.id`,
      [id],
    );

    return Response.json({ decisions });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/meetings/:id/decisions - add a decision
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    await requireMeeting(id, user.id);
    const body = new BodyReader(await getBody(request));
    const decisionText = body.filledText("decisionText", 500, "Decision", true);
    body.done();

    const rows = await query(
      `insert into decisions as d (meeting_id, decision_text) values ($1, $2) returning ${columns}`,
      [id, decisionText],
    );

    return Response.json({ decision: rows[0] }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
