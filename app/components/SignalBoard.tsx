"use client";

interface Signal {
  id: string;
  title: string;
  value: string;
  status: "정상" | "주의" | "경고";
  description: string;
}

const SIGNALS: Signal[] = [
  {
    id: "SIG-1",
    title: "메모리 계약가",
    value: "+12.5%",
    status: "정상",
    description: "DDR5 현물 가격이 기준가 대비 12.5% 상승. HBM은 더 강세.",
  },
  {
    id: "SIG-2",
    title: "파이프라인 이탈률",
    value: "3.2%",
    status: "주의",
    description: "AI 칩 설계 단계에서 협력사 변경율이 평년 2.1% → 3.2%로 상승.",
  },
  {
    id: "SIG-3",
    title: "크레딧 스프레드",
    value: "145bp",
    status: "정상",
    description: "반도체 기업 CDS가 역사적 저수준. 수요 불안 없음을 시사.",
  },
  {
    id: "SIG-4",
    title: "BOM 진행률 갭",
    value: "-8.3%",
    status: "경고",
    description: "2026년 설계 BOM 진행률이 역사 평균 대비 8.3% 뒤처짐.",
  },
];

function getStatusColor(status: string): string {
  switch (status) {
    case "정상":
      return "#10b981"; // 초록
    case "주의":
      return "#f59e0b"; // 주황
    case "경고":
      return "#ef4444"; // 빨강
    default:
      return "#8b949e";
  }
}

export default function SignalBoard() {
  return (
    <div className="bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark-fg mb-2">AI 신호 보드</h2>
          <p className="text-sm text-dark-muted">
            실시간 시장 신호 4가지 — 메모리 계약가, 파이프라인, 신용도, BOM 진행률
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SIGNALS.map((signal) => {
            const statusColor = getStatusColor(signal.status);

            return (
              <div
                key={signal.id}
                className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-indigo-primary/50 transition-colors group"
              >
                {/* Header with ID and Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="font-mono text-xs font-bold text-indigo-primary">
                    {signal.id}
                  </div>
                  <div
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: statusColor }}
                  ></div>
                </div>

                {/* Signal Title and Value */}
                <h3 className="text-sm font-bold text-dark-fg mb-2 group-hover:text-indigo-primary transition-colors">
                  {signal.title}
                </h3>
                <div
                  className="text-2xl font-bold mb-3"
                  style={{ color: statusColor }}
                >
                  {signal.value}
                </div>

                {/* Status Badge */}
                <div
                  className="text-xs font-semibold px-2 py-1 rounded w-fit mb-3"
                  style={{
                    backgroundColor: `${statusColor}20`,
                    color: statusColor,
                  }}
                >
                  {signal.status}
                </div>

                {/* Description */}
                <p className="text-xs text-dark-muted leading-relaxed">
                  {signal.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Signal Legend */}
        <div className="mt-8 flex flex-wrap gap-6 p-4 bg-dark-surface/50 rounded-lg border border-dark-border text-xs text-dark-muted">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-status-up"></div>
            <span>정상 = 긍정적 신호</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <span>주의 = 모니터링 필요</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-status-down"></div>
            <span>경고 = 위험 신호</span>
          </div>
        </div>
      </div>
    </div>
  );
}
