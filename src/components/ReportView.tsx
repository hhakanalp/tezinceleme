import React from "react";
import type { AnalysisReport, RuleResult } from "../App";

interface ReportViewProps {
  report: AnalysisReport;
}

const statusLabel: Record<RuleResult["status"], string> = {
  passed: "Uygun",
  failed: "Uygun Değil",
  warning: "Uyarı"
};

export const ReportView: React.FC<ReportViewProps> = ({ report }) => {
  const grouped = report.items.reduce<Record<string, RuleResult[]>>(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {}
  );

  const failedCount = report.items.filter((i) => i.status === "failed").length;
  const warningCount = report.items.filter(
    (i) => i.status === "warning"
  ).length;

  return (
    <div className="report-root">
      <div className="report-summary">
        <p>{report.summary}</p>
        <p>
          <strong>Başarısız kural sayısı:</strong> {failedCount} &nbsp;|&nbsp;
          <strong>Uyarı sayısı:</strong> {warningCount}
        </p>
        {typeof report.overallScore === "number" && (
          <p>
            <strong>Genel uygunluk skoru:</strong>{" "}
            {report.overallScore.toFixed(0)} / 100
          </p>
        )}
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="report-section">
          <h3>{category}</h3>
          <ul className="rule-list">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rule-item rule-${item.status}`}
              >
                <div className="rule-header">
                  <span className="rule-title">{item.title}</span>
                  <span className={`rule-status-badge rule-${item.status}`}>
                    {statusLabel[item.status]}
                  </span>
                </div>
                <div className="rule-description">{item.description}</div>
                {item.details && (
                  <div className="rule-details">{item.details}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

