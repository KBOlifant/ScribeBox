import "server-only";

// An error with a status code that we can send back to the user
export class ApiError extends Error {
  status: number;
  fields?: Record<string, string | undefined>;

  constructor(status: number, message: string, fields?: Record<string, string | undefined>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ids are UUIDs, so anything else can't exist: answer 404 without asking the database
export function checkId(id: string, notFoundMessage: string) {
  if (!UUID_PATTERN.test(id)) {
    throw new ApiError(404, notFoundMessage);
  }
}

// Postgres can't store the null character, so text containing it would fail with a 500
export function hasNullCharacter(...values: string[]): boolean {
  return values.some((value) => value.includes("\u0000"));
}

// Turns an error into a JSON response
export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message, fields: error.fields }, { status: error.status });
  }

  console.log("Server error:", error);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

// Reads the JSON body from a request
export async function getBody(request: Request) {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("Body is not an object");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}
