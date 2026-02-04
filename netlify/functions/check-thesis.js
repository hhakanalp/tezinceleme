const { Buffer } = require("buffer");
const pdfParser = require("../../services/pdfParser");
const ruleEngine = require("../../services/ruleEngine");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Yalnızca POST isteği destekleniyor."
    };
  }

  try {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"];
    if (!contentType || !contentType.includes("application/json")) {
      return {
        statusCode: 400,
        body: "İçerik tipi application/json olmalıdır."
      };
    }

    const body = JSON.parse(event.body || "{}");
    if (!body.contentBase64 || !body.fileName) {
      return {
        statusCode: 400,
        body: "contentBase64 ve fileName alanları zorunludur."
      };
    }

    const pdfBuffer = Buffer.from(body.contentBase64, "base64");
    if (!pdfBuffer || !pdfBuffer.length) {
      return {
        statusCode: 400,
        body: "Geçersiz PDF içeriği."
      };
    }

    const parsedThesis = await pdfParser.parsePdf(pdfBuffer);
    const report = await ruleEngine.evaluateThesis(parsedThesis);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(report)
    };
  } catch (error) {
    console.error("check-thesis error:", error);
    return {
      statusCode: 500,
      body: "Tez analizi sırasında beklenmeyen bir hata oluştu."
    };
  }
};

