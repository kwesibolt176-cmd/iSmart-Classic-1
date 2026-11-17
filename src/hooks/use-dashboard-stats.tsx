import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";

export const useDashboardStats = (dateRange?: { start: Date; end: Date }) => {
  const { user } = useBusiness();
  const [stats, setStats] = useState({
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    mobileMoney: 0,
    invoicePayments: 0,
    invoiceCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const startDate = dateRange?.start ? new Date(dateRange.start) : new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();
      endDate.setHours(23, 59, 59, 999);

      // Fetch transactions
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("amount, payment_method")
        .eq("user_id", user.id)
        .gte("transaction_date", startDate.toISOString())
        .lte("transaction_date", endDate.toISOString())
        .eq("status", "completed");

      if (txError) throw txError;

      // Fetch invoice payments
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("paid_amount, payment_date")
        .eq("user_id", user.id)
        .in("status", ["paid", "partially_paid"])
        .not("payment_date", "is", null)
        .gte("payment_date", startDate.toISOString())
        .lte("payment_date", endDate.toISOString());

      if (invError) throw invError;

      const transactionSales = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const cashSales = transactions?.filter(t => t.payment_method === "cash")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const cardSales = transactions?.filter(t => t.payment_method === "card")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const mobileMoney = transactions?.filter(t => t.payment_method === "mobile_money")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const invoicePayments = invoices?.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0) || 0;
      const invoiceCount = invoices?.length || 0;

      // Total sales now includes invoice payments
      const totalSales = transactionSales + invoicePayments;

      setStats({
        totalSales,
        cashSales,
        cardSales,
        mobileMoney,
        invoicePayments,
        invoiceCount,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
};