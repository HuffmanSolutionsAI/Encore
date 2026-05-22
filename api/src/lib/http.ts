import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

export function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** An error carrying the HTTP status and stable error code to return to the client. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "HttpError";
  }
}

/** Parse and shallow-validate a JSON request body. */
export function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
  if (!event.body) throw new HttpError(400, "missing_body", "Request body is required");
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "invalid_json", "Request body is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(400, "invalid_body", "Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}
