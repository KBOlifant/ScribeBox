import { getUser } from "@/lib/server/auth";
import { BodyReader, updateSet } from "@/lib/server/body";
import { query } from "@/lib/server/db";
import { ApiError, checkId, errorResponse, getBody } from "@/lib/server/http";
import { ACTION_ITEM_COLUMNS as columns, readActionItem } from "@/lib/server/meetings";

type Params = { params: Promise<{ id: string }> };

// An action item belongs to a user through its meeting, so every query joins meetings on user_id

// GET /api/action-items/:id - one action item
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Action item not found");

    const rows = await query(
      `select ${columns} from action_items a join meetings m on m.id = a.meeting_id where a.id = $1 and m.user_id = $2`,
      [id, user.id],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Action item not found");
    }

    return Response.json({ actionItem: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/action-items/:id - change any field. Send null to clear an optional field,
// e.g. ownerNote: null once a person has confirmed the owner
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Action item not found");
    const body = new BodyReader(await getBody(request));
    const fields = readActionItem(body, false);
    body.done();

    const set = updateSet(fields, 3);
    const rows = await query(
      `update action_items a set ${set.sql}, updated_at = now()
       from meetings m
       where a.id = $1 and a.meeting_id = m.id and m.user_id = $2
       returning ${columns}`,
      [id, user.id, ...set.params],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Action item not found");
    }

    return Response.json({ actionItem: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/action-items/:id - delete an action item
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id, "Action item not found");

    const rows = await query(
      `delete from action_items a using meetings m
       where a.id = $1 and a.meeting_id = m.id and m.user_id = $2
       returning a.id`,
      [id, user.id],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Action item not found");
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
