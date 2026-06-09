export type RpsHand = "scissors" | "rock" | "paper";
export type RpsActor = "me" | "opponent";
export type RpsRound = 1 | 2 | 3;
export type RpsQuestionSide = "left" | "right";

export type RpsProblem = {
  round: RpsRound;
  perspective: RpsActor;
  questionSide: RpsQuestionSide;
  leftActor: RpsActor;
  rightActor: RpsActor;
  leftHand: RpsHand | null;
  rightHand: RpsHand | null;
  answer: RpsHand;
};

export type RpsRoundSummary = {
  round: RpsRound;
  solved: number;
  correct: number;
};

export const RPS_ROUND_DURATION_MS = 60_000;
export const RPS_TOTAL_ROUNDS: RpsRound[] = [1, 2, 3];

export const RPS_HANDS: Array<{ hand: RpsHand; label: string; symbol: string; hotkey: string; code: string }> = [
  { hand: "scissors", label: "가위", symbol: "✌️", hotkey: "←", code: "ArrowLeft" },
  { hand: "rock", label: "바위", symbol: "✊", hotkey: "↓", code: "ArrowDown" },
  { hand: "paper", label: "보", symbol: "✋", hotkey: "→", code: "ArrowRight" },
];

export const HAND_LABEL: Record<RpsHand, string> = {
  scissors: "가위",
  rock: "바위",
  paper: "보",
};

export const HAND_SYMBOL: Record<RpsHand, string> = {
  scissors: "✌️",
  rock: "✊",
  paper: "✋",
};

export const ACTOR_LABEL: Record<RpsActor, string> = {
  me: "나",
  opponent: "상대",
};

const WINNING_HAND: Record<RpsHand, RpsHand> = {
  scissors: "rock",
  rock: "paper",
  paper: "scissors",
};

const LOSING_HAND: Record<RpsHand, RpsHand> = {
  scissors: "paper",
  rock: "scissors",
  paper: "rock",
};

export function createRpsSeed() {
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

export function getRoundPerspective(round: RpsRound, random: () => number): RpsActor {
  if (round === 1) return "me";
  if (round === 2) return "opponent";
  return random() < 0.5 ? "me" : "opponent";
}

export function getRoundQuestionSide(round: RpsRound, random: () => number): RpsQuestionSide {
  if (round === 1) return "left";
  if (round === 2) return "right";
  return random() < 0.5 ? "left" : "right";
}

export function getPerspectiveActors(perspective: RpsActor) {
  void perspective;
  return { leftActor: "me", rightActor: "opponent" } as const;
}

export function getWinner(leftHand: RpsHand, rightHand: RpsHand): RpsQuestionSide | "draw" {
  if (leftHand === rightHand) return "draw";
  return WINNING_HAND[rightHand] === leftHand ? "left" : "right";
}

export function getWinningHandAgainst(hand: RpsHand): RpsHand {
  return WINNING_HAND[hand];
}

export function getLosingHandAgainst(hand: RpsHand): RpsHand {
  return LOSING_HAND[hand];
}

export function getHandFromKeyCode(code: string): RpsHand | null {
  return RPS_HANDS.find((item) => item.code === code)?.hand ?? null;
}

export function calculateAnswer({
  questionSide,
  leftActor,
  rightActor,
  visibleHand,
}: {
  questionSide: RpsQuestionSide;
  leftActor: RpsActor;
  rightActor: RpsActor;
  visibleHand: RpsHand;
}) {
  void leftActor;
  void rightActor;
  return questionSide === "left" ? getWinningHandAgainst(visibleHand) : getLosingHandAgainst(visibleHand);
}

export function generateRpsProblem(round: RpsRound, seed = createRpsSeed()): RpsProblem {
  const random = createSeededRandom(seed);
  const perspective = getRoundPerspective(round, random);
  const { leftActor, rightActor } = getPerspectiveActors(perspective);
  const questionSide = getRoundQuestionSide(round, random);
  const visibleHand = RPS_HANDS[Math.floor(random() * RPS_HANDS.length)].hand;
  const answer = calculateAnswer({ questionSide, leftActor, rightActor, visibleHand });

  return {
    round,
    perspective,
    questionSide,
    leftActor,
    rightActor,
    leftHand: questionSide === "left" ? null : visibleHand,
    rightHand: questionSide === "right" ? null : visibleHand,
    answer,
  };
}

export function isCorrectRpsAnswer(problem: RpsProblem, hand: RpsHand) {
  return problem.answer === hand;
}
