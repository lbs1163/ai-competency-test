"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, List, Play, RotateCcw, X } from "lucide-react";
import {
  SHAPE_DEFINITIONS,
  SHAPE_MEMORY_SETS,
  createShapeMemorySeed,
  generateShapeMemorySequence,
  getRoundConfig,
  pickShapeMemorySet,
  type ShapeId,
  type ShapeMemoryRound,
  type ShapeMemoryShapeSet,
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
  const [activeShapeSet, setActiveShapeSet] = useState<ShapeMemoryShapeSet>(() => pickShapeMemorySet(20260609));
  const [sequence, setSequence] = useState(() => generateShapeMemorySequence(1, 20260609, pickShapeMemorySet(20260609)));
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [roundSummaries, setRoundSummaries] = useState<RoundSummary[]>([]);
  const [remainingMs, setRemainingMs] = useState(getRoundConfig(1).durationMs + GRACE_PERIOD_MS);
  const [showShapeCatalog, setShowShapeCatalog] = useState(false);
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
    const nextShapeSet = pickShapeMemorySet(createShapeMemorySeed());
    setActiveShapeSet(nextShapeSet);
    setRound(nextRound);
    setSequence(generateShapeMemorySequence(nextRound, createShapeMemorySeed(), nextShapeSet));
    setPhase("idle");
    setCurrentIndex(0);
    setAnswers([]);
    setRemainingMs(nextConfig.durationMs + GRACE_PERIOD_MS);
  }

  function startRound(nextRound = round) {
    const nextConfig = getRoundConfig(nextRound);
    const shouldStartNewGame = roundSummaries.length === 0 && phase === "idle";
    const nextShapeSet = shouldStartNewGame ? pickShapeMemorySet(createShapeMemorySeed()) : activeShapeSet;
    if (shouldStartNewGame) setActiveShapeSet(nextShapeSet);
    setRound(nextRound);
    setSequence(generateShapeMemorySequence(nextRound, createShapeMemorySeed(), nextShapeSet));
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
              <ActionButton icon={<List size={16} />} label="도형 목록" onClick={() => setShowShapeCatalog(true)} />
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
      {showShapeCatalog && <ShapeCatalogModal onClose={() => setShowShapeCatalog(false)} />}
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

function ShapeCard({ shape, className = "h-36 w-36" }: { shape: ShapeId; className?: string }) {
  const color = "#5cc8c5";

  return (
    <svg viewBox="0 0 120 120" className={className} aria-label={SHAPE_DEFINITIONS.find((item) => item.id === shape)?.label} role="img">
      {renderShape(shape, color)}
    </svg>
  );
}

function ShapeCatalogModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4 py-6" role="dialog" aria-modal="true" aria-label="도형 목록">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="도형 목록 닫기" onClick={onClose} />
      <section className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">도형 목록</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:bg-stone-50"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {SHAPE_MEMORY_SETS.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-3 border-b border-stone-200 last:border-b-0">
              {row.map((shape) => (
                <div key={shape} className="flex aspect-square items-center justify-center border-r border-stone-200 last:border-r-0">
                  <ShapeCard shape={shape} className="h-20 w-20 sm:h-24 sm:w-24" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function renderShape(shape: ShapeId, color: string) {
  switch (shape) {
    case "triangle":
      return <polygon points="60,10 103,97 17,97" fill={color} />;
    case "circle":
      return <circle cx="60" cy="60" r="38" fill={color} />;
    case "square":
      return <rect x="22" y="22" width="76" height="76" fill={color} />;
    case "trapezoid":
      return <polygon points="33,23 87,23 98,98 22,98" fill={color} />;
    case "hourglass":
      return <path d="M24 22 H96 C96 44 78 54 65 59 C78 64 96 76 96 98 H24 C24 76 42 64 55 59 C42 54 24 44 24 22 Z" fill={color} />;
    case "pentagon":
      return <polygon points="39,22 81,22 105,56 60,104 15,56" fill={color} />;
    case "diamond":
      return <polygon points="60,12 104,60 60,108 16,60" fill={color} />;
    case "bowtie":
      return <path d="M18 24 C42 24 54 42 59 56 C64 42 78 24 102 24 V96 C78 96 64 78 59 64 C54 78 42 96 18 96 Z" fill={color} />;
    case "star":
      return <path d="M60 16 L71 46 L103 46 L77 64 L87 95 L60 76 L33 95 L43 64 L17 46 L49 46 Z" fill={color} />;
    case "steps":
      return <path d="M18 24 H56 V62 H18 Z M56 62 H94 V100 H56 Z" fill={color} />;
    case "twin-spike":
      return (
        <>
          <polygon points="24,24 60,24 43,102" fill={color} />
          <polygon points="60,24 96,24 77,102" fill={color} />
        </>
      );
    case "pyramid":
      return <path d="M22 98 H98 V79 H88.5 V60 H79 V41 H69.5 V22 H50.5 V41 H41 V60 H31.5 V79 H22 Z" fill={color} />;
    case "double-triangle":
      return <path d="M60 14 L103 56 H17 Z M60 56 L103 100 H17 Z" fill={color} />;
    case "petal":
      return (
        <g transform="rotate(60 60 60)">
          <path d="M60 60 C42 42 35 15 47 9 C63 13 69 41 60 60 C78 42 105 35 111 47 C107 63 79 69 60 60 C78 78 85 105 73 111 C57 107 51 79 60 60 C42 78 15 85 9 73 C13 57 41 51 60 60 Z" fill={color} />
        </g>
      );
    case "zigzag":
      return (
        <>
          <polygon points="38,14 62,60 38,106 14,60" fill={color} />
          <polygon points="60,14 84,60 60,106 36,60" fill={color} />
          <polygon points="82,14 106,60 82,106 58,60" fill={color} />
        </>
      );
  }
}
