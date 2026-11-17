import { describe, expect, it } from "vitest";
import { decryptSessionToken, encryptSessionToken } from "./session-crypto";

describe("merchant session token encryption", () => {
  it("encrypts and decrypts without exposing plaintext", async () => {
    const encrypted = await encryptSessionToken("sensitive-token", "server-secret");
    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("sensitive-token");
    await expect(decryptSessionToken(encrypted, "server-secret")).resolves.toBe("sensitive-token");
  });

  it("supports legacy plaintext rows during migration", async () => {
    await expect(decryptSessionToken("legacy-token", "server-secret")).resolves.toBe("legacy-token");
  });

  it("rejects the wrong encryption key", async () => {
    const encrypted = await encryptSessionToken("sensitive-token", "server-secret");
    await expect(decryptSessionToken(encrypted, "wrong-secret")).rejects.toThrow();
  });
});
