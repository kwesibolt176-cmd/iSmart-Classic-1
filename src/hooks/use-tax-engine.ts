import { useState, useEffect, useCallback } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  TaxConfiguration,
  TaxComputationResult,
  TaxAggregation,
  BusinessTaxProfile,
  getActiveTaxConfiguration,
  computeTaxSync,
  recordTransactionTax,
  getTaxAggregation,
  saveTaxAggregation,
  exportTaxDataAsJson,
  exportTaxDataAsCsv,
  getTaxBreakdownDisplay,
  shouldBeVatRegistered,
} from "@/lib/ghana-tax-engine";

interface UseTaxEngineReturn {
  // State
  config: TaxConfiguration | null;
  businessTaxProfile: BusinessTaxProfile | null;
  isLoading: boolean;
  error: string | null;

  // Tax computation
  computeTax: (netAmount: number) => TaxComputationResult | null;
  recordTax: (transactionId: string, taxResult: TaxComputationResult) => Promise<boolean>;

  // Reporting
  getAggregation: (periodType: 'daily' | 'monthly' | 'yearly', startDate: Date, endDate: Date) => Promise<TaxAggregation | null>;
  saveAggregation: (aggregation: TaxAggregation) => Promise<boolean>;
  exportAsJson: (aggregation: TaxAggregation) => string;
  exportAsCsv: (aggregation: TaxAggregation) => string;

  // Display helpers
  getTaxBreakdown: (result: TaxComputationResult) => string[];
  shouldRegisterForVat: (turnover: number) => boolean;

  // Refresh
  refreshConfig: () => Promise<void>;
}

export const useTaxEngine = (): UseTaxEngineReturn => {
  const { user, profile } = useBusiness();
  const [config, setConfig] = useState<TaxConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract business tax profile from profile
  const businessTaxProfile: BusinessTaxProfile | null = profile
    ? {
        tin: (profile as any).tin || undefined,
        vat_registered: (profile as any).vat_registered || false,
        tax_regime: (profile as any).tax_regime || 'None',
        turnover_last_12_months: (profile as any).turnover_last_12_months || 0,
      }
    : null;

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const taxConfig = await getActiveTaxConfiguration();
      setConfig(taxConfig);
    } catch (err) {
      setError('Failed to load tax configuration');
      console.error('Tax config error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const computeTax = useCallback(
    (netAmount: number): TaxComputationResult | null => {
      if (!config || !businessTaxProfile) return null;

      const isVatRegistered =
        businessTaxProfile.vat_registered && businessTaxProfile.tax_regime === 'VAT';

      return computeTaxSync(netAmount, config, isVatRegistered);
    },
    [config, businessTaxProfile]
  );

  const recordTax = useCallback(
    async (transactionId: string, taxResult: TaxComputationResult): Promise<boolean> => {
      if (!user?.id) return false;
      return recordTransactionTax(user.id, transactionId, taxResult);
    },
    [user?.id]
  );

  const getAggregation = useCallback(
    async (
      periodType: 'daily' | 'monthly' | 'yearly',
      startDate: Date,
      endDate: Date
    ): Promise<TaxAggregation | null> => {
      if (!user?.id) return null;
      return getTaxAggregation(user.id, periodType, startDate, endDate);
    },
    [user?.id]
  );

  const saveAggregation = useCallback(
    async (aggregation: TaxAggregation): Promise<boolean> => {
      if (!user?.id) return false;
      return saveTaxAggregation(user.id, aggregation);
    },
    [user?.id]
  );

  const getTaxBreakdown = useCallback(
    (result: TaxComputationResult): string[] => {
      return getTaxBreakdownDisplay(result);
    },
    []
  );

  return {
    config,
    businessTaxProfile,
    isLoading,
    error,
    computeTax,
    recordTax,
    getAggregation,
    saveAggregation,
    exportAsJson: exportTaxDataAsJson,
    exportAsCsv: exportTaxDataAsCsv,
    getTaxBreakdown,
    shouldRegisterForVat: (turnover: number) => shouldBeVatRegistered(
      turnover,
      Number(config?.vat_registration_threshold ?? 200000),
    ),
    refreshConfig: fetchConfig,
  };
};
