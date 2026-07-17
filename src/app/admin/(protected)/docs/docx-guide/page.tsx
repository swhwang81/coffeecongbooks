import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = {
  title: "DOCX 작성 가이드",
};

// Renders the actual repo doc (docs/deployment/docx-authoring-guide.md) —
// single source of truth shared with the git-tracked copy read outside the
// app, rather than a duplicated/hand-maintained JSX copy that could drift.
async function getGuideMarkdown(): Promise<string> {
  const filePath = path.join(process.cwd(), "docs", "deployment", "docx-authoring-guide.md");
  return readFile(filePath, "utf-8");
}

export default async function DocxGuidePage() {
  const markdown = await getGuideMarkdown();

  return (
    <div>
      <Link href="/admin/books/new" className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        도서 등록으로 돌아가기
      </Link>

      <div className="mt-4 rounded-2xl border border-ink/10 bg-paper-card p-6 sm:p-8">
        <article className="prose prose-sm sm:prose-base max-w-none prose-headings:text-ink prose-a:text-accent prose-strong:text-ink prose-th:text-ink">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
