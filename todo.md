# Coffeecong Books — 개발 TODO

이 문서는 `Coffeecong_Books_Claude_Development_Prompt.md`의 Phase 순서를 그대로 따른다.
**규칙: 이전 Phase의 항목이 모두 체크되기 전에는 다음 Phase 작업을 시작하지 않는다.**

작업을 완료하면 해당 항목을 `[x]`로 체크하고, 다음 미완료 항목으로 진행한다.

---

## Phase 1. 프로젝트 초기화

- [x] Next.js App Router 프로젝트 생성 (TypeScript strict)
- [x] Tailwind CSS 설정
- [x] 디자인 토큰 정의 (컬러, 타이포그래피, spacing) — `coffeecong books.png` 기준 (`src/app/globals.css`, 근사치 — 정확한 브랜드 값이 확정되면 조정)
- [x] 공통 레이아웃 구성 (`src/app/layout.tsx`)
- [x] 공개(Public) 레이아웃 구성 (`src/app/(public)/layout.tsx`)
- [x] 관리자(Admin) 레이아웃 구성 (`src/app/admin/layout.tsx`)
- [x] `/docs/design/coffeecong-books-ui-reference.png`로 참고 이미지 복사
- [x] 기본 홈 페이지 생성 (`src/app/(public)/page.tsx`)
- [x] 기본 `/books` 페이지 생성 (`src/app/(public)/books/page.tsx`)
- [x] 기본 `/admin` 페이지 생성 (`src/app/admin/page.tsx`)
- [x] `.env.example` 작성
- [x] README 작성
- [x] 완료 기준 확인: 로컬 실행 성공 / 레이아웃 분리 / UI 참고 이미지와 유사한 기본 디자인 / TS·lint 오류 없음 (`npm run typecheck`, `npm run lint` 모두 통과, `npm run dev` 후 `/`, `/books`, `/admin` 200 확인)

## Phase 2. Supabase 연결

- [x] Supabase client (browser) 구성
- [x] Supabase client (server) 구성
- [x] DB 스키마 설계 및 migration 작성 (books, categories, book_categories, tags, book_tags, admin_profiles, reading_progress, book_views)
- [x] Supabase TypeScript 타입 생성
- [x] Storage 버킷 생성 (book-originals, book-covers, book-assets) — *주: 이 항목은 실제로는 생성되어 있지 않았고 Phase 5 작업 중 발견되어 그때 실제로 생성함 (`supabase/migrations/002_storage_buckets.sql`)*
- [x] 기본 RLS 정책 작성
- [x] seed 데이터 작성
- [x] 완료 기준 확인: migration 성공 / Auth 연결 성공 / Storage 업로드 테스트 성공 / 공개·비공개 조회 정책 확인

## Phase 3. 관리자 인증

- [x] 로그인 화면 및 로직 구현 (`src/app/admin/login/page.tsx`, 쿠키 기반 세션)
- [x] 로그아웃 구현 (`src/components/layout/admin-sidebar.tsx`)
- [x] 세션 유지 구현 (`@supabase/ssr` 쿠키 세션 — `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`)
- [x] 관리자 역할(super_admin/admin/editor) 검증 로직 (`src/lib/auth/server.ts`의 `getAdminSession`/`requireAdmin`, service-role client로 재조회 — 클라이언트 값 신뢰 안 함)
- [x] protected route 구현 (`/admin/*`) — `src/proxy.ts` (1차: 세션 존재 확인, 로그인 페이지 제외) + `src/app/admin/(protected)/layout.tsx` (2차: role 재검증, 로그인 페이지는 route group 밖이라 리다이렉트 루프 없음)
- [x] protected API 구현 — `/api/admin/books`(GET/POST), `/api/admin/create-admin`, `/api/admin/assign-by-email` 모두 `requireAdmin`/`requireAdminBootstrap`로 세션+role 재검증 (기존에는 인증 검증이 전혀 없었음)
- [x] 비인가 접근 시 redirect 처리 (미인증 → `/admin/login?next=...`, role 없음 → 401/403 API 응답 또는 로그인 리다이렉트)
- [x] 완료 기준 확인: 관리자만 `/admin` 접근 가능(비인증 시 307→로그인) / API에서도 세션·role 재검증(401/403 확인) / 로그아웃 후 접근 차단 / `npm run typecheck`·`npm run lint` 통과

## Phase 4. 관리자 대시보드 UI

- [x] 네이비 사이드바 구현 (대시보드/도서 관리/새 도서 등록/카테고리 관리/사용자 관리/설정/로그아웃 — `src/components/layout/admin-sidebar.tsx`, role 기반 필터링 + 활성 링크 강조)
- [x] 통계 카드 구현 (총 도서 수, 공개 도서 수, 링크 전용 도서 수, 총 조회 수 — 기간 필터에 연동된 "+N 이번 기간" 델타 포함, `src/components/admin/dashboard-overview.tsx`)
- [x] 조회 통계 차트 구현 (`src/components/admin/views-chart.tsx` — SVG line/area, 크로스헤어+툴팁, 기간 필터(7/30/90일), 접근성용 sr-only 표)
- [x] 최근 등록 도서 목록 구현 (대시보드 내, 최신 5건 — `src/lib/dashboard/data.ts` + `dashboard-overview.tsx`)
- [x] 반응형 관리자 레이아웃 (`src/components/layout/admin-shell.tsx` — 데스크톱 고정 사이드바 / 모바일 상단바+드로어)
- [x] 완료 기준 확인: 디자인 기준과 시각적 일관성 확인(스크린샷) / 모바일 1440px·390px 뷰포트에서 Playwright로 로그인→대시보드→도서 관리 이동까지 실사용 흐름 확인, 콘솔 에러 없음 / `npm run typecheck`·`npm run lint` 통과

## Phase 5. DOCX 업로드

- [x] drag and drop 업로드 UI (`src/components/admin/book-create-form.tsx`)
- [x] 파일 선택 업로드 UI
- [x] 확장자 검사 (`.docx`만 허용 — Mammoth가 실제로 지원하는 유일한 형식이라 스펙 §18 "DOCX가 아닌 파일" 오류에 맞춤; 목업 이미지의 DOC/HWP/TXT 문구는 실제 변환 파이프라인과 맞지 않아 반영하지 않음)
- [x] MIME 검사 (`src/lib/upload/docx.ts`, 클라이언트+서버 양쪽에서 재검증)
- [x] 파일 용량 제한 (20MB — 클라이언트 검증 + `book-originals` 버킷 자체 제한 이중 적용)
- [x] 업로드 진행률 표시 (XHR `upload.onprogress` 기반 진행률 바)
- [x] 원본 DOCX Storage 저장 (`book-originals/{bookId}/original.docx`, `src/app/api/admin/books/route.ts`)
- [x] 완료 기준 확인: 실제 `docx_text/Coffeecong_Books_test.docx` 업로드 → Storage 저장 확인(service-role로 파일 존재 검증) / `.txt` 등 잘못된 파일 업로드 시 차단 및 안내 메시지 확인(Playwright) / `npm run typecheck`·`npm run lint` 통과

*(Phase 2에서 누락되어 있던 Storage 버킷 3종을 이번에 실제로 생성함 — 위 Phase 2 항목 참고.)*

## Phase 6. DOCX → HTML 변환

