# Coffeecong Books 개발 프롬프트

## 0. Claude에게 전달할 최상위 지시

이 문서는 `Coffeecong Books`라는 독립형 웹앱을 단계별로 개발하기 위한 전체 명세다.

반드시 아래 원칙을 지킨다.

1. 프로젝트 이름은 정확히 `Coffeecong Books`로 표기한다.
2. 모든 종류의 DOCX 문서를 Ebook으로 변환하고 공유하는 일반 서비스로 구현한다.
3. 백엔드 서비스는 Supabase로 통일한다.
4. 공개 Ebook은 링크만 있으면 로그인 없이 어디서나 열어볼 수 있어야 한다.
5. Reader는 PDF 축소 방식이 아니라 HTML 리플로우 방식으로 구현한다.
6. 화면 크기, 글자 크기, 줄 간격이 바뀌면 문장이 다시 배치되고 페이지 수가 다시 계산되어야 한다.
7. 데스크톱에서는 양면, 모바일에서는 단면 Reader로 동작해야 한다.
8. 각 Phase를 순서대로 구현하고, 이전 Phase가 완료되기 전 다음 Phase 코드를 작성하지 않는다.
9. 사용자가 제공한 UI/UX 디자인 이미지를 시각적 기준으로 삼는다.

---

# 1. 프로젝트 개요

## 서비스 이름

`Coffeecong Books`

## 서비스 설명

DOCX 문서를 업로드하면 반응형 HTML Ebook으로 변환하고, 고유한 공유 링크를 생성하여 PC, 태블릿, 모바일 어디서나 책처럼 읽을 수 있게 하는 웹앱이다.

## 핵심 문구

- 문서를 책처럼, 누구나 쉽게.
- Turn documents into beautiful, responsive ebooks.
- Upload. Convert. Share. Read anywhere.

## 핵심 사용자 가치

- Word 문서를 별도 편집 없이 Ebook으로 변환
- 링크 하나로 쉽게 공유
- 앱 설치 없이 웹브라우저에서 바로 열람
- 화면 크기에 맞춰 글자와 문단이 자연스럽게 재배치
- 실제 책처럼 클릭하거나 스와이프하여 페이지 넘김
- 읽던 위치와 읽기 설정 자동 저장

---

# 2. UI/UX 디자인 기준

사용자가 제공한 다음 디자인 이미지를 전체 UI의 기준으로 사용한다.

```text
/mnt/data/coffeecong books.png
```

프로젝트 저장소에는 다음과 같이 복사하여 참고 자료로 보관한다.

```text
/docs/design/coffeecong-books-ui-reference.png
```

## 디자인 방향

- 따뜻하고 고급스러운 디지털 도서관
- 밝은 아이보리 배경
- 짙은 네이비 Reader 배경
- 보라색을 주요 액센트 컬러로 사용
- 둥근 모서리
- 얇고 부드러운 테두리
- 절제된 그림자
- 종이책을 연상시키는 Reader
- 과도한 장식보다 가독성과 콘텐츠 집중을 우선

## 기준 화면

### 공개 메인 및 도서관

- 좌측 상단 로고: Coffeecong Books
- 상단 메뉴: 홈, 도서관, 카테고리, 검색
- 검색 입력창
- 사용자 또는 관리자 아이콘
- Hero 영역
- 최신 등록 도서 카드
- 카테고리 아이콘 메뉴

### 데스크톱 Reader

- 중앙에 펼쳐진 두 페이지
- 짙은 네이비 프레임
- 상단 Reader 툴바
- 페이지 좌우 이동 버튼
- 하단 페이지 번호
- 목차 버튼
- 글자 크기 버튼
- 테마 버튼
- 공유 버튼
- 전체 화면 버튼

### 모바일 Reader

- 한 페이지 보기
- 상단 간결한 툴바
- 하단 페이지 이동
- 좌우 스와이프
- 최소 17px 이상의 본문 글자 크기

### 관리자 화면

