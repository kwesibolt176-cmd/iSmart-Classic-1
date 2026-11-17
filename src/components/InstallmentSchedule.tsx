import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { RecordInstallmentPaymentDialog } from "./RecordInstallmentPaymentDialog";
import { useCurrency } from "@/hooks/use-currency";
interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  paid_at: string | null;
}

interface InstallmentScheduleProps {
  installments: Installment[];
  invoiceId: string;
  onPaymentRecorded?: () => void;
}

export const InstallmentSchedule = ({ installments, invoiceId, onPaymentRecorded }: InstallmentScheduleProps) => {
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const { format: formatCurrency } = useCurrency();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "partially_paid":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      paid: "bg-green-500",
      overdue: "bg-red-500",
      partially_paid: "bg-yellow-500",
      pending: "bg-blue-500"
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Installment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {installments.sort((a, b) => a.installment_number - b.installment_number).map((installment) => (
              <div 
                key={installment.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(installment.status)}
                  <div>
                    <div className="font-medium">
                      Installment #{installment.installment_number}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Due: {format(new Date(installment.due_date), "MMM dd, yyyy")}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(parseFloat(installment.amount.toString()))}
                    </div>
                    {installment.paid_amount > 0 && (
                      <div className="text-sm text-green-600">
                        Paid: {formatCurrency(parseFloat(installment.paid_amount.toString()))}
                      </div>
                    )}
                  </div>
                  
                  <Badge className={getStatusBadge(installment.status)}>
                    {installment.status}
                  </Badge>
                  
                  {installment.status !== 'paid' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedInstallment(installment)}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pay
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedInstallment && (
        <RecordInstallmentPaymentDialog
          open={!!selectedInstallment}
          onOpenChange={(open) => !open && setSelectedInstallment(null)}
          installment={selectedInstallment}
          invoiceId={invoiceId}
          onPaymentRecorded={() => {
            setSelectedInstallment(null);
            onPaymentRecorded?.();
          }}
        />
      )}
    </>
  );
};