- [x] Mammoth.js 연동 (`src/lib/docx/convert.ts`)
- [x] 영문/한글 스타일 맵 작성 (`src/lib/docx/style-map.ts` — 스펙 §10 표 그대로: Title/Heading 1-3, 제목/제목 1-3, Quote/인용 등)
- [x] 이미지 추출 로직 (`src/lib/docx/images.ts` — `mammoth.images.imgElement`로 버퍼 수집, placeholder src 발급)
- [x] 추출 이미지 Storage 업로드 (`book-assets/{bookId}/image-NNN.webp`, sharp로 WebP 변환 — 실패 시 원본 포맷으로 폴백)
- [x] 이미지 URL 치환 (업로드 후 placeholder → 실제 public URL로 치환)
- [x] HTML sanitize (`src/lib/docx/sanitize.ts` — cheerio 기반 허용 태그/속성 화이트리스트, 위험 태그는 내용째 제거, 그 외 미허용 태그는 unwrap, `javascript:`/위험한 `data:` URL 차단)
- [x] block ID 부여 (`data-block-id`) 및 block JSON 생성 (`src/lib/docx/blocks.ts` — heading/paragraph/blockquote/list/table/divider/image 타입 분류)
- [x] TOC(목차) 생성 로직 (heading block에서 `{blockId, title, level}` 추출)
- [x] 변환 경고/오류 처리 (Mammoth 경고 메시지 수집, 손상/암호화 파일 구분 에러 메시지 — `DocxConversionError`)
- [x] 완료 기준 확인: `docx_text/Coffeecong_Books_test.docx` 실제 변환 확인(한글, Title/인용 등 커스텀 스타일 정상 인식, 경고 0건) / 합성 PNG로 이미지 추출→WebP 변환→업로드→public URL 접근 확인 / 위험 HTML(script, iframe, onclick, javascript: URL, data: URL) 제거 확인 / block JSON 31개 정상 생성 및 DB 저장 확인 / TOC 8개 항목 정상 생성 확인 (모두 Playwright/직접 스크립트로 실측) / `npm run typecheck`·`npm run lint` 통과

*(book-assets 버킷을 public으로 전환함 — `supabase/migrations/003_book_assets_public.sql`. private 도서의 이미지 접근 제어는 Phase 9/16에서 공개 서빙을 구현할 때 다시 다룸.)*

## Phase 7. Ebook 등록

- [x] 제목/저자/요약 입력 폼 (`src/components/admin/book-form.tsx` — 생성/수정 공용)
- [x] 표지 이미지 업로드 (`src/lib/upload/cover.ts` — sharp로 WebP 변환 후 `book-covers/{bookId}/cover.webp`)
- [x] 카테고리/태그 선택 (체크박스, `GET /api/admin/categories`·`/api/admin/tags`에서 기존 목록 로드 — 신규 생성은 Phase 8 카테고리 관리에서)
- [x] status(draft/published/archived) 설정
- [x] visibility(public/unlisted/private) 설정
- [x] slug 생성 및 중복 검사 (자동 생성 + 수동 입력 가능, 수정 시 자기 자신 제외하고 중복 검사)
- [x] allow_share / allow_download 설정
- [x] 공개일(published_at) 설정 (미입력 시 status=published로 저장하는 순간 자동으로 현재 시각 설정)
- [x] 등록 전 미리보기 (`POST /api/admin/books/preview` — 고정 테스트 파일이 아니라 실제 선택한 DOCX를 즉시 변환해서 보여줌; 클라이언트가 미리 생성한 bookId를 그대로 재사용해 미리보기 때 올린 이미지가 저장 시 버려지지 않음)
- [x] Supabase 저장 로직 (생성: `POST /api/admin/books`, 수정: `PATCH /api/admin/books/[id]`, 단건 조회: `GET /api/admin/books/[id]`)
- [x] 완료 기준 확인: 실제 docx로 전체 항목(표지·카테고리·태그·공개상태·공유/다운로드 허용·공개일) 입력 후 저장 → DB에 전부 정상 반영 확인 / 같은 도서 수정(status·visibility·태그 변경) 후 재확인 / 수정 시 파일을 다시 올리지 않으면 기존 content_html과 원본 DOCX(`book-originals`)가 그대로 유지됨을 확인 (모두 Playwright + service-role 조회로 실측) / `npm run typecheck`·`npm run lint` 통과

*(스펙 §7의 필드명과 실제 스키마 사이 사소한 네이밍 차이(`author` vs `author_name` 등)는 그대로 유지 — 이미 여러 코드에서 쓰이고 있어 이름만 바꾸는 마이그레이션은 실익이 없다고 판단. `created_by` 컬럼만 신규 추가함(`004_books_created_by.sql`). 스펙 §14의 5단계 마법사 대신 기존 단일 페이지 구조에 누락 필드를 추가하는 방식으로 구현 — 사용자 확인받음.)*

## Phase 8. 도서 관리

- [x] 도서 목록 검색 (제목/저자, `GET /api/admin/books?q=`)
- [x] 필터 (카테고리/상태/공개범위)
- [x] 정렬 (최신순/오래된순/제목순/조회수순)
- [x] 수정 화면 연결 (Phase 7의 `/admin/books/[id]/edit`, 목록의 연필 아이콘)
- [x] 재변환 기능 (`POST /api/admin/books/[id]/reconvert` — Storage의 원본 DOCX를 다시 내려받아 파이프라인 재실행, 재업로드 불필요)
- [x] 공개(published) 전환 / unlisted 전환 / 보관(archived) 처리 (목록에서 상태·공개범위 드롭다운으로 즉시 변경, `PATCH /api/admin/books/[id]`)
- [x] 삭제(soft delete) 처리 (`DELETE /api/admin/books/[id]` — `deleted_at`만 설정, 행·Storage 파일은 보존, 목록/대시보드 쿼리 모두 `deleted_at is null` 필터링)
- [x] 링크 복사 기능 (`GET /api/admin/books/[id]/link` — public+published는 `/books/{slug}`, unlisted는 최초 클릭 시 `share_token` 생성 후 `/share/{token}`, private는 비활성화)
- [x] QR 코드 생성 (`qrcode` 라이브러리로 클라이언트에서 생성, 외부 API 호출 없음)
- [x] 조회 수 표시 (book_views 집계)
- [x] 완료 기준 확인: 검색·필터·정렬 동작 확인 / 상태·공개범위 드롭다운 변경 즉시 반영 확인 / 삭제 시 목록에서 사라지지만 DB 행·원본 DOCX는 유지됨을 service-role 조회로 확인 / 재변환·링크복사·QR·원본 다운로드 모두 실제 동작 확인(Playwright) / 모든 관리 API가 `requireAdmin`으로 보호되어 비공개 콘텐츠가 외부에 노출되지 않음 확인 / `npm run typecheck`·`npm run lint` 통과

*(공유 링크의 실제 공개 페이지(`/books/[slug]`, `/share/[shareToken]`)는 아직 없음 — Phase 9/15에서 구현. 다운로드 원본 DOCX 관리자 접근은 `allow_download`와 무관하게 항상 허용됨(그 플래그는 추후 구현할 일반 독자용 다운로드 기능에만 적용, 스펙 §9 "원본 DOCX 접근 가능").)*

## Phase 9. 공개 메인과 도서관

- [x] Hero 섹션 구현 (Phase 1에서 이미 구현됨, 유지)
- [x] 최신 등록 도서 섹션 (`getPublicBooks({ limit: 5 })`로 실제 데이터 연동)
- [x] 카테고리 아이콘 메뉴 (실제 DB 카테고리 8종, slug→아이콘 매핑)
- [x] 검색 기능 (헤더 검색창 + `/books` 자체 검색창, 둘 다 `/books?q=`로 GET 폼 제출 — JS 없이 동작)
- [x] 카드형 도서 목록 (반응형: 모바일 1열/태블릿 2열/데스크톱 4~5열 — `src/components/public/book-card.tsx`, Playwright로 3개 뷰포트 확인)
- [x] 공개(published+public) 도서만 노출되도록 쿼리 제한 (`src/lib/public/books.ts` — anon key 클라이언트 + RLS, service-role 미사용)
- [x] 완료 기준 확인: 모바일 390px·태블릿 820px·데스크톱 1440px 스크린샷 확인 / 카드 클릭 시 `/books/[slug]`로 정상 이동(Reader 자체는 Phase 10에서 구현되므로 아직 404) / 검색·카테고리 필터 실제 동작 확인 / draft·private·unlisted 도서가 홈·도서관 어디에도 노출되지 않음을 실제 시드 데이터로 확인

### 발견 및 수정한 RLS 버그 (Phase 2에서 누락)

Phase 9 작업 중 공개 페이지가 아무 도서도 못 불러오는 문제를 조사하다가 심각한 기존 RLS 버그 3건을 발견해 수정함:

- [x] `admin_profiles` 정책이 자기 자신을 서브쿼리로 참조해 **무한 재귀** 발생 → `books` 테이블의 "Admins can manage books" 정책도 `admin_profiles`를 참조하므로 anon 사용자의 `books` 조회 자체가 전부 에러로 실패하고 있었음(홈페이지가 조용히 "도서 없음"으로 보임). `public.current_admin_role()` SECURITY DEFINER 함수로 우회 (`005_fix_admin_rls_recursion.sql`)
- [x] `categories`/`tags`에 관리자 전용 정책만 있고 **공개 조회 정책 자체가 없어서** anon 사용자는 항상 0건 조회 → 카테고리 메뉴가 항상 비어 있었음 (`006_public_categories_tags.sql`)
- [x] `book_categories`/`book_tags`는 RLS만 켜져 있고 정책이 **아예 없어서** 항상 0건 → 카테고리 필터·카드의 카테고리 배지가 항상 비어 있었음. 부모 도서가 공개일 때만 읽히도록 스코프 지정 (`007_book_taxonomy_links_readable.sql`)

세 건 모두 실제 anon key로 재현·수정 확인함. 관리자 로그인·대시보드·도서 관리 흐름도 회귀 없음을 재확인.

## Phase 10. Reader 기본 UI

- [x] 네이비 Reader 프레임 구현 (`src/components/reader/reader.tsx`)
- [x] 데스크톱 양면 레이아웃 (react-pageflip `usePortrait:false`, 중앙 책등, 페이지 번호)
- [x] 모바일 단면 레이아웃 (별도 렌더 분기 — `isDesktop` 상태에 따른 하드 분기, 반응형 트릭 아님)
- [x] 상단 툴바 (뒤로가기/목차로/현재 챕터 제목/A-·A+/테마 전환/리셋/전체화면 — 데스크톱, 모바일은 축약형: 뒤로가기/제목/A-·A+/햄버거)
- [x] 하단 페이지 컨트롤 (이전/다음/페이지 번호/스크럽 슬라이더 — 데스크톱, 모바일은 이전/페이지번호/다음)
- [x] 표지 페이지 (표지 이미지+제목+저자, `showCover`로 하드 페이지 처리)
- [x] 페이지 그림자 효과 (react-pageflip `drawShadow`)
- [x] 클릭 넘김 (react-pageflip 기본 동작 + 프레임 바깥 좌우 셰브런 버튼)
- [x] 키보드 방향키 넘김 (ArrowLeft/ArrowRight 전역 리스너)
- [x] 터치 스와이프 넘김 (react-pageflip 기본 동작, Playwright 드래그로 확인)
- [x] 완료 기준 확인: 실제 `docx_text` 콘텐츠로 데스크톱 1440px 양면·모바일 390px 단면 스크린샷 확인 / 클릭·키보드·스와이프 넘김 모두 동작 확인 / 목차 클릭 시 해당 블록이 속한 페이지로 정확히 이동 확인 / 비공개·존재하지 않는 slug는 404 확인 / `npm run typecheck`·`npm run lint` 통과

### 범위 관련 메모

- **임시 페이지 분할**: 실제 컨테이너 측정 기반 분할은 Phase 11의 일. Phase 10에서는 `src/lib/reader/paginate.ts`가 글자 수 기준으로 블록을 임시로 나눠 넘김 메커니즘(클릭/키보드/스와이프/TOC 이동)을 검증 가능하게 함 — 넘김 UI/로직은 그대로 두고 Phase 11에서 분할 알고리즘만 교체 예정.
- **글자 크기/테마 변경**: 토글은 실제로 동작(테마는 라이브 스타일 변경, 글자 크기는 재분할 후 첫 페이지로 이동)하지만 옛 위치 보존은 Phase 11(정밀 재계산)·13(읽던 위치 저장, block-id 기반)에서 다룸.
- **버그 수정**: react-pageflip이 각 페이지 루트 엘리먼트를 clone하면서 `style` prop을 자체 포지셔닝 값으로 통째로 덮어써서 배경색·표지 텍스트가 투명 처리되는 문제 발견 → 배경/색상 스타일을 내부 wrapper div로 이동해 해결. 테마 변경 시 페이지가 0으로 되돌아가면서 페이지 인디케이터만 안 맞는 동기화 버그도 발견해 리마운트 key에서 테마를 제거하고 폰트 크기 변경 시에만 `currentPage`를 명시적으로 0으로 리셋하도록 수정.

*(`/books/[slug]`는 `(public)` 그룹 밖의 `(reader)` 그룹으로 분리 — 사이트 헤더 없이 완전 몰입형으로 렌더링하기 위함.)*

## Phase 11. 반응형 페이지 분할

- [x] 측정용 숨김 컨테이너 구현 (`use-pagination.ts`의 `useMeasurementNode` — 실제 페이지와 동일한 padding/footer 구조를 `document.body`에 `visibility:hidden`으로 부착, `page-layout.ts` 클래스를 공유해 측정↔실제 렌더링 드리프트 방지)
- [x] block 순차 배치 로직 (`measure-paginate.ts`의 `paginateBlocks` — 블록을 큐에 넣고 순서대로 시도, 안 맞으면 다음 페이지로 재시도하는 큐 기반 구조)
- [x] overflow(`scrollHeight > clientHeight`) 검사 로직
- [x] 긴 문단 분할 (`split-html.ts` — 단어 단위 분할, 중첩 인라인 태그(strong/em/u/a) 보존; 한국어는 ". " 같은 안정적 문장 종결 패턴이 없어 문장 단위 대신 단어 단위로 통일)
- [x] 이미지 비율 유지 처리 (Phase 6 이미지 파이프라인에 width/height 메타데이터 캡처 추가 — sharp로 실제 크기 측정 후 `<img>`에 명시해 로드 전에도 레이아웃 예약, `globals.css`의 `max-width:100%;height:auto`)
- [x] 표 축소/가로 스크롤 처리 (`globals.css` — `display:block;overflow-x:auto`; 표 중간 분할 자체는 범위 밖, 아래 메모 참고)
- [x] 제목 고립(widow/orphan) 방지 (`preventOrphanHeadings` — 페이지 마지막이 제목뿐이면 다음 페이지로 이동하되, 다음 페이지에 실제로 들어갈 때만 이동 — 안 들어가면 그대로 둠. 실제 버그였음: 처음엔 확인 없이 이동시켜서 리스트처럼 쪼갤 수 없는 블록과 합쳐지며 40px 오버플로가 발생했었음)
- [x] ResizeObserver 연동 (Reader 프레임의 실제 행(row) 엘리먼트를 관찰 — 처음엔 안쪽 `max-w-5xl` div를 관찰했는데 `h-full`이 flex 정렬 방식 때문에 0으로 붕괴되는 문제가 있어서 바깥 행으로 옮김)
- [x] resize debounce 적용 (250ms — `use-pagination.ts`)
- [x] 글자 크기/줄 간격/글꼴 변경 시 재계산 (글자 크기·줄 간격은 툴바에 실제 컨트롤 있음; 글꼴 변경은 아직 UI가 없어 재계산 로직만 준비됨 — 아래 메모)
- [x] 전체화면 진입·종료 시 재계산 (`fullscreenToken`으로 명시적 트리거)
- [x] 현재 읽던 block 위치 유지 로직 (재계산 전 현재 페이지의 첫 block-id를 기억해두고, 재계산 후 그 블록이 있는 새 페이지로 `startPage`를 설정해 재마운트)
- [x] 완료 기준 확인: 실제 `docx_text` 콘텐츠로 데스크톱 1440px 전체 페이지 순회 + 리사이즈(1440→1000px) + 글자 크기 4단계 증가 + 줄 간격 3단계 증가 + 모바일 390px 전체 순회까지 모두 실제 화면 좌표 기준으로 클리핑 없음 확인(Playwright) / 글자 크기 변경 후 읽던 위치 근처 유지 확인 / `npm run typecheck`·`npm run lint` 통과

### 실제로 찾아 고친 버그 3건 (3번은 전체 19 Phase 완료 후 실사용 중 리포트됨)