- 좌측 짙은 네이비 사이드바
- 대시보드
- 도서 관리
- 카테고리 관리
- 사용자 관리
- 설정
- 도서 등록 단계형 화면
- 도서 관리 테이블

---

# 3. 확정 기술 스택

## Frontend

- Next.js 최신 안정 버전
- App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui는 필요한 기본 UI에만 제한적으로 사용
- Lucide Icons
- StPageFlip 또는 HTML 콘텐츠를 지원하는 동등한 페이지 플립 라이브러리

## DOCX 변환

- Mammoth.js
- Word 스타일을 의미 기반 HTML로 변환
- 제목, 문단, 목록, 인용문, 링크, 기본 표, 이미지 지원

## Backend

- Next.js Route Handlers
- Server Components와 Client Components를 명확히 구분
- 필요한 경우 Server Actions 사용
- 입력 검증은 Zod 사용

## Supabase

반드시 아래 기능을 모두 Supabase로 구현한다.

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security
- Supabase TypeScript 타입 생성

## 배포

- Vercel
- Supabase
- 도메인 예시: `books.coffeecong.com`

---

# 4. 전체 사용자 흐름

## 관리자

```text
관리자 로그인
→ 새 Ebook 등록
→ DOCX 업로드
→ HTML 자동 변환
→ 이미지 추출
→ 변환 결과 미리보기
→ 제목, 저자, 설명, 표지, 카테고리 입력
→ 공개 범위 선택
→ 저장
→ 공유 링크 생성
→ 링크 복사 또는 QR 코드 공유
```

## 일반 독자

```text
도서관에서 Ebook 선택
또는 공유 링크 접속
→ Ebook Reader 열기
→ PC에서는 양면 보기
→ 모바일에서는 단면 보기
→ 클릭, 키보드, 스와이프로 페이지 넘김
→ 글자 크기 및 테마 변경
→ 읽던 위치 저장
→ 다음 방문 시 이어 읽기
```

---

# 5. URL 구조

```text
/
  Coffeecong Books 메인

/books
  공개 Ebook 목록

/books/[slug]
  공개 Ebook Reader

/share/[shareToken]
  링크 전용 Ebook Reader

/admin/login
  관리자 로그인

/admin
  관리자 대시보드

/admin/books
  Ebook 관리

/admin/books/new
  새 Ebook 등록

/admin/books/[id]/edit
  Ebook 수정

/admin/categories
  카테고리 관리

/admin/settings
  서비스 설정
```

---

# 6. 공개 범위와 공유 정책

각 Ebook은 아래 상태를 가진다.

## status

- `draft`: 작성 및 검토 중
- `published`: 도서관과 검색에 공개
- `archived`: 보관됨

## visibility

- `public`: 도서관 목록과 검색에 공개
- `unlisted`: 도서관에 표시하지 않고 링크를 가진 사람만 열람 가능
- `private`: 관리자만 열람 가능

## 공개 URL

공개 Ebook:

```text
https://books.coffeecong.com/books/example-book
```

링크 전용 Ebook:

```text
https://books.coffeecong.com/share/Ab3xK9pQ
```

## 공유 기능

Reader와 관리자 페이지에 다음 기능을 제공한다.

- 링크 복사
- Web Share API
- QR 코드
- 이메일 공유
- Facebook 공유
- X 공유
- 카카오톡 공유는 SDK 설정이 가능할 때 선택적으로 구현
- 공유 허용 여부 설정
- 원본 DOCX 다운로드 허용 여부 설정

## 공유 미리보기

각 Ebook마다 동적으로 생성한다.

- Open Graph title
- Open Graph description
- Open Graph image
- Twitter Card
- canonical URL
- robots 설정

`unlisted` Ebook은 검색엔진 색인을 차단한다.

---

# 7. Supabase 데이터베이스 설계

## books

필수 필드:

```text
id
title
slug
author_name
summary
cover_url
original_docx_path
content_html
content_json
toc_json
status
visibility
share_token
allow_share
allow_download
view_count
published_at
created_by
created_at
updated_at
deleted_at
```

## categories

