export type Direction = "up" | "right" | "down" | "left";
export type Mirror = "/" | "\\";
export type Side = "top" | "right" | "bottom" | "left";

export type Cell = {
  row: number;
  col: number;
};

export type Port = {
  side: Side;
  index: number;
};

export type Pair = {
  id: string;
  name: string;
  color: string;
  start: Port;
  end: Port;
};

export type MirrorMap = Record<string, Mirror>;

export type Stage = {
  size: number;
  pairCount: number;
  pairs: Pair[];
  solutionMirrors: MirrorMap;
  seed: number;
};

export type PathSegment = Cell & {
  pairId: string;
  direction: Direction;
};

export type PairResult = {
  pairId: string;
  success: boolean;
  reason: string;
  path: PathSegment[];
};

export type CheckResult = {
  success: boolean;
  pairResults: PairResult[];
};

export type MinimumSolution = {
  mirrorCount: number;
  mirrors: MirrorMap;
};

export type DifficultyProfile = {
  minimumMirrorCount: number;
  hasSharedMirror: boolean;
  hasDetourPair: boolean;
  score: number;
  accepted: boolean;
};

export const MIN_SIZE = 5;
export const MAX_SIZE = 10;
export const MIN_PAIRS = 2;
export const MAX_PAIRS = 10;

export const PALETTE = [
  "#ef4444",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#0f766e",
  "#db2777",
  "#7c2d12",
  "#475569",
  "#84cc16",
];

export type RandomSource = () => number;

export function createSeededRandom(seedInput: number): RandomSource {
  let seed = seedInput >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStageSeed() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0];
  }

  return Date.now() >>> 0;
}

const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];

const DELTA: Record<Direction, Cell> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  right: "left",
  down: "up",
  left: "right",
};

export function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export function clampGameSize(value: number) {
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, value));
}

export function clampPairCount(value: number) {
  return Math.max(MIN_PAIRS, Math.min(MAX_PAIRS, value));
}

export function portLabel(port: Port) {
  const sideLabel: Record<Side, string> = {
    top: "위",
    right: "오른쪽",
    bottom: "아래",
    left: "왼쪽",
  };
  return `${sideLabel[port.side]} ${port.index + 1}`;
}

export function getEntry(port: Port, size: number): Cell & { direction: Direction } {
  if (port.side === "top") return { row: 0, col: port.index, direction: "down" };
  if (port.side === "bottom") return { row: size - 1, col: port.index, direction: "up" };
  if (port.side === "left") return { row: port.index, col: 0, direction: "right" };
  return { row: port.index, col: size - 1, direction: "left" };
}

export function getExitPort(row: number, col: number, size: number): Port | null {
  if (row < 0 && col >= 0 && col < size) return { side: "top", index: col };
  if (row >= size && col >= 0 && col < size) return { side: "bottom", index: col };
  if (col < 0 && row >= 0 && row < size) return { side: "left", index: row };
  if (col >= size && row >= 0 && row < size) return { side: "right", index: row };
  return null;
}

export function samePort(a: Port, b: Port) {
  return a.side === b.side && a.index === b.index;
}

export function reflect(direction: Direction, mirror?: Mirror): Direction {
  if (!mirror) return direction;

  if (mirror === "/") {
    return {
      up: "right",
      right: "up",
      down: "left",
      left: "down",
    }[direction] as Direction;
  }

  return {
    up: "left",
    left: "up",
    down: "right",
    right: "down",
  }[direction] as Direction;
}

function mirrorForTurn(incoming: Direction, outgoing: Direction): Mirror | null {
  if (incoming === outgoing) return null;
  if (reflect(incoming, "/") === outgoing) return "/";
  if (reflect(incoming, "\\") === outgoing) return "\\";
  return null;
}

function move(cell: Cell, direction: Direction): Cell {
  const delta = DELTA[direction];
  return { row: cell.row + delta.row, col: cell.col + delta.col };
}

function inBounds(cell: Cell, size: number) {
  return cell.row >= 0 && cell.row < size && cell.col >= 0 && cell.col < size;
}

function portKey(port: Port) {
  return `${port.side}:${port.index}`;
}

