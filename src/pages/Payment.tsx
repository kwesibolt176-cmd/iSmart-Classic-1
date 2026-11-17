import { useState, useEffect, useRef } from "react";
import { PaymentMethod } from "@/components/PaymentMethod";
import { PaymentSummary } from "@/components/PaymentSummary";
import { SplitPayment } from "@/components/SplitPayment";
import { Receipt } from "@/components/Receipt";
import { DiscountDialog } from "@/components/DiscountDialog";
import { TenderedAmountDialog } from "@/components/TenderedAmountDialog";
import { ISmartMoMoDialog } from "@/components/ISmartMoMoDialog";
import { OrderTypeSelector, OrderType } from "@/components/OrderTypeSelector";
import { TransactionHistory } from "@/components/TransactionHistory";
import { GiftCardRedemption } from "@/components/GiftCardRedemption";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { ArrowLeft, Percent, CheckCircle2, Loader2, MapPin, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBusiness } from "@/contexts/BusinessContext";
import { useLocation as useBusinessLocation } from "@/contexts/LocationContext";
import { useCurrency } from "@/hooks/use-currency";
import { createPaymentReceiptAction, createSMSAction } from "@/lib/pending-actions";
import { saveOfflineOrder, saveOfflineTransaction } from "@/lib/offline-storage";
import { useOffline } from "@/hooks/use-offline";
import { StaffSelector } from "@/components/StaffSelector";
import { TableSelector } from "@/components/TableSelector";
import { computeTax, recordTransactionTax, TaxComputationResult, BusinessTaxProfile } from "@/lib/ghana-tax-engine";
import { createTransactionNotification } from "@/lib/transaction-notifications";