```text
id
name
slug
icon
sort_order
created_at
updated_at
```

## book_categories

```text
book_id
category_id
```

## tags

```text
id
name
slug
created_at
```

## book_tags

```text
book_id
tag_id
```

## admin_profiles

```text
id
auth_user_id
display_name
role
created_at
updated_at
```

역할:

- `super_admin`
- `admin`
- `editor`

## reading_progress

로그인 사용자를 향후 지원할 수 있도록 설계한다.

```text
id
book_id
user_id
block_id
character_offset
font_size
line_height
theme
updated_at
```

비로그인 사용자의 진행률은 우선 localStorage에 저장한다.

## book_views

```text
id
book_id
anonymous_id
user_id
viewed_at
user_agent
referrer
```

개인정보를 불필요하게 수집하지 않는다.

---

# 8. Supabase Storage 설계

## buckets

### book-originals

- 원본 DOCX
- 기본 비공개
- 관리자만 접근
- 다운로드를 허용한 경우에만 signed URL 생성

### book-covers

- 표지 이미지
- 공개 또는 정책 기반 접근

### book-assets

- DOCX 내부 이미지
- 공개 Ebook에서는 읽기 가능
- private Ebook은 signed URL 또는 보호된 접근 사용

## 권장 경로

```text
book-originals/{bookId}/original.docx
book-covers/{bookId}/cover.webp
book-assets/{bookId}/image-001.webp
book-assets/{bookId}/image-002.webp
```

---

# 9. Supabase RLS 원칙

모든 주요 테이블에 RLS를 활성화한다.

## 공개 사용자

- `published + public` Ebook 조회 가능
- 유효한 `share_token`을 가진 `unlisted` Ebook 조회 가능
- private Ebook 조회 불가
- 관리자 데이터 수정 불가

## 관리자

- 역할에 따라 Ebook 생성, 수정, 공개, 보관, 삭제 가능
- 원본 DOCX 접근 가능
- 관리자 화면 접근 가능

## 보안 원칙

- service role key는 서버 코드에서만 사용
- 브라우저에는 anon key만 사용
- 관리자 권한을 클라이언트 값만으로 판단하지 않음
- API에서도 세션과 role을 재검증
- 비공개 콘텐츠를 HTML 소스에 미리 포함하지 않음

---

# 10. DOCX 변환 설계

## 변환 목표

DOCX의 시각적 페이지를 그대로 복제하지 않는다.

다음 구조를 의미 기반 HTML로 변환한다.

- 제목
- 장 제목
- 소제목
- 일반 문단
- 굵게
- 기울임
- 인용문
- 순서 있는 목록
- 순서 없는 목록
- 링크
- 이미지
- 기본 표

## Mammoth 스타일 맵

영문과 한글 Word 스타일명을 모두 고려한다.

```text
p[style-name='Title'] => h1.book-title:fresh
p[style-name='Heading 1'] => h2.chapter-title:fresh
p[style-name='Heading 2'] => h3.section-title:fresh
p[style-name='Quote'] => blockquote:fresh

p[style-name='제목'] => h1.book-title:fresh
p[style-name='제목 1'] => h2.chapter-title:fresh
p[style-name='제목 2'] => h3.section-title:fresh
p[style-name='인용'] => blockquote:fresh
```

## 콘텐츠 블록

HTML과 함께 block JSON을 생성한다.

```json
[
  {
    "id": "block-0001",
    "type": "heading",
    "level": 1,
    "html": "<h1>책 제목</h1>"
  },
  {
    "id": "block-0002",
    "type": "paragraph",
    "html": "<p>본문입니다.</p>"
  },
  {
    "id": "block-0003",
    "type": "image",
    "src": "https://...",
    "alt": ""
  }
]
```

각 요소에는 다음과 같이 block ID를 넣는다.

```html
<p data-block-id="block-0002">본문입니다.</p>
```

## HTML 정제

허용 태그 기반으로 sanitize한다.

허용 예시:

