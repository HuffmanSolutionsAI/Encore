import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { HttpError, json } from "./lib/http";
import { createUser, getMe, updateMe } from "./routes/users";
import { verifyLastfm } from "./routes/lastfm";

type Route = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyResultV2>;

// `GET /health` is exposed unauthenticated by API Gateway; every other route
// sits behind the Cognito JWT authorizer.
const routes: Record<string, Route> = {
  "GET /health": async () => json(200, { status: "ok", service: "encore-api" }),
  "GET /users/me": getMe,
  "POST /users": createUser,
  "PATCH /users/me": updateMe,
  "GET /lastfm/verify": verifyLastfm,
};

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  const route = `${event.requestContext.http.method} ${event.rawPath}`;
  const fn = routes[route];
  if (!fn) return json(404, { error: "not_found", route });

  try {
    return await fn(event);
  } catch (err) {
    if (err instanceof HttpError) {
      return json(err.statusCode, { error: err.code, message: err.message });
    }
    console.error("Unhandled error", err);
    return json(500, { error: "internal", message: "Something went wrong" });
  }
}
