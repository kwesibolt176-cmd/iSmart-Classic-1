import { describe, expect, it } from "vitest";
import { friendlyAuthError, messageFromAuthPayload } from "./auth-errors";

describe("authentication error handling", () => {
  it("extracts the Merchant API nested error message", () => {
    expect(messageFromAuthPayload({ error: { code: "invalid_input", message: "email is invalid" } }))
      .toBe("email is invalid");
  });

  it("does not expose transport implementation errors", () => {
    expect(friendlyAuthError("Failed to send a request to the Edge Function", "login")).toEqual({
      title: "Service unavailable",
      message: "We could not reach the sign-in service. Please check your connection and try again.",
    });
  });

  it("shows the account-exists sign-up error from merchant-auth", () => {
    const message = messageFromAuthPayload({
      error: {
        code: "account_exists",
        message: "An account with this email or phone number already exists. Please sign in or reset your password.",
      },
    })!;
    expect(friendlyAuthError(message, "register").title).toBe("Account already exists");
  });

  it("maps credential errors only on login", () => {
    expect(friendlyAuthError("invalid credentials", "login").title).toBe("Invalid credentials");
    expect(friendlyAuthError("invalid credentials", "register").title).toBe("Registration failed");
  });
});