```text
article, section
h1, h2, h3, h4
p, span
strong, em, u
blockquote
ul, ol, li
a
img
figure, figcaption
table, thead, tbody, tr, th, td
br, hr
```

제거:

```text
script
iframe
object
embed
form
input
button
style
인라인 이벤트 속성
javascript URL
위험한 data URL
```

---

# 11. Ebook Reader 핵심 규칙

## PDF 방식 금지

Reader는 PDF 페이지를 축소하여 보여주는 방식이 아니다.

반드시 HTML 콘텐츠를 현재 화면 크기에 맞춰 다시 페이지로 나눈다.

## 반응형 동작

- 화면이 작아지면 문장이 다시 줄바꿈
- 모바일에서도 글자 크기 유지
- 모바일에서는 페이지 수 증가
- 글자 크기를 변경하면 페이지 재계산
- 줄 간격을 변경하면 페이지 재계산
- 창 크기와 방향이 바뀌면 페이지 재계산

## 데스크톱

- 양면 보기
- 중앙 책등
- 종이 그림자
- 좌우 페이지 이동
- 키보드 방향키
- 전체 화면

## 모바일

- 단면 보기
- 최소 본문 17px
- 좌우 스와이프
- 화면 가장자리 탭
- 도구 모음은 간결하게
- 상하 긴 스크롤보다 페이지 넘김 우선

## Reader 기능

- 이전/다음
- 키보드 좌우 방향키
- 클릭 넘김
- 터치 스와이프
- 페이지 번호
- 진행률
- 목차
- 글자 크기
- 줄 간격
- light/sepia/dark 테마
- 전체 화면
- 공유
- 링크 복사
- QR 코드
- 읽던 위치 복원

---

# 12. 페이지 분할 알고리즘

이 프로젝트의 가장 중요한 기술 요소다.

## 기본 절차

1. 실제 페이지 컨테이너의 너비와 높이를 측정한다.
2. 패딩을 제외한 콘텐츠 영역을 계산한다.
3. 콘텐츠 블록을 순서대로 임시 페이지에 추가한다.
4. `scrollHeight > clientHeight` 여부를 확인한다.
5. 초과하면 마지막 블록을 다음 페이지로 이동한다.
6. 긴 문단은 문장 또는 단어 단위로 분할한다.
7. 큰 이미지는 비율을 유지하여 페이지 안에 맞춘다.
8. 표는 축소 또는 가로 스크롤 규칙을 적용한다.
9. 모든 블록을 처리한 뒤 PageFlip에 전달한다.
10. 마지막 빈 페이지가 생기지 않게 한다.

## 예외 처리

- 한 페이지보다 긴 문단
- 긴 URL
- 큰 이미지
- 제목이 페이지 맨 아래에 홀로 남는 현상
- 이미지와 캡션 분리
- 목록 중간 분할
- 표 중간 분할
- 연속된 빈 문단
- 첫 표지
- 마지막 표지
- 양면 보기의 홀수 페이지 처리

## 재계산 조건

- ResizeObserver
- 브라우저 resize
- 기기 방향 전환
- 전체 화면 진입 및 종료
- 글자 크기 변경
- 줄 간격 변경
- 글꼴 변경
- 이미지 로딩 완료
- 사이드 목차 열기 및 닫기

resize에는 debounce를 적용한다.

---

# 13. 읽던 위치 저장

페이지 번호만 저장하지 않는다.

페이지 번호는 기기와 설정에 따라 달라질 수 있다.

다음을 저장한다.

```text
book ID
block ID
block 내부 문자 offset
진행률
글자 크기
줄 간격
테마
마지막 읽은 시각
```

## 비로그인 사용자

localStorage에 책별로 저장한다.

## 복원 방식

- 저장된 block ID 검색
- 현재 재계산된 페이지 배열에서 해당 블록이 속한 페이지 확인
- 해당 페이지로 이동
- 정확한 block을 찾지 못하면 가장 가까운 이전 block으로 이동

---

# 14. 관리자 UI

## 사이드바 메뉴

