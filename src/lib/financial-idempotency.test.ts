import { describe, expect, it, vi } from "vitest";
import { getFinancialAttempt } from "./financial-idempotency";

describe("getFinancialAttempt", () => {
  it("reuses the request id when the same financial request is retried", () => {
    const createId = vi.fn(() => "first-id");
    const first = getFinancialAttempt(null, "same-body", createId);
    const retry = getFinancialAttempt(first, "same-body", createId);
    expect(retry).toBe(first);
    expect(createId).toHaveBeenCalledOnce();
  });

  it("creates a new request id when financial inputs change", () => {
    const createId = vi.fn().mockReturnValueOnce("first-id").mockReturnValueOnce("second-id");
    const first = getFinancialAttempt(null, "first-body", createId);
    const changed = getFinancialAttempt(first, "changed-body", createId);
    expect(changed.requestId).toBe("second-id");
    expect(createId).toHaveBeenCalledTimes(2);
  });
});
