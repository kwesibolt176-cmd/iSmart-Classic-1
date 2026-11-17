/**
 * Canonical key for a Ghana phone number: 233 + the 9-digit subscriber number.
 * Handles 0XXXXXXXXX, +233XXXXXXXXX, 233 0XXXXXXXXX and duplicated 233 prefixes.
 * Returns null when no 9-digit subscriber number can be found.
 */
export const ghanaPhoneKey = (value: unknown): string | null => {
  let digits = String(value ?? "").replace(/\D/g, "");
  while (digits.startsWith("233")) digits = digits.slice(3);
  digits = digits.replace(/^0+/, "");
  const subscriber = digits.slice(-9);
  return subscriber.length === 9 ? `233${subscriber}` : null;
};

/** Message shown when a phone number is already verified on another business. */
export const PHONE_IN_USE_MESSAGE =
  "This phone number is already verified on another account. Use a different number or contact support.";
