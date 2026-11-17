import { supabase } from "@/integrations/supabase/client";

interface TransactionNotificationData {
  userId: string;
  transactionId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
}

export const createTransactionNotification = async (data: TransactionNotificationData) => {
  try {
    const { userId, transactionId, orderNumber, amount, paymentMethod, customerName, customerPhone } = data;
    
    // Format the amount for display
    const formattedAmount = new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
    }).format(amount);

    // Create notification title and message
    const title = "Payment Completed";
    const customerInfo = customerName ? ` from ${customerName}` : customerPhone ? ` from ${customerPhone}` : "";
    const message = `${formattedAmount} payment received${customerInfo} via ${paymentMethod}. Order: ${orderNumber}`;

    // Insert notification into database
    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        message,
        type: "success",
        is_read: false,
        link: `/orders?search=${orderNumber.replace('#', '')}`, // Link to orders page with search
      });

    if (error) {
      console.error("Failed to create transaction notification:", error);
    } else {
      console.log("Transaction notification created successfully");
    }
  } catch (error) {
    console.error("Error creating transaction notification:", error);
  }
};