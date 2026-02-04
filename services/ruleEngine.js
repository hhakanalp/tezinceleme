/** Tez yazım kılavuzu kuralları - kod içine gömülü, dosya okuma gerektirmez */
const THESIS_RULES = {
  meta: {
    version: 1,
    language: "tr",
    description: "Tez yazım kılavuzuna göre otomatik kontrol edilebilir yapısal, biçimsel ve kaynakça kuralları.",
    notes: [
      "Bu kurallar Van YYÜ Sağlık Bilimleri Enstitüsü tez yazım kılavuzu temel alınarak genelleştirilmiş örneklerdir."
    ]
  },
  sections: [
    {
      id: "structural",
      title: "Yapısal Kurallar",
      rules: [
        { id: "struct-cover-page", type: "structure", level: "required", description: "Tezde kapak sayfası bulunmalıdır (ilk sayfalarda 'T.C.', üniversite ve enstitü adı, yazar adı vb. anahtar ifadeler).", criteria: { searchWindow: { fromPage: 1, toPage: 2 }, mustContainAny: ["T.C.", "ÜNİVERSİTESİ", "ENSTİTÜSÜ", "TEZİ"] } },
        { id: "struct-abstract-tr", type: "structure", level: "required", description: "Türkçe özet bölümü bulunmalı ve ilk sayfalar içinde yer almalıdır.", criteria: { sectionTitles: ["ÖZET", "TÜRKÇE ÖZET"], maxStartPage: 5 } },
        { id: "struct-abstract-en", type: "structure", level: "recommended", description: "İngilizce özet (ABSTRACT) bölümü bulunması önerilir.", criteria: { sectionTitles: ["ABSTRACT", "SUMMARY"], maxStartPage: 7 } },
        { id: "struct-introduction", type: "structure", level: "required", description: "GİRİŞ bölümü bulunmalıdır.", criteria: { sectionTitles: ["GİRİŞ"], minPage: 3 } },
        { id: "struct-method", type: "structure", level: "required", description: "YÖNTEM veya GEREÇ VE YÖNTEM bölümü bulunmalıdır.", criteria: { sectionTitles: ["YÖNTEM", "GEREÇ VE YÖNTEM", "GEREÇ VE YÖNTEMLER"] } },
        { id: "struct-results", type: "structure", level: "required", description: "BULGULAR veya SONUÇLAR bölümü bulunmalıdır.", criteria: { sectionTitles: ["BULGULAR", "SONUÇLAR"] } },
        { id: "struct-discussion", type: "structure", level: "recommended", description: "TARTIŞMA veya TARTIŞMA VE SONUÇ bölümü bulunması önerilir.", criteria: { sectionTitles: ["TARTIŞMA", "TARTIŞMA VE SONUÇ"] } },
        { id: "struct-conclusion", type: "structure", level: "required", description: "SONUÇ veya GENEL SONUÇLAR bölümü bulunmalıdır.", criteria: { sectionTitles: ["SONUÇ", "GENEL SONUÇLAR"] } },
        { id: "struct-references", type: "structure", level: "required", description: "Tezin sonunda KAYNAKÇA / REFERENCES bölümü bulunmalıdır.", criteria: { sectionTitles: ["KAYNAKÇA", "REFERENCES"], mustBeAmongLastPages: 10 } }
      ]
    },
    {
      id: "formatting",
      title: "Biçim Kuralları (Yaklaşık Kontrol)",
      rules: [
        { id: "fmt-font-size-estimate", type: "formatting", level: "recommended", description: "Ana metnin yaklaşık 12 punto ve 1.5 satır aralığına uygunluğu (satır ve sayfa başına karakter sayısından tahmini kontrol).", criteria: { expectedCharsPerLineRange: [60, 95], expectedLinesPerPageRange: [25, 40], samplePageRange: { fromPage: 5, toPage: 30 } } },
        { id: "fmt-margins-estimate", type: "formatting", level: "info", description: "Sayfa kenar boşluklarının metin yoğunluğuna göre kabaca kontrolü (tam isabetli olmayan uyarı amaçlı heuristik).", criteria: { maxTextCoverageRatio: 0.8 } }
      ]
    },
    {
      id: "citations",
      title: "Kaynakça ve Atıf Kuralları",
      rules: [
        { id: "citations-intext-author-year", type: "citation", level: "recommended", description: "Metin içinde yazar-yıl biçiminde (APA benzeri) atıfların varlığı.", criteria: { patterns: ["\\([A-ZÇĞİÖŞÜ][a-zçğıöşü]+,\\s*20[0-9]{2}[a-z]?\\)", "\\([A-ZÇĞİÖŞÜ][a-zçğıöşü]+ ve [A-ZÇĞİÖŞÜ][a-zçğıöşü]+,\\s*20[0-9]{2}\\)"], minMatches: 3 } },
        { id: "citations-intext-numeric", type: "citation", level: "info", description: "Numaralı atıf (köşeli parantez içinde sayı) desenlerinin varlığı.", criteria: { patterns: ["\\[[0-9]{1,3}\\]"], minMatches: 3 } },
        { id: "citations-ref-section-matching", type: "citation", level: "recommended", description: "KAYNAKÇA bölümünde listelenen bazı yazar soyadlarının metin içinde geçip geçmediğinin basit kontrolü.", criteria: { minReferenceCountForCheck: 5, minMatchRatio: 0.4 } }
      ]
    }
  ]
};

