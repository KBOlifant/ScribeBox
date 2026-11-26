import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handle, readJson } from "@/lib/server/http";
import { deleteMeeting, getMeeting, updateMeeting } from "@/lib/server/meetings";

type Ctx = RouteContext<"/api/meetings/[id]">;

/** GET /api/meetings/:id: one meeting, including its transcript. */
export const GET = handle(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await ctx.params;
  return Response.json({ meeting: await getMeeting(user.id, id) });
});

/** PATCH /api/meetings/:id: changes the title and/or date. Body: { title?, date? } */
export const PATCH = handle(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await ctx.params;
  const body = await readJson(request, 16_000);
  return Response.json({ meeting: await updateMeeting(user.id, id, body) });
});

/** DELETE /api/meetings/:id */
export const DELETE = handle(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id } = await ctx.params;
  await deleteMeeting(user.id, id);
  return new Response(null, { status: 204 });
});
