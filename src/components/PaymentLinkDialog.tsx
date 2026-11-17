import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, Copy, ExternalLink, Mail, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { callMerchantApi, createIdempotencyKey } from "@/lib/merchant-api";
import {
  buildCheckoutRequest,
  checkoutEligibilityMessage,
  type CheckoutSettings,
  type MerchantCheckout,
} from "@/lib/merchant-checkout";

interface PaymentLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PaymentLinkDialog({ open, onOpenChange, onSuccess }: PaymentLinkDialogProps) {
  const { profile } = useBusiness();
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState({
    title: "",
    description: "",
    amount: "",
    isFixedAmount: true,
  });
  const [createdLink, setCreatedLink] = useState<{ title: string; url: string } | null>(null);

  const closeDialog = () => {
    setCreatedLink(null);
    setNewLink({ title: "", description: "", amount: "", isFixedAmount: true });
    onOpenChange(false);
  };

  const copyCreatedLink = async () => {
    if (!createdLink) return;
    const copied = await navigator.clipboard.writeText(createdLink.url).then(() => true).catch(() => false);
    toast[copied ? "success" : "error"](copied ? "Payment link copied" : "Could not copy the link");
  };

  const shareCreatedLink = async () => {
    if (!createdLink) return;
    if (navigator.share) {
      await navigator.share({ title: createdLink.title, text: `Pay ${createdLink.title}`, url: createdLink.url }).catch(() => undefined);
      return;
    }
    await copyCreatedLink();
  };

  const generateShortCode = () => Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((value) => value.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 20);

  const handleCreateLink = async () => {
    if (!newLink.title) {
      toast.error("Please enter a title");
      return;
    }
    const amount = Number(newLink.amount);
    if (newLink.isFixedAmount && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error("Enter a valid amount greater than zero");
      return;
    }

    const merchantBusinessId = profile?.merchant_business_id || profile?.ismart_business_id;
    if (!profile?.id || !merchantBusinessId) {
      toast.error("Merchant business is not linked");
      return;
    }

    setCreating(true);
    try {
      let settings = await callMerchantApi<CheckoutSettings>("getCheckoutSettings", {
        path: { id: merchantBusinessId },
      });
      if (!settings.ready) {
        const eligibilityError = checkoutEligibilityMessage(settings);
        if (eligibilityError && !settings.eligible.ok) throw new Error(eligibilityError);
        settings = await callMerchantApi<CheckoutSettings>("enableCheckout", {
          path: { id: merchantBusinessId },
          idempotencyKey: createIdempotencyKey("checkout-enable", merchantBusinessId),
        });
      }
      const readinessError = checkoutEligibilityMessage(settings);
      if (readinessError) throw new Error(readinessError);

      const reference = `PL_${crypto.randomUUID().replaceAll("-", "")}`;
      const checkout = await callMerchantApi<MerchantCheckout>("createCheckout", {
        path: { id: merchantBusinessId },
        idempotencyKey: createIdempotencyKey("checkout", reference),
        body: buildCheckoutRequest({
          reference,
          title: newLink.title,
          description: newLink.description,
          fixedAmount: newLink.isFixedAmount,
          amount,
        }),
      });
      const shortCode = generateShortCode();

      const { error } = await supabase
        .from('payment_links')
        .insert({
          business_id: profile.id,
          short_code: shortCode,
          title: newLink.title,
          description: newLink.description || null,
          amount: newLink.isFixedAmount ? amount : null,
          is_fixed_amount: newLink.isFixedAmount,
          currency: 'GHS',
          redirect_url: checkout.url,
          expires_at: checkout.expiresAt,
          metadata: {
            merchant_checkout_id: checkout.id,
            merchant_reference: checkout.reference,
            merchant_environment: checkout.environment,
            merchant_status: checkout.status,
          },
        });

      if (error) {
        await callMerchantApi("cancelCheckout", {
          path: { id: merchantBusinessId, checkoutId: checkout.id },
        }).catch(() => undefined);
        throw error;
      }

      const publicUrl = `${window.location.origin}/pay/${shortCode}`;
      const copied = await navigator.clipboard
        .writeText(publicUrl)
        .then(() => true)
        .catch(() => false);
      toast.success(copied ? "Payment link created and copied" : "Payment link created");
      setCreatedLink({ title: newLink.title, url: publicUrl });
      if (onSuccess) onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create payment link";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : closeDialog()}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        {createdLink ? <>
          <DialogHeader>
            <div className="mx-auto mb-2 rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-950/40">
              <CheckCircle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center">Payment link ready</DialogTitle>
            <DialogDescription className="text-center">Share this safe portal link. Customers will be redirected to iSmart secure checkout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium">{createdLink.title}</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{createdLink.url}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={copyCreatedLink}><Copy className="mr-2 h-4 w-4" />Copy</Button>
              <Button variant="outline" onClick={shareCreatedLink}><Share2 className="mr-2 h-4 w-4" />Share</Button>
              <Button variant="outline" asChild><a href={`https://wa.me/?text=${encodeURIComponent(`Pay ${createdLink.title}: ${createdLink.url}`)}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>
              <Button variant="outline" asChild><a href={`mailto:?subject=${encodeURIComponent(createdLink.title)}&body=${encodeURIComponent(`Use this secure payment link: ${createdLink.url}`)}`}><Mail className="mr-2 h-4 w-4" />Email</a></Button>
            </div>
            <Button variant="outline" className="w-full" asChild><a href={createdLink.url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Preview checkout</a></Button>
          </div>
          <DialogFooter><Button className="w-full" onClick={closeDialog}>Done</Button></DialogFooter>
        </> : <>
        <DialogHeader>
          <DialogTitle>Create Payment Link</DialogTitle>
          <DialogDescription>
            Generate a shareable link for customers to pay you
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              placeholder="e.g., Product Payment, Service Fee"
              value={newLink.title}
              onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Optional description for this payment"
              value={newLink.description}
              onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Fixed Amount</Label>
            <Switch
              checked={newLink.isFixedAmount}
              onCheckedChange={(checked) => setNewLink({ ...newLink, isFixedAmount: checked })}
            />
          </div>
          {newLink.isFixedAmount && (
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={newLink.amount}
                onChange={(e) => setNewLink({ ...newLink, amount: e.target.value })}
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={closeDialog} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleCreateLink} disabled={creating} className="w-full sm:w-auto">
            {creating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
            Create Link
          </Button>
        </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  );
}
