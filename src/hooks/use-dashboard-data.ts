import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardData {
  revenue: number;
  paidOrders: number;
  itemsSold: number;
  yesterdayRevenue: number;
  walletBalance: number;
  collections: number;
  disbursements: number;
  netCashflow: number;
  inventoryCount: number;
}

const CACHE_KEY = "dashboard_data_cache";
const CACHE_TTL = 60 * 1000; // 1 minute

function loadCache(): { data: DashboardData; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(data: DashboardData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Storage can be unavailable in privacy mode; dashboard data remains in memory.
  }
}

export function useDashboardData(userId: string | undefined, locationId: string | undefined) {
  const cached = loadCache();
  const isFresh = cached && Date.now() - cached.ts < CACHE_TTL;

  const [data, setData] = useState<DashboardData>(
    isFresh ? cached.data : {
      revenue: 0, paidOrders: 0, itemsSold: 0, yesterdayRevenue: 0,
      walletBalance: 0, collections: 0, disbursements: 0, netCashflow: 0, inventoryCount: 0,
    }
  );
  const [loading, setLoading] = useState(!isFresh);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    // If we have fresh cache, skip fetch entirely
    if (isFresh && !fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetchAll(userId, locationId).then((result) => {
      setData(result);
      saveCache(result);
      setLoading(false);
    });
  }, [userId, locationId]);

  return { data, loading };
}

async function fetchAll(userId: string, locationId: string | undefined): Promise<DashboardData> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  try {
    const [txRes, ytxRes, invRes, yInvRes, ordRes, walletRes, collRes, disbRes, inventoryRes] = await Promise.all([
      // Today's transactions
      (() => {
        let q = supabase.from("transactions").select("amount")
          .eq("user_id", userId).gte("transaction_date", today.toISOString())
          .lt("transaction_date", tomorrow.toISOString()).eq("status", "completed");
        if (locationId) q = q.eq("location_id", locationId);
        return q;
      })(),
      // Yesterday's transactions
      (() => {
        let q = supabase.from("transactions").select("amount")
          .eq("user_id", userId).gte("transaction_date", yesterday.toISOString())
          .lt("transaction_date", today.toISOString()).eq("status", "completed");
        if (locationId) q = q.eq("location_id", locationId);
        return q;
      })(),
      // Today's invoices
      supabase.from("invoices").select("paid_amount").eq("user_id", userId)
        .in("status", ["paid", "partially_paid"]).not("payment_date", "is", null)
        .gte("payment_date", today.toISOString()).lt("payment_date", tomorrow.toISOString()),
      // Yesterday's invoices
      supabase.from("invoices").select("paid_amount").eq("user_id", userId)
        .in("status", ["paid", "partially_paid"]).not("payment_date", "is", null)
        .gte("payment_date", yesterday.toISOString()).lt("payment_date", today.toISOString()),
      // Today's orders
      (() => {
        let q = supabase.from("orders").select("id, order_items(quantity)")
          .eq("user_id", userId).gte("created_at", today.toISOString())
          .lt("created_at", tomorrow.toISOString()).in("status", ["completed", "served"]);
        if (locationId) q = q.eq("location_id", locationId);
        return q;
      })(),
      // Wallet balance
      supabase.from("business_wallets").select("available_balance")
        .eq("business_id", userId).maybeSingle(),
      // Collections this month
      supabase.from("collections").select("net_amount")
        .eq("business_id", userId).eq("status", "completed")
        .gte("created_at", startOfMonth.toISOString()),
      // Disbursements this month
      supabase.from("disbursements").select("amount")
        .eq("business_id", userId).eq("status", "completed")
        .gte("created_at", startOfMonth.toISOString()),
      // Inventory count
      supabase.from("inventory_items").select("*", { count: "exact", head: true })
        .eq("user_id", userId).eq("is_active", true),
    ]);

    const txRev = txRes.data?.reduce((s, t) => s + Number(t.amount), 0) || 0;
    const invRev = invRes.data?.reduce((s, i) => s + Number(i.paid_amount || 0), 0) || 0;
    const ytxRev = ytxRes.data?.reduce((s, t) => s + Number(t.amount), 0) || 0;
    const yInvRev = yInvRes.data?.reduce((s, i) => s + Number(i.paid_amount || 0), 0) || 0;
    const orders = ordRes.data || [];
    const collections = collRes.data?.reduce((s, c) => s + Number(c.net_amount), 0) || 0;
    const disbursements = disbRes.data?.reduce((s, d) => s + Number(d.amount), 0) || 0;

    return {
      revenue: txRev + invRev,
      yesterdayRevenue: ytxRev + yInvRev,
      paidOrders: orders.length,
      itemsSold: orders.reduce((s, o: any) =>
        s + (o.order_items?.reduce((is: number, i: any) => is + i.quantity, 0) || 0), 0),
      walletBalance: (walletRes.data as any)?.available_balance || 0,
      collections,
      disbursements,
      netCashflow: collections - disbursements,
      inventoryCount: inventoryRes.count || 0,
    };
  } catch {
    return {
      revenue: 0, paidOrders: 0, itemsSold: 0, yesterdayRevenue: 0,
      walletBalance: 0, collections: 0, disbursements: 0, netCashflow: 0, inventoryCount: 0,
    };
  }
}
