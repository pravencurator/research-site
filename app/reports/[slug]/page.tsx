import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllReportSlugs, getReportBySlug } from "@/lib/reports";
import ReportSidebar from "@/app/components/ReportSidebar";

// MDX 컴포넌트 커스텀
const components = {
  h1: ({ children }: any) => (
    <h1 className="text-3xl font-bold my-6 text-dark-fg">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-2xl font-bold my-5 mt-8 text-dark-fg border-b border-dark-border pb-3">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-bold my-4 text-dark-fg">{children}</h3>
  ),
  p: ({ children }: any) => (
    <p className="text-base text-dark-fg leading-relaxed my-4">{children}</p>
  ),
  a: ({ children, href }: any) => (
    <a
      href={href}
      className="text-indigo-primary hover:text-indigo-hover underline"
    >
      {children}
    </a>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside my-4 space-y-2 text-dark-fg">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside my-4 space-y-2 text-dark-fg">
      {children}
    </ol>
  ),
  li: ({ children }: any) => <li className="ml-4">{children}</li>,
  code: ({ children }: any) => (
    <code className="bg-dark-surface text-indigo-light px-2 py-1 rounded text-sm font-mono">
      {children}
    </code>
  ),
  pre: ({ children }: any) => (
    <pre className="bg-dark-surface border border-dark-border rounded-lg p-4 my-4 overflow-x-auto">
      {children}
    </pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-indigo-primary pl-4 my-4 italic text-dark-muted">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse border border-dark-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-dark-surface border-b border-dark-border">
      {children}
    </thead>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-2 text-left font-semibold text-dark-fg border border-dark-border">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-2 text-dark-fg border border-dark-border">
      {children}
    </td>
  ),
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllReportSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params;
  const report = getReportBySlug(slug);

  if (!report) {
    notFound();
  }

  // 목차 생성 (h2 기반)
  const headings = report.content
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line, idx) => ({
      id: `section-${idx + 1}`,
      title: line.replace("## ", "").trim(),
      number: idx + 1,
    }));

  // 종목명 매핑 (샘플)
  const tickerNameMap: Record<string, string> = {
    "322000": "피에스케이홀딩스",
    "005930": "삼성전자",
    NVDA: "엔비디아",
  };

  const companyName = tickerNameMap[report.ticker] || report.ticker;
  const publishDate = new Date(report.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-dark-bg text-dark-fg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/reports"
            className="text-indigo-primary hover:text-indigo-hover text-sm font-semibold mb-4 inline-block"
          >
            ← 리포트 목록
          </Link>
          <h1 className="text-3xl font-bold mb-4">{report.title}</h1>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-dark-muted">
            <div className="flex flex-wrap gap-4">
              <span>
                <strong>종목:</strong> {companyName} ({report.ticker}.
                {report.exchange})
              </span>
              <span>
                <strong>발간:</strong> {publishDate}
              </span>
              <span>
                <strong>섹터:</strong> {report.sector}
              </span>
            </div>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                backgroundColor:
                  report.difficulty === "초급"
                    ? "rgba(16, 185, 129, 0.1)"
                    : report.difficulty === "중급"
                      ? "rgba(245, 158, 11, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                color:
                  report.difficulty === "초급"
                    ? "#10b981"
                    : report.difficulty === "중급"
                      ? "#f59e0b"
                      : "#ef4444",
              }}
            >
              {report.difficulty} 난이도
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Summary Box */}
            <div className="bg-dark-surface border border-indigo-primary/30 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-indigo-primary mb-2">
                30초 요약
              </h2>
              <p className="text-base text-dark-fg leading-relaxed">
                {report.summary}
              </p>
            </div>

            {/* Report Content */}
            <div className="prose prose-invert max-w-none">
              <MDXRemote source={report.content} components={components} />
            </div>
          </div>

          {/* Sidebar with Price Chart and Meta */}
          <ReportSidebar
            ticker={report.ticker}
            exchange={report.exchange}
            companyName={companyName}
            tags={report.tags}
            publishDate={publishDate}
            difficulty={report.difficulty}
            headings={headings}
          />
        </div>
      </div>

      {/* Related Reports */}
      <div className="border-t border-dark-border bg-dark-surface/50 backdrop-blur mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h3 className="text-2xl font-bold mb-8">관련 리포트</h3>
          <div className="text-center text-dark-muted py-8">
            <p className="mb-4">더 많은 리포트를 탐색하세요</p>
            <Link
              href="/reports"
              className="inline-block px-6 py-2 bg-indigo-primary text-white font-semibold rounded-lg hover:bg-indigo-hover transition-colors"
            >
              리포트 목록으로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