- 대시보드
- 도서 관리
- 새 도서 등록
- 카테고리 관리
- 사용자 관리
- 설정
- 로그아웃

## 대시보드

- 총 도서 수
- 공개 도서 수
- 링크 전용 도서 수
- 총 조회 수
- 최근 등록 도서
- 최근 조회 통계

## 도서 등록 단계

```text
1. 파일 업로드
2. 변환 확인
3. 도서 정보
4. 공개 및 공유 설정
5. 완료
```

## 등록 항목

- DOCX 파일
- 책 제목
- 저자
- 요약
- 표지 이미지
- 카테고리
- 태그
- status
- visibility
- 공유 허용
- 다운로드 허용
- slug
- 공개일

## 등록 완료 화면

```text
Ebook이 등록되었습니다.

공개 주소:
https://books.coffeecong.com/books/example-book

또는 공유 주소:
https://books.coffeecong.com/share/Ab3xK9pQ

[링크 복사] [QR 코드] [Ebook 열기]
```

## 도서 관리 목록

- 표지
- 제목
- 저자
- 카테고리
- 공개 상태
- 등록일
- 조회 수
- Reader 미리보기
- 링크 복사
- QR 코드
- 수정
- 보관
- 삭제

---

# 15. 공개 도서관 UI

## 메인

- Coffeecong Books 로고
- Hero
- 도서 둘러보기
- 도서 등록하기
- 최신 등록 도서
- 카테고리
- 검색

## 목록

- 카드형 표지
- 제목
- 저자
- 등록일
- 카테고리
- 읽기
- 공유
- 링크 복사

## 반응형 카드

- 모바일 1열
- 태블릿 2열
- 데스크톱 4열 또는 5열

---

# 16. 접근성

- 버튼에 aria-label
- 키보드만으로 Reader 사용 가능
- 포커스 표시 유지
- 충분한 색상 대비
- 이미지 alt
- 올바른 heading 구조
- 모달 포커스 트랩
- 스크린리더용 현재 페이지 안내
- `prefers-reduced-motion`에서는 애니메이션을 줄임
- 터치 대상 최소 크기 준수

---

# 17. 성능

- 전체 문서를 항상 모두 DOM에 렌더링하지 않기
- 현재 페이지 주변만 유지하는 가상화 고려
- 이미지 lazy loading
- 이미지 WebP 변환
- 긴 문서 페이지 계산 캐시
- viewport와 reader 설정 조합별 결과 캐시 고려
- React 불필요한 재렌더링 최소화
- 페이지 계산 중 로딩 상태 표시
- 필요하면 Web Worker 검토

---

# 18. 오류 처리

다음 오류를 사용자 친화적으로 안내한다.

- DOCX가 아닌 파일
- 손상된 DOCX
- 암호화된 문서
- 파일 용량 초과
- 변환 실패
- 이미지 추출 실패
- Supabase Storage 업로드 실패
- DB 저장 실패
- 권한 없음
- 존재하지 않는 Ebook
- 만료되거나 잘못된 share token
- 네트워크 오류

기술 스택 트레이스는 사용자에게 노출하지 않는다.

---

# 19. Phase별 구현 지시

---

## Phase 1. 프로젝트 초기화

### 목표

Coffeecong Books 프로젝트의 기본 구조와 디자인 시스템을 구축한다.

### 구현

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- 공통 레이아웃
- 공개 레이아웃
- 관리자 레이아웃
- 디자인 토큰
- 컬러, 타이포그래피, spacing
- UI 참고 이미지 저장
- 기본 홈, books, admin 페이지
- `.env.example`
- README

### 완료 기준

- 로컬 실행 성공
- 공개와 관리자 레이아웃 분리
- UI 참고 이미지와 유사한 기본 디자인
- TypeScript 및 lint 오류 없음

---

## Phase 2. Supabase 연결

### 목표

Supabase DB, Auth, Storage의 기본 구조를 완성한다.

### 구현

- Supabase client/server client
- DB schema
- migration
- generated TypeScript types
- Storage buckets
- 기본 RLS
- seed 데이터

