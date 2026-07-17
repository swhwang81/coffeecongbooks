import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "설정",
};

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">설정</h1>
      <div className="mt-6 rounded-2xl border border-ink/10 bg-paper-card p-6">
        <p className="text-sm text-ink/70">
          앱 기본 설정, 사이트 정보, 외부 연결 설정을 관리하는 화면을 이어서 구성할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
