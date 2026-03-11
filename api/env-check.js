module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const notionToken = process.env.NOTION_TOKEN || "";
  const databaseId = process.env.NOTION_DATABASE_ID || "";

  return res.status(200).json({
    ok: true,
    env: {
      notionTokenConfigured: Boolean(notionToken),
      notionTokenLength: notionToken.length,
      notionDatabaseIdConfigured: Boolean(databaseId),
      notionDatabaseIdLength: databaseId.length,
      nodeEnv: process.env.NODE_ENV || "unknown",
      vercelEnv: process.env.VERCEL_ENV || "unknown",
    },
    note: "This endpoint is for temporary diagnostics. Remove it after verification.",
  });
};
