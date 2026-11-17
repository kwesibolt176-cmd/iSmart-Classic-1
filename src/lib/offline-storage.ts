/**
 * Offline Storage Management
 * Handles storing and retrieving data when offline
 */

export interface OfflineOrder {
  id: string;
  orderNumber: string;
  items: any[];
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  userId: string;
  locationId: string | null;
}

export interface OfflineTransaction {
  id: string;
  transactionNumber: string;
  amount: number;
  paymentMethod: string;
  orderId: string | null;
  createdAt: string;
  userId: string;
  locationId: string | null;
}

const OFFLINE_ORDERS_KEY = 'offline_orders';
const OFFLINE_TRANSACTIONS_KEY = 'offline_transactions';

/**
 * Save an order to offline storage
 */
export const saveOfflineOrder = (order: OfflineOrder): void => {
  try {
    const orders = getOfflineOrders();
    orders.push(order);
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('Error saving offline order:', error);
  }
};

/**
 * Save a transaction to offline storage
 */
export const saveOfflineTransaction = (transaction: OfflineTransaction): void => {
  try {
    const transactions = getOfflineTransactions();
    transactions.push(transaction);
    localStorage.setItem(OFFLINE_TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Error saving offline transaction:', error);
  }
};

/**
 * Get all offline orders
 */
export const getOfflineOrders = (): OfflineOrder[] => {
  try {
    const orders = localStorage.getItem(OFFLINE_ORDERS_KEY);
    return orders ? JSON.parse(orders) : [];
  } catch (error) {
    console.error('Error getting offline orders:', error);
    return [];
  }
};

/**
 * Get all offline transactions
 */
export const getOfflineTransactions = (): OfflineTransaction[] => {
  try {
    const transactions = localStorage.getItem(OFFLINE_TRANSACTIONS_KEY);
    return transactions ? JSON.parse(transactions) : [];
  } catch (error) {
    console.error('Error getting offline transactions:', error);
    return [];
  }
};

/**
 * Clear all offline orders
 */
export const clearOfflineOrders = (): void => {
  try {
    localStorage.removeItem(OFFLINE_ORDERS_KEY);
  } catch (error) {
    console.error('Error clearing offline orders:', error);
  }
};

/**
 * Clear all offline transactions
 */
export const clearOfflineTransactions = (): void => {
  try {
    localStorage.removeItem(OFFLINE_TRANSACTIONS_KEY);
  } catch (error) {
    console.error('Error clearing offline transactions:', error);
  }
};

/**
 * Remove a specific offline order by ID
 */
export const removeOfflineOrder = (orderId: string): void => {
  try {
    const orders = getOfflineOrders();
    const filtered = orders.filter(order => order.id !== orderId);
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing offline order:', error);
  }
};

/**
 * Remove a specific offline transaction by ID
 */
export const removeOfflineTransaction = (transactionId: string): void => {
  try {
    const transactions = getOfflineTransactions();
    const filtered = transactions.filter(txn => txn.id !== transactionId);
    localStorage.setItem(OFFLINE_TRANSACTIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing offline transaction:', error);
  }
};

/**
 * Check if there are pending offline orders or transactions
 */
export const hasPendingOfflineData = (): boolean => {
  return getOfflineOrders().length > 0 || getOfflineTransactions().length > 0;
};
