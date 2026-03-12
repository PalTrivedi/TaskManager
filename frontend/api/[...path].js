const DEFAULT_BACKEND_BASE_URL = "http://13.233.70.109";

function getForwardHeaders(request) {
  const headers = {};
  const allowedHeaders = ["content-type", "x-user-id", "authorization"];

  for (const headerName of allowedHeaders) {
    const value = request.headers[headerName];
    if (value) {
      headers[headerName] = value;
    }
  }

  return headers;
}

function getForwardBody(request) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  if (request.body === undefined || request.body === null) {
    return undefined;
  }

  return typeof request.body === "string" ? request.body : JSON.stringify(request.body);
}

export default async function handler(request, response) {
  const backendBaseUrl = process.env.BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL;
  const pathSegments = Array.isArray(request.query.path) ? request.query.path : [request.query.path];
  const upstreamPath = pathSegments.filter(Boolean).join("/");
  const queryIndex = request.url.indexOf("?");
  const query = queryIndex >= 0 ? request.url.slice(queryIndex) : "";
  const targetUrl = `${backendBaseUrl}/api/${upstreamPath}${query}`;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: getForwardHeaders(request),
      body: getForwardBody(request),
    });

    const text = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get("content-type");

    if (contentType) {
      response.setHeader("content-type", contentType);
    }

    response.status(upstreamResponse.status).send(text);
  } catch (error) {
    response.status(502).json({
      detail: "Vercel proxy could not reach the backend",
      backendBaseUrl,
      error: error instanceof Error ? error.message : "Unknown proxy error",
    });
  }
}