function listStartCandidates(size: number, random: RandomSource): Array<Cell & { direction: Direction; port: Port }> {
  const candidates: Array<Cell & { direction: Direction; port: Port }> = [];

  for (let index = 0; index < size; index += 1) {
    candidates.push({ row: 0, col: index, direction: "down", port: { side: "top", index } });
    candidates.push({ row: size - 1, col: index, direction: "up", port: { side: "bottom", index } });
    candidates.push({ row: index, col: 0, direction: "right", port: { side: "left", index } });
    candidates.push({ row: index, col: size - 1, direction: "left", port: { side: "right", index } });
  }

  return shuffle(candidates, random);
}

function shuffle<T>(items: T[], random: RandomSource) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildPath(
  size: number,
  occupiedCells: Set<string>,
  usedPorts: Set<string>,
  targetLength: number,
  random: RandomSource,
) {
  const starts = listStartCandidates(size, random).filter(
    (candidate) => !usedPorts.has(portKey(candidate.port)) && !occupiedCells.has(cellKey(candidate.row, candidate.col)),
  );

  for (const start of starts) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const localCells = new Set<string>();
      const mirrors: MirrorMap = {};
      const path: Array<Cell & { direction: Direction }> = [];
      let current: Cell = { row: start.row, col: start.col };
      let direction = start.direction;
      let lastDirection = direction;

      for (let step = 0; step < targetLength + size; step += 1) {
        const key = cellKey(current.row, current.col);
        if (!inBounds(current, size) || occupiedCells.has(key) || localCells.has(key)) break;

        path.push({ ...current, direction });
        localCells.add(key);

        const canExit = path.length >= Math.max(2, Math.floor(targetLength * 0.55));
        const possibleDirections = shuffle(DIRECTIONS, random).filter((nextDirection) => {
          if (nextDirection === OPPOSITE[direction]) return false;
          const next = move(current, nextDirection);
          if (!inBounds(next, size)) return canExit && getExitPort(next.row, next.col, size);
          const nextKey = cellKey(next.row, next.col);
          return !occupiedCells.has(nextKey) && !localCells.has(nextKey);
        });

        if (possibleDirections.length === 0) break;

        const exitDirection = possibleDirections.find((nextDirection) => {
          const next = move(current, nextDirection);
          return !inBounds(next, size) && canExit;
        });
        const shouldExit = exitDirection && (path.length >= targetLength || random() < 0.18);
        const nextDirection = shouldExit ? exitDirection : possibleDirections.find((candidate) => inBounds(move(current, candidate), size));

        if (!nextDirection) break;

        const mirror = mirrorForTurn(direction, nextDirection);
        if (mirror) mirrors[key] = mirror;

        lastDirection = nextDirection;
        const next = move(current, nextDirection);
        if (!inBounds(next, size)) {
          const end = getExitPort(next.row, next.col, size);
          if (end && !usedPorts.has(portKey(end)) && !samePort(start.port, end) && path.length >= 2) {
            return {
              start: start.port,
              end,
              path,
              mirrors,
            };
          }
          break;
        }

        current = next;
        direction = nextDirection;
      }

      void lastDirection;
    }
  }

  return null;
}

export function generateStage(sizeInput: number, pairCountInput: number, seed = 1): Stage {
  const size = clampGameSize(sizeInput);
  const pairCount = clampPairCount(pairCountInput);
  let bestStage = generateSolvableStage(size, pairCount, seed);
  let bestProfile = analyzeStageDifficulty(bestStage);

  if (bestProfile.accepted) return bestStage;

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const attemptSeed = (seed + Math.imul(attempt, 0x9e3779b1)) >>> 0;
    const stage = generateSolvableStage(size, pairCount, attemptSeed);
    const profile = analyzeStageDifficulty(stage);

    if (profile.accepted) return stage;
    if (profile.score > bestProfile.score) {
      bestStage = stage;
      bestProfile = profile;
    }
  }

  return generateSharedMirrorFallbackStage(size, pairCount, seed, bestStage);
}

