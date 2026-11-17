import { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { Checkbox } from "@/components/ui/checkbox";

import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { useBusiness } from "@/contexts/BusinessContext";

import { useToast } from "@/hooks/use-toast";

import { useCurrency } from "@/hooks/use-currency";

import { PaymentPlanDialog, PaymentPlan } from "./PaymentPlanDialog";

import { addDays, addWeeks, addMonths } from "date-fns";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";



interface NewInvoiceDialogProps {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  onInvoiceCreated?: () => void;

}



interface InvoiceItem {

  name: string;

  quantity: number;

  price: number;

}



interface InventoryItem {

  id: string;

  name: string;

  price: number;

}



export const NewInvoiceDialog = ({ open, onOpenChange, onInvoiceCreated }: NewInvoiceDialogProps) => {

  const { user } = useBusiness();

  const { toast } = useToast();

  const { format: formatCurrency, currencySymbol } = useCurrency();

  

  const [customerName, setCustomerName] = useState("");

  const [customerEmail, setCustomerEmail] = useState("");

  const [customerPhone, setCustomerPhone] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([{ name: "", quantity: 1, price: 0 }]);

  const [tax, setTax] = useState(0);

  const [taxType, setTaxType] = useState<"fixed" | "percentage">("fixed");

  const [discount, setDiscount] = useState(0);

  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("percentage");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);

  const [enablePaymentPlan, setEnablePaymentPlan] = useState(false);

  const [showPaymentPlanDialog, setShowPaymentPlanDialog] = useState(false);

  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan | null>(null);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [requireDeposit, setRequireDeposit] = useState(false);

  const [depositType, setDepositType] = useState<"percentage" | "fixed">("percentage");

  const [depositAmount, setDepositAmount] = useState(30);



  // Fetch inventory items for dropdown

  useEffect(() => {

    if (open && user?.id) {

      fetchInventoryItems();

    }

  }, [open, user?.id]);



  const fetchInventoryItems = async () => {

    if (!user?.id) return;

    const { data } = await supabase

      .from("inventory_items")

      .select("id, name, price")

      .eq("user_id", user.id)

      .eq("is_active", true)

      .order("name");

    setInventoryItems(data || []);

  };



  const addItem = () => {

    setItems([...items, { name: "", quantity: 1, price: 0 }]);

  };



  const removeItem = (index: number) => {

    setItems(items.filter((_, i) => i !== index));

  };



  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };



  const selectInventoryItem = (index: number, itemId: string) => {

    const inventoryItem = inventoryItems.find(i => i.id === itemId);

    if (inventoryItem) {
      setItems(prev => {
        const newItems = [...prev];
        newItems[index] = { 
          ...newItems[index], 
          name: inventoryItem.name, 
          price: inventoryItem.price 
        };
        return newItems;
      });
    }

  };



  const calculateSubtotal = () => {

    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  };



  const calculateTaxAmount = () => {

    const subtotal = calculateSubtotal();

    if (taxType === "percentage") {

      return (subtotal * tax) / 100;

    }

    return tax;

  };



  const calculateDiscountAmount = () => {

    const subtotal = calculateSubtotal();

    if (discountType === "percentage") {

      return (subtotal * discount) / 100;

    }

    return discount;

  };



  const calculateTotal = () => {

    return calculateSubtotal() + calculateTaxAmount() - calculateDiscountAmount();

  };



  const calculateDepositAmount = () => {

    const total = calculateTotal();

    if (!requireDeposit) return 0;

    if (depositType === "percentage") {

      return (total * depositAmount) / 100;

    }

    return depositAmount;

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    

    if (!user?.id) {

      toast({

        title: "Error",

        description: "You must be logged in",

        variant: "destructive",

      });

      return;

    }



    if (!customerName || !dueDate || items.length === 0) {

      toast({

        title: "Error",

        description: "Please fill in all required fields",

        variant: "destructive",

      });

      return;

    }



    if (enablePaymentPlan && !paymentPlan) {

      toast({

        title: "Error",

        description: "Please configure the payment plan",

        variant: "destructive",

      });

      return;

    }



    setLoading(true);



    try {

      // Generate invoice number

      const { data: invoiceNumber, error: numberError } = await supabase

        .rpc('generate_invoice_number');



      if (numberError) throw numberError;



      const subtotal = calculateSubtotal();

      const taxAmount = calculateTaxAmount();

      const total = calculateTotal();

      

      // Generate unique payment link token

      const paymentToken = crypto.randomUUID();

      const paymentLink = `${window.location.origin}/invoice?token=${paymentToken}`;



      const depositRequired = requireDeposit ? calculateDepositAmount() : null;



      const { data: invoiceData, error } = await supabase.from("invoices").insert({

        user_id: user.id,

        invoice_number: invoiceNumber as string,

        customer_name: customerName,

        customer_email: customerEmail || null,

        customer_phone: customerPhone || null,

        issue_date: new Date().toISOString().split('T')[0],

        due_date: dueDate,

        items: items as any,

        subtotal: subtotal,

        tax: taxAmount,

        total: total,

        notes: notes || null,

        status: 'draft',

        payment_link: paymentLink,

        payment_link_token: paymentToken,

        deposit_required: depositRequired,

      } as any).select().single();



      if (error) throw error;



      // Create payment plan and installments if enabled

      if (enablePaymentPlan && paymentPlan && invoiceData) {

        const { data: planData, error: planError } = await supabase

          .from('invoice_payment_plans')

          .insert({

            invoice_id: invoiceData.id,

            user_id: user.id,

            number_of_installments: paymentPlan.numberOfInstallments,

            frequency: paymentPlan.frequency,

            first_payment_date: paymentPlan.firstPaymentDate.toISOString().split('T')[0]

          })

          .select()

          .single();



        if (planError) throw planError;



        // Generate installments

        const installments = [];

        const installmentAmount = total / paymentPlan.numberOfInstallments;

        

        for (let i = 0; i < paymentPlan.numberOfInstallments; i++) {

          let dueDate = new Date(paymentPlan.firstPaymentDate);

          

          if (paymentPlan.frequency === 'weekly') {

            dueDate = addWeeks(dueDate, i);

          } else if (paymentPlan.frequency === 'biweekly') {

            dueDate = addWeeks(dueDate, i * 2);

          } else {

            dueDate = addMonths(dueDate, i);

          }



          installments.push({

            payment_plan_id: planData.id,

            invoice_id: invoiceData.id,

            user_id: user.id,

            installment_number: i + 1,

            due_date: dueDate.toISOString().split('T')[0],

            amount: installmentAmount,

            status: 'pending'

          });

        }



        const { error: installmentsError } = await supabase

          .from('invoice_installments')

          .insert(installments);



        if (installmentsError) throw installmentsError;

      }



      toast({

        title: "Success",

        description: "Invoice created successfully",

      });



      // Reset form

      setCustomerName("");

      setCustomerEmail("");

      setCustomerPhone("");

      setDueDate("");

      setItems([{ name: "", quantity: 1, price: 0 }]);

      setTax(0);

      setTaxType("fixed");

      setDiscount(0);

      setDiscountType("percentage");

      setNotes("");

      setEnablePaymentPlan(false);

      setPaymentPlan(null);

      setRequireDeposit(false);

      setDepositType("percentage");

      setDepositAmount(30);

      

      onInvoiceCreated?.();

    } catch (error: any) {

      toast({

        title: "Error",

        description: error.message,

        variant: "destructive",

      });

    } finally {

      setLoading(false);

    }

  };



  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">

        <DialogHeader>

          <DialogTitle>Create New Invoice</DialogTitle>

        </DialogHeader>

        

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">

              <Label htmlFor="customerName">Customer Name *</Label>

              <Input

                id="customerName"

                value={customerName}

                onChange={(e) => setCustomerName(e.target.value)}

                placeholder="John Doe"

                required

              />

            </div>

            

            <div className="space-y-2">

              <Label htmlFor="dueDate">Due Date *</Label>

              <Input

                id="dueDate"

                type="date"

                value={dueDate}

                onChange={(e) => setDueDate(e.target.value)}

                required

              />

            </div>

          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">

              <Label htmlFor="customerEmail">Customer Email</Label>

              <Input

                id="customerEmail"

                type="email"

                value={customerEmail}

                onChange={(e) => setCustomerEmail(e.target.value)}

                placeholder="john@example.com"

              />

            </div>

            

            <div className="space-y-2">

              <Label htmlFor="customerPhone">Customer Phone</Label>

              <PhoneInput

                id="customerPhone"

                value={customerPhone}

                onChange={(value) => setCustomerPhone(value)}

                placeholder="Enter customer phone"

              />

            </div>

          </div>



          <div className="space-y-4">

            <div className="flex justify-between items-center">

              <Label>Items *</Label>

              <Button type="button" variant="outline" size="sm" onClick={addItem}>

                <Plus className="h-4 w-4 mr-1" />

                Add Item

              </Button>

            </div>

            

            {items.map((item, index) => (

              <div key={index} className="space-y-2">

                <div className="grid grid-cols-12 gap-2 items-end">

                  <div className="col-span-12 md:col-span-5 space-y-1">

                    <Label className="text-xs text-muted-foreground">Quick Select from Inventory</Label>

                    <Select

                      onValueChange={(value) => {

                        selectInventoryItem(index, value);

                        // Show visual feedback
                        const itemInput = document.querySelector(`input[placeholder="Item name"]`) as HTMLInputElement;
                        if (itemInput) {
                          itemInput.classList.add('ring-2', 'ring-green-500');
                          setTimeout(() => {
                            itemInput.classList.remove('ring-2', 'ring-green-500');
                          }, 1000);
                        }
                      }}

                    >

                      <SelectTrigger className="bg-background">

                        <SelectValue placeholder="Click to autofill item details..." />

                      </SelectTrigger>

                      <SelectContent className="bg-background z-50">

                        {inventoryItems.length === 0 ? (

                          <div className="p-2 text-sm text-muted-foreground">

                            No inventory items found

                          </div>

                        ) : (

                          inventoryItems.map((inv) => (

                            <SelectItem key={inv.id} value={inv.id}>

                              <div className="flex flex-col">

                                <span>{inv.name}</span>

                                <span className="text-xs text-muted-foreground">{formatCurrency(inv.price)}</span>

                              </div>

                            </SelectItem>

                          ))

                        )}

                      </SelectContent>

                    </Select>

                    <p className="text-xs text-muted-foreground mt-1">

                      Selecting will autofill name and price below

                    </p>

                  </div>

                </div>

                <div className="grid grid-cols-12 gap-2 items-end">

                  <div className="col-span-5 space-y-1">

                    <div className="relative">

                      <Input

                        placeholder="Item name"

                        value={item.name}

                        onChange={(e) => updateItem(index, 'name', e.target.value)}

                        required

                        className={item.name && inventoryItems.some(inv => inv.name === item.name) ? "pr-8 ring-2 ring-green-500/20" : ""}

                      />

                      {item.name && inventoryItems.some(inv => inv.name === item.name) && (

                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">

                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Item autofilled from inventory"></div>

                        </div>

                      )}

                    </div>

                  </div>

                  <div className="col-span-2 space-y-1">

                    <Input

                      type="number"

                      min="1"

                      placeholder="Qty"

                      value={item.quantity}

                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}

                      required

                    />

                  </div>

                  <div className="col-span-3 space-y-1">

                    <Input

                      type="number"

                      min="0"

                      step="0.01"

                      placeholder="Price"

                      value={item.price}

                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}

                      required

                    />

                  </div>

                  <div className="col-span-2">

                    {items.length > 1 && (

                      <Button

                        type="button"

                        variant="ghost"

                        size="sm"

                        onClick={() => removeItem(index)}

                        className="w-full"

                      >

                        <Trash2 className="h-4 w-4" />

                      </Button>

                    )}

                  </div>

                </div>

              </div>

            ))}

          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">

              <Label>Discount</Label>

              <div className="flex gap-2">

                <Input

                  type="number"

                  min="0"

                  step="0.01"

                  value={discount}

                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}

                  placeholder="0"

                  className="flex-1"

                />

                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "fixed" | "percentage")}>

                  <SelectTrigger className="w-24 bg-background">

                    <SelectValue />

                  </SelectTrigger>

                  <SelectContent className="bg-background z-50">

                    <SelectItem value="percentage">%</SelectItem>

                    <SelectItem value="fixed">{currencySymbol}</SelectItem>

                  </SelectContent>

                </Select>

              </div>

            </div>

            

            <div className="space-y-2">

              <Label>Tax</Label>

              <div className="flex gap-2">

                <Input

                  type="number"

                  min="0"

                  step="0.01"

                  value={tax}

                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}

                  placeholder="0"

                  className="flex-1"

                />

                <Select value={taxType} onValueChange={(v) => setTaxType(v as "fixed" | "percentage")}>

                  <SelectTrigger className="w-24 bg-background">

                    <SelectValue />

                  </SelectTrigger>

                  <SelectContent className="bg-background z-50">

                    <SelectItem value="percentage">%</SelectItem>

                    <SelectItem value="fixed">{currencySymbol}</SelectItem>

                  </SelectContent>

                </Select>

              </div>

            </div>

          </div>



          <div className="space-y-2">

            <Label htmlFor="notes">Notes</Label>

            <Textarea

              id="notes"

              value={notes}

              onChange={(e) => setNotes(e.target.value)}

              placeholder="Additional notes or payment terms..."

              rows={3}

            />

          </div>



          <div className="flex items-center space-x-2 py-4">

            <Checkbox

              id="payment-plan"

              checked={enablePaymentPlan}

              onCheckedChange={(checked) => {

                setEnablePaymentPlan(checked as boolean);

                if (checked) {

                  setShowPaymentPlanDialog(true);

                } else {

                  setPaymentPlan(null);

                }

              }}

            />

            <Label htmlFor="payment-plan" className="cursor-pointer">

              Enable Payment Plan (Installments)

            </Label>

            {paymentPlan && (

              <span className="text-sm text-muted-foreground">

                ({paymentPlan.numberOfInstallments} installments, {paymentPlan.frequency})

              </span>

            )}

          </div>



          <div className="flex items-center space-x-2 pb-4">

            <Checkbox

              id="require-deposit"

              checked={requireDeposit}

              onCheckedChange={(checked) => setRequireDeposit(checked as boolean)}

            />

            <Label htmlFor="require-deposit" className="cursor-pointer">

              Require Deposit/Advance Payment

            </Label>

          </div>



          {requireDeposit && (

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">

              <div className="space-y-2">

                <Label>Deposit Amount</Label>

                <div className="flex gap-2">

                  <Input

                    type="number"

                    min="0"

                    step="0.01"

                    value={depositAmount}

                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}

                    className="flex-1"

                  />

                  <Select value={depositType} onValueChange={(v) => setDepositType(v as "percentage" | "fixed")}>

                    <SelectTrigger className="w-24 bg-background">

                      <SelectValue />

                    </SelectTrigger>

                    <SelectContent className="bg-background z-50">

                      <SelectItem value="percentage">%</SelectItem>

                      <SelectItem value="fixed">{currencySymbol}</SelectItem>

                    </SelectContent>

                  </Select>

                </div>

              </div>

              <div className="flex items-end">

                <p className="text-sm text-muted-foreground">

                  Deposit: <span className="font-medium text-foreground">{formatCurrency(calculateDepositAmount())}</span>

                </p>

              </div>

            </div>

          )}



          <div className="border-t pt-4 space-y-2">

            <div className="flex justify-between text-sm">

              <span className="text-muted-foreground">Subtotal:</span>

              <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>

            </div>

            {discount > 0 && (

              <div className="flex justify-between text-sm text-green-600">

                <span>Discount ({discountType === "percentage" ? `${discount}%` : formatCurrency(discount)}):</span>

                <span>-{formatCurrency(calculateDiscountAmount())}</span>

              </div>

            )}

            {tax > 0 && (

              <div className="flex justify-between text-sm">

                <span className="text-muted-foreground">Tax ({taxType === "percentage" ? `${tax}%` : formatCurrency(tax)}):</span>

                <span className="font-medium">{formatCurrency(calculateTaxAmount())}</span>

              </div>

            )}

            <div className="flex justify-between text-lg font-bold">

              <span>Total:</span>

              <span className="text-primary">{formatCurrency(calculateTotal())}</span>

            </div>

          </div>



          <div className="flex justify-end gap-2">

            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>

              Cancel

            </Button>

            <Button type="submit" disabled={loading}>

              {loading ? "Creating..." : "Create Invoice"}

            </Button>

          </div>

        </form>

      </DialogContent>



      <PaymentPlanDialog

        open={showPaymentPlanDialog}

        onOpenChange={setShowPaymentPlanDialog}

        invoiceTotal={calculateTotal()}

        onPlanCreated={(plan) => {

          setPaymentPlan(plan);

          setShowPaymentPlanDialog(false);

        }}

      />

    </Dialog>

  );

};

