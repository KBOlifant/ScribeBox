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
