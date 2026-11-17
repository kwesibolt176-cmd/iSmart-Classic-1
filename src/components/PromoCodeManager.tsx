import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { Plus, Tag, Trash2, Edit2, Loader2, Copy, Sparkles, Percent } from "lucide-react";
import { format } from "date-fns";
interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  message: string | null;
  variant: string;
  min_order_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  show_on_storefront: boolean;
}

export const PromoCodeManager = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useBusiness();
  const { format: formatCurrency, currencySymbol } = useCurrency();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    message: "off your order",
    variant: "default",
    min_order_amount: "",
    max_uses: "",
    expires_at: "",
    show_on_storefront: true,
  });

  useEffect(() => {
    if (user) fetchPromoCodes();
  }, [user?.id]);

  const fetchPromoCodes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: 10,
      message: "off your order",
      variant: "default",
      min_order_amount: "",
      max_uses: "",
      expires_at: "",
      show_on_storefront: true,
    });
    setEditingPromo(null);
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      message: promo.message || "",
      variant: promo.variant,
      min_order_amount: promo.min_order_amount?.toString() || "",
      max_uses: promo.max_uses?.toString() || "",
      expires_at: promo.expires_at ? format(new Date(promo.expires_at), "yyyy-MM-dd'T'HH:mm") : "",
      show_on_storefront: promo.show_on_storefront,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !formData.code) return;
    setSaving(true);

    try {
      const promoData = {
        user_id: user.id,
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        message: formData.message || null,
        variant: formData.variant,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        show_on_storefront: formData.show_on_storefront,
      };

      if (editingPromo) {
        const { error } = await supabase
          .from("promo_codes")
          .update(promoData)
          .eq("id", editingPromo.id);
        if (error) throw error;
        toast({ title: "Promo code updated!" });
      } else {
        const { error } = await supabase
          .from("promo_codes")
          .insert(promoData);
        if (error) throw error;
        toast({ title: "Promo code created!" });
      }

      setDialogOpen(false);
      resetForm();
      fetchPromoCodes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save promo code",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("promo_codes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Promo code deleted" });
      fetchPromoCodes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete promo code",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (promo: PromoCode) => {
    try {
      const { error } = await supabase
        .from("promo_codes")
        .update({ is_active: !promo.is_active })
        .eq("id", promo.id);
      if (error) throw error;
      fetchPromoCodes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update promo code",
        variant: "destructive",
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied!" });
  };

  const getVariantBadge = (variant: string) => {
    switch (variant) {
      case "flash":
        return <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white">Flash Sale</Badge>;
      case "seasonal":
        return <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">Seasonal</Badge>;
      default:
        return <Badge variant="secondary">Standard</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Promo Codes
          </h3>
          <p className="text-sm text-muted-foreground">
            Create promo codes to display on your storefront
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Promo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Promo Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., WELCOME10"
                  className="font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <span className="flex items-center gap-2">
                          <Percent className="w-4 h-4" /> Percentage
                        </span>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <span className="flex items-center gap-2">
                          <Tag className="w-4 h-4" /> Fixed Amount
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Message (optional)</Label>
                <Input
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="e.g., off your first order"
                />
              </div>

              <div>
                <Label>Banner Style</Label>
                <Select
                  value={formData.variant}
                  onValueChange={(value) => setFormData({ ...formData, variant: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standard</SelectItem>
                    <SelectItem value="flash">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-orange-500" /> Flash Sale
                      </span>
                    </SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Order (optional)</Label>
                  <Input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Max Uses (optional)</Label>
                  <Input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div>
                <Label>Expires At (optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Show on Storefront</Label>
                <Switch
                  checked={formData.show_on_storefront}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_on_storefront: checked })}
                />
              </div>

              <Button onClick={handleSave} className="w-full" disabled={saving || !formData.code}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingPromo ? "Update Promo Code" : "Create Promo Code"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {promoCodes.length === 0 ? (
        <Card className="p-8 text-center">
          <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="font-semibold mb-2">No promo codes yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first promo code to attract customers
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {promoCodes.map((promo) => (
            <Card key={promo.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-bold text-lg">{promo.code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyCode(promo.code)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {getVariantBadge(promo.variant)}
                      {!promo.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {promo.discount_type === "percentage" ? `${promo.discount_value}%` : formatCurrency(promo.discount_value)}
                      {promo.message && ` ${promo.message}`}
                      {promo.current_uses > 0 && ` • Used ${promo.current_uses} times`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={promo.is_active}
                    onCheckedChange={() => toggleActive(promo)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(promo)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(promo.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
