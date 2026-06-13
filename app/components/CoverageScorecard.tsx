import CoverageChartClient from "@/app/components/CoverageChartClient";

interface ReportPerformance {
  ticker: string;
  company: string;
  publishDate: string;
  publishPrice: number;
  currentPrice: number;
  return: number;
  kospiAlpha: number;
}

interface CoverageScorecardProps {
  data: ReportPerformance[];
  avgReturn: number;
  kospiReturn: number;
  spxReturn: number;
}

export default function CoverageScorecard({
  data,
  avgReturn,
  kospiReturn,
  spxReturn,
}: CoverageScorecardProps) {

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">커버리지 성적표</h2>
        <p className="text-sm text-dark-muted">
          발간 이후 수익률 추적 및 KOSPI, S&P500 대비 알파
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-surface border border-indigo-primary/30 rounded-lg p-4">
          <div className="text-xs text-dark-muted mb-2">AI 리포트 평균</div>
          <div className="text-3xl font-bold text-indigo-primary">
            {avgReturn >= 0 ? "+" : ""}
            {avgReturn.toFixed(2)}%
          </div>
          <div className="text-xs text-dark-muted mt-2">
            {data.length}개 리포트
          </div>
        </div>

        <div className="bg-dark-surface border border-teal-500/30 rounded-lg p-4">
          <div className="text-xs text-dark-muted mb-2">KOSPI</div>
          <div
            className="text-3xl font-bold"
            style={{
              color: kospiReturn >= 0 ? "#10b981" : "#ef4444",
            }}
          >
            {kospiReturn >= 0 ? "+" : ""}
            {kospiReturn.toFixed(2)}%
          </div>
          <div
            className="text-xs mt-2"
            style={{
              color:
                avgReturn - kospiReturn >= 0
                  ? "#10b981"
                  : "#ef4444",
            }}
          >
            Alpha:{" "}
            {avgReturn - kospiReturn >= 0 ? "+" : ""}
            {(avgReturn - kospiReturn).toFixed(2)}%
          </div>
        </div>

        <div className="bg-dark-surface border border-pink-500/30 rounded-lg p-4">
          <div className="text-xs text-dark-muted mb-2">S&P500</div>
          <div
            className="text-3xl font-bold"
            style={{
              color: spxReturn >= 0 ? "#10b981" : "#ef4444",
            }}
          >
            {spxReturn >= 0 ? "+" : ""}
            {spxReturn.toFixed(2)}%
          </div>
          <div
            className="text-xs mt-2"
            style={{
              color:
                avgReturn - spxReturn >= 0
                  ? "#10b981"
                  : "#ef4444",
            }}
          >
            Alpha:{" "}
            {avgReturn - spxReturn >= 0 ? "+" : ""}
            {(avgReturn - spxReturn).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
        <CoverageChartClient
          avgReturn={avgReturn}
          kospiReturn={kospiReturn}
          spxReturn={spxReturn}
        />
      </div>

      {/* Detailed Table */}
      <div className="bg-dark-surface border border-dark-border rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-dark-border bg-dark-bg">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-dark-fg">
                종목
              </th>
              <th className="px-4 py-3 text-center font-semibold text-dark-fg">
                발간일
              </th>
              <th className="px-4 py-3 text-right font-semibold text-dark-fg">
                발간가
              </th>
              <th className="px-4 py-3 text-right font-semibold text-dark-fg">
                현재가
              </th>
              <th className="px-4 py-3 text-right font-semibold text-dark-fg">
                수익률
              </th>
              <th className="px-4 py-3 text-right font-semibold text-dark-fg">
                vs KOSPI
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors"
              >
                <td className="px-4 py-3 text-dark-fg font-semibold">
                  {row.ticker}
                </td>
                <td className="px-4 py-3 text-center text-dark-muted">
                  {row.publishDate}
                </td>
                <td className="px-4 py-3 text-right text-dark-fg font-mono">
                  {row.publishPrice.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-dark-fg font-mono">
                  {row.currentPrice.toLocaleString()}
                </td>
                <td
                  className="px-4 py-3 text-right font-mono font-semibold"
                  style={{
                    color: row.return >= 0 ? "#10b981" : "#ef4444",
                  }}
                >
                  {row.return >= 0 ? "+" : ""}
                  {row.return.toFixed(2)}%
                </td>
                <td
                  className="px-4 py-3 text-right font-mono"
                  style={{
                    color: row.kospiAlpha >= 0 ? "#10b981" : "#ef4444",
                  }}
                >
                  {row.kospiAlpha >= 0 ? "+" : ""}
                  {row.kospiAlpha.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
