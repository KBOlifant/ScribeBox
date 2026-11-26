import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { query } from "./db";
import { ApiError } from "./http";

/*
 * Firebase signs ID tokens with Google's public keys, so we can verify them with `jose` and the
 * project ID alone. No service-account secret is needed.
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */
const FIREBASE_KEYS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export type AuthUser = { id: string; email: string; name: string | null; createdAt: string };

type UserRow = { id: string; email: string; name: string | null; created_at: Date };

const unauthorized = () => new ApiError(401, "unauthorized", "Sign in to continue.");

/**
 * Verifies the `Authorization: Bearer <Firebase ID token>` header and returns the user,
 * creating their database row on first sight so every meeting has an owner to point at.
 */
export async function requireUser(request: Request): Promise<AuthUser> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw unauthorized();

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");

  let claims;
  try {
    ({ payload: claims } = await jwtVerify(token, FIREBASE_KEYS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    }));
  } catch {
    throw unauthorized();
  }

  const uid = claims.sub;
  const email = typeof claims.email === "string" ? claims.email : null;
  if (!uid || !email) throw unauthorized();
  const name = typeof claims.name === "string" ? claims.name : null;

  const [row] = await query<UserRow>(
    `insert into users (id, email, name) values ($1, $2, $3)
     on conflict (id) do update
       set email = excluded.email, name = coalesce(excluded.name, users.name)
     returning id, email, name, created_at`,
    [uid, email, name],
  );
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at.toISOString() };
}
