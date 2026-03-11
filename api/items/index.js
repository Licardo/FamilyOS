const { NOTION_DATABASE_ID, send, notion, mapFromNotion, mapToNotionProperties } = require("../_notion");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const queryData = await notion(`/databases/${NOTION_DATABASE_ID}/query`, "POST", {
        sorts: [{ property: "UpdatedAt", direction: "descending" }],
      });
      return send(res, 200, queryData.results.map(mapFromNotion));
    }

    if (req.method === "POST") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const page = await notion("/pages", "POST", {
        parent: { database_id: NOTION_DATABASE_ID },
        properties: mapToNotionProperties(payload, { withDefaults: true }),
      });
      return send(res, 201, mapFromNotion(page));
    }

    return send(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
};
