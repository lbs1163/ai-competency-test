import { describe, expect, it } from "vitest";
import {
  calculateAnswer,
  generateRpsProblem,
  getHandFromKeyCode,
  getPerspectiveActors,
  getRoundQuestionSide,
  getRoundPerspective,
  getWinner,
  isCorrectRpsAnswer,
  type RpsHand,
} from "./rock-paper-scissors-game";

describe("rock paper scissors rules", () => {
  it("calculates winners by standard rules", () => {
    expect(getWinner("rock", "scissors")).toBe("left");
    expect(getWinner("paper", "rock")).toBe("left");
    expect(getWinner("scissors", "paper")).toBe("left");
    expect(getWinner("scissors", "rock")).toBe("right");
    expect(getWinner("paper", "paper")).toBe("draw");
  });

  it("maps arrow keys to scissors, rock, paper", () => {
    expect(getHandFromKeyCode("ArrowLeft")).toBe("scissors");
    expect(getHandFromKeyCode("ArrowDown")).toBe("rock");
    expect(getHandFromKeyCode("ArrowRight")).toBe("paper");
    expect(getHandFromKeyCode("Space")).toBeNull();
  });

  it("uses me perspective in round 1 and opponent perspective in round 2", () => {
    expect(getRoundPerspective(1, () => 0.99)).toBe("me");
    expect(getRoundPerspective(2, () => 0.01)).toBe("opponent");
    expect(getRoundPerspective(3, () => 0.25)).toBe("me");
    expect(getRoundPerspective(3, () => 0.75)).toBe("opponent");
  });

  it("uses perspective as the question side, while actors stay fixed", () => {
    expect(getRoundQuestionSide(1, () => 0.99)).toBe("left");
    expect(getRoundQuestionSide(2, () => 0.01)).toBe("right");
    expect(getRoundQuestionSide(3, () => 0.25)).toBe("left");
    expect(getRoundQuestionSide(3, () => 0.75)).toBe("right");
    expect(getPerspectiveActors("me")).toEqual({ leftActor: "me", rightActor: "opponent" });
    expect(getPerspectiveActors("opponent")).toEqual({ leftActor: "me", rightActor: "opponent" });
  });

  it("chooses a hand that makes me win in both perspectives", () => {
    expect(
      calculateAnswer({ questionSide: "left", leftActor: "me", rightActor: "opponent", visibleHand: "scissors" }),
    ).toBe("rock");
    expect(
      calculateAnswer({ questionSide: "right", leftActor: "me", rightActor: "opponent", visibleHand: "rock" }),
    ).toBe("scissors");
    expect(
      calculateAnswer({ questionSide: "left", leftActor: "opponent", rightActor: "me", visibleHand: "paper" }),
    ).toBe("scissors");
    expect(
      calculateAnswer({ questionSide: "right", leftActor: "opponent", rightActor: "me", visibleHand: "rock" }),
    ).toBe("scissors");
  });
});

describe("rock paper scissors generator", () => {
  it("generates deterministic problems and validates answers", () => {
    const first = generateRpsProblem(1, 1234);
    const second = generateRpsProblem(1, 1234);
    expect(second).toEqual(first);
    expect(isCorrectRpsAnswer(first, first.answer)).toBe(true);
    expect(isCorrectRpsAnswer(first, ["scissors", "rock", "paper"].find((hand) => hand !== first.answer) as RpsHand)).toBe(false);
  });
});
