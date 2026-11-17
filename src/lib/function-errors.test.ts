import { describe, expect, it } from "vitest";
import { functionErrorMessage } from "./function-errors";

describe("functionErrorMessage", () => {
  it("extracts the structured edge-function message", async () => {
    const error = new Error("Edge Function returned a non-2xx status code") as Error & {
      context: { json: () => Promise<unknown> };
    };
    error.context = {
      json: async () => ({ error: { code: "ai_not_configured", message: "AI image tools are temporarily unavailable." } }),
    };

    await expect(functionErrorMessage(error, null, "Failed")).resolves.toBe(
      "AI image tools are temporarily unavailable.",
    );
  });

  it("uses a safe fallback instead of the generic SDK error", async () => {
    await expect(functionErrorMessage(new Error("Edge Function returned a non-2xx status code"), null, "Failed to generate image")).resolves.toBe(
      "Failed to generate image",
    );
  });
});