function loadRules() {
  return THESIS_RULES;
}

async function evaluateThesis(parsedThesis) {
  const rulesConfig = loadRules();
  const results = [];

  for (const section of rulesConfig.sections) {
    for (const rule of section.rules) {
      const result = evaluateSingleRule(rule, section, parsedThesis);
      results.push(result);
    }
  }

  const failed = results.filter((r) => r.status === "failed").length;
  const warnings = results.filter((r) => r.status === "warning").length;
  const total = results.length || 1;

  const passed = results.filter((r) => r.status === "passed").length;
  const overallScore = (passed / total) * 100;

  const summary = `Toplam ${total} kural değerlendirildi. ${passed} geçti, ${failed} başarısız, ${warnings} uyarı.`;

  return {
    overallScore,
    summary,
    items: results
  };
}

function evaluateSingleRule(rule, section, parsedThesis) {
  let status = "warning";
  let details = "";

  try {
    if (section.id === "structural") {
      ({ status, details } = evaluateStructuralRule(rule, parsedThesis));
    } else if (section.id === "formatting") {
      ({ status, details } = evaluateFormattingRule(rule, parsedThesis));
    } else if (section.id === "citations") {
      ({ status, details } = evaluateCitationRule(rule, parsedThesis));
    } else {
      status = "warning";
      details = "Bu kural için özel bir değerlendirme uygulanmadı.";
    }
  } catch (error) {
    status = "warning";
    details = `Kural değerlendirilirken hata oluştu: ${error.message}`;
  }

  if (status === "warning" && rule.level === "required") {
    // Zorunlu kurallar için belirsiz durumları uyarı olarak bırakıyoruz,
    // istenirse burada 'failed' olarak da işaretlenebilir.
  }

  return {
    id: rule.id,
    category: section.title,
    title: rule.description,
    description: rule.description,
    status,
    details
  };
}

function evaluateStructuralRule(rule, parsedThesis) {
  const thesisSections = parsedThesis.sections || [];
  const pages = parsedThesis.pages || [];

  if (rule.criteria.sectionTitles) {
    const expectedTitles = rule.criteria.sectionTitles.map((t) =>
      t.toUpperCase()
    );

    const found = thesisSections.filter((s) =>
      expectedTitles.includes(s.title.toUpperCase())
    );

    if (found.length === 0) {
      return {
        status: rule.level === "required" ? "failed" : "warning",
        details: `Beklenen bölüm başlıklarından hiçbiri bulunamadı: ${expectedTitles.join(
          ", "
        )}.`
      };
    }

    let pageInfo = `İlk bulunan sayfa: ${found[0].pageNumber}.`;

    if (rule.criteria.maxStartPage) {
      if (found[0].pageNumber > rule.criteria.maxStartPage) {
        return {
          status: "warning",
          details: `Bölüm bulundu ancak beklenenden geç bir sayfada başlıyor (sayfa ${found[0].pageNumber}, beklenen en geç sayfa ${rule.criteria.maxStartPage}).`
        };
      }
      pageInfo += ` Beklenen aralık içinde (<= ${rule.criteria.maxStartPage}).`;
    }

    if (rule.criteria.mustBeAmongLastPages) {
      const totalPages = pages.length;
      const threshold = totalPages - rule.criteria.mustBeAmongLastPages;
      if (found[0].pageNumber < threshold) {
        return {
          status: "warning",
          details: `Bölüm bulundu ancak tez sonunda olması bekleniyordu (bulunduğu sayfa: ${found[0].pageNumber}, son ${rule.criteria.mustBeAmongLastPages} sayfa içinde olmalı).`
        };
      }
      pageInfo += ` Tezin son ${rule.criteria.mustBeAmongLastPages} sayfası içinde.`;
    }

    return {
      status: "passed",
      details: `Bölüm(ler) bulundu. ${pageInfo}`
    };
  }

  if (rule.criteria.searchWindow) {
    const from = rule.criteria.searchWindow.fromPage || 1;
    const to = rule.criteria.searchWindow.toPage || Math.min(5, pages.length);

    const slice = pages.slice(from - 1, to);
    const joinedText = slice.map((p) => p.text).join("\n").toUpperCase();
    const mustContain = rule.criteria.mustContainAny || [];

    const foundAny = mustContain.some((phrase) =>
      joinedText.includes(phrase.toUpperCase())
    );

    if (!foundAny) {
      return {
        status: rule.level === "required" ? "failed" : "warning",
        details: `Belirtilen sayfa aralığında (sayfa ${from}-${to}) beklenen anahtar ifadeler bulunamadı: ${mustContain.join(
          ", "
        )}.`
      };
    }

    return {
      status: "passed",
      details: `Belirtilen sayfa aralığında (sayfa ${from}-${to}) en az bir anahtar ifade bulundu.`
    };
  }

  return {
    status: "warning",
    details: "Bu yapısal kural için özel bir ölçüt tanımı yapılmamış."
  };
}

