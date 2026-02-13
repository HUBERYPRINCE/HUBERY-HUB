const MANIFEST_KEY = "manifest:v1";

/** 允许跨域时用；如果 Worker 路由挂在同域（推荐），可以把 * 收紧到你的域名 */
function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,PUT,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
}

function json(data, init = {}, request) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  const c = corsHeaders(request);
  for (const [k, v] of Object.entries(c)) headers.set(k, v);
  return new Response(JSON.stringify(data), { ...init, headers });
}

function text(body, init = {}, request) {
  const headers = new Headers(init.headers || {});
  const c = corsHeaders(request);
  for (const [k, v] of Object.entries(c)) headers.set(k, v);
  return new Response(body, { ...init, headers });
}

function unauthorized(request) {
  return text("Unauthorized", { status: 401 }, request);
}

function badRequest(msg, request) {
  return text(msg, { status: 400 }, request);
}

function isValidItem(x) {
  return x && typeof x === "object" &&
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    typeof x.url === "string";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return text("", { status: 204 }, request);
    }

    if (!url.pathname.startsWith("/api/")) {
      return text("Not Found", { status: 404 }, request);
    }

    if (url.pathname === "/api/manifest" && request.method === "GET") {
      const raw = await env.TOOLBOX_KV.get(MANIFEST_KEY);
      if (!raw) {
        // 首次为空时给一个默认清单
        const initial = {
          items: [
            { id: "pricing", name: "Pricing", desc: "示例：定价", url: "/tools/pricing.html", tag: "Finance", updatedAt: new Date().toISOString() },
            { id: "report", name: "Report", desc: "示例：报表", url: "/tools/report.html", tag: "Ops", updatedAt: new Date().toISOString() },
          ],
          updatedAt: new Date().toISOString(),
        };
        await env.TOOLBOX_KV.put(MANIFEST_KEY, JSON.stringify(initial));
        return json(initial, { status: 200, headers: { "cache-control": "no-store" } }, request);
      }
      return json(JSON.parse(raw), { status: 200, headers: { "cache-control": "no-store" } }, request);
    }

    if (url.pathname === "/api/manifest" && request.method === "PUT") {
      // Auth
      const auth = request.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token || token !== env.ADMIN_TOKEN) {
        return unauthorized(request);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return badRequest("Body must be JSON", request);
      }

      const items = body?.items;
      if (!Array.isArray(items)) return badRequest("items must be an array", request);
      if (items.some(x => !isValidItem(x))) return badRequest("each item must have id/name/url (string)", request);

      const payload = { items, updatedAt: new Date().toISOString() };
      await env.TOOLBOX_KV.put(MANIFEST_KEY, JSON.stringify(payload));
      return json({ ok: true, updatedAt: payload.updatedAt }, { status: 200, headers: { "cache-control": "no-store" } }, request);
    }

    return text("Not Found", { status: 404 }, request);
  }
};
