export type ShapeId =
  | "triangle"
  | "circle"
  | "square"
  | "trapezoid"
  | "hourglass"
  | "pentagon"
  | "diamond"
  | "bowtie"
  | "star"
  | "steps"
  | "twin-spike"
  | "pyramid"
  | "double-triangle"
  | "petal"
  | "zigzag";

export type ShapeMemoryRound = 1 | 2;

export type ShapeResponse = "different" | "match-2" | "match-3";

export type ShapeDefinition = {
  id: ShapeId;
  label: string;
};

export type ShapeMemoryItem = {
  shape: ShapeId;
  expectedResponse: ShapeResponse | null;
};

export type ShapeMemoryShapeSet = readonly ShapeId[];

export type ShapeMemoryRoundConfig = {
  round: ShapeMemoryRound;
  warmupCount: number;
  totalCount: number;
  durationMs: number;
  instruction: string;
  actions: Array<{
    response: ShapeResponse;
    label: string;
    hotkey: string;
    detail: string;
  }>;
};

export type ShapeMemoryEvaluation = {
  expectedResponse: ShapeResponse | null;
  isCorrect: boolean;
};

export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
  { id: "triangle", label: "삼각형" },
  { id: "circle", label: "원" },
  { id: "square", label: "정사각형" },
  { id: "trapezoid", label: "사다리꼴" },
  { id: "hourglass", label: "모래시계" },
  { id: "pentagon", label: "오각형" },
  { id: "diamond", label: "마름모" },
  { id: "bowtie", label: "나비형" },
  { id: "star", label: "별" },
  { id: "steps", label: "계단형" },
  { id: "twin-spike", label: "이중 쐐기" },
  { id: "pyramid", label: "피라미드" },
  { id: "double-triangle", label: "이중 삼각형" },
  { id: "petal", label: "꽃잎형" },
  { id: "zigzag", label: "지그재그" },
];

export const SHAPE_MEMORY_SETS: readonly ShapeMemoryShapeSet[] = [
  ["triangle", "circle", "square"],
  ["trapezoid", "hourglass", "pentagon"],
  ["diamond", "bowtie", "star"],
  ["steps", "twin-spike", "pyramid"],
  ["double-triangle", "petal", "zigzag"],
];

export const SHAPE_MEMORY_ROUNDS: Record<ShapeMemoryRound, ShapeMemoryRoundConfig> = {
  1: {
    round: 1,
    warmupCount: 2,
    totalCount: 24,
    durationMs: 3000,
    instruction: "화면에 제시되는 도형이 두 번째 전 도형과 같은지 판단해 주세요.",
    actions: [
      { response: "different", label: "다름", hotkey: "Space", detail: "두 번째 전과 다름" },
      { response: "match-2", label: "같음", hotkey: "←", detail: "두 번째 전과 같음" },
    ],
  },
  2: {
    round: 2,
    warmupCount: 3,
    totalCount: 26,
    durationMs: 3000,
    instruction: "화면에 제시되는 도형이 두 번째 전 혹은 세 번째 전 도형과 같은지 판단해 주세요.",
    actions: [
      { response: "different", label: "다름", hotkey: "Space", detail: "두 번째, 세 번째 전 모두와 다름" },
      { response: "match-2", label: "같음", hotkey: "←", detail: "두 번째 전과 같음" },
      { response: "match-3", label: "같음", hotkey: "→", detail: "세 번째 전과 같음" },
    ],
  },
};

export function createShapeMemorySeed() {
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

export function pickShapeMemorySet(seed: number): ShapeMemoryShapeSet {
  const random = createSeededRandom(seed);
  return SHAPE_MEMORY_SETS[Math.floor(random() * SHAPE_MEMORY_SETS.length)];
}

export function getRoundConfig(round: ShapeMemoryRound) {
  return SHAPE_MEMORY_ROUNDS[round];
}

export function evaluateShapeMemoryResponse(
  sequence: ShapeId[],
  round: ShapeMemoryRound,
  index: number,
  response: ShapeResponse,
): ShapeMemoryEvaluation {
  const expectedResponse = getExpectedResponse(sequence, round, index);
  return {
    expectedResponse,
    isCorrect: expectedResponse !== null && expectedResponse === response,
  };
}

export function getExpectedResponse(sequence: ShapeId[], round: ShapeMemoryRound, index: number): ShapeResponse | null {
  const shape = sequence[index];
  const config = getRoundConfig(round);
  if (!shape || index < config.warmupCount) return null;

  if (round === 1) {
    return shape === sequence[index - 2] ? "match-2" : "different";
  }

  if (shape === sequence[index - 2]) return "match-2";
  if (shape === sequence[index - 3]) return "match-3";
  return "different";
}

export function generateShapeMemorySequence(
  round: ShapeMemoryRound,
  seed: number,
  shapePool: ShapeMemoryShapeSet = SHAPE_DEFINITIONS.map((shape) => shape.id),
): ShapeMemoryItem[] {
  const config = getRoundConfig(round);
  const random = createSeededRandom(seed);
  const shapeIds = [...new Set(shapePool)];
  const sequence: ShapeId[] = [];

  if (shapeIds.length === 0) {
    throw new Error("Shape memory sequence requires at least one shape.");
  }

  for (let index = 0; index < config.totalCount; index += 1) {
    sequence.push(shapeIds[Math.floor(random() * shapeIds.length)]);
  }

  return sequence.map((shape, index) => ({
    shape,
    expectedResponse: getExpectedResponse(sequence, round, index),
  }));
}
