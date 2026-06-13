import { extractShortageSignals, getSignalColor } from "@/lib/earnings";

export default function ShortageTracker() {
  const signals = extractShortageSignals();

  const getStrengthLabel = (strength: string): string => {
    switch (strength) {
      case "강":
        return "강한 신호";
      case "중":
        return "중간 신호";
      case "약":
        return "약한 신호";
      default:
        return "신호";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">공급부족 발언 추적</h2>
        <p className="text-sm text-dark-muted">
          경영진 어닝콜에서 수집한 공급 제약 관련 발언들
        </p>
      </div>

      {/* Signals */}
      {signals.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signals.map((signal, idx) => {
            const color = getSignalColor(signal.strength);
            const signalDate = new Date(signal.date).toLocaleDateString(
              "ko-KR",
              { year: "numeric", month: "long", day: "numeric" }
            );

            return (
              <div
                key={idx}
                className="bg-dark-surface border border-dark-border rounded-lg p-5 hover:border-indigo-primary/50 transition-colors group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-dark-fg group-hover:text-indigo-primary transition-colors">
                      {signal.company}
                    </h3>
                    <p className="text-xs text-dark-muted mt-1">
                      {signal.ticker} · {signalDate}
                    </p>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                    }}
                  >
                    {getStrengthLabel(signal.strength)}
                  </div>
                </div>

                {/* Statement */}
                <p className="text-sm text-dark-fg leading-relaxed border-l-2 pl-4 py-2" style={{ borderColor: color }}>
                  "{signal.statement}
                  {signal.statement.length === 300 ? "..." : ""}"
                </p>

                {/* Strength Indicator */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-dark-muted">신호 강도:</span>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            i < (signal.strength === "강" ? 3 : signal.strength === "중" ? 2 : 1)
                              ? color
                              : "#30363d",
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-dark-surface border border-dark-border rounded-lg">
          <p className="text-dark-muted mb-2">공급부족 발언이 없습니다.</p>
          <p className="text-xs text-dark-muted">
            data/earnings/ 폴더에 어닝콜 데이터를 추가하세요.
          </p>
        </div>
      )}

      {/* Summary */}
      {signals.length > 0 && (
        <div className="bg-dark-surface/50 border border-dark-border rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-status-down">
                {signals.filter((s) => s.strength === "강").length}
              </div>
              <div className="text-xs text-dark-muted">강한 신호</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {signals.filter((s) => s.strength === "중").length}
              </div>
              <div className="text-xs text-dark-muted">중간 신호</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-muted">
                {signals.filter((s) => s.strength === "약").length}
              </div>
              <div className="text-xs text-dark-muted">약한 신호</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