### 완료 기준

- DB migration 성공
- Auth 연결 성공
- Storage 테스트 업로드 성공
- 공개/비공개 조회 정책 확인

---

## Phase 3. 관리자 인증

### 목표

관리자 페이지와 관리 API를 보호한다.

### 구현

- 로그인
- 로그아웃
- 세션 유지
- 관리자 역할
- protected route
- protected API
- 비인가 redirect

### 완료 기준

- 관리자만 `/admin` 접근 가능
- role 검증 성공
- 로그아웃 후 접근 차단

---

## Phase 4. 관리자 대시보드 UI

### 목표

참고 이미지와 유사한 관리자 대시보드를 구현한다.

### 구현

- 네이비 사이드바
- 통계 카드
- 조회 통계 차트
- 최근 도서
- 반응형 관리자 레이아웃

### 완료 기준

- 디자인 기준과 시각적으로 일관됨
- 모바일에서도 사용 가능

---

## Phase 5. DOCX 업로드

### 목표

관리자가 DOCX 파일을 선택하고 업로드할 수 있도록 한다.

### 구현

- drag and drop
- 파일 선택
- 확장자 검사
- MIME 검사
- 용량 제한
- 진행률
- 원본 DOCX Storage 저장

### 완료 기준

- 정상 DOCX 업로드 가능
- 잘못된 파일 차단
- 업로드 오류 안내

---

## Phase 6. DOCX → HTML 변환

### 목표

Mammoth.js를 이용해 DOCX를 HTML과 block JSON으로 변환한다.

### 구현

- style map
- 이미지 추출
- Storage 업로드
- 이미지 URL 치환
- HTML sanitize
- block ID
- TOC 생성
- 변환 경고

### 완료 기준

- 한글과 영문 DOCX 변환
- 이미지 정상 표시
- 위험 HTML 제거
- block JSON 생성
- TOC 생성

---

## Phase 7. Ebook 등록

### 목표

변환 결과와 Ebook 정보를 Supabase에 저장한다.

### 구현

- 제목
- 저자
- 요약
- 표지
- 카테고리
- 태그
- status
- visibility
- slug
- allow_share
- allow_download
- 공개일
- 미리보기

### 완료 기준

- Ebook 저장 가능
- 수정 가능
- 공개 상태 반영
- 원본 DOCX 유지

---

## Phase 8. 도서 관리

### 목표

관리자가 모든 Ebook을 조회하고 관리할 수 있도록 한다.

### 구현

- 검색
- 필터
- 정렬
- 수정
- 재변환
- 공개 전환
- unlisted 전환
- 보관
- 삭제
- 링크 복사
- QR 코드
- 조회 수

### 완료 기준

- 관리 목록에서 주요 작업 수행 가능
- 비공개 콘텐츠 외부 노출 없음

---

## Phase 9. 공개 메인과 도서관

### 목표

참고 이미지의 공개 UI를 구현한다.

### 구현

- Hero
- 최신 도서
- 카테고리
- 검색
- 카드 목록
- 반응형 레이아웃
- 공개 Ebook만 표시

### 완료 기준

- 모바일, 태블릿, 데스크톱 정상
- 카드에서 Reader 이동
- 검색과 필터 작동

---

## Phase 10. Reader 기본 UI

### 목표

참고 이미지와 유사한 Ebook Reader 인터페이스를 만든다.

### 구현

- 네이비 Reader 프레임
- 데스크톱 양면
- 모바일 단면
- 상단 툴바
- 하단 페이지 컨트롤
- 표지
- 페이지 그림자
- 이전/다음
- 키보드
- 클릭
- 스와이프

### 완료 기준

- 실제 책처럼 넘김 가능
- 모바일 단면 정상
- 데스크톱 양면 정상

---

## Phase 11. 반응형 페이지 분할

### 목표

HTML 콘텐츠를 화면과 읽기 설정에 맞춰 실시간으로 재페이지화한다.

### 구현