1. **CSS**: Reader 프레임의 행(row)에 `items-center`가 걸려 있어서 안쪽 `max-w-5xl` 래퍼의 `h-full`(height:100%)이 flex 자식으로서 stretch되지 않고 0으로 붕괴 — 페이지네이션 훅이 매번 "컨테이너 크기 0" 판정을 내려 실제 분할이 전혀 동작하지 않고 있었음(콘솔 에러 없이 조용히 실패). `wrapperRef`를 안정적으로 정의된 높이를 가진 바깥 행으로 옮기고, 셰브런 버튼은 `top-1/2 -translate-y-1/2`로 독립적으로 중앙 정렬해 해결.
2. **고아 제목 이동 시 오버플로**: 위 항목 참고.
3. **책을 열 때마다 계속 깜박거림(레이아웃 폭주 루프)**: Reader 최상위 컨테이너가 `min-h-screen`(바닥값 — 내용이 넘치면 뷰포트보다 커질 수 있음)이었음. `HTMLFlipBook`은 `pageBox`가 바뀔 때마다(측정된 wrapper 크기 기준) `key`를 바꿔 통째로 재마운트되는데, 위쪽에 진짜 "천장"이 없다 보니 재마운트된 flipbook이 아주 조금이라도 커지면 → 페이지 전체가 늘어나고 → 다음 측정에서 wrapper가 더 커진 걸로 보이고 → 그 커진 값으로 또 flipbook을 재마운트 → 다시 조금 더 커지는 식으로 자기 자신을 강화하는 폭주 루프가 생김. 실측 결과 높이가 250~300ms(ResizeObserver 디바운스 주기)마다 8px씩 끝없이 증가하며 flipbook 전체가 계속 재마운트되고 있었음 — 이게 눈에는 "계속 깜박거림"으로 보임. 최상위 컨테이너를 `h-dvh`(진짜 고정 천장)로 바꿔 wrapper의 `overflow-hidden`이 실제로 넘침을 잘라내도록 해서 해결 — 수정 후 flipbook 높이가 3초 내내 완전히 고정값으로 유지됨을 확인.

### 범위 관련 메모 (의도적으로 남겨둔 부분)

- **표/목록 중간 분할 안 함**: 표와 목록(ul/ol)은 원자 단위로 취급 — 안 맞으면 통째로 다음 페이지로 넘어가고, 그래도 안 맞으면(페이지 하나보다 큰 경우) 오버플로를 감수함. 스펙 §12는 이를 "예외 처리" 항목으로 분류하고 있고, 실제 문서에서 페이지보다 큰 표/목록은 드문 경우라 이번 구현 범위에서 제외 — 필요해지면 이후에 추가.
- **글꼴 변경(글꼴 자체를 바꾸는 기능)**: 재계산 로직은 폰트 패밀리에 종속되지 않게 만들어져 있어 나중에 글꼴 선택 UI가 생기면(Phase 12) 바로 연결 가능하지만, 아직 선택할 글꼴이 없어 UI는 만들지 않음.
- **위치 유지의 한계**: block 단위로 복원하며 문단이 쪼개져 있던 경우 그 문단의 시작 지점으로 돌아감(문자 offset까지는 아직 아님 — 문자 단위 정밀 복원은 Phase 13/14의 일).

## Phase 12. Reader 읽기 설정

- [x] A-/A+ 글자 크기 조절 (Phase 10에서 이미 구현 — 데스크톱 최소 15px, 모바일 최소 17px로 이번에 분리 적용)
- [x] 기본 글자 크기 설정 (18px, `DEFAULT_FONT_SIZE`)
- [x] 줄 간격 조절 (Phase 10/11에서 이미 구현)
- [x] light / sepia / dark 테마 (Phase 10에서 이미 구현)
- [x] 전체 화면 토글 (Phase 10에서 이미 구현)
- [x] 설정 저장 (`src/lib/reader/settings-storage.ts` — localStorage, 책 slug별로 저장. `reading_progress` 테이블/블록 위치는 Phase 14에서 같은 레코드에 이어 붙일 예정이라 스키마를 미리 그에 맞게 설계함)
- [x] 모바일 설정 패널 UI (`src/components/reader/reader-settings-panel.tsx` — 바텀 시트, 글자 크기·줄 간격·테마·초기화; 데스크톱은 툴바에 인라인 컨트롤이 이미 있어 별도 패널 불필요, 모바일 툴바에 새 톱니바퀴 아이콘 추가)
- [x] 완료 기준 확인: 글자 크기 4단계 증가·줄 간격 3단계 증가·테마를 세피아로 변경 후 새로고침 → 스크린샷으로 동일하게 복원됨을 확인(Playwright) / 데스크톱 A- 반복 클릭 시 15px에서, 모바일에서는 17px에서 멈춤을 확인 / 모바일 설정 패널에서 테마 변경·초기화 정상 동작 확인 / `npm run typecheck`·`npm run lint` 통과

*(모바일 헤더는 목업엔 햄버거 아이콘 하나뿐이지만, 데스크톱 툴바에 이미 있는 테마/줄간격 컨트롤을 모바일 조건부 축약 툴바엔 넣을 자리가 없어 별도 톱니바퀴 아이콘 + 바텀시트로 분리함 — 목업과의 의도적인 소폭 차이.)*

## Phase 13. 목차와 위치 이동

- [x] 목차 패널 UI (`src/components/reader/reader-toc.tsx` — 데스크톱은 오른쪽에서 슬라이드, 모바일은 햄버거로 여는 전체 높이 시트; `role="dialog"`, 배경 클릭/Escape로 닫힘)
- [x] Heading 1/2 기반 목차 생성 (`TOC_MIN_LEVEL`/`TOC_MAX_LEVEL` = 2~3으로 필터링해 책 제목(H1)과 그 이하 하위 항목은 제외)
- [x] 현재 장 강조 표시 (`activeTocBlockId` — 현재 페이지 이하 중 가장 마지막 TOC 항목을 찾는, 툴바 장 제목과 동일한 로직. `aria-current`로 표시)
- [x] block ID 기반 이동 로직 (`jumpToBlock` → `blockIdToPage.get(blockId)` → `goTo(page)`)
- [x] 모바일 목차 패널 (데스크톱과 같은 컴포넌트, 반응형 너비만 다름)
- [x] 키보드 접근성 (목차 탐색) (열릴 때 활성 항목 또는 패널로 autofocus, Tab 키 순환 포커스 트랩, Escape로 닫힘)
- [x] 완료 기준 확인: 목차 항목 7개(H1/H4 제외) 노출 / 열릴 때 포커스 이동 및 15회 Tab 후에도 트랩 유지 / "3장" 클릭 시 정확한 페이지로 이동 및 인디케이터 갱신 / 재오픈 시 "3장" 강조 표시 / Escape로 닫힘 / 데스크톱·모바일 모두 콘솔 에러 없이 정상 동작(Playwright) / `npm run typecheck`·`npm run lint` 통과

### 실제로 찾아 고친 버그 1건

- **여러 스프레드를 건너뛰는 이동이 잘못된 페이지에 도착**: `HTMLFlipBook`이 감싸는 `page-flip.js`의 `flip(page)`/`flipToPage()`는 목표 페이지가 속한 스프레드로 바로 이동하지 않고, 내부적으로 `currentSpreadIndex`를 `목표 스프레드 - 1`로 몰래 옮긴 뒤 `flipNext()`를 "한 번만" 호출하는 방식으로 구현돼 있음(`node_modules/page-flip/src/Flip/Flip.ts`의 `flipToPage`). 표지(스프레드 0)에서 곧바로 "3장"(스프레드 2)처럼 두 스프레드 이상을 건너뛰는 목차 클릭은 이 한 단계짜리 애니메이션 로직 때문에 엉뚱한 스프레드에서 멈춤. `PageFlip.turnToPage()`(내부적으로 `PageCollection.show()` 호출)는 스프레드 인덱스를 직접 설정하고 같은 `flip` 이벤트를 동기적으로 발생시키는 진짜 즉시 이동 방식이라 이 문제가 없음 — `goTo`를 `flip()` 대신 `turnToPage()`를 쓰도록 교체. 다만 `turnToPage`가 보고하는 페이지는 항상 스프레드의 "왼쪽" 페이지라서(예: 스프레드 [1,2]에서 페이지 2로 이동해도 이벤트는 1을 보고), 목차 클릭이 정확한 페이지 번호를 가리키도록 같은 동기 배치 안에서 `setCurrentPage(page)`를 한 번 더 호출해 정밀도를 보정함.

### 범위 관련 메모

- **스크럽 슬라이더(Phase 10에서 이미 존재)도 같은 `goTo`를 공유** — 이번 버그 수정의 혜택을 그대로 받음, 별도 수정 불필요.

## Phase 14. 읽던 위치

