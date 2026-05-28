// Local dev server. Wraps the same `handler` the Lambda exports so route
// logic, validation, and SQL queries are identical between local and AWS.
// Translates Node's `IncomingMessage` / `ServerResponse` into the API
// Gateway v2 event shape `handler.ts` expects.
//
// Run via `npm run dev` (which loads .env via dotenv-cli + tsx watch).

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { handler } from "./handler";

const PORT = Number(process.env.PORT ?? 3001);
const ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function lowercaseHeaders(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) out[k.toLowerCase()] = v.join(",");
    else if (typeof v === "string") out[k.toLowerCase()] = v;
  }
  return out;
}

async function dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS preflight — the web client at WEB_ORIGIN talks to us cross-origin.
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "content-type,authorization,x-dev-user-id",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const body = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method ?? "")
    ? await readBody(req)
    : undefined;

  const event = {
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers: lowercaseHeaders(req),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    requestContext: {
      http: {
        method: req.method ?? "GET",
        path: url.pathname,
        protocol: "HTTP/1.1",
        sourceIp: req.socket.remoteAddress ?? "127.0.0.1",
        userAgent: req.headers["user-agent"] ?? "",
      },
      // requireAuth() will route through the DEV_AUTH header path; the JWT
      // claims object stays empty.
      authorizer: { jwt: { claims: {}, scopes: [] } },
    },
    body,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

  const result = await handler(event);
  const payload =
    typeof result === "object" && result !== null && "statusCode" in result
      ? result
      : { statusCode: 200, body: JSON.stringify(result) };

  res.statusCode = payload.statusCode ?? 200;
  for (const [k, v] of Object.entries(payload.headers ?? {})) {
    if (v !== undefined) res.setHeader(k, String(v));
  }
  res.end(payload.body ?? "");
}

const server = createServer((req, res) => {
  dispatch(req, res).catch((err) => {
    console.error(`[api] ${req.method} ${req.url} → 500`, err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "internal", message: String(err) }));
  });
});

server.listen(PORT, () => {
  const mode = process.env.DEV_AUTH === "1" ? "DEV_AUTH" : "JWT";
  console.log(`Encore API listening on http://localhost:${PORT}  (auth: ${mode})`);
  console.log(`  CORS origin: ${ORIGIN}`);
});
