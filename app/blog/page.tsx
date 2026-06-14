import Link from "next/link";
import { getAllPosts, getPostsByCategory, getCategoryColor } from "@/lib/blog";
import type { BlogPost } from "@/lib/blog";

const CATEGORIES = ["전체", "데일리브리핑", "반도체", "글로벌매크로", "포트폴리오", "지정학"];

interface BlogPageProps {
  searchParams: Promise<{ category?: string }>;
}

function CategoryBadge({ category }: { category: string }) {
  const colors = getCategoryColor(category);
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {category}
    </span>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  const formattedDate = new Date(post.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <div className="h-full bg-dark-surface border border-dark-border rounded-lg overflow-hidden hover:border-indigo-primary/50 hover:shadow-lg hover:shadow-indigo-primary/10 transition-all flex flex-col">
        {/* Card Top */}
        <div className="border-b border-dark-border p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <CategoryBadge category={post.category} />
            <span className="text-xs text-dark-muted">{post.readTime}분 읽기</span>
          </div>
          <h3 className="font-bold text-base leading-snug group-hover:text-indigo-primary transition-colors line-clamp-2 mt-2">
            {post.title}
          </h3>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <p className="text-sm text-dark-muted leading-relaxed line-clamp-2 flex-1">
            {post.summary}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-dark-bg border border-dark-border text-xs px-2 py-0.5 rounded text-dark-muted"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-dark-muted py-0.5">+{post.tags.length - 3}</span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-dark-muted pt-1 border-t border-dark-border">
            <span>{post.author}</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-dark-border px-4 py-3 bg-dark-bg/50">
          <span className="text-xs text-indigo-primary font-semibold group-hover:underline">
            브리핑 읽기 →
          </span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedPostCard({ post }: { post: BlogPost }) {
  const formattedDate = new Date(post.date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden hover:border-indigo-primary/50 hover:shadow-xl hover:shadow-indigo-primary/10 transition-all">
        <div className="p-6 sm:p-8">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-indigo-primary border border-indigo-primary/30 bg-indigo-primary/10 px-2 py-0.5 rounded">
                최신
              </span>
              <CategoryBadge category={post.category} />
            </div>
            <span className="text-xs text-dark-muted">{post.readTime}분 읽기</span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold leading-snug mb-3 group-hover:text-indigo-primary transition-colors">
            {post.title}
          </h2>

          {/* Summary */}
          <p className="text-dark-muted leading-relaxed mb-5 text-sm sm:text-base">
            {post.summary}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-dark-bg border border-dark-border text-xs px-2.5 py-1 rounded text-dark-muted"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm border-t border-dark-border pt-4">
            <span className="text-dark-muted">{post.author} · {formattedDate}</span>
            <span className="text-indigo-primary font-semibold group-hover:underline">
              전문 읽기 →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category: rawCategory } = await searchParams;
  const selectedCategory = rawCategory ?? "전체";

  const allPosts = getAllPosts();
  const filteredPosts = selectedCategory === "전체"
    ? allPosts
    : getPostsByCategory(selectedCategory);

  const featuredPost = filteredPosts[0] ?? null;
  const remainingPosts = filteredPosts.slice(1);

  return (
    <div className="min-h-screen bg-dark-bg text-dark-fg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">데일리 브리핑 &amp; 분석</h1>
          <p className="text-dark-muted">
            지정학→거시경제→섹터→종목 체인 분석 — 매일 업데이트
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-dark-border bg-dark-surface/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-primary">{allPosts.length}</div>
              <div className="text-xs text-dark-muted">총 브리핑</div>
            </div>
            {["데일리브리핑", "반도체", "글로벌매크로"].map((cat) => (
              <div key={cat}>
                <div className="text-2xl font-bold text-indigo-primary">
                  {allPosts.filter((p) => p.category === cat).length}
                </div>
                <div className="text-xs text-dark-muted">{cat}</div>
              </div>
            ))}
            <div className="hidden sm:block">
              <div className="text-2xl font-bold text-indigo-primary">
                {allPosts.length > 0
                  ? Math.round(allPosts.reduce((s, p) => s + p.readTime, 0) / allPosts.length)
                  : 0}분
              </div>
              <div className="text-xs text-dark-muted">평균 읽기시간</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Category filter tabs (URL-based) */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => {
            const count = cat === "전체" ? allPosts.length : allPosts.filter((p) => p.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <Link
                key={cat}
                href={cat === "전체" ? "/blog" : `/blog?category=${encodeURIComponent(cat)}`}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-primary text-white"
                    : "bg-dark-surface text-dark-fg hover:border-indigo-primary/30 border border-dark-border"
                }`}
              >
                {cat}
                <span className="ml-2 text-xs opacity-70">({count})</span>
              </Link>
            );
          })}
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-dark-muted mb-4">해당 카테고리의 브리핑이 없습니다.</p>
            <Link href="/blog" className="text-indigo-primary hover:text-indigo-hover font-semibold text-sm">
              전체 보기
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured post */}
            {featuredPost && <FeaturedPostCard post={featuredPost} />}

            {/* Remaining posts grid */}
            {remainingPosts.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-6 text-dark-muted">이전 브리핑</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {remainingPosts.map((post) => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
