"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Link2, Share2, Mail, QrCode, Check } from "lucide-react";

/** Reader-side share panel (spec §6/Phase 15) — link copy, the native share
 * sheet where available, a QR code, email, and X/Facebook. Only ever
 * rendered when the book's `allow_share` flag is on. */
export function ReaderShareMenu({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // Feature detection only works client-side — must start `false` to
    // match SSR and correct itself post-mount, same as `isDesktop` in `Reader`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    QRCode.toDataURL(url, { width: 200, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [url]);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled the share sheet — not an error.
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="공유 닫기" onClick={onClose} className="absolute inset-0 bg-ink/50" />
      <div className="relative w-full max-w-sm rounded-t-2xl bg-paper-card p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:rounded-2xl sm:pb-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">공유하기</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-1 text-ink/50 hover:bg-ink/5">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink/10 bg-paper px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-ink/60">{url}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"
          >
            {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
            {copied ? "복사됨" : "복사"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3 text-center text-xs text-ink/70">
          {canNativeShare && (
            <button type="button" onClick={handleNativeShare} className="flex flex-col items-center gap-1.5">
              <span className="flex size-11 items-center justify-center rounded-full bg-ink/5 text-ink/70">
                <Share2 className="size-4" />
              </span>
              공유
            </button>
          )}
          <a
            href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-ink/5 text-ink/70">
              <Mail className="size-4" />
            </span>
            이메일
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-ink/5 text-ink/70 text-sm font-semibold">
              X
            </span>
            X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-ink/5 text-ink/70 text-sm font-bold">
              f
            </span>
            Facebook
          </a>
        </div>

        {qrDataUrl && (
          <div className="mt-4 flex flex-col items-center gap-1.5 border-t border-ink/10 pt-4">
            <QrCode className="size-4 text-ink/40" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="공유 QR 코드" className="size-32" />
          </div>
        )}
      </div>
    </div>
  );
}
