import { describe, expect, it } from "vitest";
import { createIdempotencyKey, merchantBusinessPath } from "./merchant-api-utils";

describe("Merchant API request helpers", () => {
  it("keeps a stable reference stable across financial retries", () => {
    expect(createIdempotencyKey("payout", "PAYOUT_123")).toBe("payout:PAYOUT_123");
    expect(createIdempotencyKey("payout", "PAYOUT_123")).toBe("payout:PAYOUT_123");
  });

  it("creates unique keys when no stable reference exists", () => {
    expect(createIdempotencyKey("checkout")).not.toBe(createIdempotencyKey("checkout"));
  });

  it("uses the documented business path parameter", () => {
    expect(merchantBusinessPath("8d89631c-8a94-4e69-a420-7956f78334c7")).toEqual({
      id: "8d89631c-8a94-4e69-a420-7956f78334c7",
    });
  });
});
