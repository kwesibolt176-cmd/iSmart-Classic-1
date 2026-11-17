import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { differenceInDays } from "date-fns";

interface AgingBucket {
  label: string;
  range: string;
  count: number;
  amount: number;
  color: string;
  icon: React.ReactNode;
}

interface Invoice {
  id: string;
  customer_name: string;
  total: number;
  paid_amount: number;
  due_date: string;
  status: string;
}

export const InvoiceAgingReport = () => {
  const { user, profile } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<AgingBucket[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = { 'GHS': 'GH₵', 'USD': 'USD', 'EUR': '€', 'GBP': '£' };
    return symbols[code] || code;
  };
  const currency = getCurrencySymbol(profile?.currency || "GHS");

  useEffect(() => {
    if (user?.id) fetchInvoices();
  }, [user?.id]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, customer_name, total, paid_amount, due_date, status")
      .eq("user_id", user!.id)
      .in("status", ["sent", "partially_paid", "overdue"]);

    if (!error && data) {
      setInvoices(data);
      calculateBuckets(data);
    }
    setLoading(false);
  };

  const calculateBuckets = (invoices: Invoice[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bucketData = {
      current: { count: 0, amount: 0 },
      "1-30": { count: 0, amount: 0 },
      "31-60": { count: 0, amount: 0 },
      "61-90": { count: 0, amount: 0 },
      "90+": { count: 0, amount: 0 },
    };

    invoices.forEach((inv) => {
      const dueDate = new Date(inv.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = differenceInDays(today, dueDate);
      const remaining = inv.total - (inv.paid_amount || 0);

      if (daysOverdue <= 0) {
        bucketData.current.count++;
        bucketData.current.amount += remaining;
      } else if (daysOverdue <= 30) {
        bucketData["1-30"].count++;
        bucketData["1-30"].amount += remaining;
      } else if (daysOverdue <= 60) {
        bucketData["31-60"].count++;
        bucketData["31-60"].amount += remaining;
      } else if (daysOverdue <= 90) {
        bucketData["61-90"].count++;
        bucketData["61-90"].amount += remaining;
      } else {
        bucketData["90+"].count++;
        bucketData["90+"].amount += remaining;
      }
    });

    setBuckets([
      {
        label: "Current",
        range: "Not yet due",
        ...bucketData.current,
        color: "bg-green-500",
        icon: <CheckCircle className="h-4 w-4" />,
      },
      {
        label: "1-30 Days",
        range: "1-30 days overdue",
        ...bucketData["1-30"],
        color: "bg-yellow-500",
        icon: <Clock className="h-4 w-4" />,
      },
      {
        label: "31-60 Days",
        range: "31-60 days overdue",
        ...bucketData["31-60"],
        color: "bg-orange-500",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        label: "61-90 Days",
        range: "61-90 days overdue",
        ...bucketData["61-90"],
        color: "bg-red-400",
        icon: <AlertCircle className="h-4 w-4" />,
      },
      {
        label: "90+ Days",
        range: "Over 90 days overdue",
        ...bucketData["90+"],
        color: "bg-red-600",
        icon: <AlertCircle className="h-4 w-4" />,
      },
    ]);
  };

  const totalOutstanding = buckets.reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Aging Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center pb-4 border-b">
          <p className="text-sm text-muted-foreground">Total Outstanding</p>
          <p className="text-3xl font-bold text-primary">
            {currency} {totalOutstanding.toFixed(2)}
          </p>
        </div>

        <div className="space-y-3">
          {buckets.map((bucket) => (
            <div
              key={bucket.label}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${bucket.color} text-white`}>
                  {bucket.icon}
                </div>
                <div>
                  <p className="font-medium">{bucket.label}</p>
                  <p className="text-xs text-muted-foreground">{bucket.range}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {currency} {bucket.amount.toFixed(2)}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {totalOutstanding > 0 && (
          <div className="pt-4">
            <h4 className="font-medium mb-2">Breakdown</h4>
            <div className="h-4 w-full flex rounded-full overflow-hidden">
              {buckets.map((bucket) => {
                const width = totalOutstanding > 0 ? (bucket.amount / totalOutstanding) * 100 : 0;
                return width > 0 ? (
                  <div
                    key={bucket.label}
                    className={`${bucket.color} transition-all`}
                    style={{ width: `${width}%` }}
                    title={`${bucket.label}: ${currency} ${bucket.amount.toFixed(2)}`}
                  />
                ) : null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