- [x] 현재 block ID 추적 로직 (Phase 11의 `topBlockRef`를 그대로 재사용 — 현재 페이지의 첫 block-id)
- [x] character offset 추적 (`measure-paginate.ts`의 `ReaderPage.firstBlockWordOffset` — 아래 범위 메모 참고, 단어 단위로 추적)
- [x] localStorage 저장 (책별) (`settings-storage.ts`에 `blockId`/`wordOffset`/`progress` 필드 추가, Phase 12의 같은 레코드·같은 키에 병합 — 원래 설계대로)
- [x] 진행률 계산 (`book.blocks`에서 해당 block의 순번 ÷ 전체 block 수 — 페이지 번호 비율 대신 사용. 폰트 크기·기기에 따라 페이지 수가 달라져도 안정적)
- [x] 최근 읽은 시각 저장 (기존 `updatedAt` 필드 재사용, `persist()` 호출마다 갱신)
- [x] 완료 기준 확인: "3장" 목차 이동 → localStorage에 정확한 block/offset/progress 기록 확인 → 새로고침 시 정확히 같은 페이지로 복원(페이지 번호 아님, 콘텐츠 위치 기준) / 다른 장으로 재이동 후 다시 새로고침해도 갱신된 위치로 복원 / **긴 문단이 여러 페이지로 분할된 경우**, 분할된 뒤쪽 페이지(연속 22페이지 중 22번째)까지 읽고 새로고침해도 문단의 시작 페이지가 아니라 정확히 그 연속 페이지로 복원됨을 확인 — `firstBlockWordOffset` 정밀도 검증 / localStorage를 비운 첫 방문은 그대로 표지부터 시작 / 콘솔 에러 없음(Playwright) / `npm run typecheck`·`npm run lint` 통과

### 실제로 찾아 고친 버그 2건

1. **초기 로딩 중 여러 번의 재계산이 복원 결과를 되돌림**: `isDesktop`은 SSR 안전을 위해 `false`로 시작해 마운트 후 보정되고, `ResizeObserver` 측정도 최종 크기에 안정되기까지 한두 번 더 재계산될 수 있어, 페이지가 완전히 자리잡기 전까지 "진짜" 페이지 분할이 여러 번 연달아 발생함. 최초 1회만 localStorage를 확인하는 방식(`hasRestoredSavedPositionRef` 같은 1회성 플래그)으로 구현했더니, 정착 과정의 마지막 재계산이 그 복원 결과를 덮어써 표지로 되돌아가는 문제가 있었음. `topBlockRef`(세션 중 실제로 어딘가에 도달했는지 여부)가 비어 있는 동안은 재계산이 몇 번 일어나든 매번 다시 localStorage 기준으로 페이지를 계산하도록 바꿔서 해결 — 실제 탐색이 시작되는 순간 자연스럽게 세션 내 추적으로 전환됨.
2. **`startPage`로 다시 마운트된 react-pageflip 인스턴스도 스프레드 왼쪽 페이지를 보고**: Phase 13에서 고친 `goTo`/`turnToPage` 문제와 같은 근본 원인이 `startPage` prop을 통한 초기 마운트에도 있었음 — 새로 마운트된 인스턴스의 첫 `onFlip`도 스프레드의 왼쪽 페이지만 보고해서, 오른쪽 페이지로 복원해야 할 때 한 페이지 모자라게 표시됨. 마운트가 실제로 끝난 뒤 `goTo(startPage)`를 한 번 더 호출해 정확한 목표로 재확인하는 별도 effect를 추가해 해결. 이 과정에서 두 effect가 같은 렌더 사이클에 `setCurrentPage`를 각각 호출해 서로 덮어쓰는 경쟁 상태도 발견 — 복원 effect는 `startPage`만 정하고, `currentPage` 갱신은 이 새 effect(`goTo` 호출) 한 곳으로 일원화해 해결.

### 범위 관련 메모

- **"문자 offset"을 단어 단위로 구현**: 스펙 원문은 "block 내부 문자 offset"이라고 되어 있지만, 이 프로젝트의 페이지 분할·문단 분할 알고리즘 전체가 이미 단어 단위로 통일돼 있음(Phase 11 — 한국어는 안정적인 문장 종결 패턴이 없어 단어 단위로 분할). 복원 알고리즘(spec §13) 자체도 "block이 속한 페이지로 이동"까지만 요구하고 문자 단위 스크롤 위치까지는 요구하지 않으므로, 별도의 문자 단위를 새로 도입하지 않고 기존 단어 단위 그대로 저장 — 긴 분할 문단의 여러 연속 페이지를 구분하는 데는 충분한 정밀도.
- **진행률(progress)은 아직 UI에 노출되지 않음**: 스펙 §13이 명시적으로 요구하는 저장 필드라 localStorage에는 기록하지만, 공개 홈페이지/도서관(Phase 9 목업)에 "이어보기" 같은 개인화 UI가 없어 아직 어디에도 표시되지 않음 — 추후 그런 기능이 추가되면 바로 연결 가능하도록 스키마만 미리 마련해둠.
- **로그인 사용자 대응 `reading_progress` 테이블은 그대로 미사용**: spec §7에 정의는 돼 있지만 MVP는 사용자 가입이 범위 밖이라(§20) 이번 구현은 전량 localStorage 경로만 사용.
- [ ] 위치 복원 로직 (정확한 block → 가장 가까운 이전 block)
- [ ] "처음부터 읽기" 옵션
- [ ] 완료 기준 확인: 새로고침 후 위치 복원 / 창 크기 변경 후에도 block 기반 복원 / 페이지 번호 비의존

## Phase 15. 공유 링크

- [x] public slug URL 구현 (`/books/[slug]`) — Phase 9/10에서 이미 구현됨, 이번엔 `allow_share`/`shareUrl` 전달만 추가
- [x] unlisted share token URL 구현 (`/share/[shareToken]/page.tsx`) — 아래 "RPC" 항목 참고
- [x] 링크 복사 기능 (관리자 목록은 Phase 8에서 이미 구현됨; 이번에 Reader 자체에도 `reader-share-menu.tsx`로 추가)
- [x] Web Share API 연동 (`navigator.share` 기능 감지 후 지원 기기에서만 "공유" 버튼 노출)
- [x] QR 코드 생성 (관리자 목록은 Phase 8에서 이미 구현됨; Reader의 공유 패널에도 동일하게 `qrcode` 패키지로 추가)
- [x] 이메일 공유 (`mailto:` 링크)
- [x] SNS 공유 (X, Facebook — 카카오톡은 스펙이 "SDK 설정 가능할 때 선택"이라 명시했고 SDK 키가 없어 이번 범위에서 제외)
- [x] 공유 권한(allow_share) 검사 (Reader: `allow_share=false`면 공유 버튼 자체를 렌더링하지 않음 / 관리자 목록: 링크복사·QR 버튼을 `allow_share=false`일 때도 비활성화 — 기존엔 `visibility==='private'`만 검사하던 것을 보강)
- [x] 잘못된/만료된 token 처리 (`get_book_by_share_token` RPC가 매치되는 행이 없으면 빈 결과 → `notFound()`. "만료"는 스펙상 TTL 개념이 없고 재생성으로 무효화하는 방식이라, 재생성된 옛 token도 동일하게 처리됨)
- [x] share token 재생성 기능 (`POST /api/admin/books/[id]/link` — 새 토큰 발급, 기존 토큰은 즉시 무효화. 관리자 목록에 재생성 아이콘 추가, 파괴적 작업이라 확인창 표시)
- [x] 완료 기준 확인: 비로그인 새 브라우저 컨텍스트에서 공유 링크 열람 성공 / `/books`에 unlisted·private 도서 비노출 / private·unlisted 도서 모두 `/books/[slug]`로 404 / 잘못된 token → 404 / 재생성 후 옛 token → 404, 새 token → 정상 열람 / `allow_share=false`면 Reader에 공유 버튼 자체가 없음 / 관리자 목록에서 `allow_share=false`·`visibility=private` 도서의 복사·QR 버튼이 각각 올바르게 비활성화 / 모바일 뷰포트에서 `navigator.share`가 정확한 title·url로 호출됨(모킹) / 콘솔 에러 없음(Playwright) / `npm run typecheck`·`npm run lint` 통과

### RPC: `get_book_by_share_token` (migration 008)

