/**
 * Tez kontrol API sunucusu - yerel geliştirme için.
 * Hem dev hem preview modunda Vite ile birlikte çalışır.
 * Production'da Netlify Function kullanılır.
 */
const http = require("http");
const pdfParser = require("../services/pdfParser");
const ruleEngine = require("../services/ruleEngine");

const PORT = process.env.THESIS_API_PORT || 3456;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || (req.url !== "/" && req.url !== "/check-thesis" && req.url !== "/api/check-thesis")) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Endpoint bulunamadı." }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", async () => {
    try {
      const data = JSON.parse(body || "{}");
      if (!data.contentBase64 || !data.fileName) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "contentBase64 ve fileName zorunludur." }));
        return;
      }
      const pdfBuffer = Buffer.from(data.contentBase64, "base64");
      const parsed = await pdfParser.parsePdf(pdfBuffer);
      const report = await ruleEngine.evaluateThesis(parsed);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(report));
    } catch (err) {
      console.error("check-thesis error:", err);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: err?.message || "Beklenmeyen hata" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Tez kontrol API: http://localhost:${PORT}`);
});
