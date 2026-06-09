"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Play, RotateCcw, Timer } from "lucide-react";
import {
  ACTOR_LABEL,
  HAND_LABEL,
  HAND_SYMBOL,
  RPS_HANDS,
  RPS_ROUND_DURATION_MS,
  RPS_TOTAL_ROUNDS,
  createRpsSeed,
  generateRpsProblem,
  getHandFromKeyCode,
  isCorrectRpsAnswer,
  type RpsActor,
  type RpsHand,
  type RpsProblem,
  type RpsRound,
  type RpsRoundSummary,
} from "@/lib/rock-paper-scissors-game";

type Phase = "idle" | "playing" | "round-complete" | "finished";

const INITIAL_SEED = 20260609;

export default function RockPaperScissorsPage() {
  const [round, setRound] = useState<RpsRound>(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<RpsProblem>(() => generateRpsProblem(1, INITIAL_SEED));
  const [remainingMs, setRemainingMs] = useState(RPS_ROUND_DURATION_MS);
  const [roundSolved, setRoundSolved] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [summaries, setSummaries] = useState<RpsRoundSummary[]>([]);
  const [message, setMessage] = useState("시작 버튼을 눌러 1라운드를 시작하세요.");
  const [lastAnswer, setLastAnswer] = useState<{ hand: RpsHand; correct: boolean } | null>(null);

  const seconds = Math.ceil(remainingMs / 1000);
  const minutesText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const progressPercent = phase === "playing" ? `${((RPS_ROUND_DURATION_MS - remainingMs) / RPS_ROUND_DURATION_MS) * 100}%` : "0%";
  const totalCorrect = summaries.reduce((sum, item) => sum + item.correct, 0) + (phase === "finished" ? 0 : roundCorrect);
  const totalSolved = summaries.reduce((sum, item) => sum + item.solved, 0) + (phase === "finished" ? 0 : roundSolved);

  const roundInstruction = useMemo(() => {
    if (round === 1) return "1라운드: 물음표는 나의 손입니다. 나가 이기도록 선택하세요.";
    if (round === 2) return "2라운드: 물음표는 상대의 손입니다. 상대가 지도록 선택하세요.";
    return "3라운드: 물음표가 나 또는 상대 위치에 무작위로 제시됩니다.";
  }, [round]);

  const finishRound = useCallback(() => {
    setSummaries((current) => {
      const filtered = current.filter((item) => item.round !== round);
      return [...filtered, { round, solved: roundSolved, correct: roundCorrect }].sort((a, b) => a.round - b.round);
    });
    setRemainingMs(0);
    setLastAnswer(null);

    if (round < 3) {
      setPhase("round-complete");
      setMessage(`${round}라운드가 종료되었습니다. 다음 라운드로 이동하세요.`);
      return;
    }

    setPhase("finished");
    setMessage("모든 라운드가 종료되었습니다.");
  }, [round, roundCorrect, roundSolved]);

  useEffect(() => {
    if (phase !== "playing") return;

    const ticker = window.setInterval(() => {
      setRemainingMs((current) => {
        const next = Math.max(0, current - 1000);
        if (next === 0) finishRound();
        return next;
      });
    }, 1000);

    return () => window.clearInterval(ticker);
  }, [finishRound, phase]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const hand = getHandFromKeyCode(event.code);
      if (!hand) return;
      event.preventDefault();
      submitAnswer(hand);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function startRound(nextRound = round) {
    setRound(nextRound);
    setPhase("playing");
    setProblem(generateRpsProblem(nextRound, createRpsSeed()));
    setRemainingMs(RPS_ROUND_DURATION_MS);
    setRoundSolved(0);
    setRoundCorrect(0);
    setLastAnswer(null);
    setMessage(`${nextRound}라운드가 시작되었습니다. 물음표 카드의 손 모양을 선택하세요.`);
  }

  function submitAnswer(hand: RpsHand) {
    if (phase !== "playing") return;

    const correct = isCorrectRpsAnswer(problem, hand);
    setRoundSolved((count) => count + 1);
    if (correct) setRoundCorrect((count) => count + 1);
    setLastAnswer({ hand, correct });
    setMessage(
      correct
        ? "정답입니다! 나가 이기는 조합입니다."
        : `오답입니다. 정답은 ${HAND_LABEL[problem.answer]}입니다.`,
    );
    setProblem(generateRpsProblem(round, createRpsSeed()));
  }

  function moveToNextRound() {
    const nextRound = (round + 1) as RpsRound;
    startRound(nextRound);
  }

  function restartAll() {
    setSummaries([]);
    setRound(1);
    setPhase("idle");
    setProblem(generateRpsProblem(1, createRpsSeed()));
    setRemainingMs(RPS_ROUND_DURATION_MS);
    setRoundSolved(0);
    setRoundCorrect(0);
    setLastAnswer(null);
    setMessage("시작 버튼을 눌러 1라운드를 시작하세요.");
  }

  return (
    <main className="min-h-screen px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-stone-300 pb-4">
          <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900">
            <ArrowLeft size={16} /> 게임 허브로 돌아가기
          </Link>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">AI 역량검사 연습</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">가위 바위 보!</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <StatusPill icon={<Timer size={16} />} label={minutesText} strong />
              <StatusPill label={`${round}라운드`} />
              <StatusPill label={`정답 ${roundCorrect}개`} />
              <StatusPill label={`전체 ${totalCorrect}/${Math.max(totalSolved, 1)}`} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3 text-sm text-stone-600">
              <span className="font-semibold text-stone-800">{roundInstruction}</span>
              <span className="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-700">
                {ACTOR_LABEL[problem.perspective]} 입력
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: progressPercent }} />
            </div>

            <div className="mt-10 text-center text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">가위 바위 보!</div>

            <div className="mt-8 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 sm:gap-5">
              <ActorAvatar actor={problem.leftActor} active={problem.leftActor === problem.perspective} />
              <RpsCard hand={problem.leftHand} question={problem.questionSide === "left"} />
              <div className="text-center text-2xl font-black text-stone-300">VS</div>
              <RpsCard hand={problem.rightHand} question={problem.questionSide === "right"} />
              <ActorAvatar actor={problem.rightActor} active={problem.rightActor === problem.perspective} />
            </div>

            <div className="mx-auto mt-7 max-w-xl rounded-2xl bg-slate-50 p-4 text-center">
              <p className="font-semibold text-stone-800">{message}</p>
              <p className="mt-1 text-sm text-stone-500">
                왼쪽 물음표는 나의 손이므로 이기는 손을, 오른쪽 물음표는 상대의 손이므로 지는 손을 고르세요.
              </p>
              {lastAnswer && (
                <p className={lastAnswer.correct ? "mt-2 text-sm font-bold text-teal-700" : "mt-2 text-sm font-bold text-rose-600"}>
                  직전 입력: {HAND_LABEL[lastAnswer.hand]} · {lastAnswer.correct ? "정답" : "오답"}
                </p>
              )}
            </div>

            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
              {RPS_HANDS.map((item) => (
                <button
                  key={item.hand}
                  type="button"
                  onClick={() => submitAnswer(item.hand)}
                  disabled={phase !== "playing"}
                  className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition enabled:hover:border-teal-300 enabled:hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="text-2xl">{item.hotkey}</span>
                  <span className="mt-1 text-sm font-bold text-stone-900">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="rounded-3xl bg-teal-50 p-4">
              <div className="text-sm font-bold text-teal-800">게임 규칙</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-teal-900/80">
                <li>• 총 3라운드, 각 라운드 1분입니다.</li>
                <li>• 1라운드는 나의 손, 2라운드는 상대의 손을 입력합니다.</li>
                <li>• 3라운드는 물음표 위치가 무작위로 나옵니다.</li>
                <li>• ← 가위, ↓ 바위, → 보를 입력합니다.</li>
              </ul>
            </div>

            <div className="grid gap-2">
              {phase === "idle" && <ActionButton icon={<Play size={16} />} label="1라운드 시작" onClick={() => startRound(1)} primary />}
              {phase === "round-complete" && <ActionButton icon={<Play size={16} />} label={`${round + 1}라운드 시작`} onClick={moveToNextRound} primary />}
              <ActionButton icon={<RotateCcw size={16} />} label="처음부터 다시" onClick={restartAll} />
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <div className="text-sm font-bold text-stone-800">라운드 결과</div>
              <div className="mt-3 grid gap-2 text-sm text-stone-600">
                {RPS_TOTAL_ROUNDS.map((value) => {
                  const saved = summaries.find((item) => item.round === value);
                  const isCurrent = value === round && phase !== "finished";
                  const solved = isCurrent ? roundSolved : (saved?.solved ?? 0);
                  const correct = isCurrent ? roundCorrect : (saved?.correct ?? 0);
                  return (
                    <div key={value} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
                      <span>{value}라운드</span>
                      <span className="font-semibold text-stone-900">{solved > 0 ? `${correct} / ${solved}` : "대기 중"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {phase === "finished" && (
              <div className="rounded-3xl bg-stone-900 p-5 text-white">
                <div className="text-sm font-semibold text-stone-300">최종 결과</div>
                <div className="mt-2 text-3xl font-black">{totalCorrect} / {totalSolved}</div>
                <p className="mt-2 text-sm text-stone-300">정확도 {Math.round((totalCorrect / Math.max(totalSolved, 1)) * 100)}%</p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function ActorAvatar({ actor, active }: { actor: RpsActor; active: boolean }) {
  const isMe = actor === "me";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={active ? "rounded-full bg-teal-100 p-2 shadow-[0_0_0_6px_rgba(20,184,166,0.12)]" : "rounded-full bg-stone-100 p-2"}>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-5xl shadow-sm sm:h-28 sm:w-28">
          {isMe ? "🦝" : "🦦"}
        </div>
      </div>
      <div className={isMe ? "font-bold text-stone-900" : "font-bold text-teal-600"}>{ACTOR_LABEL[actor]}</div>
    </div>
  );
}

function RpsCard({ hand, question }: { hand: RpsHand | null; question: boolean }) {
  return (
    <div
      className={
        question
          ? "flex h-28 w-20 items-center justify-center rounded-2xl border-4 border-white bg-stone-300 text-5xl font-black text-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] sm:h-36 sm:w-28"
          : "flex h-28 w-20 flex-col items-center justify-center rounded-2xl border-4 border-white bg-teal-100 text-teal-700 shadow-[0_10px_28px_rgba(15,23,42,0.12)] sm:h-36 sm:w-28"
      }
    >
      {question ? (
        "?"
      ) : (
        <>
          <span className="text-4xl sm:text-5xl">{hand ? HAND_SYMBOL[hand] : ""}</span>
          <span className="mt-2 text-xs font-bold sm:text-sm">{hand ? HAND_LABEL[hand] : ""}</span>
        </>
      )}
    </div>
  );
}

function StatusPill({ icon, label, strong }: { icon?: React.ReactNode; label: string; strong?: boolean }) {
  return (
    <span className={strong ? "inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-3 py-2 text-white" : "rounded-2xl bg-stone-100 px-3 py-2 text-stone-700"}>
      {icon}
      {label}
    </span>
  );
}

function ActionButton({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      }
    >
      {icon}
      {label}
    </button>
  );
}
