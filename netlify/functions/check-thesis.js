const { Buffer } = require("buffer");
const pdfParser = require("../../services/pdfParser");
const ruleEngine = require("../../services/ruleEngine");

/** Maksimum PDF boyutu (bayt) - Netlify bellek/timeout limitleri için. 15MB */
const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

exports.handler = async (event) => {
  console.log("[check-thesis] İstek alındı, method:", event.httpMethod);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "Yalnızca POST isteği destekleniyor." })
    };
  }

  try {
    console.log("[check-thesis] Content-Type kontrol ediliyor...");
    const contentType = event.headers["content-type"] || event.headers["Content-Type"];
    if (!contentType || !contentType.includes("application/json")) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "İçerik tipi application/json olmalıdır." })
      };
    }

    console.log("[check-thesis] Body parse ediliyor...");
    const body = JSON.parse(event.body || "{}");
    if (!body.contentBase64 || !body.fileName) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "contentBase64 ve fileName alanları zorunludur." })
      };
    }

    const base64Length = body.contentBase64.length;
    const estimatedBytes = Math.ceil((base64Length * 3) / 4);
    console.log("[check-thesis] PDF boyutu - base64 karakter:", base64Length, "tahmini bayt:", estimatedBytes);

    if (estimatedBytes > MAX_PDF_SIZE_BYTES) {
      const maxMB = (MAX_PDF_SIZE_BYTES / (1024 * 1024)).toFixed(1);
      const actualMB = (estimatedBytes / (1024 * 1024)).toFixed(1);
      const errMsg = `PDF boyutu çok büyük (${actualMB} MB). Maksimum ${maxMB} MB desteklenir.`;
      console.log("[check-thesis] Boyut aşımı:", errMsg);
      return {
        statusCode: 413,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: errMsg })
      };
    }

    console.log("[check-thesis] Base64 decode ediliyor...");
    const pdfBuffer = Buffer.from(body.contentBase64, "base64");
    if (!pdfBuffer || !pdfBuffer.length) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Geçersiz PDF içeriği." })
      };
    }
    console.log("[check-thesis] Buffer oluşturuldu, uzunluk:", pdfBuffer.length);

    console.log("[check-thesis] PDF parse başlıyor...");
    const parsedThesis = await pdfParser.parsePdf(pdfBuffer);
    console.log("[check-thesis] PDF parse tamamlandı, sayfa sayısı:", parsedThesis?.pageCount ?? 0);

    console.log("[check-thesis] Kural motoru çalışıyor...");
    const report = await ruleEngine.evaluateThesis(parsedThesis);
    console.log("[check-thesis] Analiz tamamlandı.");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(report)
    };
  } catch (error) {
    const errorPayload = {
      error: error?.message || "Bilinmeyen hata",
      name: error?.name || "Error",
      ...(process.env.NODE_ENV !== "production" && error?.stack && { stack: error.stack })
    };
    console.error("[check-thesis] HATA:", errorPayload);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(errorPayload)
    };
  }
};
