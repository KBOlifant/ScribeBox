import { requireUser } from "@/lib/server/auth";
import { handle, readJson } from "@/lib/server/http";
import { createMeeting, listMeetings, MEETING_BODY_MAX_BYTES } from "@/lib/server/meetings";

/** GET /api/meetings: the signed-in user's meetings, newest first, without transcripts. */
export const GET = handle(async (request: Request) => {
  const user = await requireUser(request);
  const meetings = await listMeetings(user.id);
  return Response.json({ meetings });
});

/** POST /api/meetings: saves a new meeting and its transcript. Body: { title, date, transcript, sourceName? } */
export const POST = handle(async (request: Request) => {
  const user = await requireUser(request);
  const body = await readJson(request, MEETING_BODY_MAX_BYTES);
  const meeting = await createMeeting(user.id, body);
  return Response.json({ meeting }, { status: 201, headers: { Location: `/api/meetings/${meeting.id}` } });
});
