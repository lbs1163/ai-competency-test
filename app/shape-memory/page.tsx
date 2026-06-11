"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Play, RotateCcw } from "lucide-react";
import {
  SHAPE_DEFINITIONS,
  createShapeMemorySeed,
  generateShapeMemorySequence,
  getRoundConfig,
  type ShapeId,
  type ShapeMemoryRound,
  type ShapeResponse,
} from "@/lib/shape-game";

type AnswerLog = {
  index: number;
  response: ShapeResponse;
  correct: boolean;
};

type Phase = "idle" | "playing" | "round-complete" | "finished";

type RoundSummary = {
  round: ShapeMemoryRound;
  totalQuestions: number;
  correctAnswers: number;
};

const GRACE_PERIOD_MS = 1000;

export default function ShapeMemoryPage() {
  const [round, setRound] = useState<ShapeMemoryRound>(1);
  const [sequence, setSequence] = useState(() => generateShapeMemorySequence(1, 20260609));
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [roundSummaries, setRoundSummaries] = useState<RoundSummary[]>([]);
  const [remainingMs, setRemainingMs] = useState(getRoundConfig(1).durationMs + GRACE_PERIOD_MS);
  const answersRef = useRef<AnswerLog[]>([]);

  const config = useMemo(() => getRoundConfig(round), [round]);
  const currentItem = sequence[currentIndex];
  const currentShape = phase === "playing" ? currentItem?.shape : undefined;
  const answeredIndices = useMemo(() => new Set<number>(answers.map((item) => item.index)), [answers]);
  const isWarmup = currentIndex < config.warmupCount;
  const totalWindowMs = config.durationMs + GRACE_PERIOD_MS;
  const elapsedDisplayMs = Math.min(Math.max(totalWindowMs - remainingMs, 0), config.durationMs);
  const countdownSeconds = Math.ceil(Math.max(config.durationMs - elapsedDisplayMs, 0) / 1000);
  const progressPercent = phase === "playing" ? `${(elapsedDisplayMs / config.durationMs) * 100}%` : "0%";
  const totalQuestionCount = Math.max(sequence.length - config.warmupCount, 0);
  const solvedQuestionOffset = Math.max(currentIndex - config.warmupCount, 0);
  const remainingQuestionCount =
    phase === "finished" || phase === "round-complete"
      ? 0
      : Math.max(totalQuestionCount - solvedQuestionOffset, 0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  function initializeRound(nextRound: ShapeMemoryRound) {
    const nextConfig = getRoundConfig(nextRound);
    setRound(nextRound);
    setSequence(generateShapeMemorySequence(nextRound, createShapeMemorySeed()));
    setPhase("idle");
    setCurrentIndex(0);
    setAnswers([]);
    setRemainingMs(nextConfig.durationMs + GRACE_PERIOD_MS);
  }

  function startRound(nextRound = round) {
    const nextConfig = getRoundConfig(nextRound);
    setRound(nextRound);
    setSequence(generateShapeMemorySequence(nextRound, createShapeMemorySeed()));
    setPhase("playing");
    setCurrentIndex(0);
    setAnswers([]);
    setRemainingMs(nextConfig.durationMs + GRACE_PERIOD_MS);
  }

  const submitResponse = useCallback((response: ShapeResponse) => {
    if (phase !== "playing") return;
    if (isWarmup) return;
    if (answeredIndices.has(currentIndex)) return;

    const correct = currentItem?.expectedResponse === response;
    setAnswers((current) => [...current, { index: currentIndex, response, correct: Boolean(correct) }]);
  }, [answeredIndices, currentIndex, currentItem?.expectedResponse, isWarmup, phase]);

  useEffect(() => {
    if (phase !== "playing") return;

    const deadline = window.setTimeout(() => {
      setCurrentIndex((index) => {
        const nextIndex = index + 1;
        if (nextIndex >= sequence.length) {
          const totalQuestions = Math.max(sequence.length - config.warmupCount, 0);
          const correctAnswers = answersRef.current.filter((item) => item.correct).length;
          const summary = { round, totalQuestions, correctAnswers };
          setRoundSummaries((current: RoundSummary[]) => {
            const filtered = current.filter((item) => item.round !== round);
            return [...filtered, summary].sort((a, b) => a.round - b.round);
          });
          if (round === 1) setPhase("round-complete");
          else setPhase("finished");
          return index;
        }
        return nextIndex;
      });
      setRemainingMs(totalWindowMs);
    }, totalWindowMs);

    const ticker = window.setInterval(() => {
      setRemainingMs((time: number) => Math.max(0, time - 100));
    }, 100);

    return () => {
      window.clearTimeout(deadline);
      window.clearInterval(ticker);
    };
  }, [currentIndex, phase, totalWindowMs, config.durationMs, config.warmupCount, round, sequence.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "playing") return;
      if (event.code === "Space") {
        event.preventDefault();
        submitResponse("different");
      }
      if (event.code === "ArrowLeft") {
        event.preventDefault();
        submitResponse("match-2");
      }
      if (event.code === "ArrowRight" && round === 2) {
        event.preventDefault();
        submitResponse("match-3");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, round, submitResponse]);

  function restartAll() {
    setRoundSummaries([]);
    initializeRound(1);
  }

  const currentSummary = roundSummaries.find((item) => item.round === round);

  return (
    <main className="min-h-screen px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-stone-300 pb-4">
          <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900">
            <ArrowLeft size={16} /> 게임 허브로 돌아가기
          </Link>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-700">AI 역량검사 연습</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">도형 순서 기억하기</h1>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-stone-600">키보드와 모바일 터치 모두 지원합니다. 각 도형은 3초 동안 제시됩니다.</p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-stone-700">
                <span>{round}라운드</span>
                <span>{countdownSeconds}초</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">{config.instruction}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 p-4">
              <div className="text-sm font-semibold text-stone-800">입력 안내</div>
              <div className="mt-3 grid gap-2">
                {config.actions.map((action) => (
                  <div key={action.response} className="flex items-center justify-between rounded-2xl bg-stone-50 px-3 py-3 text-sm">
                    <span className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold text-stone-700">{action.hotkey}</span>
                    <span className="text-right text-stone-600">
                      <strong className="mr-1 text-stone-900">{action.label}</strong>
                      {action.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              {phase !== "playing" && (
                <>
                  <ActionButton icon={<Play size={16} />} label="1라운드 도전" onClick={() => startRound(1)} primary={round === 1} />
                  <ActionButton icon={<Play size={16} />} label="2라운드 도전" onClick={() => startRound(2)} primary={round === 2} />
                </>
              )}
              <ActionButton icon={<RotateCcw size={16} />} label="처음부터 다시" onClick={restartAll} />
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              <div className="font-semibold text-stone-800">진행 현황</div>
              <div className="mt-2 space-y-1">
                <p>현재 순서: {Math.min(currentIndex + 1, sequence.length)} / {sequence.length}</p>
                <p>판단 문항 수: {totalQuestionCount}개</p>
                <p>현재 정답 수: {answers.filter((item) => item.correct).length}개</p>
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-500 sm:text-sm">
              <span>{config.instruction}</span>
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-stone-100 px-3 py-1 text-stone-700">남은 문항 {remainingQuestionCount}</span>
                <span className="rounded-xl bg-slate-100 px-3 py-1 text-slate-700">{countdownSeconds}</span>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-sky-500 transition-all duration-100" style={{ width: progressPercent }} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,420px)_minmax(280px,1fr)] lg:items-center">
              <div className="flex justify-center">
                <div className="flex h-[320px] w-[260px] items-center justify-center rounded-[36px] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.98),rgba(245,245,245,0.96))] shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
                  <div className="flex h-[230px] w-[170px] items-center justify-center rounded-[28px] border border-stone-100 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                    {currentShape ? <ShapeCard shape={currentShape} /> : <div className="text-stone-400">준비</div>}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-3xl bg-stone-50 p-5 text-center">
                  <p className="text-xl font-bold text-stone-800">{phase === "playing" ? (isWarmup ? "제시되는 도형을 기억해 주세요." : "지금 도형을 판단해 주세요.") : phase === "round-complete" || phase === "finished" ? `${round}라운드가 끝났습니다.` : `${round}라운드를 시작해 주세요.`}</p>
                  <p className="mt-2 text-sm text-stone-600">
                    {phase === "finished" || phase === "round-complete"
                      ? `이번 라운드는 ${currentSummary?.totalQuestions ?? 0}문항 중 ${currentSummary?.correctAnswers ?? 0}개를 맞혔습니다.`
                      : isWarmup
                        ? `${config.warmupCount}개의 초기 도형을 기억하는 구간입니다.`
                        : "키보드 또는 아래 버튼으로 응답할 수 있습니다."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {config.actions.map((action) => {
                    const disabled = phase !== "playing" || (isWarmup && action.response !== "different" && action.response !== "match-2" && action.response !== "match-3") || answeredIndices.has(currentIndex);
                    return (
                      <button
                        key={action.response}
                        type="button"
                        onClick={() => submitResponse(action.response)}
                        disabled={disabled || (action.response === "match-3" && round === 1)}
                        className="flex min-h-16 items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition enabled:hover:border-sky-300 enabled:hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700">{action.hotkey}</span>
                        <span className="ml-3 text-right text-sm text-stone-600">
                          <strong className="block text-base text-stone-900">{action.label}</strong>
                          {action.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-stone-200 p-4">
                  <div className="text-sm font-semibold text-stone-800">라운드 결과</div>
                  <div className="mt-2 grid gap-2 text-sm text-stone-600">
                    {[1, 2].map((value) => {
                      const summary = roundSummaries.find((item) => item.round === value);
                      return (
                        <div key={value} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                          <span>{value}라운드</span>
                          <span className="font-semibold text-stone-900">{summary ? `${summary.correctAnswers} / ${summary.totalQuestions}` : "대기 중"}</span>
                        </div>
                      );
                    })}
                  </div>
                  {currentSummary && <p className="mt-3 text-xs text-stone-500">이번 라운드 정확도: {Math.round((currentSummary.correctAnswers / Math.max(currentSummary.totalQuestions, 1)) * 100)}%</p>}
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ActionButton({ icon, label, onClick, primary }: { icon: ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      }
    >
      {icon}
      {label}
    </button>
  );
}

function ShapeCard({ shape }: { shape: ShapeId }) {
  const color = "#5cc8c5";

  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36" aria-label={SHAPE_DEFINITIONS.find((item) => item.id === shape)?.label} role="img">
      {renderShape(shape, color)}
    </svg>
  );
}

function renderShape(shape: ShapeId, color: string) {
  switch (shape) {
    case "triangle":
      return <polygon points="60,18 95,92 25,92" fill={color} />;
    case "circle":
      return <circle cx="60" cy="60" r="34" fill={color} />;
    case "square":
      return <rect x="26" y="26" width="68" height="68" fill={color} />;
    case "trapezoid":
      return <polygon points="35,25 85,25 95,95 25,95" fill={color} />;
    case "hourglass":
      return <path d="M28 26 H92 Q88 48 68 56 Q88 64 92 94 H28 Q32 64 52 56 Q32 48 28 26 Z" fill={color} />;
    case "pentagon":
      return <polygon points="60,18 98,48 82,95 38,95 22,48" fill={color} />;
    case "diamond":
      return <polygon points="60,16 100,60 60,104 20,60" fill={color} />;
    case "bowtie":
      return <path d="M24 30 C46 30 46 48 60 60 C46 72 46 90 24 90 L24 30 Z M96 30 C74 30 74 48 60 60 C74 72 74 90 96 90 L96 30 Z" fill={color} />;
    case "star":
      return <path d="M60 16 L71 46 L103 46 L77 64 L87 95 L60 76 L33 95 L43 64 L17 46 L49 46 Z" fill={color} />;
    case "steps":
      return <path d="M26 86 H42 V70 H58 V54 H74 V38 H90 V86 Z" fill={color} />;
    case "twin-spike":
      return <path d="M24 24 H50 L42 96 L24 24 Z M96 24 H70 L78 96 L96 24 Z" fill={color} />;
    case "pyramid":
      return <path d="M24 88 H96 V74 H84 V60 H72 V46 H60 V32 H48 V46 H36 V60 H24 V88 Z" fill={color} />;
    case "double-triangle":
      return <path d="M60 18 L98 56 H22 L60 18 Z M60 102 L22 64 H98 L60 102 Z" fill={color} />;
    case "petal":
      return <path d="M60 60 C60 36 42 18 26 18 C26 42 40 54 60 60 C40 66 26 78 26 102 C42 102 60 84 60 60 C60 84 78 102 94 102 C94 78 80 66 60 60 C80 54 94 42 94 18 C78 18 60 36 60 60 Z" fill={color} />;
    case "zigzag":
      return <path d="M18 64 L34 28 L50 64 L66 28 L82 64 L98 28 L102 40 L86 92 L70 56 L54 92 L38 56 L22 92 L18 64 Z" fill={color} />;
  }
}