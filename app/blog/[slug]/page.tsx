import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, getCategoryColor } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// ─────────────────────────────────────────────
// Simple Markdown renderer (no external deps)
// ─────────────────────────────────────────────

function renderInline(text: string): string {
  // **bold**
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

interface RenderedBlock {
  type: "numbered" | "heading2" | "heading3" | "paragraph" | "empty";
  number?: number;
  html: string;
}

function parseLine(line: string): RenderedBlock {
  // Numbered paragraph: "1. text" or "12. text"
  const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
  if (numberedMatch) {
    return {
      type: "numbered",
      number: parseInt(numberedMatch[1], 10),
      html: renderInline(numberedMatch[2]),
    };
  }

  // ## heading
  if (line.startsWith("## ")) {
    return { type: "heading2", html: renderInline(line.slice(3)) };
  }

  // ### heading
  if (line.startsWith("### ")) {
    return { type: "heading3", html: renderInline(line.slice(4)) };
  }

  // Empty line
  if (line.trim() === "") {
    return { type: "empty", html: "" };
  }

  // Regular paragraph
  return { type: "paragraph", html: renderInline(line) };
}

function NumberedBlock({ number, html }: { number: number; html: string }) {
  return (
    <div className="flex gap-4 group/block">
      {/* Circle number badge */}
      <div className="flex-shrink-0 mt-0.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-primary/20 border border-indigo-primary/40 text-indigo-light text-xs font-bold font-mono group-hover/block:bg-indigo-primary/30 transition-colors">
          {number}
        </span>
      </div>
      {/* Content */}
      <p
        className="text-dark-fg leading-relaxed text-base flex-1 pt-0.5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks = lines.map(parseLine);

  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        if (block.type === "empty") return null;

        if (block.type === "numbered" && block.number !== undefined) {
          return <NumberedBlock key={idx} number={block.number} html={block.html} />;
        }

        if (block.type === "heading2") {
          return (
            <h2
              key={idx}
              className="text-xl font-bold text-dark-fg border-b border-dark-border pb-2 mt-8 mb-2"
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          );
        }

        if (block.type === "heading3") {
          return (
            <h3
              key={idx}
              className="text-lg font-bold text-dark-fg mt-6 mb-1"
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          );
        }

        // paragraph
        return (
          <p
            key={idx}
            className="text-dark-fg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  // Related posts: same category, excluding current
  const relatedPosts = allPosts
    .filter((p) => p.slug !== slug && p.category === post.category)
    .slice(0, 3);

  const categoryColors = getCategoryColor(post.category);

  const formattedDate = new Date(post.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-dark-bg text-dark-fg">
      {/* Back link */}
      <div className="border-b border-dark-border bg-dark-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/blog"
            className="text-indigo-primary hover:text-indigo-hover text-sm font-semibold"
          >
            ← 브리핑 목록
          </Link>
        </div>
      </div>

      {/* Post header */}
      <div className="border-b border-dark-border bg-dark-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Category + meta */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded border ${categoryColors.bg} ${categoryColors.text} ${categoryColors.border}`}
            >
              {post.category}
            </span>
            <span className="text-dark-muted text-sm">{formattedDate}</span>
            <span className="text-dark-muted text-sm">·</span>
            <span className="text-dark-muted text-sm">{post.readTime}분 읽기</span>
            <span className="text-dark-muted text-sm">·</span>
            <span className="text-dark-muted text-sm">{post.author}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 leading-snug">{post.title}</h1>

          {/* Summary */}
          <p className="text-dark-muted text-base leading-relaxed max-w-3xl">{post.summary}</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Article content */}
          <article className="lg:col-span-2">
            <div className="bg-dark-surface border border-dark-border rounded-xl p-6 sm:p-8">
              <MarkdownContent content={post.content} />
            </div>

            {/* Tags block */}
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-dark-surface border border-dark-border text-sm px-3 py-1 rounded-full text-dark-muted hover:border-indigo-primary/50 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Prev / Next navigation */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prevPost ? (
                <Link
                  href={`/blog/${prevPost.slug}`}
                  className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-indigo-primary/50 transition-all group"
                >
                  <div className="text-xs text-dark-muted mb-1">← 이전 브리핑</div>
                  <div className="text-sm font-semibold group-hover:text-indigo-primary transition-colors line-clamp-2">
                    {prevPost.title}
                  </div>
                </Link>
              ) : (
                <div />
              )}
              {nextPost ? (
                <Link
                  href={`/blog/${nextPost.slug}`}
                  className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-indigo-primary/50 transition-all group text-right"
                >
                  <div className="text-xs text-dark-muted mb-1">다음 브리핑 →</div>
                  <div className="text-sm font-semibold group-hover:text-indigo-primary transition-colors line-clamp-2">
                    {nextPost.title}
                  </div>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">

            {/* Sticky wrapper */}
            <div className="lg:sticky lg:top-20 space-y-6">

              {/* Post info */}
              <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wide mb-4">
                  브리핑 정보
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-dark-muted">카테고리</dt>
                    <dd>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded border ${categoryColors.bg} ${categoryColors.text} ${categoryColors.border}`}
                      >
                        {post.category}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-dark-muted">발행일</dt>
                    <dd className="text-dark-fg font-medium">{formattedDate}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-dark-muted">읽기 시간</dt>
                    <dd className="text-dark-fg font-medium">{post.readTime}분</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-dark-muted">저자</dt>
                    <dd className="text-dark-fg font-medium">{post.author}</dd>
                  </div>
                </dl>
              </div>

              {/* Tags sidebar */}
              <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wide mb-4">
                  태그
                </h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-dark-bg border border-dark-border text-xs px-2.5 py-1 rounded-full text-dark-muted hover:border-indigo-primary/50 transition-colors cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Related posts */}
              {relatedPosts.length > 0 && (
                <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-dark-muted uppercase tracking-wide mb-4">
                    관련 브리핑
                  </h3>
                  <div className="space-y-4">
                    {relatedPosts.map((related) => (
                      <Link
                        key={related.slug}
                        href={`/blog/${related.slug}`}
                        className="block group"
                      >
                        <div className="text-xs text-dark-muted mb-1">
                          {new Date(related.date).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <p className="text-sm font-medium leading-snug group-hover:text-indigo-primary transition-colors line-clamp-2">
                          {related.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Back button */}
              <Link
                href="/blog"
                className="block w-full text-center py-3 rounded-lg border border-dark-border bg-dark-bg text-sm font-semibold text-dark-muted hover:border-indigo-primary/50 hover:text-indigo-primary transition-all"
              >
                ← 브리핑 목록으로
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