function generateSolvableStage(size: number, pairCount: number, seed: number): Stage {
  const random = createSeededRandom(seed);

  for (let round = 0; round < 240; round += 1) {
    const occupiedCells = new Set<string>();
    const usedPorts = new Set<string>();
    const solutionMirrors: MirrorMap = {};
    const pairs: Pair[] = [];

    for (let index = 0; index < pairCount; index += 1) {
      const density = pairCount / size;
      const baseLength = density >= 1.4 ? 2 : density > 1 ? 3 : Math.round(size * 0.75);
      const targetLength = Math.max(2, baseLength + (density >= 1.4 ? index % 2 : index % 3));
      const built = buildPath(size, occupiedCells, usedPorts, targetLength, random);

      if (!built) break;

      built.path.forEach((cell) => occupiedCells.add(cellKey(cell.row, cell.col)));
      usedPorts.add(portKey(built.start));
      usedPorts.add(portKey(built.end));
      Object.assign(solutionMirrors, built.mirrors);
      pairs.push({
        id: `pair-${index}`,
        name: `${index + 1}`,
        color: PALETTE[index],
        start: built.start,
        end: built.end,
      });
    }

    if (pairs.length === pairCount) {
      const stage = { size, pairCount, pairs, solutionMirrors, seed };
      if (checkStage(stage, solutionMirrors).success) return stage;
    }
  }

  return generateFallbackStage(size, pairCount, seed);
}

function generateFallbackStage(size: number, pairCount: number, seed: number): Stage {
  const paths = enumerateFallbackPaths(size, Math.max(4, size + 2));
  const selected = selectDisjointPaths(paths, pairCount);
  const solutionMirrors: MirrorMap = {};
  const pairs: Pair[] = [];

  selected.forEach((path, index) => {
    Object.assign(solutionMirrors, path.mirrors);
    pairs.push({
      id: `pair-${index}`,
      name: `${index + 1}`,
      color: PALETTE[index],
      start: path.start,
      end: path.end,
    });
  });

  return {
    size,
    pairCount: pairs.length,
    pairs,
    solutionMirrors,
    seed,
  };
}

function generateSharedMirrorFallbackStage(size: number, pairCount: number, seed: number, fallbackStage: Stage): Stage {
  const center = Math.floor(size / 2);
  const sharedKey = cellKey(center, center);
  const usedPorts = new Set<string>();
  const usedCells = new Set<string>();
  const solutionMirrors: MirrorMap = { [sharedKey]: "/" };
  const pairs: Pair[] = [
    {
      id: "pair-0",
      name: "1",
      color: PALETTE[0],
      start: { side: "left", index: center },
      end: { side: "top", index: center },
    },
    {
      id: "pair-1",
      name: "2",
      color: PALETTE[1],
      start: { side: "bottom", index: center },
      end: { side: "right", index: center },
    },
  ];

  for (const pair of pairs) {
    usedPorts.add(portKey(pair.start));
    usedPorts.add(portKey(pair.end));
  }

  for (let col = 0; col <= center; col += 1) usedCells.add(cellKey(center, col));
  for (let row = 0; row <= center; row += 1) usedCells.add(cellKey(row, center));
  for (let row = center; row < size; row += 1) usedCells.add(cellKey(row, center));
  for (let col = center; col < size; col += 1) usedCells.add(cellKey(center, col));

  const extras = selectDisjointPathsWithUsed(
    enumerateFallbackPaths(size, Math.max(4, size + 2)),
    pairCount - pairs.length,
    usedCells,
    usedPorts,
  );

  extras.forEach((path, index) => {
    Object.assign(solutionMirrors, path.mirrors);
    pairs.push({
      id: `pair-${index + 2}`,
      name: `${index + 3}`,
      color: PALETTE[index + 2],
      start: path.start,
      end: path.end,
    });
  });

  const stage = {
    size,
    pairCount: pairs.length,
    pairs,
    solutionMirrors,
    seed,
  };

  const profile = analyzeStageDifficulty(stage);
  return profile.accepted && pairs.length === pairCount ? stage : fallbackStage;
}

type FallbackPath = {
  start: Port;
  end: Port;
  cells: string[];
  mirrors: MirrorMap;
};

