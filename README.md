# OtaFetch

서울 코믹월드, 일러스타 페스티벌 등 서브컬처 행사 굿즈 대리구매 플랫폼

**배포 URL**: https://otafetch.vercel.app

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 18, Vite, Tailwind CSS v4 |
| 백엔드 | Vercel Serverless Functions (Node.js) |
| 인증 | Clerk (이메일/비밀번호 + Google 소셜 로그인) |
| 데이터베이스 | Google Sheets API (Service Account) |
| 배포 | Vercel |

---

## 폴더 구조

```
otafetch/
├── frontend/
│   ├── api/                      # 백엔드 서버리스 함수
│   │   ├── _lib/
│   │   │   └── sheets.js         # Google Sheets 연동 헬퍼
│   │   ├── events.js             # GET /api/events, POST /api/events
│   │   ├── requests.js           # GET /api/requests, POST /api/requests
│   │   ├── requests/
│   │   │   └── [id]/
│   │   │       └── status.js     # PATCH /api/requests/:id/status
│   │   └── users/
│   │       └── [username].js     # GET /api/users/:username
│   ├── src/
│   │   ├── App.jsx               # 메인 앱 컴포넌트
│   │   ├── main.jsx              # 앱 진입점 (ClerkProvider)
│   │   └── index.css             # Apple 디자인 시스템 CSS
│   ├── public/                   # 정적 에셋
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   └── package.json
└── vercel.json                   # 루트 Vercel 빌드 설정
```

---

## 주요 기능

- **Shop**: 등록된 이벤트 목록 조회 및 굿즈 신청
- **Status**: 아이디로 신청 현황 조회 및 배송 단계 추적
- **Buyer**: 신청서 작성 (이름, 부스명, 주소, 상품명, 수량)
- **Admin**: 전체 신청 목록 조회 및 상태 변경 (신청완료 → 구매완료 → 배송중 → 수령완료)
- **인증**: Clerk 기반 이메일/비밀번호 회원가입 및 Google 소셜 로그인

---

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 환경변수 설정

`frontend/.env.local` 파일 생성:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
GOOGLE_CLIENT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SPREADSHEET_ID=your_spreadsheet_id
```

### 3. 로컬 서버 실행

```bash
npm run dev
```

> `/api` 요청은 `vite.config.js`의 proxy 설정을 통해 배포된 서버로 전달됩니다.

---

## Google Sheets 구조

### `events` 시트

| id | name | date |
|----|------|------|
| 1 | 서울 코믹월드 5월 | 2026-05-18 |

### `requests` 시트

| id | event_id | event_name | buyer_id | name | circle_name | address | item_name | quantity | status | created_at |
|----|----------|------------|----------|------|-------------|---------|-----------|----------|--------|------------|

---

## 배포

```bash
cd frontend
vercel --prod
```

### Vercel 환경변수 (필수)

| 키 | 설명 |
|----|------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key |
| `CLERK_SECRET_KEY` | Clerk Secret Key |
| `GOOGLE_CLIENT_EMAIL` | Google 서비스 계정 이메일 |
| `GOOGLE_PRIVATE_KEY` | Google 서비스 계정 Private Key |
| `SPREADSHEET_ID` | Google 스프레드시트 ID |

---

## 어드민 계정 설정

1. Clerk 대시보드 → **Users**
2. 어드민으로 지정할 계정 클릭
3. **Public metadata** 섹션에 입력:

```json
{ "role": "admin" }
```
