import { describe, expect, it } from "vitest";
import {
  evaluateShapeMemoryResponse,
  generateShapeMemorySequence,
  getExpectedResponse,
  getRoundConfig,
  type ShapeId,
} from "./shape-game";

describe("shape memory rules", () => {
  it("uses 2-back matching in round 1", () => {
    const sequence: ShapeId[] = ["triangle", "circle", "triangle", "square"];
    expect(getExpectedResponse(sequence, 1, 0)).toBeNull();
    expect(getExpectedResponse(sequence, 1, 1)).toBeNull();
    expect(getExpectedResponse(sequence, 1, 2)).toBe("match-2");
    expect(getExpectedResponse(sequence, 1, 3)).toBe("different");
  });

  it("uses 2-back first, then 3-back in round 2", () => {
    const sequence: ShapeId[] = ["triangle", "circle", "square", "circle", "circle", "star"];
    expect(getExpectedResponse(sequence, 2, 0)).toBeNull();
    expect(getExpectedResponse(sequence, 2, 1)).toBeNull();
    expect(getExpectedResponse(sequence, 2, 2)).toBeNull();
    expect(getExpectedResponse(sequence, 2, 3)).toBe("match-2");
    expect(getExpectedResponse(sequence, 2, 4)).toBe("match-3");
    expect(getExpectedResponse(sequence, 2, 5)).toBe("different");
  });

  it("evaluates answers correctly", () => {
    const sequence: ShapeId[] = ["triangle", "circle", "triangle"];
    expect(evaluateShapeMemoryResponse(sequence, 1, 2, "match-2").isCorrect).toBe(true);
    expect(evaluateShapeMemoryResponse(sequence, 1, 2, "different").isCorrect).toBe(false);
  });
});

describe("shape memory generator", () => {
  it("generates round 1 sequence with stable length", () => {
    const config = getRoundConfig(1);
    const sequence = generateShapeMemorySequence(1, 1234);
    expect(sequence).toHaveLength(config.totalCount);
    expect(sequence[0].expectedResponse).toBeNull();
    expect(sequence[1].expectedResponse).toBeNull();
  });

  it("generates round 2 sequence with stable seed", () => {
    const first = generateShapeMemorySequence(2, 4321);
    const second = generateShapeMemorySequence(2, 4321);
    expect(second).toEqual(first);
  });
});