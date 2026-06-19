"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/", label: "홈", icon: "🏠" },
    { href: "/blog", label: "브리핑", icon: "📝" },
    { href: "/reports", label: "리포트", icon: "📊" },
    { href: "/themes", label: "테마", icon: "🎯" },
    { href: "/heatmap", label: "히트맵", icon: "🔥" },
    { href: "/screener", label: "신고가🚀", icon: "🚀" },
    { href: "/terminal", label: "터미널", icon: "💻" },
    { href: "/admin", label: "에이전트", icon: "🤖" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-dark-bg border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-indigo-primary hover:text-indigo-hover"
          >
            <span className="text-2xl">📈</span>
            <span className="hidden sm:inline">Research</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-md text-sm font-medium text-dark-fg hover:bg-dark-surface hover:text-indigo-primary transition-colors"
              >
                <span className="hidden sm:inline">{link.label}</span>
                <span className="sm:hidden">{link.icon}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md hover:bg-dark-surface text-dark-fg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* AI Research Agent Badge */}
          <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1 bg-indigo-primary/10 border border-indigo-primary/30 rounded-full">
            <span className="text-xs font-semibold text-indigo-primary">
              🤖 AI 리서치 에이전트
            </span>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-dark-border space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-md text-sm font-medium text-dark-fg hover:bg-dark-surface hover:text-indigo-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.icon} {link.label}
              </Link>
            ))}
            <div className="px-3 py-2 text-xs text-indigo-primary font-semibold bg-indigo-primary/10 rounded-md border border-indigo-primary/30">
              🤖 AI 리서치 에이전트
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
