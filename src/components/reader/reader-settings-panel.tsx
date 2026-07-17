"use client";

import { X, Minus, Plus, Sun, Moon, Coffee, RotateCcw } from "lucide-react";
import type { ReaderTheme } from "./reader";

const THEME_OPTIONS: { value: ReaderTheme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "라이트", icon: Sun },
  { value: "sepia", label: "세피아", icon: Coffee },
  { value: "dark", label: "다크", icon: Moon },
];

/** Mobile-only settings sheet (spec Phase 12 "모바일 설정 패널 UI") — the
 * desktop toolbar already exposes these controls inline. */
export function ReaderSettingsPanel({
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  theme,
  onThemeChange,
  onReset,
  onClose,
}: {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineHeight: number;
  onLineHeightChange: (lineHeight: number) => void;
  theme: ReaderTheme;
  onThemeChange: (theme: ReaderTheme) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button type="button" aria-label="설정 닫기" onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <div className="relative w-full rounded-t-2xl bg-paper-card p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">읽기 설정</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-1 text-ink/50 hover:bg-ink/5">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-ink/70">글자 크기</span>
          <div className="flex items-center gap-2 rounded-full bg-ink/5 px-2 py-1">
            <button
              type="button"
              onClick={() => onFontSizeChange(fontSize - 1)}
              aria-label="글자 작게"
              className="rounded-full p-1.5 text-ink/70 hover:text-ink"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center text-sm text-ink">{fontSize}</span>
            <button
              type="button"
              onClick={() => onFontSizeChange(fontSize + 1)}
              aria-label="글자 크게"
              className="rounded-full p-1.5 text-ink/70 hover:text-ink"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-ink/70">줄 간격</span>
          <div className="flex items-center gap-2 rounded-full bg-ink/5 px-2 py-1">
            <button
              type="button"
              onClick={() => onLineHeightChange(lineHeight - 0.15)}
              aria-label="줄 간격 좁게"
              className="rounded-full p-1.5 text-ink/70 hover:text-ink"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center text-sm text-ink">{lineHeight.toFixed(2)}</span>
            <button
              type="button"
              onClick={() => onLineHeightChange(lineHeight + 0.15)}
              aria-label="줄 간격 넓게"
              className="rounded-full p-1.5 text-ink/70 hover:text-ink"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <span className="text-sm text-ink/70">테마</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onThemeChange(value)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-xs ${
                  theme === value ? "border-accent bg-accent/10 text-accent" : "border-ink/10 text-ink/60"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-ink/10 py-2.5 text-sm font-medium text-ink/70"
        >
          <RotateCcw className="size-4" />
          기본값으로 초기화
        </button>
      </div>
    </div>
  );
}
