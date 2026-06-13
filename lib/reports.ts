import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface ReportFrontmatter {
  title: string;
  date: string;
  ticker: string;
  exchange: string;
  sector: string;
  difficulty: "초급" | "중급" | "고급";
  tags: string[];
  summary: string;
}

export interface Report extends ReportFrontmatter {
  slug: string;
  content: string;
  isoDate: string; // ISO 형식 날짜
}

const REPORTS_PATH = process.env.REPORTS_PATH || path.join(process.cwd(), "reports");

/**
 * 모든 리포트 파일 경로 가져오기
 */
function getReportPaths(): string[] {
  if (!fs.existsSync(REPORTS_PATH)) {
    return [];
  }

  return fs.readdirSync(REPORTS_PATH)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(REPORTS_PATH, file));
}

/**
 * MD 파일을 리포트 객체로 파싱
 */
function parseReport(filePath: string): Report | null {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    const frontmatter = data as ReportFrontmatter;

    // 날짜를 ISO 형식으로 변환 (YYYY-MM-DD)
    const dateObj = new Date(frontmatter.date);
    const isoDate = dateObj.toISOString().split("T")[0];

    const filename = path.basename(filePath, ".md");

    return {
      ...frontmatter,
      slug: filename,
      content,
      isoDate,
    };
  } catch (error) {
    console.error(`Failed to parse report ${filePath}:`, error);
    return null;
  }
}

/**
 * 모든 리포트 목록 가져오기 (발간일 내림차순)
 */
export function getAllReports(): Report[] {
  const paths = getReportPaths();
  const reports = paths
    .map((filePath) => parseReport(filePath))
    .filter((report) => report !== null) as Report[];

  // 발간일 내림차순 정렬
  return reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * 특정 slug의 리포트 가져오기
 */
export function getReportBySlug(slug: string): Report | null {
  const filePath = path.join(REPORTS_PATH, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return parseReport(filePath);
}

/**
 * 모든 리포트 slug 목록 (동적 라우트 생성용)
 */
export function getAllReportSlugs(): string[] {
  return getAllReports().map((report) => report.slug);
}

/**
 * 특정 섹터의 리포트만 필터링
 */
export function getReportsBySector(sector: string): Report[] {
  if (sector === "전체") {
    return getAllReports();
  }
  return getAllReports().filter((report) => report.sector === sector);
}

/**
 * 난이도별 색상 반환
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "초급":
      return "#10b981"; // 초록
    case "중급":
      return "#f59e0b"; // 주황
    case "고급":
      return "#ef4444"; // 빨강
    default:
      return "#8b949e"; // 회색
  }
}

/**
 * 난이도별 배경 색상 반환
 */
export function getDifficultyBgColor(difficulty: string): string {
  switch (difficulty) {
    case "초급":
      return "bg-status-up/10";
    case "중급":
      return "bg-yellow-500/10";
    case "고급":
      return "bg-status-down/10";
    default:
      return "bg-dark-muted/10";
  }
}

/**
 * 리포트 성과 계산 (발간일 대비)
 * 실제 데이터는 추후 확장
 */
export function getReportPerformance(ticker: string, publishDate: string): {
  return: number;
  status: "상승" | "하락" | "보합";
} {
  // 샘플 데이터 - 실제로는 yahoo-finance2로 계산
  const baseReturn = Math.sin(new Date(publishDate).getTime() / 10000000000) * 30;

  return {
    return: baseReturn,
    status: baseReturn > 5 ? "상승" : baseReturn < -5 ? "하락" : "보합",
  };
}
