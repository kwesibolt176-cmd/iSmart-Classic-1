type ErrorPayload = {
  error?: string | { message?: string };
  message?: string;
};

type InvokeError = Error & {
  context?: {
    json?: () => Promise<unknown>;
  };
};

export const functionErrorMessage = async (
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> => {
  const fromPayload = (payload: unknown): string | undefined => {
    if (!payload || typeof payload !== "object") return undefined;
    const value = payload as ErrorPayload;
    if (typeof value.error === "string" && value.error.trim()) return value.error;
    if (typeof value.error === "object" && typeof value.error?.message === "string" && value.error.message.trim()) {
      return value.error.message;
    }
    if (typeof value.message === "string" && value.message.trim()) return value.message;
    return undefined;
  };

  const dataMessage = fromPayload(data);
  if (dataMessage) return dataMessage;

  const invokeError = error as InvokeError | null;
  if (invokeError?.context?.json) {
    try {
      const responseMessage = fromPayload(await invokeError.context.json());
      if (responseMessage) return responseMessage;
    } catch {
      // The response was not JSON; retain the safe fallback below.
    }
  }

  return fallback;
};
