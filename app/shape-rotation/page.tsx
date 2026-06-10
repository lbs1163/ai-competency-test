"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, FlipHorizontal, FlipVertical, Pause, Play, RotateCcw, RotateCw, Timer, Undo2 } from "lucide-react";
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

type SubmittedAnswer = {
  problem: ShapeRotationProblem;
  steps: RotationOperation[];
  correct: boolean;
  optimal: boolean;
  clickCount: number;
  minimumClicks: number;
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
  const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewStep, setReviewStep] = useState(0);
  const [reviewPlaying, setReviewPlaying] = useState(false);
  const [message, setMessage] = useState("시작 버튼을 눌러 1라운드를 시작하세요.");

  const seconds = Math.ceil(remainingMs / 1000);
  const minutesText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const targetTransform = operationsToCssTransform(problem.answer);
  const clickRemaining = MAX_ROTATION_CLICKS - steps.length;
  const inputDisabled = phase !== "playing" || !canAppendRotationStep(steps);
  const totalSolved = summaries.reduce((sum, item) => sum + item.solved, 0) + (phase === "finished" ? 0 : roundSolved);
  const totalOptimal = summaries.reduce((sum, item) => sum + item.optimal, 0) + (phase === "finished" ? 0 : roundOptimal);
  const totalIncorrect = summaries.reduce((sum, item) => sum + item.incorrect, 0) + (phase === "finished" ? 0 : roundIncorrect);
  const safeReviewIndex = Math.min(reviewIndex, Math.max(0, submittedAnswers.length - 1));
  const reviewedAnswer = submittedAnswers[safeReviewIndex];

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

  useEffect(() => {
    if (!reviewPlaying || !reviewedAnswer) return;

    const timer = window.setInterval(() => {
      setReviewStep((current) => {
        if (current >= reviewedAnswer.steps.length) {
          setReviewPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 700);

    return () => window.clearInterval(timer);
  }, [reviewPlaying, reviewedAnswer]);

  function startRound(nextRound = round) {
    setRound(nextRound);
    setPhase("playing");
    setProblem(generateShapeRotationProblem(nextRound, createShapeRotationSeed()));
    setSteps([]);
    setRemainingMs(ROTATION_ROUND_DURATION_MS);
    setRoundSolved(0);
    setRoundOptimal(0);
    setRoundIncorrect(0);
    setReviewPlaying(false);
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
    setSubmittedAnswers((current) => [
      ...current,
      {
        problem,
        steps: [...steps],
        correct: result.correct,
        optimal: result.optimal,
        clickCount: result.clickCount,
        minimumClicks: result.minimumClicks,
      },
    ]);

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
    setSubmittedAnswers([]);
    setReviewIndex(0);
    setReviewStep(0);
    setReviewPlaying(false);
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
    <main className="min-h-screen px-3 py-4 text-stone-900 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
        <header className="flex flex-col gap-3 border-b border-stone-300 pb-3 sm:pb-4">
          <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-900">
            <ArrowLeft size={16} /> 게임 허브로 돌아가기
          </Link>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">AI 역량검사 연습</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">도형 회전하기</h1>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold sm:gap-2 sm:text-sm">
              <StatusPill icon={<Timer size={16} />} label={minutesText} strong />
              <StatusPill label={`${round}라운드`} />
              <StatusPill label={`최소클릭 ${roundOptimal}개`} />
              <StatusPill label={`정답 ${roundSolved}개`} />
              <StatusPill label={`오답 ${roundIncorrect}개`} />
            </div>
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:rounded-[28px] sm:p-6">
            <div className="flex items-center justify-between gap-2 text-xs text-stone-600 sm:gap-3 sm:text-sm">
              <span className="font-semibold text-stone-800">{instruction}</span>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 sm:px-3">{problem.label}</span>
            </div>

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2 sm:mt-8 sm:grid-cols-[1fr_56px_1fr] sm:gap-4 md:grid-cols-[1fr_72px_1fr]">
              <ShapePanel title="전" problem={problem} hint="제시 도형" />
              <div className="flex justify-center text-2xl font-black text-emerald-500 sm:text-4xl md:text-5xl">→</div>
              <ShapePanel title="후" problem={problem} transform={targetTransform} target hint="목표 모양" />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-center sm:mt-6 sm:p-4">
              <p className="text-sm font-semibold text-stone-800 sm:text-base">{message}</p>
              <p className="mt-1 text-xs text-stone-500 sm:text-sm">문제의 최소 클릭 수: {problem.minimumClicks}회 · 사용 입력: {steps.length}단계</p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-semibold text-stone-700 sm:mt-4">
              <StatTile label="최소 횟수 해결" value={`${totalOptimal}개`} />
              <StatTile label="정답" value={`${totalSolved}개`} />
              <StatTile label="오답" value={`${totalIncorrect}개`} />
            </div>

            <button
              type="button"
              onClick={submitAnswer}
              disabled={phase !== "playing" || steps.length === 0}
              className="mx-auto mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-blue-600 px-8 text-sm font-bold text-white shadow-sm transition enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:h-12 sm:w-auto sm:min-w-48"
            >
              답안 제출
            </button>
          </section>

          <aside className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:rounded-[28px] sm:gap-4 sm:p-5">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3">
              {ROTATION_OPERATIONS.map((item) => (
                <button
                  key={item.operation}
                  type="button"
                  onClick={() => appendStep(item.operation)}
                  disabled={inputDisabled}
                  className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2 text-center text-[11px] font-bold leading-tight text-emerald-700 transition enabled:hover:border-emerald-400 enabled:hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-24 sm:gap-2 sm:p-3 sm:text-sm [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-7 sm:[&_svg]:w-7"
                >
                  {OPERATION_ICONS[item.operation]}
                  {item.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:rounded-3xl sm:p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-stone-800">입력 단계</div>
                <div className="rounded-2xl bg-white px-3 py-1.5 text-center text-xs font-semibold text-stone-600 shadow-sm sm:py-2">
                  남은 클릭 횟수
                  <strong className="block text-xl text-stone-900 sm:text-2xl">{clickRemaining}</strong>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-8 gap-1.5 sm:mt-4 sm:grid-cols-4 sm:gap-3">
                {Array.from({ length: MAX_ROTATION_STEPS }, (_, index) => {
                  const operation = steps[index];
                  const meta = ROTATION_OPERATIONS.find((item) => item.operation === operation);
                  return (
                    <div key={index} className="flex aspect-square items-center justify-center rounded-xl bg-white text-sm font-black text-stone-200 shadow-sm sm:rounded-2xl sm:text-2xl">
                      {meta ? <span className="text-[11px] text-emerald-600 sm:text-lg">{meta.shortLabel}</span> : index + 1}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
                <ControlButton icon={<Undo2 size={16} />} label="하나 지움" onClick={removeLastStep} disabled={steps.length === 0} />
                <ControlButton icon={<RotateCcw size={16} />} label="전체 초기화" onClick={resetSteps} disabled={steps.length === 0} />
              </div>
            </div>

            <div className="grid gap-2">
              {phase === "idle" && <PrimaryButton icon={<Play size={16} />} label="1라운드 시작" onClick={() => startRound(1)} />}
              {phase === "round-complete" && <PrimaryButton icon={<Play size={16} />} label="2라운드 시작" onClick={() => startRound(2)} />}
              <ControlButton icon={<RotateCcw size={16} />} label="처음부터 다시" onClick={restartAll} />
            </div>

            <div className="rounded-2xl border border-stone-200 p-3 text-sm text-stone-600 sm:p-4">
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

        {phase === "finished" && (
          <ReviewPanel
            answers={submittedAnswers}
            reviewIndex={safeReviewIndex}
            reviewStep={reviewStep}
            reviewPlaying={reviewPlaying}
            onSelectAnswer={(index) => {
              setReviewIndex(index);
              setReviewStep(0);
              setReviewPlaying(false);
            }}
            onSetStep={(step) => setReviewStep(step)}
            onTogglePlaying={() => setReviewPlaying((current) => !current)}
          />
        )}
      </div>
    </main>
  );
}

function ReviewPanel({
  answers,
  reviewIndex,
  reviewStep,
  reviewPlaying,
  onSelectAnswer,
  onSetStep,
  onTogglePlaying,
}: {
  answers: SubmittedAnswer[];
  reviewIndex: number;
  reviewStep: number;
  reviewPlaying: boolean;
  onSelectAnswer: (index: number) => void;
  onSetStep: (step: number) => void;
  onTogglePlaying: () => void;
}) {
  const answer = answers[reviewIndex];

  if (!answer) {
    return (
      <section className="rounded-[28px] border border-stone-200 bg-white p-5 text-sm font-semibold text-stone-600 shadow-sm">
        제출한 답안이 없습니다.
      </section>
    );
  }

  const safeStep = Math.min(reviewStep, answer.steps.length);
  const currentSteps = answer.steps.slice(0, safeStep);
  const currentTransform = operationsToCssTransform(currentSteps);
  const targetTransform = operationsToCssTransform(answer.problem.answer);
  const activeOperation = safeStep === 0 ? "시작" : ROTATION_OPERATIONS.find((item) => item.operation === answer.steps[safeStep - 1])?.label;
  const reason = answer.correct
    ? answer.optimal
      ? "최종 모양이 목표와 같고 최소 횟수로 도달했습니다."
      : "최종 모양이 목표와 같지만 더 적은 클릭으로도 해결할 수 있습니다."
    : "제출한 모든 단계를 적용한 최종 모양이 목표 모양과 다릅니다.";

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:rounded-[28px] sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-bold text-stone-500">제출 답안 리뷰</div>
          <h2 className="mt-1 text-base font-black text-stone-900 sm:text-xl">
            {answer.correct ? "맞은 이유" : "틀린 이유"}: {reason}
          </h2>
        </div>
        <select
          value={reviewIndex}
          onChange={(event) => onSelectAnswer(Number(event.target.value))}
          className="h-10 rounded-2xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 sm:h-11"
        >
          {answers.map((item, index) => (
            <option key={`${item.problem.id}-${index}`} value={index}>
              {index + 1}번 제출 · {item.correct ? "정답" : "오답"} · {item.clickCount}회
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2 sm:mt-5 sm:grid-cols-[1fr_56px_1fr] sm:gap-4 md:grid-cols-[1fr_72px_1fr]">
        <ShapePanel title="답안 진행" problem={answer.problem} transform={currentTransform} hint={`${safeStep}/${answer.steps.length}단계 · ${activeOperation}`} />
        <div className="flex justify-center text-2xl font-black text-emerald-500 sm:text-4xl md:text-5xl">→</div>
        <ShapePanel title="목표" problem={answer.problem} transform={targetTransform} target hint={`최소 ${answer.minimumClicks}회`} />
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:mt-5 sm:rounded-3xl sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onTogglePlaying}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 sm:h-11"
          >
            {reviewPlaying ? <Pause size={16} /> : <Play size={16} />}
            {reviewPlaying ? "정지" : "재생"}
          </button>
          <div className="text-sm font-semibold text-stone-600">
            제출 {answer.clickCount}회 · 최소 {answer.minimumClicks}회 · {answer.correct ? "정답" : "오답"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 min-[420px]:grid-cols-5 sm:mt-4 sm:grid-cols-8">
          {Array.from({ length: answer.steps.length + 1 }, (_, index) => {
            const operation = index === 0 ? undefined : ROTATION_OPERATIONS.find((item) => item.operation === answer.steps[index - 1]);
            const isActive = index === safeStep;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSetStep(index)}
                className={`flex h-12 flex-col items-center justify-center rounded-2xl border text-[11px] font-bold transition sm:h-14 sm:text-xs ${
                  isActive ? "border-blue-500 bg-blue-50 text-blue-700" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                <span>{index === 0 ? "시작" : `${index}단계`}</span>
                <span className="mt-1 text-sm">{operation?.shortLabel ?? "원본"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ShapePanel({ problem, title, transform, target, hint }: { problem: ShapeRotationProblem; title: string; transform?: string; target?: boolean; hint: string }) {
  return (
    <div className={`rounded-2xl border ${target ? "border-emerald-100 bg-emerald-50" : "border-stone-200 bg-white"} p-2 text-center shadow-sm sm:rounded-[28px] sm:p-5`}>
      <div className="flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-white min-[420px]:h-40 sm:h-72 sm:rounded-3xl">
        <div style={transform ? { transform } : undefined}>
          <ProblemShape problem={problem} />
        </div>
      </div>
      <div className="mt-2 text-sm font-bold text-stone-800 sm:mt-4 sm:text-lg">{title}</div>
      <div className="text-[11px] font-semibold leading-tight text-stone-500 sm:text-sm">{hint}</div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-2 py-2 text-center sm:px-4 sm:py-3">
      <div className="text-[11px] leading-tight text-stone-500 sm:text-xs">{label}</div>
      <div className="mt-1 text-lg font-black text-stone-900 sm:text-2xl">{value}</div>
    </div>
  );
}

function ProblemShape({ problem }: { problem: ShapeRotationProblem }) {
  if (problem.kind === "letter") {
    return <div className="select-none font-sans text-[clamp(4.5rem,22vw,8.25rem)] font-black leading-none text-stone-950">{problem.letter}</div>;
  }

  return <GridShape pattern={problem.grid ?? []} />;
}

function GridShape({ pattern }: { pattern: GridPattern }) {
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24 min-[420px]:h-32 min-[420px]:w-32 sm:h-40 sm:w-40" role="img" aria-label="격자 도형">
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
    <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 ${strong ? "bg-blue-50 text-blue-700" : "bg-stone-100 text-stone-700"}`}>
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
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-800 transition enabled:hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
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
      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 sm:h-12"
    >
      {icon}
      {label}
    </button>
  );
}
