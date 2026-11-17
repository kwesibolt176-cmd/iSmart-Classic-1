import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Calendar, User } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { format } from "date-fns";

interface GiftCardDisplayProps {
  code: string;
  balance: number;
  amount?: number;
  recipientName?: string | null;
  expiryDate?: string | null;
  expiresAt?: string | null;
  businessName?: string;
  status?: "active" | "inactive" | "expired";
  isActive?: boolean;
  isPreview?: boolean;
}

export const GiftCardDisplay = ({
  code,
  balance,
  amount,
  recipientName,
  expiryDate,
  expiresAt,
  businessName = "Gift Card",
  status = "active",
  isActive,
  isPreview = false,
}: GiftCardDisplayProps) => {
  const { format: formatCurrency } = useCurrency();

  const expiry = expiryDate || expiresAt;
  const isExpired = expiry && new Date(expiry) < new Date();
  const displayStatus = isExpired ? "expired" : (isActive ? "active" : status);

  const displayValue = amount || balance;

  return (
    <Card className={`relative overflow-hidden w-full max-w-md aspect-[1.6/1] bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl ${isPreview ? 'opacity-90' : ''}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full border-4 border-current" />
        <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full border-2 border-current" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-current" />
      </div>

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6" />
            <span className="text-sm font-medium tracking-wider uppercase opacity-90">
              {businessName}
            </span>
          </div>
          {!isPreview && (
            <Badge
              variant={displayStatus === "active" ? "secondary" : "destructive"}
              className={displayStatus === "active" 
                ? "bg-white/20 text-white border-white/30 hover:bg-white/30" 
                : ""
              }
            >
              {displayStatus === "active" ? "Active" : displayStatus === "expired" ? "Expired" : "Inactive"}
            </Badge>
          )}
          {isPreview && (
            <Badge className="bg-white/20 text-white border-white/30">
              Preview
            </Badge>
          )}
        </div>

        {/* Balance */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Card Value</p>
          <p className="text-4xl font-bold tracking-tight">{formatCurrency(displayValue)}</p>
        </div>

        {/* Footer */}
        <div className="space-y-3">
          {/* Code */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
            <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Card Code</p>
            <p className="font-mono text-lg font-bold tracking-[0.2em]">{code}</p>
          </div>

          {/* Details Row */}
          <div className="flex justify-between items-center text-xs opacity-80">
            {recipientName && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{recipientName}</span>
              </div>
            )}
            {expiry && (
              <div className="flex items-center gap-1 ml-auto">
                <Calendar className="w-3 h-3" />
                <span>Expires {format(new Date(expiry), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decorative Corner */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />
    </Card>
  );
};
