import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Gift, Calendar, User, Mail, Send, Phone, Shield, CheckCircle } from "lucide-react";
import { NewGiftCardDialog } from "@/components/NewGiftCardDialog";
import { SendGiftCardDialog } from "@/components/SendGiftCardDialog";
import { GiftCardDisplay } from "@/components/GiftCardDisplay";
import { format } from "date-fns";

interface GiftCard {
  id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  status: string;
  issued_date: string;
  expiry_date: string | null;
  issued_to_name: string | null;
  issued_to_email: string | null;
  issued_to_phone: string | null;
  notes: string | null;
  require_otp: boolean;
  sent_via_email: boolean;
  sent_via_sms: boolean;
  sent_at: string | null;
}

export const GiftCardsList = () => {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const { user, profile } = useBusiness();
  const { format: formatCurrency } = useCurrency();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchGiftCards();
    }
  }, [user?.id]);

  const fetchGiftCards = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await supabase
        .from("gift_cards")
        .update({ status: "expired" })
        .eq("user_id", user.id)
        .eq("status", "active")
        .lt("expiry_date", new Date().toISOString());

      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGiftCards((data || []) as GiftCard[]);
    } catch (error) {
      console.error("Error fetching gift cards:", error);
      toast({
        title: "Error",
        description: "Failed to load gift cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    try {
      const card = giftCards.find((item) => item.id === id);
      if (card?.expiry_date && new Date(card.expiry_date) <= new Date()) {
        toast({ title: "Gift card expired", description: "Expired gift cards cannot be reactivated.", variant: "destructive" });
        return;
      }
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("gift_cards")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Gift card ${newStatus === "active" ? "activated" : "deactivated"}`,
      });
      
      fetchGiftCards();
    } catch (error) {
      console.error("Error updating gift card:", error);
      toast({
        title: "Error",
        description: "Failed to update gift card status",
        variant: "destructive",
      });
    }
  };

  const handleSendCard = (card: GiftCard) => {
    setSelectedCard(card);
    setSendDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {giftCards.length} gift card{giftCards.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-full sm:w-auto text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Gift Card</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {giftCards.map((card) => (
          <Card key={card.id} className="overflow-hidden">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Visual Gift Card Display */}
              <GiftCardDisplay
                code={card.code}
                balance={Number(card.current_balance)}
                recipientName={card.issued_to_name}
                expiryDate={card.expiry_date}
                businessName={profile?.business_name || "Gift Card"}
                status={card.status as "active" | "inactive" | "expired"}
              />

              {/* Card Details */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {card.require_otp && (
                    <Badge variant="outline" className="gap-1">
                      <Shield className="w-3 h-3" />
                      OTP Protected
                    </Badge>
                  )}
                  {card.sent_at && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Sent {card.sent_via_email && card.sent_via_sms ? "via Email & SMS" : card.sent_via_email ? "via Email" : "via SMS"}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Initial Value</span>
                    <p className="font-medium">{formatCurrency(Number(card.initial_balance))}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Balance</span>
                    <p className="font-medium">{formatCurrency(Number(card.current_balance))}</p>
                  </div>
                </div>

                {(card.issued_to_name || card.issued_to_email || card.issued_to_phone) && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Recipient</p>
                    {card.issued_to_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3 h-3" />
                        <span>{card.issued_to_name}</span>
                      </div>
                    )}
                    {card.issued_to_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{card.issued_to_email}</span>
                      </div>
                    )}
                    {card.issued_to_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3 h-3" />
                        <span>{card.issued_to_phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {card.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{card.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSendCard(card)}
                    className="flex-1 gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusToggle(card.id, card.status)}
                    className="flex-1"
                  >
                    {card.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {giftCards.length === 0 && (
        <div className="text-center py-12">
          <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-lg mb-4">No gift cards created yet</p>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Gift Card
          </Button>
        </div>
      )}

      <NewGiftCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          fetchGiftCards();
          setDialogOpen(false);
        }}
      />

      {selectedCard && (
        <SendGiftCardDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          giftCard={selectedCard}
          onSuccess={fetchGiftCards}
        />
      )}
    </div>
  );
};
