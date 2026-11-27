import { getUser } from "@/lib/server/auth";
import { BodyReader } from "@/lib/server/body";
import { query } from "@/lib/server/db";
import { errorResponse, getBody } from "@/lib/server/http";
import { ACTION_ITEM_COLUMNS as columns, readActionItem, requireMeeting } from "@/lib/server/meetings";

type Params = { params: Promise<{ id: string }> };

// GET /api/meetings/:id/action-items - the meeting's action items, in the order they were added
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    await requireMeeting(id, user.id);

    const actionItems = await query(
      `select ${columns} from action_items a where a.meeting_id = $1 order by a.created_at, a.id`,
      [id],
    );

    return Response.json({ actionItems });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/meetings/:id/action-items - add an action item. Only title is required
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    await requireMeeting(id, user.id);
    const body = new BodyReader(await getBody(request));
    const fields = readActionItem(body, true);
    body.done();

    // Insert only the fields that were sent, so the rest get their defaults.
    // Column names come from readActionItem, never from the request
    const sent = Object.entries(fields).filter(([, value]) => value !== undefined);
    const names = ["meeting_id", ...sent.map(([column]) => column)];
    const values = [id, ...sent.map(([, value]) => value)];
    const rows = await query(
      `insert into action_items as a (${names.join(", ")})
       values (${values.map((_, index) => `$${index + 1}`).join(", ")})
       returning ${columns}`,
      values,
    );

    return Response.json({ actionItem: rows[0] }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