- 측정용 숨김 컨테이너
- block 배치
- overflow 검사
- 긴 문단 분할
- 이미지 처리
- 표 처리
- 제목 고립 방지
- ResizeObserver
- debounce
- 현재 block 위치 유지

### 완료 기준

- 화면 크기 변경 시 잘림 없음
- 글자 크기 변경 시 재계산
- 모바일에서도 읽기 쉬운 글자 유지
- 읽던 내용 위치 최대한 유지

---

## Phase 12. Reader 읽기 설정

### 목표

사용자가 편안하게 읽기 환경을 조절할 수 있도록 한다.

### 구현

- A-
- A+
- 기본 글자 크기
- 줄 간격
- light
- sepia
- dark
- 전체 화면
- 설정 저장
- 모바일 설정 패널

### 완료 기준

- 설정 즉시 반영
- 페이지 재계산
- 재방문 시 복원

---

## Phase 13. 목차와 위치 이동

### 목표

Heading 구조를 이용한 Reader 목차를 제공한다.

### 구현

- 목차 패널
- Heading 1/2
- 현재 장 강조
- block ID 이동
- 모바일 패널
- 키보드 접근성

### 완료 기준

- 목차 클릭 이동
- 현재 장 표시
- 모바일 정상

---

## Phase 14. 읽던 위치

### 목표

기기 크기가 달라도 비슷한 콘텐츠 위치에서 이어 읽을 수 있도록 한다.

### 구현

- 현재 block ID 추적
- character offset
- localStorage
- 진행률
- 최근 읽은 시각
- 복원
- 처음부터 읽기

### 완료 기준

- 새로고침 후 위치 복원
- 창 크기 변경 후에도 block 기반 복원
- 페이지 번호에 의존하지 않음

---

## Phase 15. 공유 링크

### 목표

링크를 통해 어디서나 Ebook을 열고 읽을 수 있게 한다.

### 구현

- public slug URL
- unlisted share token URL
- 링크 복사
- Web Share API
- QR 코드
- 이메일 공유
- SNS 공유
- 공유 권한 검사
- 잘못된 token 처리
- share token 재생성

### 완료 기준

- 로그인 없이 공유 링크 열람 가능
- unlisted는 도서관에 노출되지 않음
- private는 링크로도 접근 불가
- 모바일 기본 공유창 작동

---

## Phase 16. SEO와 공유 미리보기

### 목표

공유 링크가 메신저와 SNS에서 책처럼 표시되게 한다.

### 구현

- 동적 metadata
- OG title
- OG description
- OG image
- Twitter Card
- canonical
- robots
- sitemap
- unlisted noindex

### 완료 기준

- 공유 시 표지, 제목, 설명 표시
- 비공개 및 unlisted 색인 제어

---

## Phase 17. 통계

### 목표

관리자가 Ebook 이용 현황을 확인할 수 있게 한다.

### 구현

- 조회 수
- 최근 조회
- 인기 도서
- 기간별 조회 그래프
- 익명 ID
- 과도한 개인정보 수집 금지

### 완료 기준

- 대시보드 통계 표시
- 중복 조회 최소화 정책 적용

---

## Phase 18. 테스트

### Unit

- slug
- share token
- sanitize
- block ID
- TOC
- pagination utility
- progress restore

### Integration

- DOCX upload
- conversion
- Storage
- DB save
- RLS
- public access
- unlisted access
- private denial

### E2E

- 관리자 로그인
- Ebook 등록
- 공개
- 링크 복사
- 공유 링크 접속
- Reader 페이지 넘김
- 글자 크기 변경
- 위치 복원

### 완료 기준

- 주요 테스트 통과
- 모바일 및 데스크톱 viewport 통과

---

## Phase 19. 배포

### 목표

Vercel과 Supabase에 프로덕션 배포한다.

### 구현

- Vercel project
- Supabase env
- migration
- Storage policies
- custom domain
- error logging
- 관리자 생성 문서
- 운영 매뉴얼
- DOCX 작성 가이드
- 백업 및 복구 가이드

### 완료 기준