function enumerateFallbackPaths(size: number, maxLength: number): FallbackPath[] {
  const starts = listStartCandidates(size, createSeededRandom(0)).sort((a, b) => {
    const portCompare = portKey(a.port).localeCompare(portKey(b.port));
    return portCompare || a.row - b.row || a.col - b.col;
  });
  const paths: FallbackPath[] = [];

  for (const start of starts) {
    const visited = new Set<string>();
    const cells: string[] = [];
    const mirrors: MirrorMap = {};

    const walk = (cell: Cell, direction: Direction) => {
      if (!inBounds(cell, size) || cells.length >= maxLength) return;

      const key = cellKey(cell.row, cell.col);
      if (visited.has(key)) return;

      visited.add(key);
      cells.push(key);

      for (const nextDirection of DIRECTIONS) {
        if (nextDirection === OPPOSITE[direction]) continue;

        const mirror = mirrorForTurn(direction, nextDirection);
        if (mirror) mirrors[key] = mirror;
        else delete mirrors[key];

        const next = move(cell, nextDirection);
        const exit = getExitPort(next.row, next.col, size);
        if (exit && !samePort(start.port, exit)) {
          paths.push({
            start: start.port,
            end: exit,
            cells: [...cells],
            mirrors: { ...mirrors },
          });
        } else if (inBounds(next, size)) {
          walk(next, nextDirection);
        }
      }

      delete mirrors[key];
      cells.pop();
      visited.delete(key);
    };

    walk({ row: start.row, col: start.col }, start.direction);
  }

  return paths.sort((a, b) => a.cells.length - b.cells.length);
}

function selectDisjointPaths(paths: FallbackPath[], pairCount: number) {
  const selected: FallbackPath[] = [];
  const cells = new Set<string>();
  const ports = new Set<string>();
  let best: FallbackPath[] = [];

  const search = (startIndex: number) => {
    if (selected.length > best.length) best = [...selected];
    if (selected.length === pairCount) return true;

    for (let index = startIndex; index < paths.length; index += 1) {
      const path = paths[index];
      if (ports.has(portKey(path.start)) || ports.has(portKey(path.end))) continue;
      if (path.cells.some((cell) => cells.has(cell))) continue;

      selected.push(path);
      ports.add(portKey(path.start));
      ports.add(portKey(path.end));
      path.cells.forEach((cell) => cells.add(cell));

      if (search(index + 1)) return true;

      selected.pop();
      ports.delete(portKey(path.start));
      ports.delete(portKey(path.end));
      path.cells.forEach((cell) => cells.delete(cell));
    }

    return false;
  };

  search(0);
  return best;
}

function selectDisjointPathsWithUsed(
  paths: FallbackPath[],
  pairCount: number,
  initialCells: Set<string>,
  initialPorts: Set<string>,
) {
  const selected: FallbackPath[] = [];
  const cells = new Set(initialCells);
  const ports = new Set(initialPorts);
  let best: FallbackPath[] = [];

  const search = (startIndex: number) => {
    if (selected.length > best.length) best = [...selected];
    if (selected.length === pairCount) return true;

    for (let index = startIndex; index < paths.length; index += 1) {
      const path = paths[index];
      if (ports.has(portKey(path.start)) || ports.has(portKey(path.end))) continue;
      if (path.cells.some((cell) => cells.has(cell))) continue;

      selected.push(path);
      ports.add(portKey(path.start));
      ports.add(portKey(path.end));
      path.cells.forEach((cell) => cells.add(cell));

      if (search(index + 1)) return true;

      selected.pop();
      ports.delete(portKey(path.start));
      ports.delete(portKey(path.end));
      path.cells.forEach((cell) => cells.delete(cell));
    }

    return false;
  };

  search(0);
  return best;
}

export function checkStage(stage: Stage, mirrors: MirrorMap): CheckResult {
  const occupiedEdges = new Map<string, string>();
  const pairResults: PairResult[] = [];

  for (const pair of stage.pairs) {
    const result = tracePair(stage, pair, mirrors);
    if (result.success) {
      for (const edge of getPathEdges(result.path, mirrors)) {
        const existing = occupiedEdges.get(edge);
        if (existing && existing !== pair.id) {
          result.success = false;
          result.reason = "다른 색 경로와 겹칩니다.";
          break;
        }
        occupiedEdges.set(edge, pair.id);
      }
    }
    pairResults.push(result);
  }

  return {
    success: pairResults.every((result) => result.success),
    pairResults,
  };
}

function getPathEdges(path: PathSegment[], mirrors: MirrorMap) {
  const edges: string[] = [];

  for (const segment of path) {
    const key = cellKey(segment.row, segment.col);
    const incomingEdge = OPPOSITE[segment.direction];
    const outgoingEdge = reflect(segment.direction, mirrors[key]);
    edges.push(`${key}:${incomingEdge}`);
    edges.push(`${key}:${outgoingEdge}`);
  }

  return edges;
}

