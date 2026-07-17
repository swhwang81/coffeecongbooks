import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "카테고리 관리",
};

export default function CategoriesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">카테고리 관리</h1>
      <div className="mt-6 rounded-2xl border border-ink/10 bg-paper-card p-6">
        <p className="text-sm text-ink/70">
          카테고리 추가·수정·삭제를 위한 관리 화면을 이어서 구성할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
