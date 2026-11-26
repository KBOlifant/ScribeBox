import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { query } from "./db";
import { ApiError } from "./http";

// Google's public keys, used to check that a Firebase token is real
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export type User = {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
};

// Gets the logged in user from the request's token
export async function getUser(request: Request): Promise<User> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Not logged in");
  }
  const token = authHeader.replace("Bearer ", "");

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env");
  }

  let payload;
  try {
    const result = await jwtVerify(token, googleKeys, {
      issuer: "https://securetoken.google.com/" + projectId,
      audience: projectId,
    });
    payload = result.payload;
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const id = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : null;
  const name = typeof payload.name === "string" ? payload.name : null;
  if (!id || !email) {
    throw new ApiError(401, "Invalid token");
  }

  // Save the user in the database (or update them if they already exist)
  const rows = await query<User>(
    `insert into users (id, email, name) values ($1, $2, $3)
     on conflict (id) do update set email = excluded.email, name = coalesce(excluded.name, users.name)
     returning id, email, name, created_at`,
    [id, email, name],
  );
  return rows[0];
}
