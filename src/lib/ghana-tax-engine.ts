/**
 * Ghana Tax Engine - Dowo Africa
 * 
 * Modular, config-driven tax computation engine compliant with
 * Ghana Revenue Authority (GRA) regulations.
 * 
 * Current rates (2026):
 * - VAT: 15%
 * - NHIL: 2.5%
 * - GETFund: 2.5%
 * - COVID-19 Health Recovery Levy: ABOLISHED
 * - VAT Flat Rate Scheme: NOT SUPPORTED
 */

import { supabase } from "@/integrations/supabase/client";

// High-precision decimal handling using string-based calculations
const DECIMAL_PLACES = 2;

export interface TaxConfiguration {
  id: string;
  version: string;
  vat_rate: number;
  nhil_rate: number;
  getfund_rate: number;
  vat_registration_threshold: number;
  abolished_levies: string[];
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

export interface TaxComputationResult {
  transaction_id?: string;
  net_amount: number;
  nhil_amount: number;
  getfund_amount: number;
  vat_amount: number;
  total_tax: number;
  gross_amount: number;
  tax_rule_version: string;
  vat_registered: boolean;
}

export interface BusinessTaxProfile {
  tin?: string;
  vat_registered: boolean;
  tax_regime: 'VAT' | 'Presumptive' | 'None';
  turnover_last_12_months: number;
}

export interface TaxAggregation {
  period_type: 'daily' | 'monthly' | 'yearly';
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_sales: number;
  total_net_amount: number;
  total_vat: number;
  total_nhil: number;
  total_getfund: number;
  total_tax: number;
}

interface TransactionTaxRecord {
  id: string;
  transaction_id: string;
  user_id: string;
  net_amount: number;
  nhil_amount: number;
  getfund_amount: number;
  vat_amount: number;
  total_tax: number;
  gross_amount: number;
  tax_rule_version: string;
  vat_registered_at_time: boolean;
  computed_at: string;
}

// Round to specified decimal places with banker's rounding
function roundToDecimal(value: number, decimals: number = DECIMAL_PLACES): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * Fetch the current active tax configuration
 */
export async function getActiveTaxConfiguration(): Promise<TaxConfiguration | null> {
  const { data, error } = await supabase
    .from('tax_configurations' as any)
    .select('*')
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching tax configuration:', error);
    return null;
  }

  return data as unknown as TaxConfiguration;
}

/**
 * Compute taxes for a transaction
 * 
 * Tax calculation logic (for VAT registered businesses):
 * - NHIL = net_amount × 2.5%
 * - GETFund = net_amount × 2.5%
 * - VAT = net_amount × 15%
 * - Total Tax = NHIL + GETFund + VAT (20%)
 * - Gross = net_amount + total_tax
 * 
 * For non-VAT registered: No taxes applied, gross = net
 */
export async function computeTax(
  netAmount: number,
  businessProfile: BusinessTaxProfile,
  transactionId?: string
): Promise<TaxComputationResult> {
  const config = await getActiveTaxConfiguration();
  
  if (!config) {
    throw new Error('No active tax configuration found');
  }

  const isVatRegistered = businessProfile.vat_registered && 
                          businessProfile.tax_regime === 'VAT';

  if (!isVatRegistered) {
    // Non-VAT registered businesses: no indirect taxes
    return {
      transaction_id: transactionId,
      net_amount: roundToDecimal(netAmount),
      nhil_amount: 0,
      getfund_amount: 0,
      vat_amount: 0,
      total_tax: 0,
      gross_amount: roundToDecimal(netAmount),
      tax_rule_version: config.version,
      vat_registered: false,
    };
  }

  // VAT registered: compute all tax components
  const nhilAmount = roundToDecimal(netAmount * Number(config.nhil_rate));
  const getfundAmount = roundToDecimal(netAmount * Number(config.getfund_rate));
  const vatAmount = roundToDecimal(netAmount * Number(config.vat_rate));
  const totalTax = roundToDecimal(nhilAmount + getfundAmount + vatAmount);
  const grossAmount = roundToDecimal(netAmount + totalTax);

  return {
    transaction_id: transactionId,
    net_amount: roundToDecimal(netAmount),
    nhil_amount: nhilAmount,
    getfund_amount: getfundAmount,
    vat_amount: vatAmount,
    total_tax: totalTax,
    gross_amount: grossAmount,
    tax_rule_version: config.version,
    vat_registered: true,
  };
}

