import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Encore API entry point. Routes are added per milestone; M0 ships the public
 * health check that API Gateway exposes unauthenticated.
 */
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const route = `${event.requestContext.http.method} ${event.rawPath}`;

  switch (route) {
    case "GET /health":
      return json(200, { status: "ok", service: "encore-api" });
    default:
      return json(404, { error: "not_found", route });
  }
}
