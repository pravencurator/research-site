"use client";

import { useState } from "react";
import Link from "next/link";

interface AnalysisTask {
  ticker: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  timestamp: string;
}

export default function AdminPage() {
  const [tasks, setTasks] = useState<AnalysisTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    "005930.KS",
    "000660.KS",
    "322000.KS",
    "NVDA",
  ]);

  const handleRunAnalysis = async () => {
    setIsRunning(true);

    // 초기 작업 생성
    const initialTasks: AnalysisTask[] = selectedTickers.map((ticker) => ({
      ticker,
      status: "pending",
      progress: 0,
      message: "대기 중...",
      timestamp: new Date().toISOString(),
    }));

    setTasks(initialTasks);

    // 각 종목 분석
    for (let i = 0; i < selectedTickers.length; i++) {
      const ticker = selectedTickers[i];

      try {
        // 상태 업데이트: running
        setTasks((prev) =>
          prev.map((t) =>
            t.ticker === ticker
              ? { ...t, status: "running", message: "분석 중..." }
              : t
          )
        );

        // API 호출
        const response = await fetch("/api/agents/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker }),
        });

        if (response.ok) {
          const result = await response.json();
          setTasks((prev) =>
            prev.map((t) =>
              t.ticker === ticker
                ? {
                    ...t,
                    status: "completed",
                    progress: 100,
                    message: `완료: ${result.filename}`,
                  }
                : t
            )
          );
        } else {
          throw new Error(`Status ${response.status}`);
        }
      } catch (error) {
        setTasks((prev) =>
          prev.map((t) =>
            t.ticker === ticker
              ? {
                  ...t,
                  status: "failed",
                  progress: 0,
                  message: `실패: ${error instanceof Error ? error.message : "Unknown error"}`,
                }
              : t
          )
        );
      }

      // 다음 종목 전에 지연
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setIsRunning(false);
  };

  const handleToggleTicker = (ticker: string) => {
    setSelectedTickers((prev) =>
      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]
    );
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-fg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">리서치 에이전트 대시보드</h1>
              <p className="text-sm text-dark-muted mt-1">자동 리포트 생성 및 모니터링</p>
            </div>
            <Link
              href="/"
              className="text-sm text-indigo-primary hover:text-indigo-hover"
            >
              ← 홈으로
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">분석 제어</h2>

              {/* Ticker Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-xs text-dark-muted font-semibold block">
                  분석 종목 선택
                </label>
                <div className="space-y-2">
                  {["005930.KS", "000660.KS", "322000.KS", "NVDA", "MRVL", "AMAT"].map(
                    (ticker) => (
                      <label
                        key={ticker}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTickers.includes(ticker)}
                          onChange={() => handleToggleTicker(ticker)}
                          className="rounded accent-indigo-primary"
                        />
                        <span className="text-sm">{ticker}</span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Run Button */}
              <button
                onClick={handleRunAnalysis}
                disabled={isRunning || selectedTickers.length === 0}
                className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                  isRunning || selectedTickers.length === 0
                    ? "bg-dark-border text-dark-muted cursor-not-allowed"
                    : "bg-indigo-primary text-white hover:bg-indigo-hover"
                }`}
              >
                {isRunning ? "분석 중..." : "분석 시작"}
              </button>

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-dark-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-dark-muted">대기 중</span>
                  <span className="text-indigo-primary font-mono">
                    {tasks.filter((t) => t.status === "pending").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-muted">진행 중</span>
                  <span className="text-yellow-500 font-mono">
                    {tasks.filter((t) => t.status === "running").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-muted">완료</span>
                  <span className="text-green-500 font-mono">
                    {tasks.filter((t) => t.status === "completed").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-muted">실패</span>
                  <span className="text-red-500 font-mono">
                    {tasks.filter((t) => t.status === "failed").length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="lg:col-span-2">
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">분석 작업 현황</h2>

              {tasks.length === 0 ? (
                <div className="text-center py-12 text-dark-muted">
                  <p className="text-sm">분석 작업이 없습니다</p>
                  <p className="text-xs mt-2">위의 제어판에서 분석을 시작하세요</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.ticker}
                      className="bg-dark-bg border border-dark-border rounded-lg p-4"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-indigo-primary">
                            {task.ticker}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              task.status === "pending"
                                ? "bg-gray-500/20 text-gray-400"
                                : task.status === "running"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : task.status === "completed"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <span className="text-xs text-dark-muted">
                          {new Date(task.timestamp).toLocaleTimeString("ko-KR")}
                        </span>
                      </div>

                      {/* Message */}
                      <p className="text-sm text-dark-muted mb-2">{task.message}</p>

                      {/* Progress Bar */}
                      <div className="bg-dark-border rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            task.status === "completed"
                              ? "bg-green-500"
                              : task.status === "failed"
                                ? "bg-red-500"
                                : "bg-indigo-primary"
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-dark-surface border border-dark-border rounded-lg p-4 text-sm text-dark-muted">
              <p className="mb-2">
                <strong>📝 자동 분석 기능:</strong> SONNET 모델을 사용하여 종목별 투자
                리포트를 자동으로 생성합니다.
              </p>
              <p className="text-xs">
                생성된 리포트는 <code className="text-indigo-primary">/reports</code>{" "}
                디렉토리에 저장됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
