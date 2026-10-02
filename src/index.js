// joeysvault-site: serves www.joeysvault.app and projects.joeysvault.app.
// Page HTML is bundled from src/pages. Media is read from the assets layer (public/)
// and re-served here with HTTP range support, which video seeking needs.
// Everything else on joeysvault.app (upload, library, swarm, API) stays in flue-manager.
import www from "./pages/www.html";
import projects from "./pages/projects.html";
import SIZES from "./media-sizes.json";

const SITES = {
  "www.joeysvault.app": www,
  "projects.joeysvault.app": projects,
};
const HTML_HEADERS = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };
const MEDIA_TYPES = { ".mp4": "video/mp4", ".jpg": "image/jpeg" };

// Stream bytes [start, end] (inclusive) out of a full-body stream without buffering it.
function sliceStream(body, start, end) {
  const reader = body.getReader();
  let pos = 0;
  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        const chunkStart = pos;
        pos += value.byteLength;
        if (pos <= start) continue;
        const from = Math.max(0, start - chunkStart);
        const to = Math.min(value.byteLength, end - chunkStart + 1);
        if (to > from) controller.enqueue(value.subarray(from, to));
        if (pos > end) { controller.close(); reader.cancel(); return; }
        return;
      }
    },
    cancel() { return reader.cancel(); },
  });
}

async function serveMedia(request, env, url) {
  const ext = url.pathname.slice(url.pathname.lastIndexOf("."));
  const full = await env.ASSETS.fetch(new Request(url, { method: "GET" }));
  if (full.status !== 200) { return new Response(full.body, { status: full.status }); }
  const total = SIZES[url.pathname] || 0;
  const base = {
    "content-type": MEDIA_TYPES[ext] || "application/octet-stream",
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=86400",
    etag: full.headers.get("etag") || "",
  };
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (!m || !total) {
    return new Response(request.method === "HEAD" ? null : full.body, { status: 200, headers: { ...base, "content-length": String(total) } });
  }
  let start = m[1] === "" ? Math.max(0, total - Number(m[2])) : Number(m[1]);
  let end = m[1] === "" || m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1);
  if (start > end || start >= total) {
    return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
  }
  const headers = { ...base, "content-range": `bytes ${start}-${end}/${total}`, "content-length": String(end - start + 1) };
  if (request.method === "HEAD") return new Response(null, { status: 206, headers });
  return new Response(sliceStream(full.body, start, end), { status: 206, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (/\.(mp4|jpg)$/.test(url.pathname)) return serveMedia(request, env, url);
    let page = SITES[url.hostname];
    // Test aliases on the workers.dev URL only.
    if (!page && url.hostname.endsWith(".workers.dev")) {
      if (url.pathname === "/__www") page = www;
      if (url.pathname === "/__projects") page = projects;
    }
    if (page) return new Response(request.method === "HEAD" ? null : page, { headers: HTML_HEADERS });
    return new Response("Not found", { status: 404 });
  },
};