function evaluateFormattingRule(rule, parsedThesis) {
  const pages = parsedThesis.pages || [];

  if (rule.id === "fmt-font-size-estimate") {
    const { expectedCharsPerLineRange, expectedLinesPerPageRange, samplePageRange } =
      rule.criteria;

    const from = samplePageRange.fromPage || 5;
    const to = Math.min(samplePageRange.toPage || 30, pages.length);

    if (pages.length === 0 || from > to) {
      return {
        status: "warning",
        details: "Biçim analizi için yeterli sayfa bulunamadı."
      };
    }

    let totalLines = 0;
    let totalChars = 0;
    let countedLines = 0;

    for (let i = from - 1; i < to; i++) {
      const lines = pages[i].text.split(/\r?\n/).filter((l) => l.trim().length);
      totalLines += lines.length;
      lines.forEach((line) => {
        totalChars += line.length;
        countedLines += 1;
      });
    }

    if (countedLines === 0) {
      return {
        status: "warning",
        details: "Satır bazlı analiz için yeterli veri yok."
      };
    }

    const avgCharsPerLine = totalChars / countedLines;
    const avgLinesPerPage = totalLines / (to - from + 1);

    const [minC, maxC] = expectedCharsPerLineRange;
    const [minL, maxL] = expectedLinesPerPageRange;

    const withinChars = avgCharsPerLine >= minC && avgCharsPerLine <= maxC;
    const withinLines = avgLinesPerPage >= minL && avgLinesPerPage <= maxL;

    if (withinChars && withinLines) {
      return {
        status: "passed",
        details: `Ortalama satır uzunluğu yaklaşık ${avgCharsPerLine.toFixed(
          1
        )} karakter, sayfa başına satır sayısı yaklaşık ${avgLinesPerPage.toFixed(
          1
        )}. Beklenen aralıklara yakın görünüyor.`
      };
    }

    return {
      status: "warning",
      details: `Ortalama satır uzunluğu ~${avgCharsPerLine.toFixed(
        1
      )} karakter, sayfa başına satır sayısı ~${avgLinesPerPage.toFixed(
        1
      )}. Beklenen aralıklardan sapma olabilir; punto/satır aralığı kılavuza tam uymayabilir.`
    };
  }

  if (rule.id === "fmt-margins-estimate") {
    const { maxTextCoverageRatio } = rule.criteria;

    if (!parsedThesis.pageCount) {
      return {
        status: "warning",
        details: "Sayfa sayısı bilgisi bulunamadı."
      };
    }

    // Metin tabanlı çok kaba bir tahmin: sayfa başına satır sayısının çok yüksek olması
    // kenar boşluklarının dar olabileceğine işaret eder.
    const pages = parsedThesis.pages;
    const sampleCount = Math.min(10, pages.length);
    let totalLines = 0;

    for (let i = 0; i < sampleCount; i++) {
      const lines = pages[i].text.split(/\r?\n/).filter((l) => l.trim().length);
      totalLines += lines.length;
    }

    const avgLinesPerPage = totalLines / sampleCount;

    // 50+ satır genelde çok dar kenar boşluğu/satır aralığına işaret eder.
    const estimatedCoverage = Math.min(avgLinesPerPage / 50, 1);

    if (estimatedCoverage <= maxTextCoverageRatio) {
      return {
        status: "passed",
        details: `Sayfa başına ortalama satır sayısı yaklaşık ${avgLinesPerPage.toFixed(
          1
        )}. Kenar boşlukları kabaca makul görünüyor.`
      };
    }

    return {
      status: "warning",
      details: `Sayfa başına ortalama satır sayısı ~${avgLinesPerPage.toFixed(
        1
      )}. Metin alanı sayfanın çok büyük bir kısmını kaplıyor olabilir; kenar boşlukları kılavuza göre dar olabilir.`
    };
  }

  return {
    status: "warning",
    details: "Bu biçim kuralı için henüz özel bir değerlendirme uygulanmıyor."
  };
}

