const http = require("http");
const { URL } = require("url");

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_VERSION = "2022-06-28";
const PORT = Number(process.env.PORT || 8787);

if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
  console.error("Missing env: NOTION_TOKEN and NOTION_DATABASE_ID are required.");
  process.exit(1);
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function mapFromNotion(page) {
  const p = page.properties || {};
  const name = p.Name?.title?.[0]?.plain_text || "未命名";
  const category = p.Category?.select?.name || "其他";
  const status = p.Status?.select?.name || "待补货";
  const location = p.Location?.rich_text?.[0]?.plain_text || "未设置";
  const updatedAt = p.UpdatedAt?.rich_text?.[0]?.plain_text || page.last_edited_time;
  return { id: page.id, name, category, status, location, updatedAt };
}

function mapToNotionProperties(item, options = {}) {
  const withDefaults = Boolean(options.withDefaults);
  const properties = {};

  if (item.name !== undefined || withDefaults) {
    properties.Name = { title: [{ text: { content: (item.name || "未命名").trim() || "未命名" } }] };
  }
  if (item.category !== undefined || withDefaults) {
    properties.Category = { select: { name: item.category || "其他" } };
  }
  if (item.status !== undefined || withDefaults) {
    properties.Status = { select: { name: item.status || "待补货" } };
  }
  if (item.location !== undefined || withDefaults) {
    properties.Location = { rich_text: [{ text: { content: item.location || "未设置" } }] };
  }
  if (item.updatedAt !== undefined || withDefaults) {
    properties.UpdatedAt = { rich_text: [{ text: { content: item.updatedAt || new Date().toISOString() } }] };
  }
  return properties;
}

async function notion(path, method, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} failed: ${data.message || res.status}`);
  }
  return data;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return send(res, 200, { ok: true });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/health") {
      return send(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/api/items") {
      const queryData = await notion(`/databases/${NOTION_DATABASE_ID}/query`, "POST", {
        sorts: [{ property: "UpdatedAt", direction: "descending" }],
      });
      return send(res, 200, queryData.results.map(mapFromNotion));
    }

    if (req.method === "POST" && pathname === "/api/items") {
      const payload = await readBody(req);
      const page = await notion("/pages", "POST", {
        parent: { database_id: NOTION_DATABASE_ID },
        properties: mapToNotionProperties(payload, { withDefaults: true }),
      });
      return send(res, 201, mapFromNotion(page));
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/items/")) {
      const pageId = pathname.replace("/api/items/", "");
      const payload = await readBody(req);
      await notion(`/pages/${pageId}`, "PATCH", {
        properties: mapToNotionProperties(payload),
      });
      return send(res, 200, { ok: true });
    }

    if (req.method === "DELETE" && pathname.startsWith("/api/items/")) {
      const pageId = pathname.replace("/api/items/", "");
      await notion(`/pages/${pageId}`, "PATCH", { archived: true });
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: "Not found" });
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Notion proxy server running: http://localhost:${PORT}`);
});
