# AI Competency Test

Next.js로 만든 격자 기반 거울 퍼즐 게임입니다. 사용자는 `/` 또는 `\` 거울을 배치해 같은 색상의 입구와 출구가 연결되도록 경로를 완성합니다.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Vitest

## Getting Started

의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 확인합니다.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## Project Structure

```text
app/          Next.js App Router 화면과 전역 스타일
lib/          게임 생성, 판정, 풀이 로직
```