function evaluateCitationRule(rule, parsedThesis) {
  const pages = parsedThesis.pages || [];
  const fullText = pages.map((p) => p.text).join("\n");

  if (rule.id === "citations-intext-author-year") {
    const patterns = rule.criteria.patterns || [];
    const minMatches = rule.criteria.minMatches || 1;

    let totalMatches = 0;
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, "g");
      const matches = fullText.match(regex);
      if (matches) {
        totalMatches += matches.length;
      }
    }

    if (totalMatches >= minMatches) {
      return {
        status: "passed",
        details: `Metin içinde yaklaşık ${totalMatches} adet yazar-yıl biçimli atıf bulundu.`
      };
    }

    return {
      status: "warning",
      details:
        "Metin içinde çok az veya hiç yazar-yıl biçimli atıf bulunamadı. Atıf biçimi kılavuza tam uymayabilir."
    };
  }

  if (rule.id === "citations-intext-numeric") {
    const patterns = rule.criteria.patterns || [];
    const minMatches = rule.criteria.minMatches || 1;

    let totalMatches = 0;
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, "g");
      const matches = fullText.match(regex);
      if (matches) {
        totalMatches += matches.length;
      }
    }

    if (totalMatches >= minMatches) {
      return {
        status: "info",
        details: `Metin içinde yaklaşık ${totalMatches} adet numaralı atıf deseni bulundu.`
      };
    }

    return {
      status: "info",
      details: "Numaralı atıf desenine çok az rastlandı veya hiç rastlanmadı."
    };
  }

  if (rule.id === "citations-ref-section-matching") {
    const refs = parsedThesis.references || { entries: [] };
    const entries = refs.entries || [];

    if (entries.length < (rule.criteria.minReferenceCountForCheck || 5)) {
      return {
        status: "warning",
        details:
          "Kaynakça bölümünden yeterli sayıda referans tespit edilemedi; eşleşme kontrolü sınırlı yapılabildi."
      };
    }

    const surnames = entries
      .map((line) => {
        const match = line.match(/^([A-ZÇĞİÖŞÜ][^,]+)/);
        return match ? match[1].split(" ").slice(-1)[0] : null;
      })
      .filter(Boolean);

    const uniqueSurnames = Array.from(new Set(surnames));
    let matched = 0;

    uniqueSurnames.forEach((surname) => {
      const regex = new RegExp(surname, "i");
      if (regex.test(fullText)) {
        matched++;
      }
    });

    const ratio = uniqueSurnames.length
      ? matched / uniqueSurnames.length
      : 0;

    if (ratio >= (rule.criteria.minMatchRatio || 0.4)) {
      return {
        status: "passed",
        details: `Kaynakçada yer alan yazar soyadlarının yaklaşık %${(
          ratio * 100
        ).toFixed(
          0
        )} kadarı metin içinde de geçiyor. Metin içi atıflar ile kaynakça arasında temel bir tutarlılık var gibi görünüyor.`
      };
    }

    return {
      status: "warning",
      details: `Kaynakçada yer alan yazar soyadlarının yalnızca yaklaşık %${(
        ratio * 100
      ).toFixed(
        0
      )} kadarı metin içinde tespit edildi. Metin içi atıflar ile kaynakça arasında uyumsuzluklar olabilir.`
    };
  }

  return {
    status: "warning",
    details: "Bu kaynakça/atıf kuralı için özel bir değerlendirme tanımlanmadı."
  };
}

module.exports = {
  evaluateThesis
};