type CandidatePath = {
  pairId: string;
  edges: string[];
  mirrors: MirrorMap;
  mirrorCount: number;
};

export function findMinimumSolution(stage: Stage): MinimumSolution {
  const generatedMirrorCount = Object.keys(stage.solutionMirrors).length;
  const upperBound = Math.max(generatedMirrorCount, 0);
  const candidatesByPair = stage.pairs.map((pair) => ({
    pair,
    candidates: enumeratePairCandidates(stage, pair, upperBound),
  }));

  if (candidatesByPair.some((entry) => entry.candidates.length === 0)) {
    return {
      mirrorCount: generatedMirrorCount,
      mirrors: stage.solutionMirrors,
    };
  }

  const ordered = [...candidatesByPair].sort((a, b) => a.candidates.length - b.candidates.length);
  const usedEdges = new Set<string>();
  let bestCount = generatedMirrorCount;
  let bestMirrors = stage.solutionMirrors;

  const search = (index: number, mirrorCount: number, mirrors: MirrorMap) => {
    if (mirrorCount >= bestCount) return;
    if (index === ordered.length) {
      const result = checkStage(stage, mirrors);
      if (result.success) {
        bestCount = mirrorCount;
        bestMirrors = { ...mirrors };
      }
      return;
    }

    for (const candidate of ordered[index].candidates) {
      if (mirrorCount + candidate.mirrorCount >= bestCount) continue;
      if (candidate.edges.some((edge) => usedEdges.has(edge))) continue;

      candidate.edges.forEach((edge) => usedEdges.add(edge));
      search(index + 1, mirrorCount + candidate.mirrorCount, { ...mirrors, ...candidate.mirrors });
      candidate.edges.forEach((edge) => usedEdges.delete(edge));
    }
  };

  search(0, 0, {});

  return {
    mirrorCount: bestCount,
    mirrors: bestMirrors,
  };
}

export function analyzeStageDifficulty(stage: Stage): DifficultyProfile {
  const minimum = findMinimumSolution(stage);
  const result = checkStage(stage, minimum.mirrors);

  if (!result.success) {
    return {
      minimumMirrorCount: minimum.mirrorCount,
      hasSharedMirror: false,
      hasDetourPair: false,
      score: -1,
      accepted: false,
    };
  }

  const mirrorUsage = new Map<string, Set<string>>();
  const actualPairMirrors = new Map<string, number>();

  for (const pairResult of result.pairResults) {
    const pairMirrorKeys = new Set<string>();

    for (const segment of pairResult.path) {
      const key = cellKey(segment.row, segment.col);
      if (!minimum.mirrors[key]) continue;

      pairMirrorKeys.add(key);
      const users = mirrorUsage.get(key) ?? new Set<string>();
      users.add(pairResult.pairId);
      mirrorUsage.set(key, users);
    }

    actualPairMirrors.set(pairResult.pairId, pairMirrorKeys.size);
  }

  const hasSharedMirror = [...mirrorUsage.values()].some((users) => users.size >= 2);
  const hasDetourPair = stage.pairs.some((pair) => {
    const actual = actualPairMirrors.get(pair.id) ?? 0;
    const singlePairMinimum = getSinglePairMinimumMirrorCount(stage, pair, minimum.mirrorCount);
    return actual > singlePairMinimum;
  });
  const minimumTarget = Math.max(2, Math.ceil(stage.pairCount * 0.75));
  const hasEnoughMirrors = minimum.mirrorCount >= minimumTarget;
  const accepted = stage.pairCount >= 2 && hasEnoughMirrors && (hasSharedMirror || hasDetourPair);
  const score =
    minimum.mirrorCount +
    (hasSharedMirror ? 8 : 0) +
    (hasDetourPair ? 8 : 0) +
    (hasEnoughMirrors ? 3 : 0);

  return {
    minimumMirrorCount: minimum.mirrorCount,
    hasSharedMirror,
    hasDetourPair,
    score,
    accepted,
  };
}

function getSinglePairMinimumMirrorCount(stage: Stage, pair: Pair, maxMirrors: number) {
  const candidates = enumeratePairCandidates(stage, pair, Math.max(maxMirrors, stage.size));
  return candidates[0]?.mirrorCount ?? Number.POSITIVE_INFINITY;
}

