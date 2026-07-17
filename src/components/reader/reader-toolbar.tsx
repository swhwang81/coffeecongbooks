"use client";

import { ArrowLeft, List, Minus, Plus, Sun, Moon, Coffee, RotateCcw, Maximize, Minimize, Menu, AlignJustify, Settings, Share2 } from "lucide-react";
import type { ReaderTheme } from "./reader";

const THEME_ICON: Record<ReaderTheme, typeof Sun> = { light: Sun, sepia: Coffee, dark: Moon };
const THEME_ORDER: ReaderTheme[] = ["light", "sepia", "dark"];

export function ReaderToolbar({
  variant,
  title,
  onBack,
  onToggleToc,
  onOpenSettings,
  onOpenShare,
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  theme,
  onThemeChange,
  onReset,
  isFullscreen,
  onToggleFullscreen,
}: {
  variant: "desktop" | "mobile";
  title: string;
  onBack: () => void;
  onToggleToc: () => void;
  onOpenSettings: () => void;
  /** Omitted (no button rendered) when the book has sharing turned off. */
  onOpenShare?: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineHeight: number;
  onLineHeightChange: (lineHeight: number) => void;
  theme: ReaderTheme;
  onThemeChange: (theme: ReaderTheme) => void;
  onReset: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const ThemeIcon = THEME_ICON[theme];

  function cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    onThemeChange(next);
  }

  const iconButtonClass = "rounded-full p-2 text-paper/80 hover:bg-paper/10 hover:text-paper";

  if (variant === "mobile") {
    return (
      <div className="flex h-14 shrink-0 items-center gap-2 px-3 text-paper">
        <button type="button" onClick={onBack} aria-label="뒤로가기" className={iconButtonClass}>
          <ArrowLeft className="size-5" />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        <button type="button" onClick={() => onFontSizeChange(fontSize - 1)} aria-label="글자 작게" className={iconButtonClass}>
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => onFontSizeChange(fontSize + 1)} aria-label="글자 크게" className={iconButtonClass}>
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={onOpenSettings} aria-label="읽기 설정" className={iconButtonClass}>
          <Settings className="size-5" />
        </button>
        {onOpenShare && (
          <button type="button" onClick={onOpenShare} aria-label="공유하기" className={iconButtonClass}>
            <Share2 className="size-5" />
          </button>
        )}
        <button type="button" onClick={onToggleToc} aria-label="메뉴" className={iconButtonClass}>
          <Menu className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 px-4 text-paper">
      <button type="button" onClick={onBack} aria-label="뒤로가기" className={iconButtonClass}>
        <ArrowLeft className="size-5" />
      </button>
      <button type="button" onClick={onToggleToc} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-paper/80 hover:bg-paper/10 hover:text-paper">
        <List className="size-4" />
        목차로
      </button>
      <span className="min-w-0 flex-1 truncate text-center text-sm font-medium">{title}</span>

      <div className="flex items-center gap-1 rounded-full bg-paper/10 px-1 py-1">
        <button type="button" onClick={() => onFontSizeChange(fontSize - 1)} aria-label="글자 작게" className="rounded-full px-2 py-1 text-xs font-semibold text-paper/80 hover:text-paper">
          A-
        </button>
        <button type="button" onClick={() => onFontSizeChange(fontSize + 1)} aria-label="글자 크게" className="rounded-full px-2 py-1 text-xs font-semibold text-paper/80 hover:text-paper">
          A+
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-full bg-paper/10 px-1 py-1">
        <AlignJustify className="ml-1 size-3.5 text-paper/50" aria-hidden="true" />
        <button
          type="button"
          onClick={() => onLineHeightChange(lineHeight - 0.15)}
          aria-label="줄 간격 좁게"
          className="rounded-full px-2 py-1 text-xs font-semibold text-paper/80 hover:text-paper"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => onLineHeightChange(lineHeight + 0.15)}
          aria-label="줄 간격 넓게"
          className="rounded-full px-2 py-1 text-xs font-semibold text-paper/80 hover:text-paper"
        >
          +
        </button>
      </div>

      <button type="button" onClick={cycleTheme} aria-label="테마 전환" className={iconButtonClass}>
        <ThemeIcon className="size-4" />
      </button>
      <button type="button" onClick={onReset} aria-label="설정 초기화" className={iconButtonClass}>
        <RotateCcw className="size-4" />
      </button>
      {onOpenShare && (
        <button type="button" onClick={onOpenShare} aria-label="공유하기" className={iconButtonClass}>
          <Share2 className="size-4" />
        </button>
      )}
      <button type="button" onClick={onToggleFullscreen} aria-label="전체화면" className={iconButtonClass}>
        {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
      </button>
    </div>
  );
}
