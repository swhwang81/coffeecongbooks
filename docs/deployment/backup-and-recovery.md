# 백업 및 복구 가이드

백업 대상은 두 가지 — **Postgres 데이터베이스**(도서 메타데이터·본문·목차 JSON 등)와 **Storage 버킷**(원본 DOCX·표지·본문 삽입 이미지). 스키마 자체는 `supabase/migrations/*.sql`이 코드로 관리하므로, "백업"이 실제로 지켜야 하는 건 **데이터**다.

## 무엇이 어디에 있는가

| 대상 | 위치 | 내용 |
|---|---|---|
| DB 스키마 | `supabase/migrations/*.sql` (git 관리) | `books`, `categories`, `tags`, `book_categories`, `book_tags`, `admin_profiles`, `reading_progress`, `book_views` 테이블 + RLS 정책 |
| DB 데이터 | Supabase Postgres (git에 없음) | 위 테이블의 실제 행 — **이게 진짜 백업 대상** |
| `book-originals` | Storage 버킷 (비공개) | 업로드된 원본 `.docx` — 재변환(reconvert)에 필요 |
| `book-covers` | Storage 버킷 (공개) | 표지 이미지(webp) |
| `book-assets` | Storage 버킷 (공개) | DOCX 안에 삽입되어 있던 이미지 |

`books.content_html`/`content_json`/`toc_json`은 DB 안에 있으므로(원본 DOCX를 다시 변환하지 않아도) DB만 복구하면 Reader는 정상 작동한다. 원본 DOCX(`book-originals`)는 "재변환" 기능을 쓸 때만 필요.

## 정기 백업

### Postgres

Supabase 유료 플랜은 **Point-in-Time Recovery(PITR)**를 대시보드에서 켤 수 있다 — **Project Settings → Database → Backups**. 켜두면 이 문서에서 설명하는 수동 백업은 사고 대비용 이중 안전장치 정도로만 필요하다.

수동 덤프(Supabase CLI, 프로젝트에 이미 링크되어 있다면):

```bash
supabase db dump --data-only -f backup-$(date +%Y%m%d).sql
```

스키마까지 포함한 전체 덤프가 필요하면 `--data-only`를 빼되, 이 경우 `supabase/migrations`와 중복되니 보통은 데이터만 덤프하는 쪽을 권장.

### Storage

Supabase CLI에 버킷 전체를 한 번에 내려받는 명령은 없다 — REST API로 순회하며 다운로드한다:

```bash
# 예시: book-covers 버킷 전체를 로컬로 미러링
npx supabase storage ls ss://book-covers --linked
# 개별 파일은 storage.from(bucket).download(path)를 쓰는 짧은 스크립트로 순회 다운로드
```

파일 수가 적을 동안은(이 프로젝트 규모 기준) Supabase 대시보드 **Storage** 탭에서 버킷별로 수동 다운로드해도 충분하다.

## 복구

### 새 Supabase 프로젝트로 완전히 옮길 때

1. 새 프로젝트 생성 후 `supabase link --project-ref <new-ref>`
2. `supabase db push` — `supabase/migrations/`의 모든 마이그레이션을 순서대로 적용해 스키마·RLS·Storage 버킷 설정을 재현
3. 데이터 덤프를 새 프로젝트에 복원:
   ```bash
   psql "<new-project-connection-string>" -f backup-YYYYMMDD.sql
   ```
4. Storage 버킷에 백업해둔 파일들을 재업로드 (경로 규칙 유지: `book-covers/{bookId}/cover.webp`, `book-assets/{bookId}/{key}.<ext>`, `book-originals/{bookId}/original.docx`)
5. `.env.local`(로컬) / Vercel 환경 변수(배포)의 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY`를 새 프로젝트 값으로 교체
6. 관리자 계정 재생성 — [admin-setup.md](./admin-setup.md)

### 특정 도서만 실수로 삭제했을 때

PITR이 켜져 있다면 Supabase 대시보드에서 삭제 시점 이전으로 **프로젝트 전체를 되돌리는** 방식만 제공한다(테이블 단위 부분 복구는 아님) — 되돌리면 그 시점 이후의 다른 변경사항도 함께 사라지므로, 삭제된 도서 하나 때문에 전체 롤백을 할지는 신중히 판단한다. 더 안전한 대안은 정기적으로 뜬 수동 데이터 덤프에서 해당 행만 골라 `INSERT`로 복원하는 것.

### 마이그레이션이 꼬였을 때

`supabase/migrations/*.sql`은 각 파일이 `if not exists`/`on conflict do nothing` 등으로 재실행 안전하게 작성돼 있다(001, 002 참고) — 이미 적용된 마이그레이션을 다시 `db push`해도 대부분 안전하다. 그래도 프로덕션에 직접 `db push`하기 전에는 반드시 스테이징 프로젝트나 로컬 Supabase(`supabase start`)에서 먼저 검증한다.

## 체크리스트 (배포 전 최종 확인)

- [ ] `supabase migration list` 로 로컬 `migrations/` 폴더와 원격 프로젝트의 적용 이력이 일치하는지 확인
- [ ] 세 버킷(`book-originals`/`book-covers`/`book-assets`)이 실제로 존재하고 public/private 설정이 마이그레이션과 일치하는지 확인
- [ ] `.env.local`에만 있고 git에는 없는 `SUPABASE_SERVICE_ROLE_KEY`가 Vercel 환경 변수에도 등록돼 있는지 확인 (배포 환경에 없으면 관리자 API 전체가 500 에러)
