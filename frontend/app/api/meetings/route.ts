import { getUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { ApiError, errorResponse, getBody } from "@/lib/server/http";
import { hasErrors, meetingErrors } from "@/lib/validation";

// Columns we send back for a meeting (date as text so it stays YYYY-MM-DD)
const columns = `id, title, meeting_date::text as date, source_kind, source_name,
  analysis_state, summary, decisions, created_at, updated_at`;

// Returns the value if it's a string, otherwise an empty string
function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

// GET /api/meetings - get all my meetings (without the transcripts)
export async function GET(request: Request) {
  try {
    const user = await getUser(request);

    const meetings = await query(
      `select ${columns} from meetings where user_id = $1 order by meeting_date desc, created_at desc`,
      [user.id],
    );

    return Response.json({ meetings });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/meetings - create a meeting
export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    const body = await getBody(request);

    const title = asText(body.title);
    const date = asText(body.date);
    const transcript = asText(body.transcript);
    const sourceName = asText(body.sourceName).trim();

    const errors = meetingErrors({ title, date, transcript });
    if (hasErrors(errors)) {
      throw new ApiError(422, "Some fields need fixing", errors);
    }

    // If there's a file name the transcript was uploaded, otherwise it was pasted
    const sourceKind = sourceName ? "file" : "paste";

    const rows = await query(
      `insert into meetings (user_id, title, meeting_date, source_kind, source_name, transcript)
       values ($1, $2, $3, $4, $5, $6)
       returning ${columns}, transcript`,
      [user.id, title.trim(), date, sourceKind, sourceName || null, transcript],
    );

    return Response.json({ meeting: rows[0] }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
