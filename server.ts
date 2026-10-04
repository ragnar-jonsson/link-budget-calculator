// server.ts
// Deno HTTP server exposing the link‑budget calculator as a JSON API.
// POST /compute with body { "inputOverrides": { … } }
// Returns the full result from compute().

// Using built‑in Deno.serve – no external import needed
import { compute } from "./channel_capacity_calc.js";

const handler = async (request: Request): Promise<Response> => {
  const { pathname } = new URL(request.url);
  if (request.method === "GET" && pathname === "/ping") {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (request.method === "POST" && pathname === "/compute") {
    try {
      const body = await request.json();
      const overrides = body.inputOverrides || {};
      const result = compute(overrides);
      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e) {
      console.error("Compute error:", e);
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }

  // Serve index.html for root path
  if (request.method === "GET" && pathname === "/") {
    const indexPath = `${Deno.cwd()}/index.html`;
    try {
      const indexData = await Deno.readFile(indexPath);
      return new Response(indexData, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    } catch {
      // fall through to 404 if not found
    }
  }
  // Serve static files (HTML, JS, CSS, etc.) for other GET requests
  if (request.method === "GET") {
    const safePath = pathname.replace(/^\\+/, "");
    const filePath = `${Deno.cwd()}/${safePath}`;
    try {
      const fileData = await Deno.readFile(filePath);
      const ext = safePath.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        html: "text/html",
        js: "application/javascript",
        css: "text/css",
        json: "application/json",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
      };
      const contentType = mimeMap[ext ?? ""] || "application/octet-stream";
      return new Response(fileData, {
        status: 200,
        headers: { "content-type": contentType },
      });
    } catch {
      // fall through to 404
    }
  }

  // Default 404 response
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

const port = Number(Deno.env.get("PORT") ?? "3000");
console.log(`Link‑budget calculator API listening on http://0.0.0.0:${port}`);
Deno.serve({ port, hostname: "0.0.0.0" }, handler);
