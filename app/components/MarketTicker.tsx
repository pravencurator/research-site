"use client";

import { useEffect, useState } from "react";

interface TickerData {
  symbol: string;
  label: string;
  value: number;
  change: number;
  changePercent: number;
  isLoading?: boolean;
}

const TICKERS_TO_TRACK = [
  { symbol: "^KSPI", label: "코스피", exchange: "KS" },
  { symbol: "^GSPC", label: "S&P500", exchange: "" },
  { symbol: "^CCMP", label: "NASDAQ", exchange: "" },
  { symbol: "NVDA", label: "엔비디아", exchange: "" },
  { symbol: "005930", label: "삼성전자", exchange: "KS" },
  { symbol: "000660", label: "SK하이닉스", exchange: "KS" },
  { symbol: "TSLA", label: "테슬라", exchange: "" },
  { symbol: "322000", label: "PSK", exchange: "KS" },
];

const FALLBACK_TICKERS: TickerData[] = [
  { symbol: "KOSPI", label: "코스피", value: 2745.32, change: 12.5, changePercent: 0.46 },
  { symbol: "SPX", label: "S&P500", value: 5832.04, change: -8.3, changePercent: -0.14 },
  { symbol: "CCMP", label: "NASDAQ", value: 18925.68, change: 45.2, changePercent: 0.24 },
  { symbol: "NVDA", label: "엔비디아", value: 147.23, change: -1.2, changePercent: -0.81 },
  { symbol: "Samsung", label: "삼성전자", value: 70500, change: 500, changePercent: 0.71 },
  { symbol: "SK Hynix", label: "SK하이닉스", value: 190000, change: -2500, changePercent: -1.30 },
  { symbol: "TSLA", label: "테슬라", value: 238.45, change: 5.8, changePercent: 2.50 },
  { symbol: "PSK", label: "PSK", value: 85000, change: 1500, changePercent: 1.79 },
];

export default function MarketTicker() {
  const [tickers, setTickers] = useState<TickerData[]>(FALLBACK_TICKERS);
  const [isHovering, setIsHovering] = useState(false);

  // 실시간 데이터 갱신
  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        // API 엔드포인트에서 실시간 데이터 조회
        const response = await fetch("/api/market/ticker");
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setTickers(data.data);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch ticker data, using fallback:", error);
        // 폴백 유지
      }
    };

    // 초기 로드
    fetchTickerData();

    // 30초마다 갱신
    const interval = setInterval(fetchTickerData, 30000);

    return () => clearInterval(interval);
  }, []);

  const TickerItem = ({ ticker }: { ticker: TickerData }) => (
    <div className="flex-shrink-0 flex items-center gap-3 px-3 py-1 bg-dark-bg rounded-md border border-dark-border hover:border-indigo-primary/50 transition-colors cursor-pointer group">
      <div className="flex flex-col gap-0.5 min-w-max">
        <div className="text-xs font-semibold text-dark-muted group-hover:text-indigo-primary transition-colors">
          {ticker.label}
        </div>
        <div className="text-sm font-bold text-dark-fg">
          {ticker.value.toLocaleString("ko-KR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      <div
        className={`text-xs font-semibold whitespace-nowrap flex flex-col items-center ${
          ticker.change >= 0 ? "text-status-up" : "text-status-down"
        }`}
      >
        <div>{ticker.change >= 0 ? "▲" : "▼"}</div>
        <div>{Math.abs(ticker.changePercent).toFixed(2)}%</div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="bg-dark-surface border-b border-dark-border overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className="flex gap-6 px-4 py-3 will-change-transform"
          style={{
            animation: isHovering
              ? "none"
              : `scroll 40s linear infinite`,
          }}
        >
          {[...tickers, ...tickers].map((ticker, idx) => (
            <TickerItem key={`${ticker.symbol}-${idx}`} ticker={ticker} />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </>
  );
}
