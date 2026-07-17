import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사용자 관리",
};

export default function UsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">사용자 관리</h1>
      <div className="mt-6 rounded-2xl border border-ink/10 bg-paper-card p-6">
        <p className="text-sm text-ink/70">
          관리자 및 권한 사용자 목록을 관리하는 화면을 이어서 구현할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
