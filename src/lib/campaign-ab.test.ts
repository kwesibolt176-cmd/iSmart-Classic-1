import { describe, expect, it } from "vitest";
import { determineCampaignWinner } from "./campaign-ab";

describe("determineCampaignWinner", () => {
  it("selects the variant with the higher configured rate", () => {
    expect(
      determineCampaignWinner(
        [
          { variant: "A", sent: 100, opened: 60, clicked: 10, converted: 2 },
          { variant: "B", sent: 100, opened: 40, clicked: 20, converted: 3 },
        ],
        "open_rate",
      ).winner,
    ).toBe("A");

    expect(
      determineCampaignWinner(
        [
          { variant: "A", sent: 100, opened: 60, clicked: 10, converted: 2 },
          { variant: "B", sent: 100, opened: 40, clicked: 20, converted: 3 },
        ],
        "click_rate",
      ).winner,
    ).toBe("B");
  });

  it("does not invent a winner for ties or missing delivery data", () => {
    expect(
      determineCampaignWinner(
        [
          { variant: "A", sent: 10, opened: 5, clicked: 1, converted: 0 },
          { variant: "B", sent: 10, opened: 5, clicked: 1, converted: 0 },
        ],
        "open_rate",
      ).winner,
    ).toBeNull();

    expect(
      determineCampaignWinner(
        [
          { variant: "A", sent: 0, opened: 0, clicked: 0, converted: 0 },
          { variant: "B", sent: 0, opened: 0, clicked: 0, converted: 0 },
        ],
        "click_rate",
      ).winner,
    ).toBeNull();
  });
});
