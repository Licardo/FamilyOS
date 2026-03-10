const { send, notion, mapToNotionProperties } = require("../_notion");

module.exports = async function handler(req, res) {
  try {
    const { id } = req.query || {};
    if (!id) return send(res, 400, { error: "Missing id" });

    if (req.method === "PATCH") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      await notion(`/pages/${id}`, "PATCH", {
        properties: mapToNotionProperties(payload),
      });
      return send(res, 200, { ok: true });
    }

    if (req.method === "DELETE") {
      await notion(`/pages/${id}`, "PATCH", { archived: true });
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
};
