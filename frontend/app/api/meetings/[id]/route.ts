import { getUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { ApiError, checkId as checkUuid, errorResponse, getBody } from "@/lib/server/http";
import { MEETING_COLUMNS } from "@/lib/server/meetings";
import { hasErrors, meetingDateError, meetingTitleError } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const columns = `${MEETING_COLUMNS}, transcript`;

function checkId(id: string) {
  checkUuid(id, "Meeting not found");
}

// GET /api/meetings/:id - get one meeting (with the transcript)
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id);

    const rows = await query(`select ${columns} from meetings where id = $1 and user_id = $2`, [id, user.id]);
    if (rows.length === 0) {
      throw new ApiError(404, "Meeting not found");
    }

    return Response.json({ meeting: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/meetings/:id - update a meeting's title and/or date
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id);
    const body = await getBody(request);

    if (body.transcript !== undefined) {
      throw new ApiError(422, "The transcript can't be changed");
    }

    const title = typeof body.title === "string" ? body.title.trim() : null;
    const date = typeof body.date === "string" ? body.date : null;

    if (title === null && date === null) {
      throw new ApiError(400, "Send a title or date to update");
    }

    const errors = {
      title: title !== null ? meetingTitleError(title) : undefined,
      date: date !== null ? meetingDateError(date) : undefined,
    };
    if (hasErrors(errors)) {
      throw new ApiError(422, "Some fields need fixing", errors);
    }

    // coalesce keeps the old value when we didn't send a new one
    const rows = await query(
      `update meetings
       set title = coalesce($3, title), meeting_date = coalesce($4::date, meeting_date), updated_at = now()
       where id = $1 and user_id = $2
       returning ${columns}`,
      [id, user.id, title, date],
    );
    if (rows.length === 0) {
      throw new ApiError(404, "Meeting not found");
    }

    return Response.json({ meeting: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/meetings/:id - delete a meeting
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getUser(request);
    const { id } = await params;
    checkId(id);

    const rows = await query(`delete from meetings where id = $1 and user_id = $2 returning id`, [id, user.id]);
    if (rows.length === 0) {
      throw new ApiError(404, "Meeting not found");
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
