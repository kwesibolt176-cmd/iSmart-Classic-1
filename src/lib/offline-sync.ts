/**
 * Offline Sync Manager
 * Handles syncing offline data when connection is restored
 */

import { supabase } from "@/integrations/supabase/client";
import {
  getOfflineOrders,
  getOfflineTransactions,
  removeOfflineOrder,
  removeOfflineTransaction,
  type OfflineOrder,
  type OfflineTransaction,
} from "./offline-storage";
import { createTransactionNotification } from "./transaction-notifications";
import { toast } from "sonner";

/**
 * Sync all offline orders to the database
 */
export const syncOfflineOrders = async (): Promise<void> => {
  const offlineOrders = getOfflineOrders();
  
  if (offlineOrders.length === 0) {
    return;
  }

  console.log(`Syncing ${offlineOrders.length} offline orders...`);

  for (const order of offlineOrders) {
    try {
      // Insert order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          id: order.id,
          user_id: order.userId,
          order_number: order.orderNumber,
          total: order.total,
          status: order.status,
          location_id: order.locationId,
          created_at: order.createdAt,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error syncing order:', orderError);
        continue;
      }

      // Insert order items
      if (order.items && order.items.length > 0) {
        const orderItems = order.items.map(item => ({
          order_id: orderData.id,
          inventory_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error('Error syncing order items:', itemsError);
          continue;
        }
      }

      // Remove from offline storage after successful sync
      removeOfflineOrder(order.id);
      
    } catch (error) {
      console.error('Error syncing order:', error);
    }
  }
};

/**
 * Sync all offline transactions to the database
 */
export const syncOfflineTransactions = async (): Promise<void> => {
  const offlineTransactions = getOfflineTransactions();
  
  if (offlineTransactions.length === 0) {
    return;
  }

  console.log(`Syncing ${offlineTransactions.length} offline transactions...`);

  for (const transaction of offlineTransactions) {
    try {
      const { error } = await supabase.rpc("sync_offline_transaction" as never, {
        _id: transaction.id,
        _transaction_number: transaction.transactionNumber,
        _amount: transaction.amount,
        _payment_method: transaction.paymentMethod,
        _order_id: transaction.orderId,
        _location_id: transaction.locationId,
        _client_created_at: transaction.createdAt,
      } as never);

      if (error) {
        console.error('Error syncing transaction:', error);
        continue;
      }

      // Remove from offline storage after successful sync
      removeOfflineTransaction(transaction.id);
      
    } catch (error) {
      console.error('Error syncing transaction:', error);
    }
  }
};

/**
 * Sync pending notifications to the database
 */
export const syncPendingNotifications = async (): Promise<void> => {
  const pendingNotifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
  
  if (pendingNotifications.length === 0) {
    return;
  }

  console.log(`Syncing ${pendingNotifications.length} pending notifications...`);

  for (const notification of pendingNotifications) {
    try {
      await createTransactionNotification(notification);
    } catch (error) {
      console.error('Error syncing notification:', error);
    }
  }

  // Clear pending notifications after sync attempt
  localStorage.removeItem('pendingNotifications');
};

/**
 * Sync all offline data
 */
export const syncAllOfflineData = async (): Promise<void> => {
  try {
    await syncOfflineOrders();
    await syncOfflineTransactions();
    await syncPendingNotifications();
    
    const remainingOrders = getOfflineOrders().length;
    const remainingTransactions = getOfflineTransactions().length;
    
    if (remainingOrders === 0 && remainingTransactions === 0) {
      toast.success('All offline data synced successfully!');
    } else {
      toast.warning(`Some data could not be synced. ${remainingOrders} orders and ${remainingTransactions} transactions remaining.`);
    }
  } catch (error) {
    console.error('Error syncing offline data:', error);
    toast.error('Failed to sync offline data');
  }
};
