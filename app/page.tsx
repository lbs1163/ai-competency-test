"use client";

import { useMemo, useState } from "react";
import { Check, Eye, RotateCcw, Sparkles } from "lucide-react";
import {
  MAX_PAIRS,
  MAX_SIZE,
  MIN_PAIRS,
  MIN_SIZE,
  cellKey,
  checkStage,
  createStageSeed,
  findMinimumSolution,
  generateStage,
  portLabel,
  reflect,
  type CheckResult,
  type Direction,
  type Mirror,
  type MirrorMap,
  type Pair,
  type PathSegment,
  type Port,
  type Stage,
} from "@/lib/game";

const INITIAL_STAGE_SEED = 20260608;

type CellPath = {
  color: string;
  incoming: Direction;
  outgoing: Direction;
};

const EDGE_CLASS: Record<Direction, string> = {
  up: "top-0 left-1/2 h-1/2 w-1 -translate-x-1/2",
  right: "right-0 top-1/2 h-1 w-1/2 -translate-y-1/2",
  down: "bottom-0 left-1/2 h-1/2 w-1 -translate-x-1/2",
  left: "left-0 top-1/2 h-1 w-1/2 -translate-y-1/2",
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  right: "left",
  down: "up",
  left: "right",
};

export default function Home() {
  const [size, setSize] = useState(5);
  const [pairCount, setPairCount] = useState(2);
  const [stage, setStage] = useState<Stage>(() => generateStage(5, 2, INITIAL_STAGE_SEED));
  const [userMirrors, setUserMirrors] = useState<MirrorMap>({});
  const [result, setResult] = useState<CheckResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const minimumSolution = useMemo(() => findMinimumSolution(stage), [stage]);
  const activeMirrors = showSolution ? minimumSolution.mirrors : userMirrors;
  const solutionMirrorCount = minimumSolution.mirrorCount;
  const pathByCell = useMemo(() => buildPathMap(stage, activeMirrors, result, showSolution), [stage, activeMirrors, result, showSolution]);

  function createNewStage(nextSize = size, nextPairCount = pairCount) {
    const generated = generateStage(nextSize, nextPairCount, createStageSeed());
    setStage(generated);
    setUserMirrors({});
    setResult(null);
    setShowSolution(false);
  }

  function updateSize(nextSize: number) {
    setSize(nextSize);
    createNewStage(nextSize, Math.min(pairCount, MAX_PAIRS));
  }

  function updatePairCount(nextPairCount: number) {
    setPairCount(nextPairCount);
    createNewStage(size, nextPairCount);
  }

  function cycleMirror(row: number, col: number) {
    setShowSolution(false);
    setResult(null);
    const key = cellKey(row, col);
    setUserMirrors((current) => {
      const next = { ...current };
      const cycled = getNextMirror(current[key]);
      if (cycled) next[key] = cycled;
      else delete next[key];
      return next;
    });
  }

  function runCheck() {
    setShowSolution(false);
    setResult(checkStage(stage, userMirrors));
  }

  function resetBoard() {
    setUserMirrors({});
    setResult(null);
    setShowSolution(false);
  }

  function revealSolution() {
    setResult(checkStage(stage, minimumSolution.mirrors));
    setShowSolution(true);
  }

  return (
    <main className="min-h-screen px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-3 border-b border-stone-300 pb-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-700">AI 역량검사 연습</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal sm:text-3xl">길 만들기 게임</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            좌클릭은 / 거울, 우클릭은 \ 거울입니다. 같은 방향을 다시 누르면 지워집니다.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4 rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-stone-700">
                격자 크기
                <select
                  value={size}
                  onChange={(event) => updateSize(Number(event.target.value))}
                  className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                >
                  {range(MIN_SIZE, MAX_SIZE).map((value) => (
                    <option key={value} value={value}>
                      {value}x{value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-semibold text-stone-700">
                경로 개수
                <select
                  value={pairCount}
                  onChange={(event) => updatePairCount(Number(event.target.value))}
                  className="h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                >
                  {range(MIN_PAIRS, MAX_PAIRS).map((value) => (
                    <option key={value} value={value}>
                      {value}쌍
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <IconButton onClick={() => createNewStage()} icon={<Sparkles size={17} />} label="새 문제" />
              <IconButton onClick={resetBoard} icon={<RotateCcw size={17} />} label="초기화" />
              <IconButton onClick={runCheck} icon={<Check size={17} />} label="검사" primary />
              <IconButton onClick={revealSolution} icon={<Eye size={17} />} label="정답" />
            </div>

            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="text-sm font-semibold text-stone-800">결과</div>
              <div className="mt-2 grid gap-1 text-sm text-stone-600">
                <span>
                  정답 거울 수: <span className="font-semibold text-stone-900">{solutionMirrorCount}개</span>
                </span>
                {result ? (
                  <span className={result.success ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
                    {result.success ? "모든 경로가 연결되었습니다." : "아직 맞지 않습니다."}
                  </span>
                ) : (
                  <span>거울을 배치한 뒤 검사하세요.</span>
                )}
              </div>
              {result && (
                <div className="mt-3 grid gap-2">
                  {stage.pairs.map((pair) => {
                    const pairResult = result.pairResults.find((item) => item.pairId === pair.id);
                    return (
                      <div key={pair.id} className="flex items-center gap-2 text-xs text-stone-600">
                        <span className="h-3 w-3 rounded-full" style={{ background: pair.color }} />
                        <span className="font-semibold text-stone-800">{pair.name}</span>
                        <span>{pairResult?.reason ?? "대기 중"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-stone-300 bg-white p-3 shadow-sm sm:p-5">
            <div className="mx-auto grid w-full max-w-[760px] gap-2" style={{ gridTemplateColumns: "32px minmax(0, 1fr) 32px" }}>
              <div />
              <PortRow side="top" size={stage.size} pairs={stage.pairs} />
              <div />
              <PortColumn side="left" size={stage.size} pairs={stage.pairs} />
              <div
                className="grid aspect-square overflow-hidden border border-stone-300 bg-stone-100"
                style={{ gridTemplateColumns: `repeat(${stage.size}, minmax(0, 1fr))` }}
              >
                {range(0, stage.size - 1).flatMap((row) =>
                  range(0, stage.size - 1).map((col) => {
                    const key = cellKey(row, col);
                    return (
                      <button
                        key={key}
                        aria-label={`${row + 1}행 ${col + 1}열`}
                        onClick={() => cycleMirror(row, col)}
                        className="relative aspect-square border border-stone-200 bg-white transition hover:bg-emerald-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        {pathByCell[key]?.map((path, index) => (
                          <PathInCell key={`${path.color}-${index}`} path={path} />
                        ))}
                        {activeMirrors[key] && <MirrorGlyph mirror={activeMirrors[key]} solution={showSolution} />}
                      </button>
                    );
                  }),
                )}
              </div>
              <PortColumn side="right" size={stage.size} pairs={stage.pairs} />
              <div />
              <PortRow side="bottom" size={stage.size} pairs={stage.pairs} />
              <div />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function IconButton({
  label,
  icon,
  primary,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
          : "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      }
    >
      {icon}
      {label}
    </button>
  );
}

function MirrorGlyph({ mirror, solution }: { mirror: Mirror; solution: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute left-1/2 top-1/2 z-20 h-[82%] w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
        solution ? "bg-amber-500" : "bg-emerald-500"
      } ${mirror === "/" ? "rotate-45" : "-rotate-45"}`}
    />
  );
}

function PathInCell({ path }: { path: CellPath }) {
  const entry = OPPOSITE[path.incoming];
  const edges = path.incoming === path.outgoing ? [entry, path.outgoing] : [entry, path.outgoing];

  return (
    <span className="pointer-events-none absolute inset-0 z-10">
      <span
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: path.color }}
      />
      {edges.map((edge) => (
        <span key={edge} className={`absolute rounded-full ${EDGE_CLASS[edge]}`} style={{ background: path.color }} />
      ))}
    </span>
  );
}

function PortRow({ side, size, pairs }: { side: "top" | "bottom"; size: number; pairs: Pair[] }) {
  return (
    <div className="grid h-8" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
      {range(0, size - 1).map((index) => (
        <div key={`${side}-${index}`} className="flex items-center justify-center">
          <PortMarker port={{ side, index }} pairs={pairs} />
        </div>
      ))}
    </div>
  );
}

function PortColumn({ side, size, pairs }: { side: "left" | "right"; size: number; pairs: Pair[] }) {
  return (
    <div className="grid w-8" style={{ gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}>
      {range(0, size - 1).map((index) => (
        <div key={`${side}-${index}`} className="flex items-center justify-center">
          <PortMarker port={{ side, index }} pairs={pairs} />
        </div>
      ))}
    </div>
  );
}

function PortMarker({ port, pairs }: { port: Port; pairs: Pair[] }) {
  const pair = pairs.find((item) => samePortLocal(item.start, port) || samePortLocal(item.end, port));

  if (!pair) return <span className="h-2 w-2 rounded-full bg-stone-300" />;

  return (
    <span
      title={`${pair.name}번 ${portLabel(port)}`}
      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
      style={{ background: pair.color }}
    >
      {pair.name}
    </span>
  );
}

function buildPathMap(stage: Stage, mirrors: MirrorMap, result: CheckResult | null, showSolution: boolean) {
  if (!result && !showSolution) return {};

  const source = result ?? checkStage(stage, mirrors);
  const map: Record<string, CellPath[]> = {};

  source.pairResults.forEach((pairResult) => {
    const pair = stage.pairs.find((item) => item.id === pairResult.pairId);
    if (!pair) return;

    pairResult.path.forEach((segment: PathSegment) => {
      const key = cellKey(segment.row, segment.col);
      const outgoing = reflect(segment.direction, mirrors[key]);
      map[key] = [...(map[key] ?? []), { color: pair.color, incoming: segment.direction, outgoing }];
    });
  });

  return map;
}

function samePortLocal(a: Port, b: Port) {
  return a.side === b.side && a.index === b.index;
}

function getNextMirror(current: Mirror | undefined): Mirror | undefined {
  if (!current) return "/";
  if (current === "/") return "\\";
  return undefined;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
