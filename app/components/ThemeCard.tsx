"use client";

import { useState } from "react";
import Link from "next/link";

export interface ThemeCardProps {
  id: string;
  title: string;
  description: string;
  conviction: number; // 0-1
  stocks: string[];
  sector: string;
  isHot?: boolean;
  latestReportSlug?: string;
}

function ConvictionBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90 ? "#10b981" :
    pct >= 80 ? "#4f46e5" :
    pct >= 70 ? "#f59e0b" :
    "#8b949e";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-dark-muted">Conviction</span>
        <span className="font-bold font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface StockChipProps {
  ticker: string;
  onClick: (ticker: string) => void;
}

function StockChip({ ticker, onClick }: StockChipProps) {
  return (
    <button
      onClick={() => onClick(ticker)}
      className="text-xs font-mono px-2 py-0.5 bg-dark-bg border border-dark-border rounded hover:border-indigo-primary/60 hover:bg-indigo-primary/10 hover:text-indigo-primary transition-all text-dark-muted"
    >
      {ticker}
    </button>
  );
}

interface StockModalProps {
  ticker: string;
  onClose: () => void;
}

function StockModal({ ticker, onClose }: StockModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-dark-surface border border-dark-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-dark-fg text-lg font-mono">{ticker}</h3>
            <p className="text-xs text-dark-muted">종목 상세 정보</p>
          </div>
          <button
            onClick={onClose}
            className="text-dark-muted hover:text-dark-fg p-1 rounded hover:bg-dark-bg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-dark-bg rounded-lg p-4 mb-4 text-center text-sm text-dark-muted">
          <div className="text-4xl mb-2">📈</div>
          <p>차트 데이터 로딩 중...</p>
          <p className="text-xs mt-1">터미널에서 상세 분석 가능</p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/terminal?ticker=${ticker}`}
            className="flex-1 text-center text-sm py-2 bg-indigo-primary text-white rounded-lg hover:bg-indigo-hover transition-colors font-semibold"
            onClick={onClose}
          >
            터미널에서 보기
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-dark-border rounded-lg text-sm text-dark-muted hover:border-dark-muted transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ThemeCard({
  id,
  title,
  description,
  conviction,
  stocks,
  sector,
  isHot = false,
  latestReportSlug,
}: ThemeCardProps) {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  return (
    <>
      {selectedStock && (
        <StockModal ticker={selectedStock} onClose={() => setSelectedStock(null)} />
      )}

      <div
        className={`
          relative bg-dark-surface rounded-xl p-5 transition-all duration-300
          hover:-translate-y-1 hover:shadow-xl cursor-default
          ${isHot
            ? "border border-amber-500/50 hover:border-amber-400/70 hover:shadow-amber-500/10"
            : "border border-dark-border hover:border-indigo-primary/50 hover:shadow-indigo-primary/10"
          }
        `}
        style={isHot ? {
          background: "linear-gradient(145deg, #1a1410 0%, #161b22 100%)",
        } : undefined}
      >
        {/* HOT Badge */}
        {isHot && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
            HOT
          </div>
        )}

        {/* Gradient Border for Hot */}
        {isHot && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.15), transparent 60%)",
            }}
          />
        )}

        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-bold text-dark-fg text-base leading-tight">{title}</h3>
              <span className="text-xs text-dark-muted font-mono shrink-0 px-1.5 py-0.5 bg-dark-bg border border-dark-border rounded">
                {sector}
              </span>
            </div>
            <p className="text-xs text-dark-muted leading-relaxed line-clamp-2">
              {description}
            </p>
          </div>

          {/* Conviction Bar */}
          <ConvictionBar value={conviction} />

          {/* Stocks */}
          <div>
            <div className="text-xs text-dark-muted mb-2">핵심 종목</div>
            <div className="flex flex-wrap gap-1.5">
              {stocks.map((ticker) => (
                <StockChip
                  key={ticker}
                  ticker={ticker}
                  onClick={setSelectedStock}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-dark-border">
            <span className="text-xs text-dark-border font-mono">{id}</span>
            {latestReportSlug ? (
              <Link
                href={`/reports/${latestReportSlug}`}
                className="text-xs text-indigo-primary hover:text-indigo-hover font-semibold transition-colors"
              >
                최신 리포트 →
              </Link>
            ) : (
              <span className="text-xs text-dark-border">리포트 준비 중</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
