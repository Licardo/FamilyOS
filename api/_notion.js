const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_VERSION = "2022-06-28";

function assertEnv() {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    throw new Error("Missing env: NOTION_TOKEN or NOTION_DATABASE_ID");
  }
}

function send(res, status, data) {
  res.status(status).json(data);
}

async function notion(path, method, body) {
  assertEnv();
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

function mapFromNotion(page) {
  const p = page.properties || {};
  return {
    id: page.id,
    name: p.Name?.title?.[0]?.plain_text || "未命名",
    category: p.Category?.select?.name || "其他",
    status: p.Status?.select?.name || "待补货",
    location: p.Location?.rich_text?.[0]?.plain_text || "未设置",
    updatedAt: p.UpdatedAt?.rich_text?.[0]?.plain_text || page.last_edited_time,
  };
}

function mapToNotionProperties(item, options = {}) {
  const withDefaults = Boolean(options.withDefaults);
  const properties = {};

  if (item.name !== undefined || withDefaults) {
    properties.Name = {
      title: [{ text: { content: (item.name || "未命名").trim() || "未命名" } }],
    };
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
    properties.UpdatedAt = {
      rich_text: [{ text: { content: item.updatedAt || new Date().toISOString() } }],
    };
  }

  return properties;
}

module.exports = {
  NOTION_DATABASE_ID,
  send,
  notion,
  mapFromNotion,
  mapToNotionProperties,
};
