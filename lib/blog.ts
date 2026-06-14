import fs from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  category: "데일리브리핑" | "반도체" | "글로벌매크로" | "포트폴리오" | "지정학";
  tags: string[];
  summary: string;
  author: string;
  readTime: number; // minutes
  content: string;
}

const BLOG_PATH = path.join(process.cwd(), "content", "blog");

/**
 * 프론트매터를 직접 파싱 (gray-matter 없이 regex 사용)
 */
function parseFrontmatter(fileContent: string): { data: Record<string, unknown>; content: string } {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = fileContent.match(fmRegex);

  if (!match) {
    return { data: {}, content: fileContent };
  }

  const fmBlock = match[1];
  const content = match[2];
  const data: Record<string, unknown> = {};

  for (const line of fmBlock.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();

    if (!key) continue;

    // Array: ["a", "b", "c"]
    if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
      const inner = rawVal.slice(1, -1);
      data[key] = inner
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      // Scalar: strip surrounding quotes
      data[key] = rawVal.replace(/^["']|["']$/g, "");
    }
  }

  return { data, content: content.trimStart() };
}

/**
 * MD 파일을 BlogPost 객체로 파싱
 */
function parsePost(filePath: string): BlogPost | null {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = parseFrontmatter(fileContent);

    const slug = path.basename(filePath, ".md");

    // 단어 수로 읽기 시간 계산
    const wordCount = content.trim().split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 300);

    return {
      slug,
      title: (data.title as string) || "",
      date: (data.date as string) || "",
      category: (data.category as BlogPost["category"]) || "데일리브리핑",
      tags: (data.tags as string[]) || [],
      summary: (data.summary as string) || "",
      author: (data.author as string) || "AI Research Agent",
      readTime,
      content,
    };
  } catch (error) {
    console.error(`Failed to parse blog post ${filePath}:`, error);
    return null;
  }
}

/**
 * 모든 블로그 포스트 (날짜 내림차순)
 */
export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_PATH)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_PATH).filter((f) => f.endsWith(".md"));

  const posts = files
    .map((f) => parsePost(path.join(BLOG_PATH, f)))
    .filter((p): p is BlogPost => p !== null);

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * 특정 slug의 포스트
 */
export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_PATH, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  return parsePost(filePath);
}

/**
 * 카테고리별 포스트 필터링
 */
export function getPostsByCategory(cat: string): BlogPost[] {
  if (cat === "전체") return getAllPosts();
  return getAllPosts().filter((p) => p.category === cat);
}

/**
 * 카테고리별 배지 색상 (Tailwind 클래스)
 */
export function getCategoryColor(category: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case "데일리브리핑":
      return { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" };
    case "반도체":
      return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" };
    case "글로벌매크로":
      return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" };
    case "포트폴리오":
      return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" };
    case "지정학":
      return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" };
    default:
      return { bg: "bg-dark-surface", text: "text-dark-muted", border: "border-dark-border" };
  }
}
