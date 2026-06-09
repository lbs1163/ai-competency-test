import { describe, expect, it } from "vitest";
import {
  MAX_ROTATION_STEPS,
  ROTATION_LETTERS,
  canAppendRotationStep,
  checkShapeRotationAnswer,
  findMinimumClicks,
  generateShapeRotationProblem,
  operationsToCssTransform,
  sameTransform,
  type RotationOperation,
} from "./shape-rotation-game";

describe("shape rotation game", () => {
  it("treats opposite 45 degree rotations as identity", () => {
    expect(sameTransform(["rotate-left", "rotate-right"], [])).toBe(true);
  });

  it("applies flips relative to the current transformed state", () => {
    expect(sameTransform(["rotate-right", "flip-x"], ["flip-x", "rotate-right"])).toBe(false);
  });

  it("renders accumulated transforms as a CSS matrix instead of a transform list", () => {
    expect(operationsToCssTransform(["rotate-right", "flip-x"])).toMatch(/^matrix\(/);
  });

  it("uses only clearly asymmetric letters for round one", () => {
    expect(ROTATION_LETTERS).toEqual(["R", "L", "F", "P", "G"]);
    expect(ROTATION_LETTERS).not.toContain("N");
    expect(ROTATION_LETTERS).not.toContain("Z");
    expect(ROTATION_LETTERS).not.toContain("K");
  });

  it("calculates minimum clicks for equivalent transforms", () => {
    expect(findMinimumClicks(["rotate-left", "rotate-left", "rotate-left", "rotate-left"])).toBe(2);
    expect(findMinimumClicks(["flip-x", "flip-x"])).toBe(0);
  });

  it("checks generated problem answer", () => {
    const problem = generateShapeRotationProblem(1, 20260609);
    const result = checkShapeRotationAnswer(problem, problem.answer);
    expect(result.correct).toBe(true);
    expect(result.minimumClicks).toBeGreaterThanOrEqual(1);
  });

  it("limits input steps to eight", () => {
    const steps = Array.from({ length: MAX_ROTATION_STEPS }, () => "rotate-left") as RotationOperation[];
    expect(canAppendRotationStep(steps)).toBe(false);
  });
});