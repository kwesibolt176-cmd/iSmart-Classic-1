import { describe, expect, it } from "vitest";
import { describeInviteDelivery } from "./staff-invite-delivery";

describe("describeInviteDelivery", () => {
  it("reports success when the email arrives but SMS fails", () => {
    const result = describeInviteDelivery("Ama", { email: { ok: true }, sms: { ok: false }, delivered: true }, false);
    expect(result.ok).toBe(true);
    expect(result.description).toContain("by email");
    expect(result.description).toContain("SMS could not be delivered");
  });

  it("reports failure when no channel delivered", () => {
    const result = describeInviteDelivery("Ama", { email: { ok: false }, sms: { ok: false }, delivered: false }, true);
    expect(result.ok).toBe(false);
  });

  it("never includes the invite link or token", () => {
    const result = describeInviteDelivery("Ama", null, true);
    expect(result.description).not.toMatch(/token|staff-invite|http/i);
  });
});
