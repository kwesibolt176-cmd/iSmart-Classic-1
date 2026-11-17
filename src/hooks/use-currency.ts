import { useBusiness } from "@/contexts/BusinessContext";

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "USD", symbol: "USD", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc" },
];

export const getCurrencySymbol = (code: string): string => {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return currency?.symbol || code;
};

export const getCurrencyConfig = (code: string): CurrencyConfig => {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return currency || { code, symbol: code, name: code };
};

export const formatCurrency = (
  amount: number | string,
  currencyCode: string = "GHS",
  options?: { showSymbol?: boolean; decimals?: number }
): string => {
  const { showSymbol = true, decimals = 2 } = options || {};
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return "0.00";

  const symbol = getCurrencySymbol(currencyCode);
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numAmount);
  
  return showSymbol ? `${symbol}${formattedAmount}` : formattedAmount;
};

export const useCurrency = () => {
  const { profile } = useBusiness();
  const currencyCode = profile?.currency || "GHS";
  const currencyConfig = getCurrencyConfig(currencyCode);

  const format = (
    amount: number | string,
    options?: { showSymbol?: boolean; decimals?: number }
  ): string => {
    return formatCurrency(amount, currencyCode, options);
  };

  return {
    currencyCode,
    currencySymbol: currencyConfig.symbol,
    currencyName: currencyConfig.name,
    format,
    formatCurrency: (amount: number | string) => format(amount),
  };
};
