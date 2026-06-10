"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, FlipHorizontal, FlipVertical, Play, RotateCcw, RotateCw, Timer, Undo2 } from "lucide-react";
import {
  MAX_ROTATION_CLICKS,
  MAX_ROTATION_STEPS,
  ROTATION_OPERATIONS,
  ROTATION_ROUND_DURATION_MS,
  canAppendRotationStep,
  checkShapeRotationAnswer,
  createShapeRotationSeed,
  generateShapeRotationProblem,
  operationsToCssTransform,
  type GridPattern,
  type RotationOperation,
  type ShapeRotationProblem,
  type ShapeRotationRound,
} from "@/lib/shape-rotation-game";

type Phase = "idle" | "playing" | "round-complete" | "finished";

type RoundSummary = {
  round: ShapeRotationRound;
  solved: number;
  optimal: number;
  incorrect: number;
};

const INITIAL_SEED = 20260609;

const OPERATION_ICONS: Record<RotationOperation, ReactNode> = {
  "rotate-left": <RotateCcw size={28} />,
  "rotate-right": <RotateCw size={28} />,
  "flip-x": <FlipHorizontal size={28} />,
  "flip-y": <FlipVertical size={28} />,
};

export default function ShapeRotationPage() {
  const [round, setRound] = useState<ShapeRotationRound>(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<ShapeRotationProblem>(() => generateShapeRotationProblem(1, INITIAL_SEED));
  const [steps, setSteps] = useState<RotationOperation[]>([]);
  const [remainingMs, setRemainingMs] = useState(ROTATION_ROUND_DURATION_MS);
  const [roundSolved, setRoundSolved] = useState(0);
  const [roundOptimal, setRoundOptimal] = useState(0);
  const [roundIncorrect, setRoundIncorrect] = useState(0);
  const [summaries, setSummaries] = useState<RoundSummary[]>([]);
  const [message, setMessage] = useState("시작 버튼을 눌러 1라운드를 시작하세요.");

  const seconds = Math.ceil(remainingMs / 1000);
  const minutesText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const targetTransform = operationsToCssTransform(problem.answer);
  const clickRemaining = MAX_ROTATION_CLICKS - steps.length;
  const inputDisabled = phase !== "playing" || !canAppendRotationStep(steps);
  const totalSolved = summaries.reduce((sum, item) => sum + item.solved, 0) + (phase === "finished" ? 0 : roundSolved);
  const totalOptimal = summaries.reduce((sum, item) => sum + item.optimal, 0) + (phase === "finished" ? 0 : roundOptimal);
  const totalIncorrect = summaries.reduce((sum, item) => sum + item.incorrect, 0) + (phase === "finished" ? 0 : roundIncorrect);

  const instruction = useMemo(() => {
    if (round === 1) return "1라운드: 알파벳을 목표 모양과 같게 회전·반전하세요.";
    return "2라운드: 격자 도형을 목표 모양과 같게 회전·반전하세요.";
  }, [round]);

  const finishRound = useCallback(() => {
    setSummaries((current) => {
      const filtered = current.filter((item) => item.round !== round);
      return [...filtered, { round, solved: roundSolved, optimal: roundOptimal, incorrect: roundIncorrect }].sort((a, b) => a.round - b.round);
    });
    setSteps([]);
    setRemainingMs(0);
    if (round === 1) {
      setPhase("round-complete");
      setMessage("1라운드가 종료되었습니다. 2라운드로 이동하세요.");
    } else {
      setPhase("finished");
      setMessage("모든 라운드가 종료되었습니다.");
    }
  }, [round, roundIncorrect, roundOptimal, roundSolved]);

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

  function startRound(nextRound = round) {
    setRound(nextRound);
    setPhase("playing");
    setProblem(generateShapeRotationProblem(nextRound, createShapeRotationSeed()));
    setSteps([]);
    setRemainingMs(ROTATION_ROUND_DURATION_MS);
    setRoundSolved(0);
    setRoundOptimal(0);
    setRoundIncorrect(0);
    setMessage(`${nextRound}라운드가 시작되었습니다. 목표 모양을 만들어 제출하세요.`);
  }

  function appendStep(operation: RotationOperation) {
    if (phase !== "playing") return;
    setSteps((current) => (canAppendRotationStep(current) ? [...current, operation] : current));
  }

  function removeLastStep() {
    setSteps((current) => current.slice(0, -1));
  }

  function resetSteps() {
    setSteps([]);
  }

  function submitAnswer() {
    if (phase !== "playing") return;
    const result = checkShapeRotationAnswer(problem, steps);
    if (!result.correct) {
      setRoundIncorrect((count) => count + 1);
      setMessage(`아직 목표 모양과 다릅니다. 입력 ${result.clickCount}회 / 최소 ${result.minimumClicks}회`);
      return;
    }

    setRoundSolved((count) => count + 1);
    if (result.optimal) setRoundOptimal((count) => count + 1);
    setMessage(result.optimal ? "정답입니다! 최소 클릭으로 해결했습니다." : `정답입니다! 최소 클릭 수는 ${result.minimumClicks}회입니다.`);
    setProblem(generateShapeRotationProblem(round, createShapeRotationSeed()));
    setSteps([]);
  }

  function restartAll() {
    setSummaries([]);
    setRound(1);
    setPhase("idle");
    setProblem(generateShapeRotationProblem(1, createShapeRotationSeed()));
    setSteps([]);
    setRemainingMs(ROTATION_ROUND_DURATION_MS);
    setRoundSolved(0);
    setRoundOptimal(0);
    setRoundIncorrect(0);
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
              <p className="text-sm font-semibold text-emerald-700">AI 역량검사 연습</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">도형 회전하기</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <StatusPill icon={<Timer size={16} />} label={minutesText} strong />
              <StatusPill label={`${round}라운드`} />
              <StatusPill label={`최소클릭 ${roundOptimal}개`} />
              <StatusPill label={`정답 ${roundSolved}개`} />
              <StatusPill label={`오답 ${roundIncorrect}개`} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3 text-sm text-stone-600">
              <span className="font-semibold text-stone-800">{instruction}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{problem.label}</span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-[1fr_72px_1fr] md:items-center">
              <ShapePanel title="전" problem={problem} hint="제시 도형" />
              <div className="flex justify-center text-5xl font-black text-emerald-500">→</div>
              <ShapePanel title="후" problem={problem} transform={targetTransform} target hint="목표 모양" />
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-center">
              <p className="font-semibold text-stone-800">{message}</p>
              <p className="mt-1 text-sm text-stone-500">문제의 최소 클릭 수: {problem.minimumClicks}회 · 사용 입력: {steps.length}단계</p>
            </div>

            <div className="mt-4 grid gap-2 text-sm font-semibold text-stone-700 sm:grid-cols-3">
              <StatTile label="최소 횟수 해결" value={`${totalOptimal}개`} />
              <StatTile label="정답" value={`${totalSolved}개`} />
              <StatTile label="오답" value={`${totalIncorrect}개`} />
            </div>

            <button
              type="button"
              onClick={submitAnswer}
              disabled={phase !== "playing" || steps.length === 0}
              className="mx-auto mt-6 flex h-12 min-w-48 items-center justify-center rounded-2xl bg-blue-600 px-8 text-sm font-bold text-white shadow-sm transition enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              답안 제출
            </button>
          </section>

          <aside className="flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              {ROTATION_OPERATIONS.map((item) => (
                <button
                  key={item.operation}
                  type="button"
                  onClick={() => appendStep(item.operation)}
                  disabled={inputDisabled}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-center text-sm font-bold text-emerald-700 transition enabled:hover:border-emerald-400 enabled:hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {OPERATION_ICONS[item.operation]}
                  {item.label}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-stone-800">입력 단계</div>
                <div className="rounded-2xl bg-white px-3 py-2 text-center text-xs font-semibold text-stone-600 shadow-sm">
                  남은 클릭 횟수
                  <strong className="block text-2xl text-stone-900">{clickRemaining}</strong>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {Array.from({ length: MAX_ROTATION_STEPS }, (_, index) => {
                  const operation = steps[index];
                  const meta = ROTATION_OPERATIONS.find((item) => item.operation === operation);
                  return (
                    <div key={index} className="flex aspect-square items-center justify-center rounded-2xl bg-white text-2xl font-black text-stone-200 shadow-sm">
                      {meta ? <span className="text-lg text-emerald-600">{meta.shortLabel}</span> : index + 1}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ControlButton icon={<Undo2 size={16} />} label="하나 지움" onClick={removeLastStep} disabled={steps.length === 0} />
                <ControlButton icon={<RotateCcw size={16} />} label="전체 초기화" onClick={resetSteps} disabled={steps.length === 0} />
              </div>
            </div>

            <div className="grid gap-2">
              {phase === "idle" && <PrimaryButton icon={<Play size={16} />} label="1라운드 시작" onClick={() => startRound(1)} />}
              {phase === "round-complete" && <PrimaryButton icon={<Play size={16} />} label="2라운드 시작" onClick={() => startRound(2)} />}
              <ControlButton icon={<RotateCcw size={16} />} label="처음부터 다시" onClick={restartAll} />
            </div>

            <div className="rounded-2xl border border-stone-200 p-4 text-sm text-stone-600">
              <div className="font-bold text-stone-800">라운드 결과</div>
              <div className="mt-3 grid gap-2">
                {[1, 2].map((value) => {
                  const summary = summaries.find((item) => item.round === value);
                  return (
                    <div key={value} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                      <span>{value}라운드</span>
                      <span className="font-semibold text-stone-900">{summary ? `최소 ${summary.optimal}개 · 정답 ${summary.solved}개 · 오답 ${summary.incorrect}개` : "대기 중"}</span>
                    </div>
                  );
                })}
              </div>
              {phase === "finished" && (
                <div className="mt-4 rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-700">
                  <CheckCircle className="mr-1 inline" size={16} /> 최소 {totalOptimal}개, 정답 {totalSolved}개, 오답 {totalIncorrect}개
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function ShapePanel({ problem, title, transform, target, hint }: { problem: ShapeRotationProblem; title: string; transform?: string; target?: boolean; hint: string }) {
  return (
    <div className={`rounded-[28px] border ${target ? "border-emerald-100 bg-emerald-50" : "border-stone-200 bg-white"} p-5 text-center shadow-sm`}>
      <div className="flex h-72 items-center justify-center overflow-hidden rounded-3xl bg-white">
        <div style={transform ? { transform } : undefined}>
          <ProblemShape problem={problem} />
        </div>
      </div>
      <div className="mt-4 text-lg font-bold text-stone-800">{title}</div>
      <div className="text-sm font-semibold text-stone-500">{hint}</div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-stone-900">{value}</div>
    </div>
  );
}

function ProblemShape({ problem }: { problem: ShapeRotationProblem }) {
  if (problem.kind === "letter") {
    return <div className="select-none font-sans text-[132px] font-black leading-none text-stone-950">{problem.letter}</div>;
  }

  return <GridShape pattern={problem.grid ?? []} />;
}

function GridShape({ pattern }: { pattern: GridPattern }) {
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40" role="img" aria-label="격자 도형">
      <rect x="8" y="8" width="104" height="104" fill="white" stroke="#78716c" strokeWidth="2" />
      {pattern.map((row, rowIndex) =>
        row.map((filled, colIndex) => (
          <rect
            key={`${rowIndex}-${colIndex}`}
            x={8 + colIndex * 26}
            y={8 + rowIndex * 26}
            width="26"
            height="26"
            fill={filled ? "#9ca3af" : "white"}
            stroke="#78716c"
            strokeWidth="1.5"
          />
        )),
      )}
    </svg>
  );
}

function StatusPill({ icon, label, strong }: { icon?: ReactNode; label: string; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 ${strong ? "bg-blue-50 text-blue-700" : "bg-stone-100 text-stone-700"}`}>
      {icon}
      {label}
    </span>
  );
}

function ControlButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition enabled:hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function PrimaryButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
    >
      {icon}
      {label}
    </button>
  );
}