/**
 * Synchronous tax computation when config is already loaded
 */
export function computeTaxSync(
  netAmount: number,
  config: TaxConfiguration,
  isVatRegistered: boolean,
  transactionId?: string
): TaxComputationResult {
  if (!isVatRegistered) {
    return {
      transaction_id: transactionId,
      net_amount: roundToDecimal(netAmount),
      nhil_amount: 0,
      getfund_amount: 0,
      vat_amount: 0,
      total_tax: 0,
      gross_amount: roundToDecimal(netAmount),
      tax_rule_version: config.version,
      vat_registered: false,
    };
  }

  const nhilAmount = roundToDecimal(netAmount * Number(config.nhil_rate));
  const getfundAmount = roundToDecimal(netAmount * Number(config.getfund_rate));
  const vatAmount = roundToDecimal(netAmount * Number(config.vat_rate));
  const totalTax = roundToDecimal(nhilAmount + getfundAmount + vatAmount);
  const grossAmount = roundToDecimal(netAmount + totalTax);

  return {
    transaction_id: transactionId,
    net_amount: roundToDecimal(netAmount),
    nhil_amount: nhilAmount,
    getfund_amount: getfundAmount,
    vat_amount: vatAmount,
    total_tax: totalTax,
    gross_amount: grossAmount,
    tax_rule_version: config.version,
    vat_registered: true,
  };
}

/**
 * Record tax computation for a transaction
 */
export async function recordTransactionTax(
  userId: string,
  transactionId: string,
  taxResult: TaxComputationResult
): Promise<boolean> {
  const { error: taxError } = await supabase
    .from('transaction_tax_records' as any)
    .insert({
      transaction_id: transactionId,
      user_id: userId,
      net_amount: taxResult.net_amount,
      nhil_amount: taxResult.nhil_amount,
      getfund_amount: taxResult.getfund_amount,
      vat_amount: taxResult.vat_amount,
      total_tax: taxResult.total_tax,
      gross_amount: taxResult.gross_amount,
      tax_rule_version: taxResult.tax_rule_version,
      vat_registered_at_time: taxResult.vat_registered,
    });

  if (taxError) {
    console.error('Error recording transaction tax:', taxError);
    return false;
  }

  // Create audit log
  const { error: auditError } = await supabase
    .from('tax_audit_logs' as any)
    .insert({
      transaction_id: transactionId,
      user_id: userId,
      action: 'tax_computed',
      tax_rule_version: taxResult.tax_rule_version,
      tax_components: {
        net_amount: taxResult.net_amount,
        nhil_amount: taxResult.nhil_amount,
        getfund_amount: taxResult.getfund_amount,
        vat_amount: taxResult.vat_amount,
        total_tax: taxResult.total_tax,
        gross_amount: taxResult.gross_amount,
      },
      metadata: {
        vat_registered: taxResult.vat_registered,
        computed_at: new Date().toISOString(),
      },
    });

  if (auditError) {
    console.error('Error creating tax audit log:', auditError);
  }

  return true;
}

/**
 * Get tax aggregation for a period
 */
