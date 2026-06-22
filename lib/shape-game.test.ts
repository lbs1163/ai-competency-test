import { describe, expect, it } from "vitest";
import {
  evaluateShapeMemoryResponse,
  SHAPE_MEMORY_SETS,
  generateShapeMemorySequence,
  getExpectedResponse,
  getRoundConfig,
  pickShapeMemorySet,
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

  it("limits generated shapes to the selected shape set", () => {
    const shapeSet: ShapeId[] = ["diamond", "bowtie", "star"];
    const sequence = generateShapeMemorySequence(2, 9876, shapeSet);
    expect(sequence.every((item) => shapeSet.includes(item.shape))).toBe(true);
  });

  it("does not repeat the same shape immediately", () => {
    const sequence = generateShapeMemorySequence(2, 2468);

    for (let index = 1; index < sequence.length; index += 1) {
      expect(sequence[index].shape).not.toBe(sequence[index - 1].shape);
    }
  });

  it("picks one of the configured five shape sets", () => {
    const selectedSet = pickShapeMemorySet(1357);
    expect(SHAPE_MEMORY_SETS).toContain(selectedSet);
    expect(selectedSet).toHaveLength(3);
  });
});
