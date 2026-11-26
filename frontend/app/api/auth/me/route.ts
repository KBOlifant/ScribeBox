import { requireUser } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";

/**
 * GET /api/auth/me
 * Sign-in itself happens with Firebase. This endpoint checks the Firebase ID token, makes sure the
 * user has a row in our database, and returns who they are.
 */
export const GET = handle(async (request: Request) => {
  const user = await requireUser(request);
  return Response.json({ user });
});
