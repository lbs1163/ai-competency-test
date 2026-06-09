import Link from "next/link";
import { ArrowRight, BrainCircuit, Route } from "lucide-react";

const games = [
  {
    href: "/mirror-path",
    title: "길 만들기 게임",
    description: "거울을 배치해 각 포트를 올바르게 연결하는 퍼즐 게임입니다.",
    icon: Route,
    accent: "from-emerald-500/15 to-teal-500/10",
    badge: "전략형",
  },
  {
    href: "/shape-memory",
    title: "도형 순서 기억하기",
    description: "3초마다 바뀌는 도형을 보고 2-back / 3-back 규칙으로 빠르게 판단합니다.",
    icon: BrainCircuit,
    accent: "from-sky-500/15 to-indigo-500/10",
    badge: "기억형",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-stone-500">AI 역량검사 연습 허브</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">게임을 선택해 훈련을 시작하세요</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
            기존 게임과 신규 게임을 각각 독립된 서브 URL로 분리했습니다. 앞으로 새로운 게임을 같은 방식으로 계속 추가할 수 있도록 허브 중심 구조로 구성했습니다.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          {games.map((game) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.href}
                href={game.href}
                className={`group rounded-[28px] border border-stone-200 bg-gradient-to-br ${game.accent} p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-stone-800 shadow-sm">
                    <Icon size={28} />
                  </div>
                  <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">{game.badge}</span>
                </div>
                <h2 className="mt-6 text-2xl font-bold text-stone-900">{game.title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">{game.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-900">
                  게임 시작하기 <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
