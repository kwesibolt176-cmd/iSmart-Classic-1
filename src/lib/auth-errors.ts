type ApiErrorEnvelope = {
  error?: string | { code?: string; message?: string };
  message?: string;
};

export const messageFromAuthPayload = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const value = payload as ApiErrorEnvelope;
  if (typeof value.error === "string") return value.error;
  if (value.error && typeof value.error.message === "string") return value.error.message;
  if (typeof value.message === "string") return value.message;
  return undefined;
};

export const friendlyAuthError = (message: string, flow: "login" | "register" | "reset") => {
  const lower = message.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("edge function")) {
    return {
      title: "Service unavailable",
      message: "We could not reach the sign-in service. Please check your connection and try again.",
    };
  }
  if (flow === "register" && (lower.includes("already exists") || lower.includes("already been registered") || lower.includes("duplicate"))) {
    return {
      title: "Account already exists",
      message: "An account with this email or phone number already exists. Please sign in instead.",
    };
  }
  if (flow === "login" && [
    "invalid credentials", "invalid login credentials", "invalid email or password",
    "authentication failed", "unauthenticated",
  ].some((pattern) => lower.includes(pattern))) {
    return { title: "Invalid credentials", message: "Invalid email or password. Please try again." };
  }
  if (lower.includes("expired")) return { title: "Code expired", message };
  if (lower.includes("invalid") && flow === "reset") return { title: "Invalid code", message };
  return {
    title: flow === "register" ? "Registration failed" : flow === "reset" ? "Password reset failed" : "Sign in failed",
    message,
  };
};
