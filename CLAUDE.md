# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

Phase 1 (project init) is complete; see `todo.md` for live phase-by-phase progress — check it before starting any work to see what's actually done vs. still pending. Phases 2–19 are not started: no Supabase project, no DOCX conversion, no Reader, no auth. Don't write code for a later phase until `todo.md` shows every earlier phase checked off.

- `docs/Coffeecong_Books_Claude_Development_Prompt.md` — the complete, authoritative specification (Korean). Read it in full before nontrivial work; summaries below are not a substitute.
- `docs/design/coffeecong-books-ui-reference.png` — the canonical UI/UX reference image (see "Design reference" below).
- `todo.md` — the phase checklist. Update it (`[ ]` → `[x]`) as items are completed.

### Commands

```bash
npm run dev         # dev server (Turbopack, default in Next 16)
npm run build        # production build
npm run lint         # ESLint (flat config; `next lint` was removed in Next 16)
npm run typecheck     # tsc --noEmit
```

No test runner is configured yet — Phase 18 adds one (spec §19 lists Unit/Integration/E2E). There's no single-test-file command until then.

### Next.js version note

This project runs **Next.js 16**, not 15 — assume App Router APIs match your training data only after checking `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` if something behaves unexpectedly. The changes that actually affect this codebase's future phases:

- `params` and `searchParams` in pages/layouts/route handlers are **async** (`await props.params`) — relevant for `/books/[slug]`, `/share/[shareToken]`, `/admin/books/[id]/edit`.
- Route protection middleware must be named `proxy.ts` / export `proxy()`, not `middleware.ts`/`middleware()` — relevant to Phase 3 admin auth guarding.
- `next/image` requires `images.remotePatterns` (not `domains`) for external hosts — relevant once Supabase Storage URLs are rendered via `next/image` in Phase 6/9.
- Turbopack is the default bundler for both `dev` and `build`.

## What this project is

**Coffeecong Books** — a standalone web app that converts any DOCX document into a responsive HTML ebook and shares it via a unique link, readable on PC/tablet/mobile without login.

Non-negotiable constraints from the spec (violating these is a spec violation, not a style choice):

- The exact product name `Coffeecong Books` must be used verbatim everywhere.
- The Reader is **HTML reflow, not PDF-shrink-to-fit**. Content is re-paginated in the browser based on actual container size — never rendered as scaled-down fixed pages.
- Resizing the window/font/line-height/orientation must trigger real re-pagination (recompute page boundaries), not just CSS scaling.
- Desktop Reader = two-page spread. Mobile Reader = single page. This is a hard layout branch, not a responsive tweak of the same component.
- Backend is unified on Supabase (Postgres, Auth, Storage, RLS) — no other backend service.
- Public ebooks must be openable via link with **zero authentication**.

## Mandated build order (phase gating)

The spec defines 19 sequential phases (§19 of the spec doc) plus MVP scope (§20). The spec explicitly requires: **do not write code for Phase N+1 until Phase N is complete and its completion criteria are met.** If asked to implement something, check which phase it belongs to and whether prior phases actually exist in the repo yet — do not skip ahead even if it seems more efficient.

Phase order: 1 Project init → 2 Supabase connection → 3 Admin auth → 4 Admin dashboard UI → 5 DOCX upload → 6 DOCX→HTML conversion → 7 Ebook registration → 8 Book management → 9 Public homepage/library → 10 Reader base UI → 11 Responsive pagination → 12 Reader settings (font/theme) → 13 TOC/navigation → 14 Reading-position persistence → 15 Share links → 16 SEO/share previews → 17 Analytics → 18 Tests → 19 Deployment.

Before starting a phase, report per §21 of the spec: goal, files to create/modify, DB/Storage/RLS/API changes, key components, risks. After finishing a phase, report: what was completed, files touched, how to run it, how to test it, known limitations, and what to verify before the next phase.

## Confirmed tech stack

- **Frontend**: Next.js (latest stable, App Router), React, TypeScript (strict), Tailwind CSS, shadcn/ui (used sparingly, only for base primitives), Lucide icons, StPageFlip (or an equivalent HTML-capable page-flip library) for the Reader's page-turn effect.
- **DOCX conversion**: Mammoth.js, mapping Word styles (English and Korean style names both) to semantic HTML — see the style-map table in spec §10.
- **Backend**: Next.js Route Handlers / Server Actions, Zod for all input validation, strict Server/Client Component separation.
- **Supabase**: Postgres + Auth + Storage + RLS, with generated TypeScript types. `service_role` key is server-only, never exposed to the browser; the anon key is the only key used client-side.
- **Deploy**: Vercel + Supabase, target domain `books.coffeecong.com`.

## Architecture that spans multiple files (read the spec for full detail)

