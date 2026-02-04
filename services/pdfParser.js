/**
 * PDF'i parse edip sayfa bazlı metin ve temel bölüm başlığı tahminlerini döndürür.
 * unpdf kullanır - serverless/Node.js ortamı için tasarlanmış, DOMMatrix/test dosyası gerektirmez.
 */
async function parsePdf(buffer) {
  const { extractText, getDocumentProxy } = await import("unpdf");

  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  const textByPage = Array.isArray(text) && text.length > 0 ? text.map((t) => t || "") : [""];
  const sections = detectSections(textByPage);
  const references = extractReferencesSection(textByPage, sections);

  return {
    pageCount: textByPage.length,
    pages: textByPage.map((content, index) => ({
      pageNumber: index + 1,
      text: typeof content === "string" ? content : ""
    })),
    sections,
    references,
    meta: {
      info: {},
      numPages: totalPages || textByPage.length
    }
  };
}

function splitTextByPages(rawText) {
  // pdf-parse bazen sayfaları form feed ile ayırır, bazen de sadece satır bazlı verir.
  // Önce form feed'e göre, yoksa kaba bir yaklaşık ayrım uyguluyoruz.
  if (rawText.includes("\f")) {
    return rawText
      .split("\f")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  // Yedek: her ~60 satırı bir sayfa olarak grupla
  const lines = rawText.split(/\r?\n/);
  const pageSize = 60;
  const pages = [];
  for (let i = 0; i < lines.length; i += pageSize) {
    const chunk = lines.slice(i, i + pageSize).join("\n").trim();
    if (chunk) {
      pages.push(chunk);
    }
  }
  return pages;
}

function detectSections(pages) {
  const sectionPatterns = [
    { id: "ozet-tr", titles: ["ÖZET", "TÜRKÇE ÖZET"] },
    { id: "ozet-en", titles: ["ABSTRACT", "SUMMARY"] },
    { id: "giris", titles: ["GİRİŞ"] },
    {
      id: "literatur",
      titles: ["LİTERATÜR TARAMASI", "GENEL BİLGİLER", "KURAMSAL ÇERÇEVE"]
    },
    {
      id: "yontem",
      titles: ["YÖNTEM", "GEREÇ VE YÖNTEM", "GEREÇ VE YÖNTEMLER"]
    },
    { id: "bulgular", titles: ["BULGULAR", "SONUÇLAR"] },
    {
      id: "tartisma",
      titles: ["TARTIŞMA", "TARTIŞMA VE SONUÇ", "TARTIŞMA VE YORUM"]
    },
    {
      id: "sonuc",
      titles: ["SONUÇ", "GENEL SONUÇLAR", "SONUÇ VE ÖNERİLER"]
    },
    {
      id: "kaynakca",
      titles: ["KAYNAKÇA", "REFERENCES"]
    }
  ];

  const sections = [];

  pages.forEach((pageText, index) => {
    const pageNumber = index + 1;
    const lines = pageText.split(/\r?\n/).map((l) => l.trim());

    for (const pattern of sectionPatterns) {
      for (const title of pattern.titles) {
        const regex = new RegExp(`^${escapeRegex(title)}$`, "i");
        if (lines.some((line) => regex.test(normalizeTurkish(line)))) {
          sections.push({
            id: pattern.id,
            title,
            pageNumber
          });
          break;
        }
      }
    }
  });

  return sections;
}

function extractReferencesSection(pages, sections) {
  const referencesSection = sections.find(
    (s) => s.id === "kaynakca" || s.title.toUpperCase().includes("KAYNAKÇA")
  );

  if (!referencesSection) {
    return {
      entries: [],
      rawText: "",
      pageStart: null,
      pageEnd: null
    };
  }

  const startIndex = referencesSection.pageNumber - 1;
  const rawText = pages.slice(startIndex).join("\n\n");
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());

  const entries = lines.filter((line) => {
    if (!line) return false;
    // Basit heuristik: satırın sonunda yıl veya numara geçmesi
    return /20[0-9]{2}|19[0-9]{2}|\[[0-9]{1,3}\]$/.test(line);
  });

  return {
    entries,
    rawText,
    pageStart: referencesSection.pageNumber,
    pageEnd: pages.length
  };
}

function normalizeTurkish(str) {
  return str
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  parsePdf
};