`unlisted` 도서를 anon key로 조회하려면 RLS만으로는 안전하게 처리할 수 없음 — `visibility = 'unlisted' and status = 'published'` 같은 정책은 행 자체만 보고 판단하기 때문에, 클라이언트가 `.eq('share_token', ...)`로 좁히지 않고 REST API를 직접 두드리면 token 없이도 모든 unlisted 도서를 나열할 수 있는 구멍이 생김. 대신 token을 인자로 받아 정확히 일치하는 행 하나만 반환하는 `SECURITY DEFINER` 함수를 추가 — token을 모르면 애초에 호출 결과를 받을 수 없어 나열이 원천적으로 불가능함(마이그레이션 005의 `current_admin_role()`과 같은 패턴을, 재귀 방지가 아니라 나열 방지에 적용).

### 범위 관련 메모

- **카카오톡 공유 제외**: 스펙이 명시적으로 "SDK 설정이 가능할 때 선택적으로 구현"이라고 했고 Kakao SDK 앱 키가 설정돼 있지 않아 이번 범위에서 제외.
- **공유 링크에는 만료(TTL) 개념이 없음**: 스펙 데이터 모델(§7)에 만료 필드가 없어, "무효화"는 오직 재생성(토큰 교체)을 통해서만 가능 — 옛 링크를 가진 사람은 재생성 전까지 계속 열람 가능.
- **`allow_share`는 열람 권한이 아니라 공유 도구 노출 여부**: `allow_share=false`여도 이미 발급된 링크(`/share/[token]`)는 계속 열람 가능 — 꺼지는 건 Reader/관리자의 공유 버튼·QR·복사 UI뿐. 스펙이 이 둘을 별개 축(공개범위 vs 공유 허용)으로 정의하고 있어, 기존에 공유된 링크를 admin이 한쪽만 끈다고 조용히 깨뜨리지 않도록 의도적으로 분리함.
- **`unlisted` → `public`으로 전환된 뒤 옛 공유 링크는 깨짐**: RPC가 `visibility = 'unlisted'`을 요구하므로, admin이 나중에 도서를 완전 공개로 바꾸면 이전에 나눠준 `/share/[token]` 링크는 더 이상 열리지 않음(슬러그로는 여전히 열람 가능). 스펙이 이 전환 시나리오의 리다이렉트를 요구하지 않아 별도 처리를 추가하지 않음.

## Phase 16. SEO와 공유 미리보기

- [x] 동적 metadata 생성 (`src/lib/reader/book-metadata.ts`의 `buildBookMetadata()` — `/books/[slug]`·`/share/[shareToken]` 양쪽이 공유)
- [x] OG title/description/image 생성 (title/summary/cover_url을 그대로 사용, summary 없으면 기본 설명으로 대체)
- [x] Twitter Card 적용 (표지 있으면 `summary_large_image`, 없으면 `summary`)
- [x] canonical URL 설정 (`alternates.canonical` — `/books/[slug]`는 자기 슬러그, `/share/[token]`은 자기 공유 링크를 가리킴, 서로 섞이지 않음)
- [x] robots 설정 (페이지별 메타 태그: `/books/[slug]`는 `index,follow`, `/share/[shareToken]`은 `noindex,nofollow` + 사이트 전역 `robots.ts`로 `/admin`·`/api`만 크롤링 차단)
- [x] sitemap 생성 (`src/app/sitemap.ts` — 홈/도서관 목록 + anon key로 조회한 공개·발행 도서만 포함)
- [x] unlisted 도서 noindex 처리 (메타 태그 `robots: noindex` + 애초에 sitemap에도 포함되지 않음 — 이중으로 보장)
- [x] 완료 기준 확인: `/books/[slug]` 응답 HTML에서 title·description·canonical·OG(title/description/url/image/type=book)·Twitter Card·`robots: index,follow` 모두 확인(curl) / `/share/[token]`은 `robots: noindex,nofollow` + 자기 링크를 가리키는 canonical 확인 / `/sitemap.xml`에 공개·발행 도서만 포함되고 unlisted·draft 도서는 제외됨을 확인 / `/robots.txt`가 `/admin`·`/api`만 차단하고 sitemap을 가리킴을 확인 / `npm run typecheck`·`npm run lint` 통과

### 범위 관련 메모

- **robots.txt에서 `/share/*`를 막지 않음**: `/admin`·`/api`만 차단하고 `/share`는 그대로 둠 — robots.txt로 크롤링 자체를 막으면 크롤러가 페이지를 아예 가져오지 않아 그 안의 `noindex` 메타 태그를 볼 기회조차 없어짐. 외부에서 링크가 걸리면 오히려 "차단된 URL"로 빈 항목이 검색결과에 노출될 위험이 있어, 표준적인 방식대로 크롤링은 허용하고 메타 `noindex`로만 색인을 막음.
- **`metadataBase` 추가**: 루트 레이아웃에 `NEXT_PUBLIC_SITE_URL` 기반 `metadataBase`를 설정 — OG/Twitter 이미지가 상대 경로일 경우 소셜 스크래퍼가 절대 URL로 해석할 수 있도록 함(현재 표지는 Supabase Storage의 절대 URL이라 당장은 영향 없지만, 향후 상대 경로를 쓰게 되어도 안전하도록 미리 설정).
- **`createAnonSupabaseClient` 신설**: `sitemap.ts`는 빌드 타임에도 실행될 수 있어 `cookies()`에 의존하는 기존 `createServerSupabaseClient`를 쓸 수 없음 — 세션이 필요 없는 공개 데이터 조회 전용으로 쿠키 없는 anon key 클라이언트를 `src/lib/supabase/server.ts`에 추가.

## Phase 17. 통계

- [x] 조회 수 기록 로직 (`src/lib/reader/view-tracking.ts`의 `recordBookView()` — Reader 마운트 시 1회, 브라우저에서 anon key로 `book_views`에 직접 insert. RLS "Anyone can create book views"는 Phase 2에서 이미 마련돼 있었으나 실제로 기록하는 코드는 이번에 처음 추가)
- [x] 최근 조회 목록 (대시보드 "최근 조회" 섹션 — 최근 view 이벤트 8건, 상대 시각 표시)
- [x] 인기 도서 집계 (대시보드 "인기 도서" 섹션 — 선택한 기간 내 조회 수 기준 상위 5권)
- [x] 기간별 조회 그래프 (Phase 4에서 이미 구현된 `조회수 통계` 차트 — 이번에 실제 기록 로직이 붙으면서 처음으로 실제 데이터가 채워짐)
- [x] 익명 ID 기반 중복 조회 최소화 (localStorage에 브라우저별 익명 UUID(`viewer_id`) 생성·저장 + 같은 책을 30분 이내 재방문하면 새 행을 만들지 않는 dedup 로직)
- [x] 과도한 개인정보 수집 금지 확인 (book_id + 익명 UUID만 기록 — user_agent·referrer 등은 기존 스키마에 자리가 있어도 의도적으로 수집하지 않음)
- [x] 완료 기준 확인: 새 도서 첫 열람 시 `book_views` 행 1개 생성 / 즉시 새로고침해도 행이 늘지 않음(dedup) / dedup 윈도우 경과 후 새로고침하면 행이 다시 늘어남 / 대시보드 "인기 도서"·"최근 조회" 섹션에 실제 조회 반영 확인(Playwright, DB 카운트 직접 대조) / 콘솔 에러 없음 / `npm run typecheck`·`npm run lint` 통과

### 실제로 찾아 고친 버그 1건

- **조회가 전혀 기록되지 않음**: `recordBookView`에서 `void supabase.from("book_views").insert(...)`로 결과를 기다리지 않고 끝냈더니 조회가 하나도 기록되지 않았음 — supabase-js의 쿼리 빌더는 `.then()`을 호출해야 비로소 실제 네트워크 요청을 보내는 지연 실행(thenable) 방식이라, `await`도 `.then()`도 없이 `void`만 붙이면 요청 자체가 나가지 않음. `.then(() => {}, () => {})`로 실제로 실행되도록 수정해 해결 — Playwright로 DB 행 개수를 직접 대조하지 않았다면 못 찾았을 조용한 버그.

### 범위 관련 메모

