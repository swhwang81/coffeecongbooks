# 관리자 계정 생성

이 앱은 회원가입 기능이 없다(MVP 범위 밖, spec §20). 관리자 계정은 Supabase Auth에 사용자를 먼저 만들고, `admin_profiles` 테이블에 역할을 부여하는 두 단계로 생성한다.

## 역할(role) 체계

`admin_profiles.role`은 셋 중 하나다 — 코드 기준은 `src/lib/auth/server.ts`의 `isRoleAtLeast()`.

| role | 권한 |
|---|---|
| `editor` | 도서 등록·수정, 카테고리/태그 조회 |
| `admin` | editor 권한 + 카테고리 관리, 사용자 관리, 설정 |
| `super_admin` | admin 권한 전체 (현재 코드상 admin과 동일 게이트를 씀 — 향후 확장용) |

세션과 role은 매 요청마다 서버에서 재검증한다(`getAdminSession()`, `requireAdmin()`) — 클라이언트가 보낸 role은 절대 신뢰하지 않는다.

## 1단계 — Supabase Auth 사용자 생성

Supabase 대시보드에서:

1. **Authentication → Users → Add user**
2. 이메일·비밀번호 입력
3. **Auto Confirm User** 체크 (이메일 인증 절차를 생략 — 관리자 계정이므로 즉시 로그인 가능해야 함)

또는 CLI로:

```bash
# service role key 필요 (.env.local의 SUPABASE_SERVICE_ROLE_KEY)
curl -X POST "https://<project-ref>.supabase.co/auth/v1/admin/users" \
  -H "apikey: <service-role-key>" \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"new-admin@example.com","password":"<임시 비밀번호>","email_confirm":true}'
```

## 2단계 — `admin_profiles`에 역할 부여

`POST /api/admin/assign-by-email`을 호출한다 (`src/app/api/admin/assign-by-email/route.ts`). 이 엔드포인트는 `requireAdminBootstrap()`으로 보호된다:

- **`admin_profiles`가 비어 있으면** (최초 1명) — 로그인한 사용자라면 누구나 자기 자신 또는 남을 관리자로 지정할 수 있다. 최초 부트스트랩 전용 예외.
- **이미 1명 이상 있으면** — 호출자가 반드시 기존 `admin`/`super_admin`이어야 한다.

```bash
# 이미 로그인한 관리자 브라우저 세션의 쿠키를 사용하거나,
# 최초 부트스트랩이라면 방금 만든 계정으로 /admin/login에서 로그인한 뒤
# 브라우저 개발자 도구에서 세션 쿠키를 복사해 사용한다.
curl -X POST "https://books.coffeecong.com/api/admin/assign-by-email" \
  -H "Content-Type: application/json" \
  -H "Cookie: <로그인한 admin의 세션 쿠키>" \
  -d '{"email":"new-admin@example.com","role":"editor"}'
```

`role`은 `editor`(기본값) / `admin` / `super_admin` 중 하나. 응답이 `{"ok":true,...}`이면 완료 — 해당 이메일로 `/admin/login`에서 바로 로그인 가능하다.

### 최초 관리자(이 프로젝트의 시드 계정)

현재 프로덕션에는 이미 `admin@coffeecongbooks.com` (role: `admin`)이 시드되어 있다. 새 환경(별도 Supabase 프로젝트)으로 옮길 때만 위 부트스트랩 절차가 필요하다.

## 관리자 삭제/역할 변경

전용 UI는 없다 — Supabase 대시보드에서 `admin_profiles` 테이블 행을 직접 수정/삭제하거나, `assign-by-email`을 다른 role로 다시 호출해 덮어쓴다(`upsert`). Auth 사용자 자체를 지우려면 **Authentication → Users**에서 삭제 — `admin_profiles.user_id`가 `auth.users(id)`를 참조하므로 함께 정리해야 한다.
