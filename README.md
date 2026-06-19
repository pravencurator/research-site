This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## KRX 유니버스 수동 갱신 (주 1회 권장)

`data/krx-universe.json`에는 코스피 + 코스닥 전체 상장종목 목록이 저장됩니다.
시장 신규 상장·상장폐지를 반영하기 위해 **매주 월요일** 수동으로 갱신합니다.

### 실행 방법

```bash
# 기본 실행 (KRX data.krx.co.kr — API 키 불필요)
npm run fetch-krx

# 공공데이터포털 소스 사용 시 (KRX 접근 불가 등 대안)
PUBLIC_DATA_API_KEY=발급받은키 npm run fetch-krx
```

> **공공데이터포털 API 키 발급**: [data.go.kr](https://www.data.go.kr) → 금융위원회_주식시세정보 신청

### 우선순위 소스

| 순위 | 소스 | API 키 | 시가총액 |
|------|------|--------|---------|
| 1 | KRX data.krx.co.kr | 불필요 | 직접 제공 (억원) |
| 2 | 공공데이터포털 금융위원회_주식시세정보 | `PUBLIC_DATA_API_KEY` 필요 | 종가×상장주식수 산출 |

### 출력 파일 형식

`data/krx-universe.json`:
```json
{
  "fetchedAt": "2026-06-19T03:00:00.000Z",
  "source": "KRX data.krx.co.kr (trdDd=20260619)",
  "count": 2650,
  "kospiCount": 830,
  "kosdaqCount": 1820,
  "stocks": [
    { "ticker": "005930", "name": "삼성전자", "market": "KOSPI", "marketCap": 3800000 },
    { "ticker": "000660", "name": "SK하이닉스", "market": "KOSPI", "marketCap": 1200000 }
  ]
}
```

### GitHub Actions 자동화 (선택)

`.github/workflows/fetch-krx.yml`에 아래 내용을 추가하면 매주 월요일 자동 실행됩니다:

```yaml
name: Fetch KRX Universe
on:
  schedule:
    - cron: '0 1 * * MON'   # 매주 월요일 10:00 KST
  workflow_dispatch:

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run fetch-krx
        env:
          PUBLIC_DATA_API_KEY: ${{ secrets.PUBLIC_DATA_API_KEY }}
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'data: weekly KRX universe update'
          file_pattern: 'data/krx-universe.json'
```
