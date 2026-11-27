import { getUser } from "@/lib/server/auth";
import { BodyReader, updateSet } from "@/lib/server/body";
import { query } from "@/lib/server/db";
import { errorResponse, getBody } from "@/lib/server/http";

// Users can only see and change their own account, so there's no list or /users/:id.
// The account row is created on the first signed-in request (see getUser), so there's no POST

// GET /api/users/me - my account
export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    return Response.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/users/me - change my name. The email comes from Firebase, so it can't be changed here
export async function PATCH(request: Request) {
  try {
    const user = await getUser(request);
    const body = new BodyReader(await getBody(request));
    // A cleared name would be refilled from the token on the next request, so it can't be cleared
    const name = body.filledText("name", 80, "Name", false);
    body.done();

    const set = updateSet({ name }, 2);
    const rows = await query(`update users set ${set.sql} where id = $1 returning id, email, name, created_at`, [
      user.id,
      ...set.params,
    ]);

    return Response.json({ user: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/users/me - delete my account and, through the foreign keys, all my meetings,
// summaries, decisions and action items. The Firebase login itself stays: signing in again
// starts a new, empty account
export async function DELETE(request: Request) {
  try {
    const user = await getUser(request);
    await query(`delete from users where id = $1`, [user.id]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