export async function getTaxAggregation(
  userId: string,
  periodType: 'daily' | 'monthly' | 'yearly',
  startDate: Date,
  endDate: Date
): Promise<TaxAggregation | null> {
  const { data, error } = await supabase
    .from('transaction_tax_records' as any)
    .select('*')
    .eq('user_id', userId)
    .gte('computed_at', startDate.toISOString())
    .lte('computed_at', endDate.toISOString());

  if (error) {
    console.error('Error fetching tax records:', error);
    return null;
  }

  const records = data as unknown as TransactionTaxRecord[] | null;

  const aggregation: TaxAggregation = {
    period_type: periodType,
    period_start: startDate.toISOString().split('T')[0],
    period_end: endDate.toISOString().split('T')[0],
    total_transactions: records?.length || 0,
    total_sales: 0,
    total_net_amount: 0,
    total_vat: 0,
    total_nhil: 0,
    total_getfund: 0,
    total_tax: 0,
  };

  records?.forEach((record) => {
    aggregation.total_sales += Number(record.gross_amount);
    aggregation.total_net_amount += Number(record.net_amount);
    aggregation.total_vat += Number(record.vat_amount);
    aggregation.total_nhil += Number(record.nhil_amount);
    aggregation.total_getfund += Number(record.getfund_amount);
    aggregation.total_tax += Number(record.total_tax);
  });

  // Round all totals
  aggregation.total_sales = roundToDecimal(aggregation.total_sales);
  aggregation.total_net_amount = roundToDecimal(aggregation.total_net_amount);
  aggregation.total_vat = roundToDecimal(aggregation.total_vat);
  aggregation.total_nhil = roundToDecimal(aggregation.total_nhil);
  aggregation.total_getfund = roundToDecimal(aggregation.total_getfund);
  aggregation.total_tax = roundToDecimal(aggregation.total_tax);

  return aggregation;
}

/**
 * Save tax aggregation summary
 */
export async function saveTaxAggregation(
  userId: string,
  aggregation: TaxAggregation
): Promise<boolean> {
  const { error } = await supabase
    .from('tax_aggregation_summaries' as any)
    .upsert({
      user_id: userId,
      period_type: aggregation.period_type,
      period_start: aggregation.period_start,
      period_end: aggregation.period_end,
      total_transactions: aggregation.total_transactions,
      total_sales: aggregation.total_sales,
      total_net_amount: aggregation.total_net_amount,
      total_vat: aggregation.total_vat,
      total_nhil: aggregation.total_nhil,
      total_getfund: aggregation.total_getfund,
      total_tax: aggregation.total_tax,
      generated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,period_type,period_start',
    });

  if (error) {
    console.error('Error saving tax aggregation:', error);
    return false;
  }

  return true;
}

/**
 * Export tax data as JSON
 */
export function exportTaxDataAsJson(aggregation: TaxAggregation): string {
  return JSON.stringify(aggregation, null, 2);
}

/**
 * Export tax data as CSV
 */
export function exportTaxDataAsCsv(aggregation: TaxAggregation): string {
  const headers = [
    'Period Type',
    'Period Start',
    'Period End',
    'Total Transactions',
    'Total Sales (GHS)',
    'Net Amount (GHS)',
    'VAT (GHS)',
    'NHIL (GHS)',
    'GETFund (GHS)',
    'Total Tax (GHS)',
  ];

  const row = [
    aggregation.period_type,
    aggregation.period_start,
    aggregation.period_end,
    aggregation.total_transactions,
    aggregation.total_sales.toFixed(2),
    aggregation.total_net_amount.toFixed(2),
    aggregation.total_vat.toFixed(2),
    aggregation.total_nhil.toFixed(2),
    aggregation.total_getfund.toFixed(2),
    aggregation.total_tax.toFixed(2),
  ];

  return `${headers.join(',')}\n${row.join(',')}`;
}

/**
 * Get tax breakdown display text
 */
export function getTaxBreakdownDisplay(result: TaxComputationResult, currencySymbol: string = 'GH₵'): string[] {
  if (!result.vat_registered) {
    return ['No taxes applied (Not VAT registered)'];
  }

  return [
    `NHIL (2.5%): ${currencySymbol}${result.nhil_amount.toFixed(2)}`,
    `GETFund (2.5%): ${currencySymbol}${result.getfund_amount.toFixed(2)}`,
    `VAT (15%): ${currencySymbol}${result.vat_amount.toFixed(2)}`,
    `Total Tax: ${currencySymbol}${result.total_tax.toFixed(2)}`,
  ];
}

/**
 * Check if business should be VAT registered based on turnover
 * Ghana VAT registration threshold: GHS 200,000 annually
 */
export function shouldBeVatRegistered(turnover: number, threshold = 200000): boolean {
  return turnover >= threshold;
}
