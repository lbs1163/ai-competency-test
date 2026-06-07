import { describe, expect, it } from "vitest";
import { analyzeStageDifficulty, checkStage, findMinimumSolution, generateStage, reflect, type Stage } from "./game";

describe("mirror reflection", () => {
  it("reflects slash mirrors", () => {
    expect(reflect("up", "/")).toBe("right");
    expect(reflect("right", "/")).toBe("up");
    expect(reflect("down", "/")).toBe("left");
    expect(reflect("left", "/")).toBe("down");
  });

  it("reflects backslash mirrors", () => {
    expect(reflect("up", "\\")).toBe("left");
    expect(reflect("left", "\\")).toBe("up");
    expect(reflect("down", "\\")).toBe("right");
    expect(reflect("right", "\\")).toBe("down");
  });
});

describe("stage checks", () => {
  it("passes a straight path", () => {
    const stage: Stage = {
      size: 5,
      pairCount: 1,
      pairs: [
        {
          id: "pair-0",
          name: "1",
          color: "#ef4444",
          start: { side: "left", index: 2 },
          end: { side: "right", index: 2 },
        },
      ],
      solutionMirrors: {},
      seed: 1,
    };

    expect(checkStage(stage, {}).success).toBe(true);
  });

  it("fails when the beam exits at the wrong port", () => {
    const stage: Stage = {
      size: 5,
      pairCount: 1,
      pairs: [
        {
          id: "pair-0",
          name: "1",
          color: "#ef4444",
          start: { side: "left", index: 2 },
          end: { side: "top", index: 2 },
        },
      ],
      solutionMirrors: {},
      seed: 1,
    };

    expect(checkStage(stage, {}).success).toBe(false);
  });

  it("detects path overlap", () => {
    const stage: Stage = {
      size: 5,
      pairCount: 2,
      pairs: [
        {
          id: "pair-0",
          name: "1",
          color: "#ef4444",
          start: { side: "left", index: 2 },
          end: { side: "right", index: 2 },
        },
        {
          id: "pair-1",
          name: "2",
          color: "#2563eb",
          start: { side: "right", index: 2 },
          end: { side: "left", index: 2 },
        },
      ],
      solutionMirrors: {},
      seed: 1,
    };

    expect(checkStage(stage, {}).success).toBe(false);
  });

  it("allows paths to pass through the same cell without sharing edges", () => {
    const stage: Stage = {
      size: 5,
      pairCount: 2,
      pairs: [
        {
          id: "pair-0",
          name: "1",
          color: "#ef4444",
          start: { side: "left", index: 2 },
          end: { side: "top", index: 2 },
        },
        {
          id: "pair-1",
          name: "2",
          color: "#2563eb",
          start: { side: "bottom", index: 2 },
          end: { side: "right", index: 2 },
        },
      ],
      solutionMirrors: { "2:2": "/" },
      seed: 1,
    };

    expect(checkStage(stage, stage.solutionMirrors).success).toBe(true);
  });
});

describe("stage generator", () => {
  it("generates a solvable default stage", () => {
    const stage = generateStage(5, 2);
    expect(stage.size).toBe(5);
    expect(stage.pairs).toHaveLength(2);
    expect(checkStage(stage, stage.solutionMirrors).success).toBe(true);
  });

  it("generates a solvable max stage", () => {
    const stage = generateStage(10, 10);
    expect(stage.size).toBe(10);
    expect(stage.pairs).toHaveLength(10);
    expect(checkStage(stage, stage.solutionMirrors).success).toBe(true);
  });

  it("generates a solvable dense small stage", () => {
    const stage = generateStage(5, 10);
    expect(stage.size).toBe(5);
    expect(stage.pairs).toHaveLength(10);
    expect(checkStage(stage, stage.solutionMirrors).success).toBe(true);
  });

  it("generates the same stage for the same seed", () => {
    const first = generateStage(7, 4, 12345);
    const second = generateStage(7, 4, 12345);
    expect(second).toEqual(first);
  });

  it("clamps one pair requests to at least two pairs", () => {
    const stage = generateStage(5, 1, 20260608);
    expect(stage.pairs).toHaveLength(2);
  });

  it("generates an accepted difficulty profile", () => {
    const stage = generateStage(5, 2, 20260608);
    const profile = analyzeStageDifficulty(stage);
    expect(profile.accepted).toBe(true);
    expect(profile.minimumMirrorCount).toBeGreaterThanOrEqual(2);
  });

  it("does not accept independent simple turns as difficult", () => {
    const stage: Stage = {
      size: 5,
      pairCount: 2,
      pairs: [
        {
          id: "pair-0",
          name: "1",
          color: "#ef4444",
          start: { side: "left", index: 1 },
          end: { side: "top", index: 1 },
        },
        {
          id: "pair-1",
          name: "2",
          color: "#2563eb",
          start: { side: "right", index: 3 },
          end: { side: "bottom", index: 3 },
        },
      ],
      solutionMirrors: {
        "1:1": "/",
        "3:3": "/",
      },
      seed: 1,
    };

    const profile = analyzeStageDifficulty(stage);
    expect(profile.hasSharedMirror).toBe(false);
    expect(profile.hasDetourPair).toBe(false);
    expect(profile.accepted).toBe(false);
  });
});

describe("minimum solution", () => {
  it("ignores unnecessary generated mirrors", () => {
    const stage: Stage = {
      size: 5,
      pairCount: 1,
      pairs: [
        {
          id: "pair-0",
          name: "1",
          color: "#ef4444",
          start: { side: "left", index: 2 },
          end: { side: "right", index: 2 },
        },
      ],
      solutionMirrors: { "0:0": "/" },
      seed: 1,
    };

    const minimum = findMinimumSolution(stage);
    expect(minimum.mirrorCount).toBe(0);
    expect(checkStage(stage, minimum.mirrors).success).toBe(true);
  });

  it("finds a one-mirror turn", () => {
    const stage: Stage = {
      size: 5,
      pairCount: 1,
      pairs: [
        {
          id: "pair-0",
          name: "1",
          color: "#ef4444",
          start: { side: "left", index: 2 },
          end: { side: "top", index: 2 },
        },
      ],
      solutionMirrors: { "2:2": "/" },
      seed: 1,
    };

    const minimum = findMinimumSolution(stage);
    expect(minimum.mirrorCount).toBe(1);
    expect(checkStage(stage, minimum.mirrors).success).toBe(true);
  });
});
