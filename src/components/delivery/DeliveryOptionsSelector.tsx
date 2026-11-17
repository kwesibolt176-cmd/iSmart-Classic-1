import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Truck, MapPin, Clock, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";

interface DeliveryPartner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  min_order_amount: number;
}

interface DeliveryQuote {
  partnerId: string;
  partnerName: string;
  fee: number;
  estimatedTime: string;
  available: boolean;
}

interface DeliveryDetails {
  partnerId: string;
  partnerName: string;
  deliveryAddress: string;
  deliveryContact: string;
  deliveryPhone: string;
  deliveryNotes: string;
  deliveryFee: number;
  estimatedTime: string;
}

interface DeliveryOptionsSelectorProps {
  orderTotal: number;
  pickupAddress: string;
  onDeliverySelected: (details: DeliveryDetails | null) => void;
  isDeliveryEnabled: boolean;
  onToggleDelivery: (enabled: boolean) => void;
}

export const DeliveryOptionsSelector = ({
  orderTotal,
  pickupAddress,
  onDeliverySelected,
  isDeliveryEnabled,
  onToggleDelivery,
}: DeliveryOptionsSelectorProps) => {
  const { formatCurrency } = useCurrency();
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [quotes, setQuotes] = useState<DeliveryQuote[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  
  // Delivery details form
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryContact, setDeliveryContact] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  useEffect(() => {
    if (isDeliveryEnabled) {
      fetchDeliveryPartners();
    }
  }, [isDeliveryEnabled]);

  const fetchDeliveryPartners = async () => {
    setLoadingPartners(true);
    try {
      const { data, error } = await supabase
        .from("delivery_partners")
        .select("*")
        .eq("is_active", true)
        .lte("min_order_amount", orderTotal);

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      console.error("Error fetching delivery partners:", error);
      toast({
        title: "Error",
        description: "Failed to load delivery options",
        variant: "destructive",
      });
    } finally {
      setLoadingPartners(false);
    }
  };

  const fetchDeliveryQuotes = async () => {
    if (!deliveryAddress || partners.length === 0) {
      toast({
        title: "Address required",
        description: "Please enter a delivery address first",
        variant: "destructive",
      });
      return;
    }

    setLoadingQuotes(true);
    try {
      // Simulate API calls to delivery partners for quotes
      // In production, this would call actual delivery partner APIs
      const mockQuotes: DeliveryQuote[] = partners.map((partner) => ({
        partnerId: partner.id,
        partnerName: partner.name,
        fee: Math.round((5 + Math.random() * 15) * 100) / 100, // Random fee between 5-20
        estimatedTime: `${20 + Math.floor(Math.random() * 40)} mins`,
        available: Math.random() > 0.2, // 80% availability
      }));

      setQuotes(mockQuotes);
      
      // Auto-select first available partner
      const firstAvailable = mockQuotes.find(q => q.available);
      if (firstAvailable) {
        setSelectedPartner(firstAvailable.partnerId);
      }
    } catch (error: any) {
      console.error("Error fetching quotes:", error);
      toast({
        title: "Error",
        description: "Failed to get delivery quotes",
        variant: "destructive",
      });
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handlePartnerSelect = (partnerId: string) => {
    setSelectedPartner(partnerId);
    const quote = quotes.find(q => q.partnerId === partnerId);
    
    if (quote && deliveryAddress && deliveryContact && deliveryPhone) {
      onDeliverySelected({
        partnerId: quote.partnerId,
        partnerName: quote.partnerName,
        deliveryAddress,
        deliveryContact,
        deliveryPhone,
        deliveryNotes,
        deliveryFee: quote.fee,
        estimatedTime: quote.estimatedTime,
      });
    }
  };

  // Update parent when form changes
  useEffect(() => {
    if (selectedPartner && deliveryAddress && deliveryContact && deliveryPhone) {
      const quote = quotes.find(q => q.partnerId === selectedPartner);
      if (quote) {
        onDeliverySelected({
          partnerId: quote.partnerId,
          partnerName: quote.partnerName,
          deliveryAddress,
          deliveryContact,
          deliveryPhone,
          deliveryNotes,
          deliveryFee: quote.fee,
          estimatedTime: quote.estimatedTime,
        });
      }
    } else if (!isDeliveryEnabled) {
      onDeliverySelected(null);
    }
  }, [selectedPartner, deliveryAddress, deliveryContact, deliveryPhone, deliveryNotes]);

  if (!isDeliveryEnabled) {
    return (
      <Card className="p-4">
        <button
          onClick={() => onToggleDelivery(true)}
          className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Add Delivery</span>
          </div>
          <Badge variant="outline">Optional</Badge>
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Delivery Options</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onToggleDelivery(false);
            onDeliverySelected(null);
          }}
        >
          Cancel
        </Button>
      </div>

      <Separator />

      {/* Delivery Address Form */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="deliveryAddress">Delivery Address *</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter full delivery address"
              className="flex-1"
            />
            <Button
              onClick={fetchDeliveryQuotes}
              disabled={!deliveryAddress || loadingQuotes}
              size="sm"
            >
              {loadingQuotes ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Get Quotes"
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="deliveryContact">Recipient Name *</Label>
            <Input
              id="deliveryContact"
              value={deliveryContact}
              onChange={(e) => setDeliveryContact(e.target.value)}
              placeholder="John Doe"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="deliveryPhone">Recipient Phone *</Label>
            <Input
              id="deliveryPhone"
              type="tel"
              value={deliveryPhone}
              onChange={(e) => setDeliveryPhone(e.target.value)}
              placeholder="+233 XX XXX XXXX"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="deliveryNotes">Delivery Notes (Optional)</Label>
          <Textarea
            id="deliveryNotes"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="Special instructions for delivery..."
            rows={2}
            className="mt-1"
          />
        </div>
      </div>

      {/* Loading Partners */}
      {loadingPartners && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading delivery partners...</span>
        </div>
      )}

      {/* No Partners Available */}
      {!loadingPartners && partners.length === 0 && (
        <div className="text-center py-4">
          <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No delivery partners available for this order
          </p>
        </div>
      )}

      {/* Delivery Quotes */}
      {quotes.length > 0 && (
        <>
          <Separator />
          <div>
            <Label className="mb-2 block">Select Delivery Provider</Label>
            <RadioGroup value={selectedPartner} onValueChange={handlePartnerSelect}>
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <div
                    key={quote.partnerId}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedPartner === quote.partnerId
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    } ${!quote.available ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={() => quote.available && handlePartnerSelect(quote.partnerId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value={quote.partnerId}
                          id={quote.partnerId}
                          disabled={!quote.available}
                        />
                        <div>
                          <p className="font-medium">{quote.partnerName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{quote.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {quote.available ? (
                          <span className="font-bold text-primary">
                            {formatCurrency(quote.fee)}
                          </span>
                        ) : (
                          <Badge variant="secondary">Unavailable</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        </>
      )}

      {/* Selected Delivery Summary */}
      {selectedPartner && quotes.find(q => q.partnerId === selectedPartner) && (
        <>
          <Separator />
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Delivery Summary</span>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">{deliveryAddress}</p>
              <p className="text-muted-foreground">
                {deliveryContact} • {deliveryPhone}
              </p>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span>Delivery Fee:</span>
                <span className="font-bold">
                  {formatCurrency(quotes.find(q => q.partnerId === selectedPartner)?.fee || 0)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
