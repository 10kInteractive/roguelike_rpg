import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
};

function toFilePath(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const relative = decodeURIComponent(url.pathname);
  const resolved = path.resolve(rootDir, `.${relative}`);

  if (!resolved.startsWith(rootDir)) {
    return null;
  }

  return resolved;
}

async function readFileOrIndex(filePath) {
  const stats = await fs.stat(filePath).catch(() => null);

  if (stats?.isDirectory()) {
    return readFileOrIndex(path.join(filePath, "index.html"));
  }

  if (!stats?.isFile()) {
    return null;
  }

  return {
    body: await fs.readFile(filePath),
    contentType: mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  const filePath = toFilePath(request.url ?? "/");
  const file = filePath ? await readFileOrIndex(filePath) : null;

  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": file.contentType });
  response.end(request.method === "HEAD" ? undefined : file.body);
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});
