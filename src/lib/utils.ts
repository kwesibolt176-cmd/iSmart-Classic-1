import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a phone number to various formats.
 * @param phone The raw phone number string
 * @param format 'e164' (+233...), 'international' (233...), or 'local' (0...)
 * @returns The formatted phone number
 */
export function formatPhoneNumber(phone: string, format: 'e164' | 'international' | 'local' = 'e164'): string {
  if (!phone) return "";
  
  // Remove all non-numeric characters except +
  const digits = phone.replace(/[^\d+]/g, "");
  
  // Strip existing country prefix for Ghana if present to make it easier to re-format
  // This logic can be expanded for other countries, but currently focused on Ghana as primary use case
  let base = digits;
  if (base.startsWith("+233")) base = base.substring(4);
  else if (base.startsWith("233")) base = base.substring(3);
  else if (base.startsWith("0")) base = base.substring(1);
  
  // If it's a general international number (not Ghana) and starts with +, we might want to keep it
  // but for the sake of these white-label APIs, we often need specific formats.
  
  switch (format) {
    case 'e164':
      return digits.startsWith("+") ? digits : `+233${base}`;
    case 'international':
      return `233${base}`;
    case 'local':
      return `0${base}`;
    default:
      return digits;
  }
}

export const isValidGhanaPhone = (phone: string) => {
  const digits = phone.replace(/[^\d]/g, "");
  return /^233\d{9}$/.test(digits) || /^0\d{9}$/.test(digits);
};
