# Coffeecong Books

DOCX 문서를 반응형 HTML Ebook으로 변환하고, 공유 링크로 어디서나 읽을 수 있게 하는 웹앱.

> 문서를 책처럼, 누구나 쉽게.

전체 명세는 [`docs/Coffeecong_Books_Claude_Development_Prompt.md`](docs/Coffeecong_Books_Claude_Development_Prompt.md),
개발 진행 상황은 [`todo.md`](todo.md)를 참고한다.

## 기술 스택

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS
- Mammoth.js (DOCX → HTML 변환)
- Supabase (PostgreSQL, Auth, Storage, RLS)
- Vercel 배포

## 시작하기

```bash
npm install
cp .env.example .env.local   # Supabase 키 입력 (Phase 2부터 필요)
npm run dev
```

http://localhost:3000 에서 확인한다.

### Phase 2 Supabase 설정

1. Supabase 프로젝트를 생성한다.
2. 프로젝트 URL과 anon key를 `.env.local`에 입력한다.
3. [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql) 를 실행한다.
4. [supabase/seed.sql](supabase/seed.sql) 로 기본 데이터를 넣는다.
5. `/api/supabase-health` 에서 설정 상태를 확인한다.

## 스크립트

```bash
npm run dev              # 개발 서버
npm run build             # 프로덕션 빌드
npm run lint              # ESLint
npm run typecheck          # TypeScript 타입 검사 (tsc --noEmit)
npm test                  # 유닛 테스트 (Vitest)
npm run test:integration    # 통합 테스트 — 실제 연결된 Supabase 프로젝트 필요
npm run test:e2e            # E2E 테스트 (Playwright) — 개발 서버 자동 기동
```

## 프로젝트 구조

```text
src/app/(public)/    공개 홈, 도서관, Reader 라우트
src/app/admin/       관리자 대시보드, 도서/카테고리/사용자 관리
src/components/      공용 UI 및 레이아웃 컴포넌트
src/lib/             공용 유틸리티, 폰트, (Phase 2부터) Supabase 클라이언트
docs/design/         UI/UX 참고 이미지
```

이 프로젝트는 Phase 단위로 순차 개발한다 (`docs/Coffeecong_Books_Claude_Development_Prompt.md` §19).
현재 상태는 [`todo.md`](todo.md)에서 확인할 수 있다.

## 배포 및 운영 문서

- [관리자 계정 생성](docs/deployment/admin-setup.md)
- [운영 매뉴얼](docs/deployment/operations-manual.md)
- [DOCX 작성 가이드](docs/deployment/docx-authoring-guide.md)
- [백업 및 복구 가이드](docs/deployment/backup-and-recovery.md)