- **Data model** (spec §7): `books` (with `status`: draft/published/archived, and `visibility`: public/unlisted/private, plus `share_token`, `content_html`, `content_json`, `toc_json`), `categories`, `tags`, join tables, `admin_profiles` (roles: super_admin/admin/editor), `reading_progress`, `book_views`. Reading progress for anonymous users lives in `localStorage`, not the DB.
- **Storage buckets** (spec §8): `book-originals` (private, admin-only, signed URLs only if download is allowed), `book-covers` (public/policy-based), `book-assets` (DOCX-embedded images; access depends on the parent book's visibility).
- **RLS model** (spec §9): public users can read `published + public` books, and `unlisted` books only via a valid `share_token`; `private` books are never readable by non-admins. Admin authorization must be re-verified server-side (session + role) — never trust a client-supplied role/flag.
- **DOCX→HTML conversion pipeline** (spec §10): Mammoth converts DOCX to semantic HTML using a style map (see spec for exact mapping), output is sanitized against an explicit allow-list of tags (script/iframe/object/embed/form/inline event handlers/`javascript:` URLs/dangerous `data:` URLs are stripped), and each block gets a stable `data-block-id` plus a parallel `block JSON` array (`{id, type, html, ...}`) that is the single source of truth used by both the TOC and the reading-position system — not just an HTML rendering artifact.
- **Pagination algorithm** (spec §12) — the most technically critical part of the project: measure the real page container, lay out content blocks into an offscreen container, detect `scrollHeight > clientHeight` overflow, push overflowing content to the next page, split long paragraphs at sentence/word boundaries, keep images in-ratio, handle widow/orphan headings, image-caption pairs, and odd-page handling in two-page spread mode. Recompute must be debounced and triggered by: ResizeObserver, window resize, orientation change, fullscreen toggle, font-size/line-height/font-family change, image load completion, and TOC panel open/close.
- **Reading-position persistence** (spec §13): never store just a page number (it's not stable across devices/settings). Store `book_id + block_id + character_offset + font_size + line_height + theme + timestamp`; restoring means finding the block in the *currently recomputed* page array and falling back to the nearest earlier block if an exact match isn't found.
- **URL structure** (spec §5): `/books/[slug]` (public), `/share/[shareToken]` (unlisted, no login), `/admin/*` (protected). Visibility and status together gate which route resolves.

## Design reference

`docs/design/coffeecong-books-ui-reference.png` is the binding visual spec — check it before building any screen the spec text alone would leave ambiguous. It contains six mockups plus a design-token strip:

- **Public homepage/library**: logo top-left (book icon + "Coffeecong Books" wordmark), nav row (홈/도서관/카테고리/검색), search input, notification bell, user avatar, top-right. Hero headline "지식을 책처럼, 누구나 쉽게." with a filled navy primary CTA ("도서 둘러보기") next to an outlined secondary CTA ("도서 등록하기"), and a warm illustration (open book, plant, coffee cup). Below: a "최신 등록 도서" row of book cards (cover, title, author, date, category pill), then a category icon row (전체/소설/에세이/비즈니스/자기계발/역사/과학/디자인/기타).
- **Desktop Reader**: dark navy frame around a two-page cream/ivory spread with a visible center gutter. Top toolbar inside the frame: back arrow, "목차로" (to TOC), current chapter title, A-/A+ font-size steppers, theme toggle, a refresh/reset icon, fullscreen icon. Each page shows chapter number + title, a divider ornament, body text, and an image or small ornament near the bottom; page numbers are centered under each page. Side chevrons sit outside the frame for prev/next. A bottom bar repeats a TOC shortcut, page indicator ("12 / 248"), and a scrub slider.
- **Mobile Reader**: same navy frame, single page only, condensed top toolbar (back, title, font-size, hamburger menu), bottom prev/next chevrons with the page indicator between them. Body text is visibly larger/looser than desktop, matching the spec's 17px minimum.
- **Admin dashboard**: fixed dark navy sidebar (logo, 대시보드/도서 관리/카테고리 관리/사용자 관리/설정, 로그아웃 pinned at the bottom). Main area: a date-range control, four stat cards (총 도서 수/공개 도서 수/총 다운로드/총 조회수, each with a "+N 이번 주" delta), and a purple line chart ("조회수 통계") with a period filter.
- **Admin book registration**: numbered 4-step header (파일 업로드 → 정보 입력 → 미리보기 → 완료). Left: drag-and-drop dropzone ("Word 파일을 드래그하거나 클릭하여 업로드하세요 (DOCX, DOC, HWP, TXT)") with a filled purple "파일 선택" button. Right: a live preview card showing the converted chapter heading and placeholder body/image blocks. Footer: outlined "취소" + filled purple "다음".
- **Admin book management**: search box, category filter, status filter, filled purple "+새 도서 등록" top-right, and a data table with columns 표지(thumbnail)/제목/저자/카테고리/상태(공개=green pill, 비공개=red pill)/등록일/조회수/관리(edit, view, download, QR/camera icon actions).
- **Design-token strip** (bottom of the image): swatches for the palette — dark navy (frame/sidebar), a purple/violet accent (primary buttons, links, chart line), a warm tan/beige, a light neutral gray, a green (used for the "공개" status pill), and a coral/pink; typography sample labeled "Pretendard" with a Korean glyph sample ("가나다라마바사"); an icon set (home, book, grid, search, bell, user, edit, delete, camera, eye, download, settings); and component exemplars for the primary (filled purple) button, secondary (outlined) button, and status/category tag pill. The tokens currently in `src/app/globals.css` (`--color-ink`, `--color-accent`, `--color-paper`, etc.) are close approximations, not pixel-sampled values — pull exact hex/type values from the image file itself if precision matters (e.g. a real brand style guide arrives later).

## MVP scope

See spec §20 for the definitive MVP checklist and explicit exclusions (payments, DRM, comments, likes, user signup, collaborative editing, EPUB export, offline app, advanced analytics — all out of scope unless the user says otherwise).
