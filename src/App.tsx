import React, { useState } from "react";
import { FileUpload } from "./components/FileUpload";
import { ReportView } from "./components/ReportView";

export type RuleStatus = "passed" | "failed" | "warning";

export interface RuleResult {
  id: string;
  category: string;
  title: string;
  description: string;
  status: RuleStatus;
  details?: string;
}

export interface AnalysisReport {
  overallScore?: number;
  summary: string;
  items: RuleResult[];
}

/** Parça parça base64'e çevirir; büyük dosyalarda "Maximum call stack size exceeded" önler */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export const App: React.FC = () => {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setError(null);
    setReport(null);
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);

      const response = await fetch("/api/check-thesis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: file.name,
          contentBase64: base64
        })
      });

      if (!response.ok) {
        const text = await response.text();
        let errMsg = text || "Bilinmeyen hata";
        try {
          const json = JSON.parse(text) as { error?: string };
          if (json.error) errMsg = json.error;
        } catch {
          /* JSON değilse ham metni kullan */
        }
        throw new Error(`Sunucu hatası (${response.status}): ${errMsg}`);
      }

      const data = (await response.json()) as AnalysisReport;
      setReport(data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Tez Yazım Kılavuzu Uygunluk Kontrolü</h1>
        <p>
          PDF formatındaki tezinizi yükleyin, sistem otomatik olarak temel
          yapısal, biçimsel ve kaynakça kurallarını kontrol etsin.
        </p>
      </header>

      <main className="app-main">
        <section className="card">
          <h2>1. Tez PDF&apos;ini Yükleyin</h2>
          <FileUpload onFileSelected={handleFileSelected} loading={loading} />
          {error && <div className="error-box">Hata: {error}</div>}
        </section>

        {report && (
          <section className="card">
            <h2>2. Otomatik Değerlendirme Raporu</h2>
            <ReportView report={report} />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <small>
          Not: Sistem tez kılavuzuna %100 kesin uyum garantisi vermez; özellikle
          font ve milimetrik kenar boşlukları yaklaşık olarak kontrol edilir.
        </small>
      </footer>
    </div>
  );
};

