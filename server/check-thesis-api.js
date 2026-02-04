/**
 * Tez kontrol API sunucusu - yerel geliştirme için.
 * Hem dev hem preview modunda Vite ile birlikte çalışır.
 * Production'da Netlify Function kullanılır.
 */
const http = require("http");
const pdfParser = require("../services/pdfParser");
const ruleEngine = require("../services/ruleEngine");

const PORT = process.env.THESIS_API_PORT || 3456;
const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

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
      console.log("[check-thesis] Body parse ediliyor...");
      const data = JSON.parse(body || "{}");
      if (!data.contentBase64 || !data.fileName) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "contentBase64 ve fileName zorunludur." }));
        return;
      }

      const base64Length = data.contentBase64.length;
      const estimatedBytes = Math.ceil((base64Length * 3) / 4);
      console.log("[check-thesis] PDF boyutu - base64 karakter:", base64Length, "tahmini bayt:", estimatedBytes);

      if (estimatedBytes > MAX_PDF_SIZE_BYTES) {
        const maxMB = (MAX_PDF_SIZE_BYTES / (1024 * 1024)).toFixed(1);
        const actualMB = (estimatedBytes / (1024 * 1024)).toFixed(1);
        const errMsg = `PDF boyutu çok büyük (${actualMB} MB). Maksimum ${maxMB} MB desteklenir.`;
        console.log("[check-thesis] Boyut aşımı:", errMsg);
        res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: errMsg }));
        return;
      }

      console.log("[check-thesis] Base64 decode ediliyor...");
      const pdfBuffer = Buffer.from(data.contentBase64, "base64");
      console.log("[check-thesis] Buffer oluşturuldu, uzunluk:", pdfBuffer.length);

      console.log("[check-thesis] PDF parse başlıyor...");
      const parsed = await pdfParser.parsePdf(pdfBuffer);
      console.log("[check-thesis] PDF parse tamamlandı, sayfa sayısı:", parsed?.pageCount ?? 0);

      console.log("[check-thesis] Kural motoru çalışıyor...");
      const report = await ruleEngine.evaluateThesis(parsed);
      console.log("[check-thesis] Analiz tamamlandı.");

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(report));
    } catch (err) {
      const errorPayload = {
        error: err?.message || "Beklenmeyen hata",
        name: err?.name || "Error",
        ...(err?.stack && { stack: err.stack })
      };
      console.error("[check-thesis] HATA:", errorPayload);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(errorPayload));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Tez kontrol API: http://localhost:${PORT}`);
});
