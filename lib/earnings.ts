import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface EarningsData {
  ticker: string;
  company: string;
  date: string;
  content: string;
}

export interface ShortageSignal {
  ticker: string;
  company: string;
  date: string;
  statement: string;
  strength: "강" | "중" | "약";
}

const EARNINGS_PATH = process.env.EARNINGS_PATH || path.join(process.cwd(), "data/earnings");

function getEarningsFiles(): string[] {
  if (!fs.existsSync(EARNINGS_PATH)) {
    return [];
  }

  return fs.readdirSync(EARNINGS_PATH)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(EARNINGS_PATH, file));
}

export function getAllEarningsData(): EarningsData[] {
  const files = getEarningsFiles();

  return files
    .map((filePath) => {
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const { data, content } = matter(fileContent);

        return {
          ticker: data.ticker || "",
          company: data.company || "",
          date: data.date || "",
          content,
        };
      } catch (error) {
        console.error(`Failed to parse earnings file ${filePath}:`, error);
        return null;
      }
    })
    .filter((item) => item !== null) as EarningsData[];
}

/**
 * 공급부족 발언 추출 (간단한 패턴 매칭)
 */
export function extractShortageSignals(): ShortageSignal[] {
  const allEarnings = getAllEarningsData();
  const signals: ShortageSignal[] = [];

  const SHORTAGE_KEYWORDS = [
    "supply",
    "constraint",
    "shortage",
    "limited",
    "capacity",
    "부족",
    "제약",
    "한정",
  ];

  allEarnings.forEach((earnings) => {
    // 마크다운의 "공급부족 발언 원문" 섹션 찾기
    const lines = earnings.content.split("\n");
    let inShortageSection = false;
    let currentStrength = "";
    let currentStatement = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes("공급부족 발언 원문")) {
        inShortageSection = true;
        continue;
      }

      if (inShortageSection) {
        // 강/중/약 찾기
        const strengthMatch = line.match(/\*\*(강|중|약)/);
        if (strengthMatch) {
          currentStrength = strengthMatch[1];
          // 따옴표 안의 내용 추출
          const statementMatch = line.match(/"(.+?)"/);
          if (statementMatch) {
            currentStatement = statementMatch[1];
            break;
          }
        }
      }
    }

    if (currentStrength && currentStatement) {
      signals.push({
        ticker: earnings.ticker,
        company: earnings.company,
        date: earnings.date,
        statement: currentStatement.slice(0, 300),
        strength: currentStrength as "강" | "중" | "약",
      });
    }
  });

  return signals.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * 신호 강도 색상
 */
export function getSignalColor(strength: string): string {
  switch (strength) {
    case "강":
      return "#ef4444"; // 빨강
    case "중":
      return "#f59e0b"; // 주황
    case "약":
      return "#8b949e"; // 회색
    default:
      return "#8b949e";
  }
}
