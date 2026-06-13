"use client";

import { useEffect, useState } from "react";

interface TickerData {
  symbol: string;
  label: string;
  value: number;
  change: number;
  changePercent: number;
}

const SAMPLE_TICKERS: TickerData[] = [
  { symbol: "KOSPI", label: "코스피", value: 2745.32, change: 12.5, changePercent: 0.46 },
  { symbol: "SPX", label: "S&P500", value: 5832.04, change: -8.3, changePercent: -0.14 },
  { symbol: "CCMP", label: "NASDAQ", value: 18925.68, change: 45.2, changePercent: 0.24 },
  { symbol: "USDT", label: "USD/KRW", value: 1298.45, change: -2.1, changePercent: -0.16 },
  { symbol: "BTC", label: "비트코인", value: 67543.20, change: 2140.5, changePercent: 3.27 },
  { symbol: "ETH", label: "이더리움", value: 3512.80, change: 120.3, changePercent: 3.54 },
  { symbol: "NVDA", label: "엔비디아", value: 147.23, change: -1.2, changePercent: -0.81 },
  { symbol: "TSLA", label: "테슬라", value: 238.45, change: 5.8, changePercent: 2.50 },
];

export default function MarketTicker() {
  const [tickers, setTickers] = useState<TickerData[]>(SAMPLE_TICKERS);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prevTickers) =>
        prevTickers.map((ticker) => ({
          ...ticker,
          change: (Math.random() - 0.5) * 100,
          changePercent: (Math.random() - 0.5) * 5,
        }))
      );
    }, 5000);

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