export const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Support both URL params and location state for express mode
  const urlParams = new URLSearchParams(location.search);
  const expressFromUrl = urlParams.get("express") === "true";
  const settleTableId = urlParams.get("settleTableId");
  const existingOrderId = urlParams.get("orderId");
  const expressMode = location.state?.expressMode || expressFromUrl;

  const { items: cartItems, setItems, getSubtotal, getTax, getTotal, clearCart, selectedTable } = useCart();
  const { currentLocation } = useBusinessLocation();
  const { isOnline, updatePendingCount } = useOffline();

  const [selectedMethod, setSelectedMethod] = useState<string | null>(expressMode ? "cash" : null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discount, setDiscount] = useState<{ type: string; value: number; reason: string } | null>(null);
  const [orderType, setOrderType] = useState<OrderType>(selectedTable || settleTableId ? "dine-in" : "takeout");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [autoSendReceipt, setAutoSendReceipt] = useState(true);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [tipPercent, setTipPercent] = useState(15);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [tenderedDialogOpen, setTenderedDialogOpen] = useState(false);
  const [tenderedAmount, setTenderedAmount] = useState<number | null>(null);
  const [changeDue, setChangeDue] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isOrderCreating, setIsOrderCreating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(selectedTable?.id || settleTableId || null);
  const [tableNumber, setTableNumber] = useState<number | null>(selectedTable?.number || null);
  const [appliedGiftCard, setAppliedGiftCard] = useState<{ id: string; code: string; amount: number } | null>(null);
  const [taxResult, setTaxResult] = useState<TaxComputationResult | null>(null);
  const [iSmartMoMoDialogOpen, setISmartMoMoDialogOpen] = useState(false);
  const [iSmartProcessing, setISmartProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string;
    tableNumber: number;
    items: Array<{ id: string; name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
    server: string;
  } | null>(null);
  const { user, profile } = useBusiness();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    if (!user?.id) return;
    const loadPosDefaults = async () => {
      const { data } = await supabase
        .from("pos_settings" as never)
        .select("auto_print_receipts,tips_enabled,default_tip_percentage,email_receipts")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return;
      const settings = data as unknown as {
        auto_print_receipts: boolean;
        tips_enabled: boolean;
        default_tip_percentage: number;
        email_receipts: boolean;
      };
      setAutoPrintReceipt(settings.auto_print_receipts);
      setTipsEnabled(settings.tips_enabled);
      setTipPercent(Number(settings.default_tip_percentage));
      setAutoSendReceipt(settings.email_receipts);
    };
    void loadPosDefaults();
  }, [user?.id]);

  // Compute tax when subtotal changes (for VAT-registered businesses)
  useEffect(() => {
    const computeTaxForOrder = async () => {
      if (!profile || cartItems.length === 0) return;
      
      const businessTaxProfile: BusinessTaxProfile = {
        tin: (profile as any).tin || undefined,
        vat_registered: (profile as any).vat_registered || false,
        tax_regime: (profile as any).tax_regime || 'None',
        turnover_last_12_months: (profile as any).turnover_last_12_months || 0,
      };
      
      try {
        const result = await computeTax(getSubtotal(), businessTaxProfile);
        setTaxResult(result);
      } catch (error) {
        console.error('Error computing tax:', error);
        setTaxResult(null);
      }
    };
    
    computeTaxForOrder();
  }, [cartItems, profile, getSubtotal]);

  // Keep local tableId synced with URL + CartContext - initialize from URL param immediately
  const effectiveTableId = settleTableId || selectedTable?.id || tableId;
  
  useEffect(() => {
    if (settleTableId && settleTableId !== tableId) {
      setTableId(settleTableId);
      return;
    }

    if (selectedTable?.id && selectedTable.id !== tableId) {
      setTableId(selectedTable.id);
    }
  }, [settleTableId, selectedTable?.id]);

  // --- Order hydration ---
  // When navigating from Orders -> Process Payment or Tables -> Settle, Payment can mount before cart context updates.
  // If cart is empty but we have an orderId or tableId, hydrate the cart from the existing order.
  const needsHydration = !!(settleTableId || existingOrderId);
  const [hydrationChecked, setHydrationChecked] = useState(!needsHydration);
  const hydrationInFlightRef = useRef(false);

  useEffect(() => {
    if (hydrationChecked) return;

    if (cartItems.length > 0) {
      setHydrationChecked(true);
      return;
    }

    // Need either a tableId or existingOrderId to hydrate
    if (!tableId && !existingOrderId) {
      setHydrationChecked(true);
      return;
    }

    if (hydrationInFlightRef.current) return;
    hydrationInFlightRef.current = true;

    (async () => {
      try {
        let orderIdToFetch: string | null = existingOrderId;

        // If we have a tableId but no orderId, get order from table
        if (!orderIdToFetch && tableId) {
          const { data: tableRow, error: tableErr } = await supabase
            .from("restaurant_tables")
            .select("current_order_id, table_number")
            .eq("id", tableId)
            .maybeSingle();

          if (tableErr) throw tableErr;
          orderIdToFetch = tableRow?.current_order_id || null;
          if (tableRow?.table_number) {
            setTableNumber(tableRow.table_number);
          }
        }

        if (!orderIdToFetch) {
          setHydrationChecked(true);
          return;
        }

        const { data: orderRow, error: orderErr } = await supabase
          .from("orders")
          .select("id, order_number, order_type, customer_name, customer_phone")
          .eq("id", orderIdToFetch)
          .single();

        if (orderErr) throw orderErr;

        const { data: itemsData, error: itemsErr } = await supabase
          .from("order_items")
          .select("id, inventory_item_id, name, quantity, price")
          .eq("order_id", orderRow.id);

        if (itemsErr) throw itemsErr;

        setOrderId(orderRow.id);
        setOrderNumber(orderRow.order_number);
        if (orderRow.order_type) setOrderType(orderRow.order_type as OrderType);
        if (orderRow.customer_name) setCustomerName(orderRow.customer_name);
        if (orderRow.customer_phone) setCustomerPhone(orderRow.customer_phone);

        setItems(
          (itemsData || []).map((i) => ({
            id: i.inventory_item_id ?? i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          }))
        );
      } catch (error) {
        console.error("Error hydrating order:", error);
      } finally {
        hydrationInFlightRef.current = false;
        setHydrationChecked(true);
      }
    })();
  }, [hydrationChecked, cartItems.length, tableId, existingOrderId, setItems]);

  // Generate order number and create order in database (normal checkout flow)
  const orderCreationStartedRef = useRef(false);
  useEffect(() => {
    if (!hydrationChecked) return;
    // Skip order creation if we already have an order (from settle flow or existing orderId)
    if (settleTableId || existingOrderId) return;
    if (orderId) return;
    if (orderCreationStartedRef.current) return;
    if (cartItems.length === 0) return;

    orderCreationStartedRef.current = true;
    setIsOrderCreating(true);

    const createOrder = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Authentication required",
            description: "Please sign in to continue",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        // Generate order number using database function
        const { data: orderNumberData, error: orderNumberError } = await supabase
          .rpc('generate_order_number');

        if (orderNumberError) throw orderNumberError;

        const generatedOrderNumber = orderNumberData || `#${Date.now().toString().slice(-6)}`;
        setOrderNumber(generatedOrderNumber);

        // If table is selected, mark it as occupied and get table number
        let fetchedTableNumber = null;
        if (tableId) {
          const { data: tableData, error: tableError } = await supabase
            .from('restaurant_tables')
            .select('table_number')
            .eq('id', tableId)
            .single();

          if (!tableError && tableData) {
            fetchedTableNumber = tableData.table_number;
            setTableNumber(fetchedTableNumber);

            // Update table status to occupied
            await supabase
              .from('restaurant_tables')
              .update({
                status: 'occupied',
                current_order_id: null, // Will update after order creation
              })
              .eq('id', tableId);
          }
        }

        // Lookup existing customer by phone for purchase history linking
        // Use business owner's user_id from context (not auth user, which could be staff)
        const businessUserId = profile?.user_id || user.id;
        let customerId = null;
        if (customerPhone) {
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', businessUserId)
            .eq('phone', customerPhone)
            .maybeSingle();
          
          customerId = existingCustomer?.id || null;
        }

        // Create order in database
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: businessUserId,
            location_id: currentLocation?.id || null,
            order_number: generatedOrderNumber,
            status: 'pending',
            total: getTotal(),
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            customer_id: customerId,
            order_type: orderType,
            table_number: fetchedTableNumber,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        setOrderId(order.id);

        // Update table with order ID
        if (tableId) {
          await supabase
            .from('restaurant_tables')
            .update({ current_order_id: order.id })
            .eq('id', tableId);
        }

        // Validate inventory item IDs exist before inserting
        // Some items may come from social_media_products which don't have inventory_items entries
        const itemIds = cartItems.map(item => item.id).filter(Boolean);
        let validInventoryIds = new Set<string>();
        
        if (itemIds.length > 0) {
          const { data: validItems } = await supabase
            .from('inventory_items')
            .select('id')
            .in('id', itemIds);
          
          validInventoryIds = new Set((validItems || []).map(item => item.id));
        }

        // Create order items - only set inventory_item_id if it exists in inventory_items
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          inventory_item_id: validInventoryIds.has(item.id) ? item.id : null,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        setIsOrderCreating(false);
        toast({
          title: "Order created",
          description: `Order ${generatedOrderNumber} is ready for payment`,
        });

      } catch (error: any) {
        console.error('Error creating order:', error);
        setIsOrderCreating(false);
        toast({
          title: "Error creating order",
          description: error.message || "Could not create order",
          variant: "destructive",
        });
      }
    };

    createOrder();
  }, [hydrationChecked]);

  // Redirect if cart is empty (only after settle hydration check and if payment not successful)
  useEffect(() => {
    if (!hydrationChecked) return;
    
    // Don't redirect if payment was successful - we want to show success state
    if (paymentStatus === "success") return;

    if (cartItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to cart before checkout",
        variant: "destructive",
      });
      navigate("/?section=products");
    }
  }, [hydrationChecked, cartItems.length, navigate, paymentStatus]);

  const orderTotal = getTotal();
  const giftCardDiscount = appliedGiftCard?.amount || 0;
  const checkoutDiscount = discount
    ? discount.type === "percentage" ? getSubtotal() * (discount.value / 100) : discount.value
    : 0;
  const tipAmount = tipsEnabled ? getSubtotal() * (tipPercent / 100) : 0;
  const finalTotal = Math.max(0, orderTotal + tipAmount - checkoutDiscount - giftCardDiscount);

  const currentOrder = {
    orderNumber: orderNumber || `#${Date.now().toString().slice(-6)}`,
    tableNumber: 0,
    items: cartItems,
    subtotal: getSubtotal(),
    tax: getTax(),
    total: finalTotal,
    server: "Self-Service",
  };

  const handleSendPaymentLink = async () => {
    if (!customerPhone) {
      toast({
        title: "Phone number required",
        description: "Please enter a customer phone number",
        variant: "destructive",
      });
      return;
    }

    setSendingSMS(true);
    try {
      const paymentLink = `${window.location.origin}/track-order?orderNumber=${encodeURIComponent(currentOrder.orderNumber)}`;
      const message = `Hi! Your order ${currentOrder.orderNumber} is ready. Total: GHS ${currentOrder.total.toFixed(2)}. Track & pay here: ${paymentLink}`;

      await createSMSAction(
        customerPhone,
        message,
        'high'
      );

      toast({
        title: "Payment link queued!",
        description: "SMS with payment link has been queued for admin approval",
      });
    } catch (error: any) {
      console.error('Error sending payment link:', error);
      toast({
        title: "Failed to send SMS",
        description: error.message || "Could not send payment link",
        variant: "destructive",
      });
    } finally {
      setSendingSMS(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!selectedMethod) return;

    // Express mode: skip tendered dialog for exact cash payment
    if (expressMode && selectedMethod === "cash") {
      await processPayment(currentOrder.total, 0);
      return;
    }

    // For cash payments, show tendered amount dialog
    if (selectedMethod === "Cash" || selectedMethod === "cash") {
      setTenderedDialogOpen(true);
      return;
    }

    // For iSmart MoMo payments, show provider dialog
    if (selectedMethod === "ismart-momo") {
      setISmartMoMoDialogOpen(true);
      return;
    }

    // For card and mobile payments, use iSmart Collect
    if (selectedMethod === "card" || selectedMethod === "mobile") {
      await initiateMomoPayment();
      return;
    }

    // For other payment methods (e.g., "other"), proceed directly
    await processPayment(null, null);
  };

  const initiateISmartMoMoPayment = async (provider: "MTN" | "TELECEL") => {
    if (!customerPhone) {
      toast({
        title: "Phone number required",
        description: "Please enter a customer phone number",
        variant: "destructive",
      });
      return;
    }

    // Ensure order is created
    if (!orderId && !settleTableId && !existingOrderId) {
      toast({
        title: "Please wait",
        description: "Order is being prepared. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setISmartProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId,
          orderNumber,
          amount: finalTotal,
          customerName,
          customerPhone,
          provider,
          merchantUserId: user.id,
          items: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      });

      if (error) throw error;

      if (data?.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data?.success) {
        setISmartMoMoDialogOpen(false);
        toast({
          title: "Payment prompt sent!",
          description: data.message || "Customer should approve the payment on their phone",
        });
        
        // Show processing state while waiting for payment confirmation
        setPaymentStatus("processing");
        
        // For now, we'll treat iSmart as async - the webhook will update the order
        // Show a helpful message to the cashier
        toast({
          title: "Awaiting payment confirmation",
          description: "The order will be marked complete once payment is confirmed. You can check order status in the Orders page.",
        });
      } else {
        throw new Error(data?.error || data?.message || "Failed to initiate payment");
      }
    } catch (error: any) {
      console.error("Error initiating iSmart payment:", error);
      toast({
        title: "Payment failed",
        description: error.message || "Could not send payment prompt",
        variant: "destructive",
      });
    } finally {
      setISmartProcessing(false);
    }
  };

  const initiateMomoPayment = async () => {
    if (!customerEmail && !customerPhone) {
      toast({
        title: "Contact required",
        description: "Please enter customer email or phone for electronic payments",
        variant: "destructive",
      });
      return;
    }

    // Ensure order is created before proceeding with iSmart Collect
    if (!orderId && !settleTableId && !existingOrderId) {
      toast({
        title: "Please wait",
        description: "Order is being prepared. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setPaymentStatus("processing");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        return;
      }

      // Validate email - use customer email if valid, otherwise generate from phone or use fallback
      let email = customerEmail?.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!email || !emailRegex.test(email)) {
        // Generate email from phone if available
        const cleanPhone = customerPhone?.replace(/[^0-9]/g, '');
        if (cleanPhone && cleanPhone.length >= 10) {
          email = `customer.${cleanPhone}@getdowo.com`;
        } else {
          // Fallback with timestamp to ensure uniqueness
          email = `guest.${Date.now()}@getdowo.com`;
        }
      }

      const { data, error } = await supabase.functions.invoke("ismart-checkout", {
        body: {
          orderId,
          orderNumber,
          amount: finalTotal,
          customerName,
          customerPhone,
          customerEmail: email,
          provider: "MTN",
          merchantUserId: user.id,
          items: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        },
      });

      if (error) throw error;
      if (data?.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
      if (data?.success === false) throw new Error(data.error || "Failed to initialize payment");

      window.location.href = `/merchant-payment/callback?reference=${data?.reference || orderId}`;
    } catch (error: any) {
      console.error("Error initiating payment:", error);
      setPaymentStatus("error");
      toast({
        title: "Payment initialization failed",
        description: error.message || "Could not start payment process",
        variant: "destructive",
      });
    }
  };

  const processPayment = async (tendered: number | null, change: number | null) => {
    setTenderedAmount(tendered);
    setChangeDue(change);
    setPaymentStatus("processing");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const businessUserId = profile?.user_id || user.id;

      const generatedOrderId = orderId || crypto.randomUUID();
      const generatedTransactionId = crypto.randomUUID();

      // If offline, save to local storage
      if (!isOnline) {
        // Save order to offline storage
        saveOfflineOrder({
          id: generatedOrderId,
          orderNumber: orderNumber || `#OFFLINE-${Date.now()}`,
          items: cartItems,
          total: currentOrder.total,
          paymentMethod: selectedMethod || 'Cash',
          status: 'completed',
          createdAt: new Date().toISOString(),
          userId: businessUserId,
          locationId: currentLocation?.id || null,
        });

        // Save transaction to offline storage
        saveOfflineTransaction({
          id: generatedTransactionId,
          transactionNumber: `TXN-${Date.now()}`,
          amount: currentOrder.total,
          paymentMethod: selectedMethod || 'Cash',
          orderId: generatedOrderId,
          createdAt: new Date().toISOString(),
          userId: businessUserId,
          locationId: currentLocation?.id || null,
        });

        // Update pending count
        updatePendingCount();

        // Store notification for when online
        const offlineNotification = {
          userId: businessUserId,
          transactionId: generatedTransactionId,
          orderNumber: orderNumber || `#OFFLINE-${Date.now()}`,
          amount: currentOrder.total,
          paymentMethod: selectedMethod || 'Cash',
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
        };
        
        const existingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
        existingNotifications.push(offlineNotification);
        localStorage.setItem('pendingNotifications', JSON.stringify(existingNotifications));

        // Store order data before clearing cart
        setCompletedOrder({
          orderNumber: orderNumber || `#OFFLINE-${Date.now()}`,
          tableNumber: 0,
          items: [...cartItems],
          subtotal: getSubtotal(),
          tax: getTax(),
          total: currentOrder.total,
          server: "Self-Service",
        });

        // Clear cart and show success
        clearCart();
        setPaymentStatus("success");
        setShowReceipt(true);

        toast({
          title: "Payment completed (Offline)",
          description: "Transaction saved locally. Will sync when online.",
        });

        return;
      }

      // Online mode - process normally
      if (orderId) {
        // Lookup existing customer by phone for purchase history linking
        // Use business owner's user_id from context (not auth user, which could be staff)
        let customerId = null;
        if (customerPhone) {
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', businessUserId)
            .eq('phone', customerPhone)
            .maybeSingle();
          
          customerId = existingCustomer?.id || null;
        }

        // Update order status to completed
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'completed',
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            customer_id: customerId,
          })
          .eq('id', orderId);

        if (updateError) throw updateError;

        // Process gift card redemption if applied
        if (appliedGiftCard) {
          const { error: redemptionError } = await supabase.rpc("redeem_gift_card" as never, {
            p_gift_card_id: appliedGiftCard.id,
            p_amount: appliedGiftCard.amount,
            p_order_id: orderId,
            p_notes: `Applied to order ${orderNumber}`,
          } as never);
          if (redemptionError) throw redemptionError;
        }

        // If table was linked, update its status back to available
        // Use effectiveTableId to ensure we have the table from URL params
        const tableToUpdate = settleTableId || tableId;
        if (tableToUpdate) {
          const { error: tableUpdateError } = await supabase
            .from('restaurant_tables')
            .update({
              status: 'available',
              current_order_id: null,
            })
            .eq('id', tableToUpdate);
          
          if (tableUpdateError) {
            console.error('Error updating table status:', tableUpdateError);
          } else {
            console.log('Table status updated to available:', tableToUpdate);
          }
        }

        // Create transaction record
        const transactionNumber = `TXN-${Date.now()}`;
        const { data: insertedTx, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            order_id: orderId,
            location_id: currentLocation?.id || null,
            amount: currentOrder.total,
            payment_method: selectedMethod || 'Cash',
            status: 'completed',
            transaction_number: transactionNumber,
            tendered_amount: tendered,
            change_due: change,
            staff_id: staffId,
          })
          .select('id')
          .single();

        if (transactionError) throw transactionError;

        const transactionUuid = insertedTx?.id;

        // Create transaction notification
        await createTransactionNotification({
          userId: businessUserId,
          transactionId: transactionNumber,
          orderNumber: orderNumber || `#${Date.now().toString().slice(-6)}`,
          amount: currentOrder.total,
          paymentMethod: selectedMethod || 'Cash',
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
        });

        // Record tax breakdown for GRA compliance (always record so net sales appear in reports)
        if (taxResult && transactionUuid) {
          await recordTransactionTax(businessUserId, transactionUuid, taxResult);
        }
      }

      // Store order data before clearing cart
      setCompletedOrder({
        orderNumber: orderNumber || `#${Date.now().toString().slice(-6)}`,
        tableNumber: tableNumber || 0,
        items: [...cartItems],
        subtotal: getSubtotal(),
        tax: taxResult?.total_tax || getTax(),
        total: currentOrder.total,
        server: "Self-Service",
      });

      // Clear cart after payment
      clearCart();
      setPaymentStatus("success");
      
      // Complete payment logic
      setShowReceipt(true);

      // Auto-send receipt if enabled and customer contact provided
      if (autoSendReceipt && (customerEmail || customerPhone)) {
        try {
          // Send email receipt if email provided
          if (customerEmail) {
            const itemsHtml = cartItems.map(item => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${item.quantity}x ${item.name}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
              </tr>
            `).join('');

            const receiptHtml = `
              <!DOCTYPE html>
              <html>
                <head><meta charset="utf-8"></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <div style="font-size: 48px;">✓</div>
                    <h1 style="margin: 10px 0 0 0;">Payment Successful</h1>
                  </div>
                  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                    <div style="text-align: center; margin-bottom: 25px;">
                      <h2 style="margin: 0 0 5px 0;">${profile?.business_name || 'Store'}</h2>
                      ${profile?.address ? `<p style="margin: 0; color: #6b7280;">${profile.address}</p>` : ''}
                    </div>
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                      <table style="width: 100%;">
                        <tr><td style="color: #6b7280;">Order #:</td><td style="text-align: right; font-weight: 600;">${orderNumber}</td></tr>
                        <tr><td style="color: #6b7280;">Date:</td><td style="text-align: right;">${new Date().toLocaleDateString()}</td></tr>
                        <tr><td style="color: #6b7280;">Payment:</td><td style="text-align: right;">${selectedMethod || 'Cash'}</td></tr>
                      </table>
                    </div>
                    <table style="width: 100%;">${itemsHtml}</table>
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #10B981; text-align: right;">
                      <span style="font-size: 20px; font-weight: bold;">Total: ${formatCurrency(currentOrder.total)}</span>
                    </div>
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0;">Thank you for your business!</p>
                      <p style="margin: 5px 0 0 0;">Please come again!</p>
                    </div>
                  </div>
                </body>
              </html>
            `;

            await supabase.functions.invoke('send-email-direct', {
              body: { to: customerEmail, subject: `Payment Receipt - ${orderNumber}`, html: receiptHtml },
            });
          }

          // Send SMS receipt if phone provided (no tracking link for POS receipts - only for customer-facing platforms)
          if (customerPhone) {
            const receiptLink = `${window.location.origin}/receipt?order=${encodeURIComponent(orderNumber.replace(/^#/, ''))}`;
            const smsMessage = `[Success] Payment Confirmed!\n${profile?.business_name || 'Store'}\nOrder: ${orderNumber}\nTotal: ${formatCurrency(currentOrder.total)}\nReceipt: ${receiptLink}`;

            const { error: smsError } = await supabase.functions.invoke('send-sms', {
              body: { to: customerPhone, message: smsMessage, type: 'receipt', channel: 'sms' },
            });
            
            if (smsError) {
              console.error('SMS receipt error:', smsError);
              // Check if it's a credits issue
              const errorMsg = typeof smsError === 'object' ? JSON.stringify(smsError) : String(smsError);
              if (errorMsg.includes('INSUFFICIENT_CREDITS') || errorMsg.includes('credits')) {
                toast({
                  title: "SMS not sent",
                  description: "Insufficient SMS credits. Purchase credits in Settings.",
                  variant: "default",
                });
              } else {
                toast({
                  title: "SMS not sent", 
                  description: "Could not send SMS receipt.",
                  variant: "default",
                });
              }
            } else {
              toast({
                title: "SMS receipt sent!",
                description: `Receipt sent to ${customerPhone}`,
              });
            }
          }

          if (customerEmail) {
            toast({
              title: "Email receipt sent!",
              description: `Receipt sent to ${customerEmail}`,
            });
          }
        } catch (error) {
          console.error('Error sending auto receipt:', error);
          toast({
            title: "Receipt not sent",
            description: "Payment completed but receipt could not be sent.",
            variant: "default",
          });
        }
      }

      // Auto-create or link customer profile for future tracking
      if (customerPhone || customerEmail) {
        try {
          await supabase.functions.invoke('enhance-customer-profile', {
            body: {
              action: 'auto-create-or-link',
              businessUserId: profile?.user_id || user.id,
              customerPhone,
              customerEmail,
              customerName,
              orderId
            }
          });
        } catch (profileError) {
          console.error('Customer profile enhancement failed:', profileError);
          // Non-blocking - don't show error to user
        }
      }

      toast({
        title: "Payment completed",
        description: `Order ${orderNumber} has been paid`,
      });

    } catch (error: any) {
      console.error('Error processing payment:', error);
      setPaymentStatus("error");
      toast({
        title: "Error processing payment",
        description: error.message || "Could not complete payment",
        variant: "destructive",
      });
    }
  };

  if (showReceipt && completedOrder) {
    return (
      <Receipt 
        order={completedOrder}
        orderNumber={completedOrder.orderNumber}
        customerName={customerName}
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        onClose={() => {
          setShowReceipt(false);
          setCompletedOrder(null);
          setPaymentStatus("idle");
          setTaxResult(null);
          navigate("/");
        }}
        paymentMethod={selectedMethod || undefined}
        tenderedAmount={tenderedAmount}
        changeDue={changeDue}
        taxResult={taxResult}
        autoPrint={autoPrintReceipt}
      />
    );
  }

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <Button 
            variant="ghost" 
            className="gap-2 self-start rounded-lg hover:bg-muted font-bold text-xs uppercase" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Button>
          
          <Button 
            variant="outline" 
            className="gap-2 w-full sm:w-auto rounded-lg font-bold text-xs uppercase"
            onClick={() => setShowDiscountDialog(true)}
          >
            <Percent className="w-4 h-4" />
            Apply Discount
          </Button>
        </div>

        {isOrderCreating && (
          <Alert className="mb-6 bg-amber-500/10 border-amber-500/20">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <AlertDescription className="text-amber-500 ml-2">
              Processing order...
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus === "processing" && (
          <Alert className="mb-6 bg-blue-500/10 border-blue-500/20">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <AlertDescription className="text-blue-500 ml-2">
              Processing payment...
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus === "success" && (
          <Alert className="mb-6 bg-green-500/10 border-green-500/20 p-4">
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <AlertDescription className="text-green-500 ml-2 font-medium">
                    Payment successful!
                  </AlertDescription>
                </div>
                {orderId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-green-500/30 text-green-600 hover:bg-green-500/10"
                    onClick={() => navigate(`/order-tracking?phone=${encodeURIComponent(customerPhone || '')}`)}
                  >
                    <MapPin className="h-4 w-4" />
                    Track Order
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-green-500/20">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <p className="font-semibold text-foreground">{orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                  <p className="font-semibold text-green-600">{formatCurrency(currentOrder.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="font-semibold text-foreground capitalize">{selectedMethod || 'N/A'}</p>
                </div>
                {customerName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-semibold text-foreground">{customerName}</p>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}

        {paymentStatus === "error" && (
          <Alert className="mb-6 bg-destructive/10 border-destructive/20">
            <AlertDescription className="text-destructive">
              Payment failed. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card rounded-lg border border-border p-6 sm:p-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Order Number</p>
                  <h2 className="text-xl sm:text-4xl font-black text-foreground">
                    {orderNumber || "GENERATING..."}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Status</p>
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase">
                    Pending Payment
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-4xl font-black text-foreground mb-1">Complete Checkout</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Total Amount Due: <span className="text-primary font-bold">{formatCurrency(currentOrder.total)}</span>
              </p>
            </div>

            <OrderTypeSelector value={orderType} onValueChange={setOrderType} industry={profile?.industry} />

            <TableSelector value={tableId} onValueChange={setTableId} />

            <StaffSelector value={staffId} onValueChange={setStaffId} />

            <GiftCardRedemption
              orderTotal={orderTotal}
              onGiftCardApplied={(amount, id, code) => setAppliedGiftCard({ amount, id, code })}
              onGiftCardRemoved={() => setAppliedGiftCard(null)}
              appliedGiftCard={appliedGiftCard}
            />

            {expressMode && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <p className="text-xs font-bold text-primary uppercase flex items-center gap-2 tracking-wide">
                  <Zap className="w-4 h-4" />
                  Express Checkout Active - Cash pre-selected
                </p>
              </div>
            )}

            <PaymentMethod
              selectedMethod={selectedMethod}
              onSelectMethod={setSelectedMethod}
            />

            {splitMode && <SplitPayment order={currentOrder} />}

            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
              <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">
                Customer Details
                {selectedMethod !== "cash" && (
                  <span className="text-red-500 ml-2 text-sm font-normal normal-case">*</span>
                )}
              </h2>
              {selectedMethod !== "cash" && (
                <p className="text-xs text-muted-foreground">
                  Customer details are required for electronic payments
                </p>
              )}
              {selectedMethod === "cash" && (
                <p className="text-xs text-muted-foreground">
                  Customer details are optional for cash payments
                </p>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Enter Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/20 transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                  <PhoneInput
                    value={customerPhone}
                    onChange={setCustomerPhone}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/20 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary/20 transition-all text-sm font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSendReceipt"
                    checked={autoSendReceipt}
                    onChange={(e) => setAutoSendReceipt(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="autoSendReceipt" className="text-xs font-bold text-muted-foreground uppercase">
                    Auto-send receipt
                  </label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendPaymentLink}
                  disabled={!customerPhone || sendingSMS}
                  className="text-[10px] font-bold uppercase rounded-lg"
                >
                  {sendingSMS ? "Sending..." : "Send Payment Link"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setSplitMode(!splitMode)}
                className="flex-1 text-xs font-bold uppercase py-6 rounded-lg"
              >
                {splitMode ? "Cancel Split" : "Split Bill"}
              </Button>
              <Button
                onClick={handleCompletePayment}
                disabled={!selectedMethod || paymentStatus === "processing" || isOrderCreating}
                className="flex-1 text-sm font-bold uppercase py-6 rounded-lg shadow-sm"
                size="lg"
              >
                {isOrderCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Order...
                  </>
                ) : paymentStatus === "processing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Complete Payment
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <PaymentSummary
              order={{ ...currentOrder, total: orderTotal }}
              discount={discount}
              tipsEnabled={tipsEnabled}
              tipPercent={tipPercent}
              onTipPercentChange={setTipPercent}
            />
            <TransactionHistory />
          </div>
        </div>

        <DiscountDialog
          open={showDiscountDialog}
          onOpenChange={setShowDiscountDialog}
          onApplyDiscount={setDiscount}
        />

        <TenderedAmountDialog
          open={tenderedDialogOpen}
          onOpenChange={setTenderedDialogOpen}
          totalAmount={currentOrder.total}
          onComplete={(tendered, change) => processPayment(tendered, change)}
        />

        <ISmartMoMoDialog
          open={iSmartMoMoDialogOpen}
          onOpenChange={setISmartMoMoDialogOpen}
          customerPhone={customerPhone}
          onPhoneChange={setCustomerPhone}
          onConfirm={initiateISmartMoMoPayment}
          isProcessing={iSmartProcessing}
          amount={finalTotal}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
};