- `books.coffeecong.com`에서 서비스 작동
- DOCX 등록부터 공유 링크 열람까지 전체 흐름 성공

---

# 20. MVP 우선순위

MVP에 반드시 포함한다.

1. 관리자 로그인
2. DOCX 업로드
3. HTML 변환
4. 이미지 추출
5. Ebook 저장
6. 공개 도서관
7. 반응형 Reader
8. 데스크톱 양면
9. 모바일 단면
10. 클릭 및 스와이프
11. 글자 크기 및 테마
12. 읽던 위치
13. public 링크
14. unlisted 공유 링크
15. 링크 복사
16. QR 코드
17. Web Share API
18. Supabase RLS

MVP에서 제외 가능:

- 결제
- DRM
- 댓글
- 좋아요
- 사용자 회원가입
- 협업 편집
- EPUB export
- 오프라인 앱
- 복잡한 분석 통계

---

# 21. Claude의 작업 보고 형식

각 Phase 시작 전에 반드시 다음을 보고한다.

1. Phase 목표
2. 생성할 파일
3. 수정할 파일
4. DB 변경
5. Storage 변경
6. RLS 변경
7. API 변경
8. 주요 컴포넌트
9. 예상 위험 요소

각 Phase 완료 후 반드시 다음을 보고한다.

1. 완료 항목
2. 생성 및 수정 파일
3. 실행 방법
4. 테스트 방법
5. 알려진 제한 사항
6. 다음 Phase 전에 확인할 사항

---

# 22. 코드 작성 원칙

- TypeScript strict mode
- `any` 최소화
- 입력값 Zod 검증
- Server/Client Component 명확히 구분
- 오류 상태와 로딩 상태 구현
- 하드코딩된 비밀 값 금지
- service role key 클라이언트 노출 금지
- 접근성 준수
- 모바일 우선
- 불필요한 라이브러리 금지
- 과도한 추상화 금지
- 복잡한 부분에는 의도를 설명하는 주석 추가
- 실제 실행 가능한 코드를 작성
- placeholder만 만들고 완료했다고 보고하지 않기

---

# 23. 최종 완료 조건

다음 조건을 모두 만족해야 한다.

- 서비스명이 Coffeecong Books로 표시된다.
- 관리자가 DOCX를 업로드할 수 있다.
- DOCX가 반응형 HTML Ebook으로 변환된다.
- 문서 내부 이미지가 표시된다.
- Ebook 목록에서 책을 선택할 수 있다.
- 데스크톱에서 양면 Reader가 작동한다.
- 모바일에서 단면 Reader가 작동한다.
- 글자와 문장이 화면 크기에 맞춰 재배치된다.
- 책장 넘김 효과가 작동한다.
- 글자 크기, 줄 간격, 테마를 변경할 수 있다.
- 읽던 위치가 복원된다.
- 각 Ebook에 공개 URL을 만들 수 있다.
- unlisted 공유 URL을 만들 수 있다.
- 링크를 받은 사람은 로그인 없이 어디서나 읽을 수 있다.
- 링크 복사, QR 코드, Web Share API가 작동한다.
- public, unlisted, private 권한이 정확히 구분된다.
- Supabase RLS가 적용된다.
- 공유 시 표지와 설명이 표시된다.
- 제공된 UI/UX 디자인과 전체적인 시각 방향이 일치한다.
- Vercel과 Supabase 프로덕션에서 정상 작동한다.

---

# 24. 최초 실행 명령

먼저 전체 요구사항을 검토하고 아래 선택 사항을 설명한다.

1. StPageFlip을 사용할지 대체 라이브러리를 사용할지
2. DOCX 변환을 서버에서 처리할지 브라우저에서 처리할지
3. 긴 문서의 페이지 계산 성능 전략
4. Supabase Storage 공개 및 비공개 bucket 정책
5. share token 생성 방식
6. RLS 설계 전략

그 후 Phase 1만 구현한다.

Phase 1이 완료되기 전에는 Phase 2 코드를 작성하지 않는다.