function enumeratePairCandidates(stage: Stage, pair: Pair, maxMirrors: number): CandidatePath[] {
  const entry = getEntry(pair.start, stage.size);
  const candidates: CandidatePath[] = [];
  const queue = [
    {
      cell: { row: entry.row, col: entry.col },
      direction: entry.direction,
      mirrorCount: 0,
      cells: new Set<string>(),
      path: [] as PathSegment[],
      mirrors: {} as MirrorMap,
    },
  ];
  const stateBest = new Map<string, number>();
  const maxCandidates = 40;
  const maxExpanded = 1200;
  let expanded = 0;

  while (queue.length > 0 && candidates.length < maxCandidates && expanded < maxExpanded) {
    queue.sort((a, b) => a.mirrorCount - b.mirrorCount || a.path.length - b.path.length);
    const current = queue.shift();
    if (!current) break;
    expanded += 1;

    if (current.mirrorCount > maxMirrors) continue;

    if (!inBounds(current.cell, stage.size)) {
      const exit = getExitPort(current.cell.row, current.cell.col, stage.size);
      if (exit && samePort(exit, pair.end)) {
        candidates.push({
          pairId: pair.id,
          edges: getPathEdges(current.path, current.mirrors),
          mirrors: current.mirrors,
          mirrorCount: current.mirrorCount,
        });
      }
      continue;
    }

    const key = cellKey(current.cell.row, current.cell.col);
    if (current.cells.has(key)) continue;

    const stateKey = `${key}:${current.direction}`;
    const previousBest = stateBest.get(stateKey);
    if (previousBest !== undefined && previousBest < current.mirrorCount) continue;
    stateBest.set(stateKey, current.mirrorCount);

    const nextCells = new Set(current.cells);
    nextCells.add(key);
    const nextPath = [...current.path, { row: current.cell.row, col: current.cell.col, direction: current.direction, pairId: pair.id }];

    for (const nextDirection of DIRECTIONS) {
      if (nextDirection === OPPOSITE[current.direction]) continue;

      const mirror = mirrorForTurn(current.direction, nextDirection);
      const nextMirrorCount = mirror ? current.mirrorCount + 1 : current.mirrorCount;
      if (nextMirrorCount > maxMirrors) continue;

      const nextMirrors = { ...current.mirrors };
      if (mirror) nextMirrors[key] = mirror;
      else delete nextMirrors[key];

      queue.push({
        cell: move(current.cell, nextDirection),
        direction: nextDirection,
        mirrorCount: nextMirrorCount,
        cells: nextCells,
        path: nextPath,
        mirrors: nextMirrors,
      });
    }
  }

  return candidates.sort((a, b) => a.mirrorCount - b.mirrorCount || a.edges.length - b.edges.length);
}

export function tracePair(stage: Stage, pair: Pair, mirrors: MirrorMap): PairResult {
  const entry = getEntry(pair.start, stage.size);
  const path: PathSegment[] = [];
  const seen = new Set<string>();
  let row = entry.row;
  let col = entry.col;
  let direction = entry.direction;

  for (let step = 0; step < stage.size * stage.size * 4; step += 1) {
    if (!inBounds({ row, col }, stage.size)) {
      const exit = getExitPort(row, col, stage.size);
      if (exit && samePort(exit, pair.end)) {
        return { pairId: pair.id, success: true, reason: "연결되었습니다.", path };
      }
      return { pairId: pair.id, success: false, reason: "다른 위치로 빠져나갔습니다.", path };
    }

    const stateKey = `${row}:${col}:${direction}`;
    if (seen.has(stateKey)) {
      return { pairId: pair.id, success: false, reason: "경로가 반복됩니다.", path };
    }
    seen.add(stateKey);

    const key = cellKey(row, col);
    path.push({ row, col, direction, pairId: pair.id });
    direction = reflect(direction, mirrors[key]);
    const next = move({ row, col }, direction);
    row = next.row;
    col = next.col;
  }

  return { pairId: pair.id, success: false, reason: "경로가 너무 깁니다.", path };
}

export function toggleMirror(current: Mirror | undefined, next: Mirror) {
  return current === next ? undefined : next;
}