- **`book_views` 컬럼명이 스펙 문서(§7)와 다름**: 스펙은 `anonymous_id`/`user_id`/`viewed_at`/`user_agent`/`referrer`를 제안하지만, Phase 2에서 이미 `viewer_id`/`session_id`/`created_at`으로 테이블이 만들어져 있었음. 기존 스키마와 이를 읽는 Phase 4 코드(대시보드, 도서 관리 조회수)를 다시 마이그레이션하는 대신, 같은 목적(익명 방문자 식별)을 `viewer_id`로 충족시키는 쪽을 택함 — 개인정보 최소 수집 원칙과도 맞물려 `user_agent`/`referrer`는 애초에 의도적으로 수집하지 않음.
- **`session_id` 컬럼은 계속 미사용**: 스펙에 없는, 이전 단계에서 미리 마련해둔 컬럼으로 보이며 이번 구현에서 채울 뚜렷한 필요가 없어(익명 ID 하나로 dedup 요건을 충분히 만족) 그대로 null로 둠 — 필요해지면 이후 확장 가능.
- **뷰 기록은 Reader 마운트당 1회**: 페이지를 넘길 때마다가 아니라 "책을 열었다" 시점 1회만 기록 — "조회 수"의 통상적 의미(페이지뷰가 아니라 오픈 수)에 맞춤.

## Phase 18. 테스트

테스트 러너 도입: **Vitest**(unit/integration, jsdom) + **Playwright**(E2E). `npm test`(unit) / `npm run test:integration` / `npm run test:e2e` 세 명령으로 분리.

- [x] Unit: slug 생성 (`src/lib/admin/slug.ts`로 분리 — 원래 `api/admin/books/route.ts`에 인라인이라 테스트 불가능했음, `slug.test.ts`)
- [x] Unit: share token 생성 (`src/lib/admin/share-token.ts`로 분리 — 원래 `link/route.ts`에 인라인, `share-token.test.ts`)
- [x] Unit: HTML sanitize (`sanitize.test.ts` — 위험 태그 제거, javascript:/data: URL 차단, 인라인 이벤트 핸들러 제거, 허용 태그 보존)
- [x] Unit: block ID 생성 (`blocks.test.ts` — 순차 zero-padded id, 타입 분류, 이미지 단독 문단 판별)
- [x] Unit: TOC 생성 (`blocks.test.ts` 같은 파일 — 제목 레벨·텍스트 추출, 중첩 마크업 제거)
- [x] Unit: pagination utility (`split-html.test.ts` — 단어 경계 분할, 중첩 인라인 태그 보존, head+tail 무손실·무중복 불변식을 모든 budget 값에 대해 검증. `paginateBlocks` 자체는 실제 레이아웃 측정(scrollHeight/clientHeight)이 필요해 jsdom으로 의미 있게 테스트 불가 — E2E가 대신 담당)
- [x] Unit: 읽던 위치 복원 로직 (`measure-paginate.test.ts`의 `findPageForPosition` — 분할된 문단의 연속 페이지 구분, 블록이 페이지의 첫 블록이 아닐 때의 폴백)
- [x] Integration: DOCX 업로드 / 변환 파이프라인 / Storage 업로드·조회 (`tests/integration/docx-pipeline.test.ts` — 실제 `docx_text/Coffeecong_Books_test.docx`를 실제 연결된 Supabase 프로젝트로 변환·업로드, 종료 후 정리)
- [x] Integration: DB 저장 / RLS 정책 / public·unlisted·private 접근 (`tests/integration/rls.test.ts` — service-role/anon 두 클라이언트로 실제 정책 검증: public 열람 가능, draft 제외, unlisted는 평범한 select로는 절대 안 보이고 `get_book_by_share_token` RPC로 정확한 token일 때만 열람 가능·틀린 token은 빈 결과, private는 어떤 경로로도 차단, anon key는 쓰기 불가)
- [x] E2E: 관리자 로그인 (`e2e/admin-auth.spec.ts` — 미인증 리다이렉트, 정상 로그인, 잘못된 비밀번호 거부)
- [x] E2E: Ebook 등록 / 공개 전환 / 링크 복사 (`e2e/admin-book-lifecycle.spec.ts` — 실제 관리자 UI로 실제 샘플 DOCX 업로드 → 상태를 공개로 등록 → 목록에서 상태 확인 → 링크 복사 → 복사된 링크가 실제로 비로그인 상태에서 열림까지 한 흐름으로 검증)
- [x] E2E: 공유 링크 접속 (`e2e/share-access.spec.ts` — unlisted 도서가 올바른 token으로 비로그인 열람, 같은 도서가 `/books/[slug]`로는 404, 잘못된 token도 404)
- [x] E2E: Reader 페이지 넘김 / 글자 크기 변경 / 위치 복원 (`e2e/reader.spec.ts` — desktop+mobile 두 viewport 모두에서 실행)
- [x] 완료 기준 확인: unit 35개, integration 10개, E2E 13개(데스크톱 9 + 모바일 4) 전부 통과, 반복 실행으로 안정성 확인 / `npm run typecheck`·`npm run lint` 통과 / 테스트가 만든 데이터·Storage 객체 모두 정리 확인

### 실제로 찾아 고친 버그 3건 (테스트가 아니었다면 못 찾았을 것들)

1. **긴 문단 분할 시 단어 중복**: `split-html.ts`의 `keepFirstWords`가, 단어 예산이 정확히 어떤 형제 요소 경계에서 소진될 때 — 즉 이전 형제(텍스트 노드)가 예산을 정확히 다 쓰고, 다음 형제(`<strong>` 등)로 넘어가는 바로 그 순간 — 그 다음 형제를 전혀 건드리지 않고 그대로 남겨두는 버그가 있었음. 그 형제는 다음 페이지(`removeFirstWords`가 만드는 continuation)에도 다시 나타나므로, 결과적으로 같은 단어들이 **두 페이지에 동시에 렌더링**됨. 유닛 테스트로 "예산=1, `<p>one <strong>two three</strong></p>`" 같은 정확한 경계 케이스를 짜다가 발견 — 실제 앱에서는 흔치 않은 우연의 경계 조건이라 지금까지 수동 QA로는 걸리지 않았음. `keepFirstWords`가 자식을 순회하기 전에 예산이 이미 0인지 먼저 확인해 그런 자식은 즉시 제거하도록 수정, 그리고 모든 budget 값에 대해 head+tail 합쳐서 원본과 정확히 같은 단어 집합이 되는지 확인하는 불변식 테스트를 추가해 회귀를 막음.
2. **읽던 위치 저장이 레이아웃이 안정되지 않는 동안 전혀 기록되지 않음**: 위치 저장 effect가 `pages`(재계산마다 새로 생기는 배열)에 의존하고 있어서, 초기 로딩 중 웹폰트 로딩·ResizeObserver 잡음으로 페이지 분할이 연달아(모바일 WebKit에서 5~7회 이상) 재계산되는 동안 디바운스 타이머가 매번 리셋됨 — 재계산이 600ms보다 촘촘하게 계속 일어나면 타이머가 한 번도 끝까지 못 가서 아무것도 저장되지 않음. E2E 테스트로 모바일 viewport에서 "다음 페이지 클릭 → 새로고침 → 같은 위치 복원"을 검증하다가 `localStorage`가 완전히 비어 있는 것을 발견. effect의 의존성을 `pages` 배열 자체가 아니라 실제로 계산된 `blockId`/`wordOffset` 값으로 바꿔서 해결 — 재계산이 몇 번 일어나든 실제로 가리키는 위치가 안 바뀌면 타이머를 건드리지 않음. 같은 조사 과정에서 `document.fonts.ready`를 기다려 한 번 더 확정적으로 재계산하는 effect도 추가해, 폰트가 늦게 로드되는 환경에서의 불필요한 재계산 횟수 자체도 줄임.
3. **`npm test` 스크립트가 조용히 유닛 테스트 대부분을 건너뜀**: `package.json`의 `"test": "vitest run --exclude tests/integration/**"`에서 따옴표 없는 glob이 npm이 아니라 셸에 의해 먼저 확장되면서 vitest에 이상한 인자가 전달돼, 매번 6개 파일 중 1개(8개 테스트)만 실행되고 있었음 — vitest도 npm도 에러를 내지 않아 겉보기엔 "통과"처럼 보였음. glob 대신 `vitest run src`로 바꿔 해결(통합 테스트는 `tests/`에 있어 자연히 제외됨).

### 범위 관련 메모

