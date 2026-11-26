import { getUser } from "@/lib/server/auth";
import { errorResponse } from "@/lib/server/http";

// GET /api/auth/me - returns the logged in user
export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    return Response.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
