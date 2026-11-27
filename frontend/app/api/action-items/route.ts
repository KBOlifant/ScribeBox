import type { NextRequest } from "next/server";
import { getUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { ApiError, errorResponse } from "@/lib/server/http";
import { ACTION_ITEM_COLUMNS as columns, PROGRESS_STATES } from "@/lib/server/meetings";

// GET /api/action-items - my action items across all meetings, for the Action items page.
// ?progressState=todo|in_progress|done filters them. Items with a due date come first, soonest first
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    const progressState = request.nextUrl.searchParams.get("progressState");
    if (progressState !== null && !(PROGRESS_STATES as readonly string[]).includes(progressState)) {
      throw new ApiError(400, `progressState must be one of: ${PROGRESS_STATES.join(", ")}`);
    }

    const actionItems = await query(
      `select ${columns}, m.title as meeting_title, m.meeting_date::text as meeting_date
       from action_items a join meetings m on m.id = a.meeting_id
       where m.user_id = $1 and ($2::text is null or a.progress_state = $2)
       order by a.action_date nulls last, m.meeting_date desc, a.created_at`,
      [user.id, progressState],
    );

    return Response.json({ actionItems });
  } catch (error) {
    return errorResponse(error);
  }
}