- **`paginateBlocks`(실제 overflow 계산)는 유닛 테스트 대상에서 제외**: `scrollHeight`/`clientHeight`를 jsdom이 항상 0으로 보고하기 때문에 의미 있는 검증이 불가능함 — 실제 브라우저 레이아웃이 필요한 부분이라 Playwright E2E(Reader 페이지 넘김 테스트가 실제로 여러 페이지를 오가며 콘텐츠가 잘리지 않는지 간접 확인)와 Phase 11 단계의 수동 QA로 커버.
- **위치 복원 E2E 테스트는 정확한 페이지 "번호" 대신 블록 ID 일치를 확인**: 모바일/WebKit에서는 두 번의 서로 다른 로드가 legitimately 다른 총 페이지 수로 수렴할 수 있음(레이아웃 안정화 타이밍 차이) — 이는 버그가 아니라 spec §13이애초에 페이지 번호가 아니라 block ID 기반으로 위치를 저장하도록 설계한 바로 그 이유와 정확히 일치함. 그래서 테스트도 페이지 번호 문자열이 아니라 localStorage에 저장된 `blockId`가 새로고침 전후로 같은지를 확인.
- **Playwright `workers: 1`(직렬 실행)**: 데스크톱+모바일 여러 브라우저 인스턴스가 동시에 CPU를 다툴 때만 간헐적으로 페이지네이션 안정화가 늦어져 테스트가 흔들렸음(각각 격리 실행하면 항상 통과) — 실행 시간을 다소 희생하더라도 안정성을 택함.
- **카카오톡 SDK 등 Phase 15의 선택적 항목과 마찬가지로, 실제 이메일 전송·SNS API 연동 테스트는 하지 않음**: 그 기능들 자체가 `mailto:`/외부 링크를 여는 것뿐이라 브라우저가 처리하는 부분이고, 이 프로젝트가 검증할 수 있는 범위(링크 URL이 올바르게 구성되는지)는 이미 Phase 15에서 확인됨.

## Phase 19. 배포

git 저장소 생성(2026-07-17) — 이전까지는 git 저장소가 아니었음. `main` 브랜치에 초기 커밋 완료, GitHub(`swhwang81/coffeecongbooks`, private)에 push 완료. 프로덕션 Supabase는 지금까지 개발에 써온 프로젝트(`ittjmpowdbpcrjcvbqfx`)를 그대로 사용하기로 확정(사용자 확인) — 별도 프로덕션 전용 프로젝트를 새로 만들지 않음. Vercel 프로젝트도 사용자가 직접 생성·연동 완료(실제 배포된 도메인에서 관리자 기능 테스트 중인 것으로 확인, 2026-07-18) — 아래 체크박스가 기존에 미표시로 남아있던 걸 실제 진행 상황에 맞게 정리함.

- [x] Vercel 프로젝트 생성 — 사용자가 직접 GitHub 저장소 import, 실제 배포 도메인에서 관리자 페이지 접속·테스트 중인 것으로 확인
- [x] Supabase 프로덕션 환경 변수 설정 — 위와 동일하게 확인(배포된 사이트에서 실제 Supabase 데이터 대상으로 동작 중)
- [x] 프로덕션 migration 적용 — 기존 프로젝트를 그대로 쓰기로 해서 이미 전부 적용된 상태(001~008, 이번 세션 내내 `supabase db push`로 실시간 적용하며 검증함). `supabase login` 없이는 `migration list`로 재확인이 안 되지만, 세션 내내 통합·E2E 테스트가 이 프로젝트에 대해 계속 성공한 것이 곧 적용 증거.
- [x] Storage 정책 프로덕션 적용 — 위와 동일한 이유로 이미 적용됨(`book-originals`/`book-covers`/`book-assets` 버킷 + RLS, migration 002/003)
- [ ] custom domain 연결 (`books.coffeecong.com`) — 사용자 확인: 지금은 Vercel 기본 도메인으로 배포하고 커스텀 도메인은 나중에 진행
- [ ] 오류 로깅 설정 — 아직 미착수(계정 필요 없는 Vercel 기본 함수 로그부터 시작, Sentry 등 외부 서비스는 필요 시 추가)
- [x] 관리자 생성 문서 작성 (`docs/deployment/admin-setup.md`)
- [x] 운영 매뉴얼 작성 (`docs/deployment/operations-manual.md`)
- [x] DOCX 작성 가이드 작성 (`docs/deployment/docx-authoring-guide.md`)
- [x] 백업 및 복구 가이드 작성 (`docs/deployment/backup-and-recovery.md`)
- [ ] 완료 기준 확인: 프로덕션 도메인에서 서비스 작동 / DOCX 등록→공유 링크 열람 전체 흐름 성공 — 이미지 포함 DOCX 등록 관련 버그(아래) 수정 후 재검증 필요

### 배포 후 실사용 중 발견된 버그

- **이미지 포함 DOCX 등록 시 Vercel에서만 "저장에 실패했습니다"**: 로컬 개발 서버에서는 재현 안 됐고 배포된 사이트에서만 실패 — `POST /api/admin/books`(및 PATCH, `/preview`, `/reconvert`)가 DOCX 변환·이미지별 WebP 압축·Storage 업로드를 **한 요청 안에서 순차적으로(동기적으로)** 처리하는데, 이 라우트들에 `maxDuration` 설정이 없어 Vercel 기본 타임아웃(플랜에 따라 보통 10초)을 그대로 적용받고 있었음. 실제 사진이 포함된 문서는 이 처리가 10초를 넘기기 쉬워 Vercel이 함수를 강제 종료하고, 클라이언트는 정상적인 `{ok, error}` JSON 대신 Vercel의 자체 에러 페이지를 받아 `xhr-upload.ts`의 JSON 파싱이 조용히 실패 → `book-form.tsx`가 아무 진단 정보 없이 "저장에 실패했습니다"라는 뭉뚱그린 메시지만 띄움. 네 개 라우트(`books/route.ts`, `books/[id]/route.ts`, `books/[id]/reconvert/route.ts`, `books/preview/route.ts`) 전부에 `export const maxDuration = 60`(Hobby 플랜에서 설정 가능한 최댓값이자 Pro 기본값 내에 있는 안전한 값) 추가해 해결. 로컬 `next build`로 라우트 설정 정상 컴파일 확인, 관련 E2E(`admin-book-lifecycle.spec.ts`) 통과 확인 — 실제 타임아웃 자체는 Vercel 인프라 특성상 로컬에서 재현·검증 불가하므로, 재배포 후 사용자가 실제로 이미지 포함 문서를 등록해봐야 최종 확인됨.

### 남은 절차 (사용자 액션 필요)

1. 이번 `maxDuration` 수정 커밋을 push해 Vercel 재배포 트리거
2. 재배포 후 실제 도메인에서 이미지 포함 DOCX로 등록/수정 재시도 — 여전히 실패하면 어떤 에러(상태 코드 포함)인지 확인 필요
3. custom domain(`books.coffeecong.com`) 연결 — 사용자 진행 예정
4. 오류 로깅 설정 착수

### 범위 관련 메모

- **별도 프로덕션 Supabase 프로젝트를 만들지 않음**: 사용자가 기존 프로젝트를 그대로 쓰기로 확정 — 개발과 프로덕션이 같은 DB를 공유한다는 뜻이므로, 이후 로컬에서 테스트 데이터를 만들 때 실제 서비스에 노출되지 않도록 각별히 주의(이번 세션에서 QA용으로 만든 도서들은 매번 사용 후 정리함, 앞으로도 같은 습관 유지 필요).
- **커스텀 도메인은 의도적으로 이번 범위에서 제외**: DNS 접근 권한이 없어 직접 할 수 없고, 사용자가 나중에 진행하기로 확인함.

---

## 최초 실행 전 검토 사항 (Phase 1 착수 전)

Phase 1 코드를 작성하기 전에 아래 선택 사항을 먼저 검토하고 설명한다.

- [ ] StPageFlip 사용 여부 vs 대체 라이브러리
- [ ] DOCX 변환 처리 위치 (서버 vs 브라우저)
- [ ] 긴 문서 페이지 계산 성능 전략
- [ ] Supabase Storage 공개/비공개 bucket 정책
- [ ] share token 생성 방식
- [ ] RLS 설계 전략
