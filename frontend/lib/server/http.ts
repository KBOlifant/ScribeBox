import "server-only";

/** An error that is safe to show the caller. Anything else becomes a generic 500. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string | undefined>,
  ) {
    super(message);
  }
}

export const notFound = () => new ApiError(404, "not_found", "That meeting doesn't exist.");

/** Wraps a route handler so every failure comes back in the same `{ error: { code, message } }` shape. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(
          { error: { code: error.code, message: error.message, ...(error.fields && { fields: error.fields }) } },
          { status: error.status },
        );
      }
      console.error("Unhandled API error:", error);
      return Response.json({ error: { code: "server_error", message: "Something went wrong." } }, { status: 500 });
    }
  };
}

/** Parses a JSON object body, rejecting bodies over `maxBytes` before reading them in full where possible. */
export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new ApiError(413, "too_large", "Request body is too large.");

  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) throw new ApiError(413, "too_large", "Request body is too large.");

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "invalid_json", "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}
