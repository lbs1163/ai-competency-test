export type ShapeRotationRound = 1 | 2;

export type RotationOperation = "rotate-left" | "rotate-right" | "flip-x" | "flip-y";

export type RotationProblemKind = "letter" | "grid";

export type GridPattern = number[][];

export type ShapeRotationProblem = {
  id: string;
  round: ShapeRotationRound;
  kind: RotationProblemKind;
  label: string;
  letter?: string;
  grid?: GridPattern;
  answer: RotationOperation[];
  minimumClicks: number;
  seed: number;
};

export type ShapeRotationCheckResult = {
  correct: boolean;
  optimal: boolean;
  clickCount: number;
  minimumClicks: number;
};

export const MAX_ROTATION_CLICKS = 20;
export const MAX_ROTATION_STEPS = 8;
export const ROTATION_ROUND_DURATION_MS = 180_000;

export const ROTATION_OPERATIONS: Array<{ operation: RotationOperation; label: string; shortLabel: string }> = [
  { operation: "rotate-left", label: "왼쪽 45° 회전", shortLabel: "↺45°" },
  { operation: "rotate-right", label: "오른쪽 45° 회전", shortLabel: "↻45°" },
  { operation: "flip-x", label: "좌우반전", shortLabel: "↔" },
  { operation: "flip-y", label: "상하반전", shortLabel: "↕" },
];

export const ROTATION_LETTERS = ["R", "L", "F", "P", "G"] as const;

const GRID_PATTERNS: GridPattern[] = [
  [
    [1, 0, 0, 1],
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 1],
  ],
  [
    [1, 0, 1, 0],
    [0, 0, 1, 1],
    [1, 1, 0, 0],
    [0, 1, 0, 1],
  ],
  [
    [0, 1, 0, 0],
    [1, 1, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 0, 1],
  ],
  [
    [1, 1, 0, 0],
    [0, 1, 0, 1],
    [0, 1, 1, 1],
    [1, 0, 0, 0],
  ],
  [
    [0, 0, 1, 0],
    [1, 1, 1, 0],
    [0, 1, 0, 0],
    [1, 0, 1, 1],
  ],
];

type Matrix = readonly [number, number, number, number];

export function createShapeRotationSeed() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0];
  }
  return Date.now() >>> 0;
}

export function createSeededRandom(seedInput: number) {
  let seed = seedInput >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateShapeRotationProblem(round: ShapeRotationRound, seed = createShapeRotationSeed()): ShapeRotationProblem {
  const random = createSeededRandom(seed);
  const answerLength = 2 + Math.floor(random() * 4);
  const answer = buildAnswer(random, answerLength);
  const minimumClicks = findMinimumClicks(answer);

  if (round === 1) {
    const letter = ROTATION_LETTERS[Math.floor(random() * ROTATION_LETTERS.length)];
    return { id: `letter-${seed}`, round, kind: "letter", label: `알파벳 ${letter}`, letter, answer, minimumClicks, seed };
  }

  const grid = GRID_PATTERNS[Math.floor(random() * GRID_PATTERNS.length)];
  return { id: `grid-${seed}`, round, kind: "grid", label: "격자 도형", grid, answer, minimumClicks, seed };
}

export function checkShapeRotationAnswer(problem: ShapeRotationProblem, userAnswer: RotationOperation[]): ShapeRotationCheckResult {
  const correct = sameTransform(problem.answer, userAnswer);
  return {
    correct,
    optimal: correct && userAnswer.length === problem.minimumClicks,
    clickCount: userAnswer.length,
    minimumClicks: problem.minimumClicks,
  };
}

export function canAppendRotationStep(current: RotationOperation[]) {
  return current.length < MAX_ROTATION_CLICKS && current.length < MAX_ROTATION_STEPS;
}

export function operationsToCssTransform(operations: RotationOperation[]) {
  const [a, b, c, d] = sequenceToMatrix(operations);
  return `matrix(${formatMatrixValue(a)}, ${formatMatrixValue(b)}, ${formatMatrixValue(c)}, ${formatMatrixValue(d)}, 0, 0)`;
}

export function sameTransform(left: RotationOperation[], right: RotationOperation[]) {
  return matrixKey(sequenceToMatrix(left)) === matrixKey(sequenceToMatrix(right));
}

export function findMinimumClicks(target: RotationOperation[]) {
  const targetKey = matrixKey(sequenceToMatrix(target));
  const queue: Array<{ operations: RotationOperation[]; key: string }> = [{ operations: [], key: matrixKey(sequenceToMatrix([])) }];
  const visited = new Set(queue.map((item) => item.key));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.key === targetKey) return current.operations.length;
    if (current.operations.length >= MAX_ROTATION_STEPS) continue;

    for (const { operation } of ROTATION_OPERATIONS) {
      const operations = [...current.operations, operation];
      const key = matrixKey(sequenceToMatrix(operations));
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ operations, key });
    }
  }

  return target.length;
}

function buildAnswer(random: () => number, answerLength: number) {
  const answer: RotationOperation[] = [];
  while (answer.length < answerLength) {
    const operation = ROTATION_OPERATIONS[Math.floor(random() * ROTATION_OPERATIONS.length)].operation;
    const next = [...answer, operation];
    if (findMinimumClicks(next) > 0) answer.push(operation);
  }
  return answer;
}

function sequenceToMatrix(operations: RotationOperation[]): Matrix {
  return operations.reduce<Matrix>((matrix, operation) => multiply(operationMatrix(operation), matrix), [1, 0, 0, 1]);
}

function operationMatrix(operation: RotationOperation): Matrix {
  const c = Math.SQRT1_2;
  if (operation === "rotate-left") return [c, -c, c, c];
  if (operation === "rotate-right") return [c, c, -c, c];
  if (operation === "flip-x") return [-1, 0, 0, 1];
  return [1, 0, 0, -1];
}

function multiply(left: Matrix, right: Matrix): Matrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
  ];
}

function matrixKey(matrix: Matrix) {
  return matrix.map((value) => Math.round(value * 1_000_000) / 1_000_000).join(":");
}

function formatMatrixValue(value: number) {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}